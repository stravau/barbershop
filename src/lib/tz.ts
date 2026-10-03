import { fromZonedTime, toZonedTime, format as formatTz } from "date-fns-tz"
import { pt } from "date-fns/locale"

export const TZ = "Europe/Lisbon"

/**
 * Converts a UTC date to the equivalent wall-clock time in Lisbon.
 * Use the result only for display/formatting — its `.getTime()` will lie.
 */
export function utcToLisbon(utcDate: Date): Date {
  return toZonedTime(utcDate, TZ)
}

/**
 * Formats a UTC date in Europe/Lisbon timezone.
 * @param fmt - date-fns format string (e.g. "HH:mm", "dd/MM/yyyy")
 */
export function formatLisbon(date: Date, fmt: string): string {
  const out = formatTz(toZonedTime(date, TZ), fmt, { timeZone: TZ, locale: pt })
  // PT locale lowercases weekday and month ("domingo, 10 de maio"); we capitalize
  // the first letter and the word after " de " for UI consistency.
  return out
    .replace(/^([a-záéíóúâêôãõç])/, (c) => c.toUpperCase())
    .replace(/(\sde\s)([a-záéíóúâêôãõç])/g, (_m, p, c) => p + c.toUpperCase())
}

/**
 * Builds a UTC `Date` from a calendar date + time-of-day in Lisbon local time.
 * Handles DST automatically.
 *
 * @example combineDateTimeLisbon("2026-05-05", "15:00") -> Date for 14:00 UTC (during BST)
 */
export function combineDateTimeLisbon(yyyymmdd: string, hhmm: string): Date {
  // Pass the wall-clock time as an offset-less ISO string: date-fns-tz reads it
  // as Lisbon time. (A Date object would be read in the *machine's* timezone,
  // which is only right on UTC servers.)
  return fromZonedTime(`${yyyymmdd}T${hhmm}:00`, TZ)
}

/**
 * Returns the day-of-week (0=Sun..6=Sat) for a YYYY-MM-DD date in Lisbon local time.
 * Avoids DST surprises near midnight by anchoring at noon.
 */
export function getLisbonDayOfWeek(yyyymmdd: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const noonUtc = combineDateTimeLisbon(yyyymmdd, "12:00")
  return utcToLisbon(noonUtc).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Day, week (Mon–Sun), month and year boundaries in Lisbon local time, as UTC
 * instants — lower bound inclusive, upper bound exclusive. `today` is the
 * Lisbon calendar date (YYYY-MM-DD).
 */
export function lisbonPeriods(now: Date = new Date()) {
  const today = formatTz(toZonedTime(now, TZ), "yyyy-MM-dd", { timeZone: TZ })
  const [y, m, d] = today.split("-").map(Number)
  // Date.UTC normalises overflow (day 32, month 13…) before we anchor to Lisbon
  const midnight = (yy: number, mm: number, dd: number) =>
    combineDateTimeLisbon(new Date(Date.UTC(yy, mm - 1, dd)).toISOString().slice(0, 10), "00:00")
  const sinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
  return {
    today,
    dayStart: midnight(y, m, d),
    dayEnd: midnight(y, m, d + 1),
    weekStart: midnight(y, m, d - sinceMonday),
    weekEnd: midnight(y, m, d - sinceMonday + 7),
    monthStart: midnight(y, m, 1),
    monthEnd: midnight(y, m + 1, 1),
    yearStart: midnight(y, 1, 1),
    yearEnd: midnight(y + 1, 1, 1),
  }
}

/**
 * Returns the UTC start (00:00 local) and end (next-day 00:00 local) of a Lisbon date.
 * Useful for "all events on day X" queries.
 */
export function getLisbonDayBounds(yyyymmdd: string): { startUtc: Date; endUtc: Date } {
  const [y, m, d] = yyyymmdd.split("-").map(Number)
  const startUtc = combineDateTimeLisbon(yyyymmdd, "00:00")
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1))
  const nextDayStr =
    `${nextDay.getUTCFullYear()}-` +
    `${String(nextDay.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(nextDay.getUTCDate()).padStart(2, "0")}`
  const endUtc = combineDateTimeLisbon(nextDayStr, "00:00")
  return { startUtc, endUtc }
}
