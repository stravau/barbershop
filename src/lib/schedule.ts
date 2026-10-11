export type LocationId = "lisboa" | "setubal"

// Street addresses deliberately don't live here — this module ships to the
// browser. See lib/addresses.ts.
export interface Location {
  id: LocationId
  name: string
}

// Listed in the order the week runs (Setúbal on weekdays, then Lisboa) —
// this is the order the site shows them in.
export const LOCATIONS: readonly Location[] = [
  { id: "setubal", name: "Setúbal" },
  { id: "lisboa", name: "Lisboa" },
] as const

export interface WorkingHours {
  start: string // "HH:mm" Lisbon local
  end: string
}

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

/**
 * Weekly schedule per location, in Europe/Lisbon local time: the periods a
 * day is open for bookings, in order. Days not listed = closed.
 *
 * Setúbal (weekdays) is the free time around the barber's classes this
 * semester, within 08:00–21:00. Classes: Mon 08:30–10:00 and 10:30–13:30;
 * Tue 08:30–11:30; Wed 14:00–18:30; Thu 11:30–13:00; Fri 09:00–10:30,
 * 11:00–12:30 and 13:30–15:00.
 */
export const SCHEDULE: Record<LocationId, Partial<Record<DayOfWeek, WorkingHours[]>>> = {
  setubal: {
    1: [h("08:00", "08:30"), h("10:00", "10:30"), h("13:30", "21:00")], // Mon
    2: [h("08:00", "08:30"), h("11:30", "21:00")], // Tue
    3: [h("08:00", "14:00"), h("18:30", "21:00")], // Wed
    4: [h("08:00", "11:30"), h("13:00", "21:00")], // Thu
    // Fri: travels to Lisboa after the last class (see FRIDAY_TRAVEL_BLOCK)
    5: [h("08:00", "09:00"), h("10:30", "11:00"), h("12:30", "13:30")],
  },
  lisboa: {
    // Friday starts 17:00 (NOT 16:30) — travel buffer for Setúbal->Lisboa drive on Friday afternoons.
    // The 15:00-17:00 window is implicitly blocked on Fridays (see slots.ts FRIDAY_TRAVEL_BLOCK).
    5: [h("17:00", "20:00")], // Fri
    6: [h("10:00", "12:30")], // Sat
  },
}

function h(start: string, end: string): WorkingHours {
  return { start, end }
}

/** How far ahead a booking can be made (days). */
export const BOOKING_WINDOW_DAYS = 60
/** The earliest a booking can start, in minutes from now (the barber confirms by hand). */
export const MIN_NOTICE_MIN = 60

/**
 * Defense-in-depth: even if SCHEDULE is edited, slot generator MUST honour these on Fridays.
 */
export const FRIDAY_TRAVEL_BLOCK = {
  setubalLatestEnd: "15:00",
  lisboaEarliestStart: "17:00",
} as const

/** The day's open periods, in order (empty when closed). */
export function getWorkingHours(location: LocationId, dayOfWeek: DayOfWeek): WorkingHours[] {
  return SCHEDULE[location][dayOfWeek] ?? []
}

export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id)
}

/** True if the location has working hours configured for that day of week. */
export function isLocationOpenOn(
  location: LocationId,
  dayOfWeek: DayOfWeek,
): boolean {
  return (SCHEDULE[location][dayOfWeek]?.length ?? 0) > 0
}

// ---------- display helpers ----------

/** Monday-first week, the way it's read in Portugal. */
const WEEK: readonly DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT: Record<DayOfWeek, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
}

/** "12:00" -> "12h", "12:30" -> "12h30" */
export function formatHour(hhmm: string): string {
  const [h, m] = hhmm.split(":")
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`
}

export interface WeekDayHours {
  dow: DayOfWeek
  day: string
  /** e.g. ["8h–8h30", "13h30–21h"]; empty when closed */
  hours: string[]
}

/** Opening hours for a location, Monday → Sunday (closed days included). */
export function weeklyHours(location: LocationId): WeekDayHours[] {
  return WEEK.map((dow) => {
    return {
      dow,
      day: DAY_SHORT[dow],
      // word joiners keep "15h–20h" from wrapping at the dash
      hours: getWorkingHours(location, dow).map((wh) => `${formatHour(wh.start)}⁠–⁠${formatHour(wh.end)}`),
    }
  })
}

/**
 * Opening hours with consecutive same-hours days merged and closed days left
 * out, e.g. Setúbal -> [{ days: "Seg–Ter", hours: "12h–20h" }, { days: "Qua", … }]
 */
export function groupedWeeklyHours(
  location: LocationId,
): { days: string; hours: string[] }[] {
  const groups: { first: string; last: string; hours: string[] }[] = []
  let prevHours: string | null = null
  for (const d of weeklyHours(location)) {
    const key = d.hours.join(" ")
    const last = groups[groups.length - 1]
    if (key && key === prevHours) last.last = d.day
    else if (key) groups.push({ first: d.day, last: d.day, hours: d.hours })
    prevHours = key || null
  }
  return groups.map((g) => ({
    days: g.first === g.last ? g.first : `${g.first}–${g.last}`,
    hours: g.hours,
  }))
}

/** Open days as short text: "Seg–Sex", "Sex e Sáb", "Seg, Qua e Sex". */
export function openDaysSummary(location: LocationId): string {
  const idx = WEEK.flatMap((dow, i) => (isLocationOpenOn(location, dow) ? [i] : []))
  if (idx.length === 0) return ""
  const names = idx.map((i) => DAY_SHORT[WEEK[i]])
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1)
  if (consecutive && idx.length > 2) return `${names[0]}–${names[names.length - 1]}`
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`
}

/** Calendar arithmetic on YYYY-MM-DD strings: ymdPlusDays("2026-09-30", 1) -> "2026-10-01" */
export function ymdPlusDays(yyyymmdd: string, days: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d + days))
  const yy = probe.getUTCFullYear()
  const mm = String(probe.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(probe.getUTCDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/** Day of week of a YYYY-MM-DD calendar date (0 = Sunday). */
export function ymdDayOfWeek(yyyymmdd: string): DayOfWeek {
  const [y, m, d] = yyyymmdd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as DayOfWeek
}

/**
 * The YYYY-MM-DD dates on which the location is open, from `fromYmd`
 * (inclusive) through `days` days later.
 */
export function upcomingOpenDates(
  location: LocationId,
  fromYmd: string,
  days: number,
): string[] {
  const out: string[] = []
  for (let i = 0; i <= days; i++) {
    const ymd = ymdPlusDays(fromYmd, i)
    if (isLocationOpenOn(location, ymdDayOfWeek(ymd))) out.push(ymd)
  }
  return out
}
