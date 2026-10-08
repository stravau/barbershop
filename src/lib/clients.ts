// Client identity helpers: phone/name normalisation, duplicate detection and
// merging. Relative imports only, so scripts can load this file directly.

import type { PrismaClient } from "../generated/prisma"

/**
 * Client.phone is the client's unique key. Bookings added in the admin
 * without a number get a placeholder starting with this prefix.
 */
export const NO_PHONE_PREFIX = "sem-telefone-"

/** Clients who always pay the same amount, whatever the service (by first name). */
const FIXED_PRICE_BY_FIRST_NAME: Record<string, number> = {
  arlindo: 20,
}

/** The fixed price for this client's bookings, or null to use the service price. */
export function fixedPriceFor(name: string): number | null {
  return FIXED_PRICE_BY_FIRST_NAME[normalizeName(name).split(" ")[0]] ?? null
}

export function hasPhone(phone: string): boolean {
  return /^\d+$/.test(phone)
}

/** Digits only; Portuguese 9-digit numbers get the 351 country code. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.length === 9 && /^[29]/.test(digits) ? `351${digits}` : digits
}

/** "  José  Fernandes" -> "jose fernandes" */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export interface ClientSummary {
  id: string
  name: string
  phone: string
  email: string | null
  createdAt: Date
  bookingCount: number
}

export async function loadClientSummaries(prisma: PrismaClient): Promise<ClientSummary[]> {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "asc" },
  })
  return clients.map((c) => ({ ...c, bookingCount: c._count.bookings }))
}

export interface DuplicateGroup {
  /** The client the others get merged into comes first. */
  clients: ClientSummary[]
  reasons: string[]
}

/**
 * Finds clients that look like the same person.
 *
 * `sure` — same (normalised) phone or same email. These chain safely (A=B
 * by phone, B=C by email → one group) and can be merged without asking.
 *
 * `probable` — single pairs for the barber to confirm: same name where one
 * has no phone, a phoneless client whose first name matches exactly one
 * other client, or the same full name with different phones. Never chained,
 * so a phoneless "João" can't pull several Joões together.
 */
export function findDuplicates(clients: ClientSummary[]): {
  sure: DuplicateGroup[]
  probable: DuplicateGroup[]
} {
  // Union-find over the "sure" links
  const parent = new Map(clients.map((c) => [c.id, c.id]))
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!
    return x
  }
  const sureReasons = new Map<string, Set<string>>() // root-independent: per client id
  const link = (a: ClientSummary, b: ClientSummary, reason: string) => {
    parent.set(find(a.id), find(b.id))
    for (const id of [a.id, b.id]) {
      if (!sureReasons.has(id)) sureReasons.set(id, new Set())
      sureReasons.get(id)!.add(reason)
    }
  }

  const probablePairs: { a: ClientSummary; b: ClientSummary; reason: string }[] = []
  const firstName = (c: ClientSummary) => normalizeName(c.name).split(" ")[0]

  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const a = clients[i]
      const b = clients[j]
      const aPhone = hasPhone(a.phone)
      const bPhone = hasPhone(b.phone)
      if (aPhone && bPhone && normalizePhone(a.phone) === normalizePhone(b.phone)) {
        link(a, b, "mesmo telemóvel")
      }
      if (a.email && b.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()) {
        link(a, b, "mesmo email")
      }
      const an = normalizeName(a.name)
      const bn = normalizeName(b.name)
      if (an && an === bn) {
        if (!aPhone || !bPhone) probablePairs.push({ a, b, reason: "mesmo nome, um sem telefone" })
        else if (an.includes(" ")) probablePairs.push({ a, b, reason: "mesmo nome completo" })
      }
    }
  }

  // Phoneless client whose first name matches exactly one other client
  for (const c of clients.filter((x) => !hasPhone(x.phone))) {
    const matches = clients.filter(
      (o) => o.id !== c.id && firstName(o) === firstName(c) && normalizeName(o.name) !== normalizeName(c.name),
    )
    if (matches.length === 1) {
      probablePairs.push({ a: c, b: matches[0], reason: "mesmo primeiro nome, um sem telefone" })
    }
  }

  const groups = new Map<string, ClientSummary[]>()
  for (const c of clients) groups.set(find(c.id), [...(groups.get(find(c.id)) ?? []), c])
  const sure = [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => ({
      clients: [...members].sort(primaryFirst),
      reasons: [...new Set(members.flatMap((m) => [...(sureReasons.get(m.id) ?? [])]))],
    }))

  const probable = probablePairs
    .filter(({ a, b }) => find(a.id) !== find(b.id)) // already covered by a sure group
    .map(({ a, b, reason }) => ({ clients: [a, b].sort(primaryFirst), reasons: [reason] }))

  return { sure, probable }
}

