// The admin's client list for suggestions while typing ("Nova marcação"):
// who they are and what they usually book, worked out from their bookings.

import type { PrismaClient } from "../generated/prisma"
import { hasPhone } from "./clients"
import { happened } from "./loyalty"
import { buildCombo, validateSelection } from "./services"
import type { LocationId } from "./schedule"

export interface ClientHint {
  id: string
  name: string
  /** Digits, "" when the client has no phone */
  phone: string
  email: string | null
  visits: number
  /** ISO, the last visit that happened */
  lastVisit: string | null
  /** Usual services (item ids) and how they read, e.g. "Corte + Barba" */
  services: string[]
  serviceName: string | null
  location: LocationId | null
}

const mode = <T,>(values: T[]): T | undefined => {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export async function loadClientDirectory(prisma: PrismaClient, now = new Date()): Promise<ClientHint[]> {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      preferredLocation: true,
      bookings: { select: { serviceId: true, location: true, status: true, startUtc: true } },
    },
  })
  return clients
    .filter((c) => c.name !== "Cliente apagado") // accounts deleted by their owner
    .map((c) => {
      const done = c.bookings.filter((b) => happened(b, now))
      // What they usually book: their visits, else whatever they've booked
      const pool = (done.length > 0 ? done : c.bookings.filter((b) => b.status !== "CANCELLED")).filter(
        (b) => validateSelection(b.serviceId.split("+")).ok,
      )
      const key = mode(pool.map((b) => b.serviceId))
      const combo = key ? buildCombo(key.split("+")) : null
      const preferred = c.preferredLocation === "lisboa" || c.preferredLocation === "setubal" ? c.preferredLocation : null
      const last = done.reduce<Date | null>((m, b) => (!m || b.startUtc > m ? b.startUtc : m), null)
      return {
        id: c.id,
        name: c.name,
        phone: hasPhone(c.phone) ? c.phone : "",
        email: c.email,
        visits: done.length,
        lastVisit: last?.toISOString() ?? null,
        services: combo?.itemIds ?? [],
        serviceName: combo?.name ?? null,
        location: (preferred ?? mode(pool.map((b) => b.location)) ?? null) as LocationId | null,
      }
    })
    .sort((a, b) => b.visits - a.visits)
}
