// Client accounts — passwordless: a 6-digit code sent to the client's email.
// The session cookie is HMAC-signed (lib/admin-session.ts helpers) and each
// session is a database row, so it can be ended.

import { createHash, randomInt } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "./prisma"
import { sendEmail } from "./email"
import { CLIENT_COOKIE_NAME, sign, verify } from "./admin-session"
import { failedAttemptsLeft, recordAttempt, requestInfo, secretsMatch } from "./admin-auth"

export { CLIENT_COOKIE_NAME }
const CLIENT_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 90 // 90 days
const CODE_TTL_MS = 1000 * 60 * 10
const CODE_MAX_TRIES = 5
/** Codes that can be requested per email in CODE_WINDOW_MS (stops email spam). */
const CODES_PER_EMAIL = 3
const CODE_WINDOW_MS = 1000 * 60 * 15

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Emails a login code. Returns an error key for the form, or null when sent. */
export async function sendClientCode(rawEmail: string): Promise<"invalid" | "blocked" | "email" | null> {
  const email = normalizeEmail(rawEmail)
  if (!isValidEmail(email)) return "invalid"

  const { ip, userAgent } = await requestInfo()
  if ((await failedAttemptsLeft(ip, "client")) === 0) return "blocked"
  const recent = await prisma.clientLoginCode.count({
    where: { email, createdAt: { gte: new Date(Date.now() - CODE_WINDOW_MS) } },
  })
  if (recent >= CODES_PER_EMAIL) return "blocked"

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  await prisma.clientLoginCode.create({
    data: { email, codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  })
  await recordAttempt(ip, "client-email", true, userAgent)

  const sent = await sendEmail({
    to: email,
    subject: `O teu código: ${code} — Tarzan's Barbershop`,
    html: `<div style="font-family:Arial,sans-serif;color:#1a1712">
<p style="font-size:16px">O teu código para entrares na tua conta Tarzan's Barbershop é:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
<p style="font-size:13px;color:#6b6152">Válido durante 10 minutos. Se não foste tu a pedir, ignora este email.</p></div>`,
  })
  if (!sent.ok) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[client-auth] login code for ${email} (dev only): ${code}`)
      return null
    }
    return "email"
  }
  return null
}

/**
 * Checks the latest code sent to `email`; on success starts a session
 * (cookie set) linked to the client with that email, if there is one.
 * Returns "ok" | "wrong" | "expired" | "blocked".
 */
export async function verifyClientCode(
  rawEmail: string,
  given: string,
): Promise<"ok" | "wrong" | "expired" | "blocked"> {
  const email = normalizeEmail(rawEmail)
  const { ip, userAgent } = await requestInfo()
  if ((await failedAttemptsLeft(ip, "client")) === 0) return "blocked"

  const row = await prisma.clientLoginCode.findFirst({
    where: { email, usedAt: null },
    orderBy: { createdAt: "desc" },
  })
  if (!row || row.expiresAt < new Date() || row.attempts >= CODE_MAX_TRIES) return "expired"
  if (!secretsMatch(sha256(given.replace(/\D/g, "")), row.codeHash)) {
    await prisma.clientLoginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } })
    await recordAttempt(ip, "client-code", false, userAgent)
    return "wrong"
  }
  await prisma.clientLoginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  await recordAttempt(ip, "client-code", true, userAgent)

  const client = await findClientByEmail(email)
  const session = await prisma.clientSession.create({
    data: { email, clientId: client?.id ?? null, expiresAt: new Date(Date.now() + CLIENT_SESSION_TTL_MS) },
  })
  const value = await sign("client", session.id, CLIENT_SESSION_TTL_MS)
  if (!value) return "expired"
  ;(await cookies()).set(CLIENT_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(CLIENT_SESSION_TTL_MS / 1000),
  })
  return "ok"
}

/** The client with this email (the one with most bookings, if several). */
async function findClientByEmail(email: string) {
  const matches = await prisma.client.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { _count: { select: { bookings: true } } },
  })
  return matches.sort((a, b) => b._count.bookings - a._count.bookings)[0] ?? null
}

/** The signed-in client session (and their client record, once registered). */
export async function currentClientSession() {
  const id = await verify("client", (await cookies()).get(CLIENT_COOKIE_NAME)?.value)
  if (!id) return null
  const session = await prisma.clientSession.findUnique({ where: { id } })
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null
  if (Date.now() - session.lastSeenAt.getTime() > 1000 * 60 * 30) {
    await prisma.clientSession.update({ where: { id }, data: { lastSeenAt: new Date() } })
  }
  const client = session.clientId
    ? await prisma.client.findUnique({ where: { id: session.clientId } })
    : null
  return { session, client }
}

/** For client-area pages/actions: signed in AND registered, else redirect. */
export async function requireClient() {
  const current = await currentClientSession()
  if (!current) redirect("/conta/entrar")
  if (!current.client) redirect("/conta/registo")
  return { session: current.session, client: current.client }
}

export async function endClientSession(): Promise<void> {
  const current = await currentClientSession()
  if (current) {
    await prisma.clientSession.update({ where: { id: current.session.id }, data: { revokedAt: new Date() } })
  }
  ;(await cookies()).delete(CLIENT_COOKIE_NAME)
}