/** Prefer a real phone, then more bookings, then an email, then the oldest. */
function primaryFirst(a: ClientSummary, b: ClientSummary): number {
  return (
    Number(hasPhone(b.phone)) - Number(hasPhone(a.phone)) ||
    b.bookingCount - a.bookingCount ||
    Number(!!b.email) - Number(!!a.email) ||
    a.createdAt.getTime() - b.createdAt.getTime()
  )
}

/** The fullest name (most words); the primary's on a tie. */
export function bestName(names: string[]): string {
  return names.reduce((best, n) =>
    n.trim().split(/\s+/).length > best.trim().split(/\s+/).length ? n.trim() : best,
  )
}

/** What the merged client will look like (for previews). */
export function mergedPreview(group: ClientSummary[]): { name: string; phone: string; email: string | null } {
  const [primary, ...others] = group
  const realPhone = group.map((c) => c.phone).find(hasPhone)
  return {
    name: bestName(group.map((c) => c.name)),
    phone: realPhone ? normalizePhone(realPhone) : primary.phone,
    email: primary.email ?? others.find((o) => o.email)?.email ?? null,
  }
}

/**
 * Merges `otherIds` into `primaryId`: their bookings move over, the primary
 * keeps the fullest name / a real phone / an email, and the others are
 * deleted. All in one transaction.
 */
export async function mergeClients(
  prisma: PrismaClient,
  primaryId: string,
  otherIds: string[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const all = await tx.client.findMany({
      where: { id: { in: [primaryId, ...otherIds] } },
      include: { _count: { select: { bookings: true } } },
    })
    const primary = all.find((c) => c.id === primaryId)
    const others = all.filter((c) => c.id !== primaryId)
    if (!primary || others.length === 0) return

    const preview = mergedPreview([
      { ...primary, bookingCount: primary._count.bookings },
      ...others.map((o) => ({ ...o, bookingCount: o._count.bookings })),
    ])

    await tx.booking.updateMany({
      where: { clientId: { in: others.map((o) => o.id) } },
      data: { clientId: primaryId },
    })
    // Signed-in accounts of the merged clients stay signed in, as the primary
    // (otherwise they'd be sent to registration and create a duplicate again)
    await tx.clientSession.updateMany({
      where: { clientId: { in: others.map((o) => o.id) } },
      data: { clientId: primaryId },
    })
    await tx.client.deleteMany({ where: { id: { in: others.map((o) => o.id) } } })
    await tx.client.update({
      where: { id: primaryId },
      data: {
        name: preview.name,
        phone: preview.phone,
        email: preview.email,
        loyaltyCount: all.reduce((s, c) => s + c.loyaltyCount, 0),
        createdAt: new Date(Math.min(...all.map((c) => c.createdAt.getTime()))),
      },
    })
  })
}

/**
 * Adds the 351 code to 9-digit numbers so WhatsApp links work. Skips a
 * number when the normalised one already belongs to another client (that
 * pair shows up as a duplicate instead). Returns how many were fixed.
 */
export async function normalizeClientPhones(prisma: PrismaClient): Promise<number> {
  const clients = await prisma.client.findMany({ select: { id: true, phone: true } })
  const taken = new Set(clients.map((c) => c.phone))
  let fixed = 0
  for (const c of clients) {
    if (!hasPhone(c.phone)) continue
    const normalized = normalizePhone(c.phone)
    if (normalized === c.phone || taken.has(normalized)) continue
    await prisma.client.update({ where: { id: c.id }, data: { phone: normalized } })
    taken.add(normalized)
    fixed++
  }
  return fixed
}
