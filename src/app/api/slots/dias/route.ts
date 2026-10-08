import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildCombo, parseServicesParam, validateSelection } from "@/lib/services"
import { busyBetween, freeSlotsWith } from "@/lib/availability"
import { BOOKING_WINDOW_DAYS, upcomingOpenDates } from "@/lib/schedule"
import { getLisbonDayBounds, lisbonPeriods } from "@/lib/tz"

const querySchema = z.object({
  location: z.enum(["lisboa", "setubal"]),
  services: z.string().min(1),
})

/**
 * GET /api/slots/dias?location=setubal&services=corte,barba
 *
 * How many free times each open day of the booking window has, so the day
 * picker can show the full days as full: { days: { "2026-10-12": 9, … } }.
 */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

  const itemIds = parseServicesParam(parsed.data.services)
  if (!validateSelection(itemIds).ok) return NextResponse.json({ error: "Invalid services" }, { status: 400 })
  const { durationMin } = buildCombo(itemIds)
  const { location } = parsed.data

  const now = new Date()
  const dates = upcomingOpenDates(location, lisbonPeriods(now).today, BOOKING_WINDOW_DAYS)
  if (dates.length === 0) return NextResponse.json({ days: {} })

  // One look at the agenda for the whole window
  const busy = await busyBetween(
    getLisbonDayBounds(dates[0]).startUtc,
    getLisbonDayBounds(dates[dates.length - 1]).endUtc,
  )
  const days = Object.fromEntries(
    dates.map((d) => [d, freeSlotsWith(busy, location, d, durationMin, now).length]),
  )
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } })
}
