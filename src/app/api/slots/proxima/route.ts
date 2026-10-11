import { NextResponse } from "next/server"
import { buildCombo } from "@/lib/services"
import { busyBetween, freeSlotsWith } from "@/lib/availability"
import { upcomingOpenDates, ymdPlusDays, type LocationId } from "@/lib/schedule"
import { formatLisbon, getLisbonDayBounds, lisbonPeriods } from "@/lib/tz"

/** How far ahead to look for the next free cut. */
const LOOKAHEAD_DAYS = 14
const LOCATIONS: LocationId[] = ["setubal", "lisboa"]

/**
 * GET /api/slots/proxima — the next free time for a cut, in either city, for
 * the home page ("Próxima vaga: hoje às 16:00 em Setúbal").
 * { slot: { startIso, location, label } } or { slot: null }.
 */
export async function GET() {
  const now = new Date()
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

  if (!best) return NextResponse.json({ slot: null }, { headers: { "Cache-Control": "no-store" } })

  const day = formatLisbon(best.start, "yyyy-MM-dd")
  const when =
    day === today
      ? "hoje"
      : day === ymdPlusDays(today, 1)
        ? "amanhã"
        : formatLisbon(best.start, "EEEE, dd/MM").replace("-feira", "").toLowerCase()
  return NextResponse.json(
    {
      slot: {
        startIso: best.start.toISOString(),
        location: best.location,
        label: `${when} às ${formatLisbon(best.start, "HH:mm")} em ${best.location === "lisboa" ? "Lisboa" : "Setúbal"}`,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
