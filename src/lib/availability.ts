// Free booking times — the one place that decides them, used by the slot
// list (/api/slots), "Marcação express" and, as the final check, by every
// booking request. Busy time = bookings waiting or confirmed + Google
// Calendar events (the barber's own blocks).

import { addDays, addMinutes } from "date-fns"
import { prisma } from "./prisma"
import { getBusyIntervals } from "./gcal"
import { filterFutureSlots, generateSlots, type BusyInterval } from "./slots"
import { BOOKING_WINDOW_DAYS, MIN_NOTICE_MIN, type LocationId } from "./schedule"
import { getLisbonDayBounds } from "./tz"

/** Everything that blocks the agenda between two instants. */
export async function busyBetween(from: Date, to: Date): Promise<BusyInterval[]> {
  const [bookings, gcal] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, startUtc: { lt: to }, endUtc: { gt: from } },
      select: { startUtc: true, endUtc: true },
    }),
    getBusyIntervals(from, to).catch((e) => {
      console.error("[availability] gcal failed:", e)
      return [] as BusyInterval[]
    }),
  ])
  return [...gcal, ...bookings.map((b) => ({ start: b.startUtc, end: b.endUtc }))]
}

/** Bookable start times on a Lisbon date, given what's busy (from busyBetween). */
export function freeSlotsWith(
  busy: BusyInterval[],
  location: LocationId,
  isoDate: string,
  durationMin: number,
  now = new Date(),
): Date[] {
  if (getLisbonDayBounds(isoDate).startUtc > addDays(now, BOOKING_WINDOW_DAYS + 1)) return []
  return filterFutureSlots(generateSlots({ isoDate, location, durationMin, busy }), now, MIN_NOTICE_MIN)
}

/** Bookable start times on a Lisbon date. */
export async function freeSlots(
  location: LocationId,
  isoDate: string,
  durationMin: number,
  now = new Date(),
): Promise<Date[]> {
  const { startUtc, endUtc } = getLisbonDayBounds(isoDate)
  // A day's slots can be blocked by something just outside it (the buffer)
  const busy = await busyBetween(addMinutes(startUtc, -60), addMinutes(endUtc, 60))
  return freeSlotsWith(busy, location, isoDate, durationMin, now)
}
