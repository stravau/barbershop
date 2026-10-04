// "Marcação express": what a client usually books, and the next free slots
// that match that habit.

import { prisma } from "./prisma"
import { buildCombo, validateSelection } from "./services"
import { getBusyIntervals } from "./gcal"
import { filterFutureSlots, generateSlots, type BusyInterval } from "./slots"
import { isLocationOpenOn, upcomingOpenDates, ymdDayOfWeek, type LocationId } from "./schedule"
import { combineDateTimeLisbon, formatLisbon, lisbonPeriods } from "./tz"

const LOOKAHEAD_DAYS = 21
const SUGGESTIONS = 4

export interface Habit {
  services: string[]
  serviceName: string
  priceEur: number
  durationMin: number
  location: LocationId
  /** 0 = Sunday … 6 = Saturday, or null when there's no clear favourite */
  weekday: number | null
  /** Usual start time in minutes after midnight (Lisbon) */
  minutes: number
  visits: number
}

export interface Suggestion {
  startIso: string
  location: LocationId
}

const mode = <T,>(values: T[]): T | undefined => {
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

/** The client's usual booking, from their past appointments (null if none). */
export async function clientHabit(
  clientId: string,
  preferredLocation: string | null,
): Promise<Habit | null> {
  const select = { serviceId: true, location: true, startUtc: true } as const
  let past = await prisma.booking.findMany({
    where: { clientId, status: { in: ["CONFIRMED", "COMPLETED"] }, startUtc: { lt: new Date() } },
    select,
    orderBy: { startUtc: "desc" },
    take: 30,
  })
  // No visit yet: go by what they've booked so far (a new client's first bookings)
  if (past.length === 0) {
    past = await prisma.booking.findMany({
      where: { clientId, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
      select,
      orderBy: { startUtc: "desc" },
      take: 30,
    })
  }
  if (past.length === 0) return null

  // Most frequent service (combo) that is still bookable
  const keys = past.map((b) => b.serviceId).filter((k) => validateSelection(k.split("+")).ok)
  const key = mode(keys)
  if (!key) return null
  const combo = buildCombo(key.split("+"))

  const location = (preferredLocation === "lisboa" || preferredLocation === "setubal"
    ? preferredLocation
    : mode(past.map((b) => b.location))) as LocationId

  const weekdays = past.map((b) => ymdDayOfWeek(formatLisbon(b.startUtc, "yyyy-MM-dd")))
  const weekday = mode(weekdays) ?? null
  const minutesList = past
    .map((b) => {
      const [h, m] = formatLisbon(b.startUtc, "HH:mm").split(":").map(Number)
      return h * 60 + m
    })
    .sort((a, b) => a - b)

  return {
    services: combo.itemIds,
    serviceName: combo.name,
    priceEur: combo.priceEur,
    durationMin: combo.durationMin,
    location,
    weekday: weekday !== null && weekdays.filter((w) => w === weekday).length >= 2 ? weekday : null,
    minutes: minutesList[Math.floor(minutesList.length / 2)],
    visits: past.length,
  }
}

/** Next free slots that fit the habit: one per day, best matches first, then by date. */
export async function suggestSlots(habit: Habit): Promise<Suggestion[]> {
  const { today } = lisbonPeriods()
  const days = upcomingOpenDates(habit.location, today, LOOKAHEAD_DAYS).filter((d) =>
    isLocationOpenOn(habit.location, ymdDayOfWeek(d)),
  )
  if (days.length === 0) return []

  const from = combineDateTimeLisbon(days[0], "00:00")
  const to = combineDateTimeLisbon(days[days.length - 1], "23:59")
  const [bookings, gcalBusy] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] }, startUtc: { lt: to }, endUtc: { gt: from } },
      select: { startUtc: true, endUtc: true },
    }),
    getBusyIntervals(from, to).catch(() => [] as BusyInterval[]),
  ])
  const busy = [...gcalBusy, ...bookings.map((b) => ({ start: b.startUtc, end: b.endUtc }))]

  const perDay: { startIso: string; score: number; date: string }[] = []
  for (const day of days) {
    const slots = filterFutureSlots(
      generateSlots({ isoDate: day, location: habit.location, durationMin: habit.durationMin, busy }),
    )
    if (slots.length === 0) continue
    // Closest to the usual time; the usual weekday is worth ~3 hours of difference
    const best = slots
      .map((s) => {
        const [h, m] = formatLisbon(s, "HH:mm").split(":").map(Number)
        let score = Math.abs(h * 60 + m - habit.minutes)
        if (habit.weekday !== null && ymdDayOfWeek(day) !== habit.weekday) score += 180
        return { startIso: s.toISOString(), score, date: day }
      })
      .sort((a, b) => a.score - b.score)[0]
    perDay.push(best)
  }

  return perDay
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))
    .slice(0, SUGGESTIONS)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ startIso }) => ({ startIso, location: habit.location }))
}
