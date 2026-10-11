// The signed-in client's bits for the home page (rendered with the page, and
// also served at GET /api/conta/resumo).

import { prisma } from "./prisma"
import { currentClientSession } from "./client-auth"
import { clientHabit, suggestSlots } from "./express"
import { formatLisbon } from "./tz"
import { stamps } from "./loyalty"

export type AccountSummary =
  | { signedIn: false }
  | {
      signedIn: true
      firstName: string
      visits: number
      /** Next pending/confirmed booking */
      next: {
        day: string
        short: string
        time: string
        status: "PENDING" | "CONFIRMED"
        serviceName: string
        priceEur: number
        city: string
      } | null
      /** The usual booking and the next free times that fit it (null: no history yet) */
      express: {
        serviceName: string
        priceEur: number
        city: string
        slots: { startIso: string; day: string; short: string; time: string }[]
      } | null
    }

const cityName = (location: string) => (location === "lisboa" ? "Lisboa" : "Setúbal")
// "Segunda, 05 de Outubro" — short enough for one line in the slot buttons
const day = (d: Date) =>
  formatLisbon(d, "EEEE, dd 'de' MMMM").replace("-feira", "").replace(/^./, (c) => c.toUpperCase())
const time = (d: Date) => formatLisbon(d, "HH:mm")
/** "Seg 05/10" */
const short = (d: Date) => formatLisbon(d, "EEE dd/MM").replace(/^./, (c) => c.toUpperCase())

/**
 * What the home page personalises for a signed-in client: next-booking bar,
 * express booking and loyalty card ({ signedIn: false } for everyone else).
 */
export async function getAccountSummary(): Promise<AccountSummary> {
  const current = await currentClientSession()
  const client = current?.client
  if (!client) {
    return { signedIn: false }
  }

  const now = new Date()
  const bookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    select: { status: true, startUtc: true, serviceId: true, serviceName: true, servicePrice: true, location: true },
    orderBy: { startUtc: "asc" },
  })
  const upcoming = bookings.find(
    (b) => b.startUtc >= now && (b.status === "PENDING" || b.status === "CONFIRMED"),
  )
  const habit = await clientHabit(client.id, client.preferredLocation)
  const slots = habit ? await suggestSlots(habit) : []

  const summary: AccountSummary = {
    signedIn: true,
    firstName: client.name.split(" ")[0],
    visits: stamps(bookings, now),
    next: upcoming
      ? {
          day: day(upcoming.startUtc),
          short: short(upcoming.startUtc),
          time: time(upcoming.startUtc),
          status: upcoming.status as "PENDING" | "CONFIRMED",
          serviceName: upcoming.serviceName,
          priceEur: upcoming.servicePrice,
          city: cityName(upcoming.location),
        }
      : null,
    express: habit
      ? {
          serviceName: habit.serviceName,
          priceEur: habit.priceEur,
          city: cityName(habit.location),
          slots: slots.map((s) => {
            const d = new Date(s.startIso)
            return { startIso: s.startIso, day: day(d), short: short(d), time: time(d) }
          }),
        }
      : null,
  }
  return summary
}
