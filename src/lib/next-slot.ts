// The next free time for a cut, in either city: the home page's "Próxima
// vaga" ticket (rendered with the page) and GET /api/slots/proxima.

import { buildCombo } from "./services"
import { busyBetween, freeSlotsWith } from "./availability"
import { upcomingOpenDates, ymdPlusDays, type LocationId } from "./schedule"
import { formatLisbon, getLisbonDayBounds, lisbonPeriods } from "./tz"

/** How far ahead to look for the next free cut. */
const LOOKAHEAD_DAYS = 14
const LOCATIONS: LocationId[] = ["setubal", "lisboa"]

export interface FreeSlot {
  startIso: string
  location: LocationId
  /** "hoje", "amanhã" or "terça, 14/10" */
  when: string
  time: string
  city: string
  /** "amanhã às 12:00 em Setúbal" */
  label: string
}

export async function nextFreeCut(now = new Date()): Promise<FreeSlot | null> {
  const { today } = lisbonPeriods(now)
  const { durationMin } = buildCombo(["corte"])
  const busy = await busyBetween(
    getLisbonDayBounds(today).startUtc,
    getLisbonDayBounds(ymdPlusDays(today, LOOKAHEAD_DAYS)).endUtc,
  )

  let best: { start: Date; location: LocationId } | null = null
  for (const location of LOCATIONS) {
    for (const date of upcomingOpenDates(location, today, LOOKAHEAD_DAYS)) {
      const first = freeSlotsWith(busy, location, date, durationMin, now)[0]
      if (first) {
        if (!best || first < best.start) best = { start: first, location }
        break // the first open day with room is this city's earliest
      }
    }
  }
  if (!best) return null

  const day = formatLisbon(best.start, "yyyy-MM-dd")
  const when =
    day === today
      ? "hoje"
      : day === ymdPlusDays(today, 1)
        ? "amanhã"
        : formatLisbon(best.start, "EEEE, dd/MM").replace("-feira", "").toLowerCase()
  const time = formatLisbon(best.start, "HH:mm")
  const city = best.location === "lisboa" ? "Lisboa" : "Setúbal"
  return { startIso: best.start.toISOString(), location: best.location, when, time, city, label: `${when} às ${time} em ${city}` }
}
