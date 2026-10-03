import type { Prisma } from "@/generated/prisma"
import { formatLisbon } from "@/lib/tz"

export type BookingWithClient = Prisma.BookingGetPayload<{ include: { client: true } }>

/**
 * Statuses that count as a real appointment. Nothing moves bookings to
 * COMPLETED yet, so a CONFIRMED booking whose start time has passed is
 * treated as done ("realizada") everywhere in the admin.
 */
export const BOOKED_STATUSES = ["CONFIRMED", "COMPLETED"]

export function isDone(b: { status: string; startUtc: Date }, now: Date): boolean {
  return BOOKED_STATUSES.includes(b.status) && b.startUtc < now
}

/** What was actually received for a booking: service price + tip. */
export function received(b: { servicePrice: number; tipEur: number }): number {
  return b.servicePrice + b.tipEur
}

/** "12,5" / "12.50" / "" -> 12.5 / 0. Returns null when it isn't a sane amount. */
export function parseEuros(raw: string): number | null {
  const s = raw.trim().replace(",", ".")
  if (!s) return 0
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n * 100) / 100 : null
}

export function cityName(location: string): string {
  return location === "lisboa" ? "Lisboa" : "Setúbal"
}

export function parseCity(raw: string | undefined): "lisboa" | "setubal" | undefined {
  return raw === "lisboa" || raw === "setubal" ? raw : undefined
}

export function bookingHref(b: { id: string; adminToken: string }): string {
  return `/admin/booking/${b.id}?token=${b.adminToken}`
}

export function whatsappHref(phone: string): string {
  return `https://wa.me/${phone}`
}

export { NO_PHONE_PREFIX, hasPhone } from "@/lib/clients"

/** "Hoje" / "Amanhã" / "Ontem" for the Lisbon dates around `today`, else null. */
export function relativeDay(date: Date, today: string): string | null {
  const ymd = formatLisbon(date, "yyyy-MM-dd")
  const diff = Math.round(
    (Date.UTC(...ymdParts(ymd)) - Date.UTC(...ymdParts(today))) / 864e5,
  )
  return diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : diff === -1 ? "Ontem" : null
}

function ymdParts(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map(Number)
  return [y, m - 1, d]
}

/** Groups items by a key, keeping the input order (Map preserves insertion). */
export function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const arr = groups.get(k)
    if (arr) arr.push(item)
    else groups.set(k, [item])
  }
  return groups
}
