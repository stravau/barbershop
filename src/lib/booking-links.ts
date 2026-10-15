// Links straight to a free time, and how it reads on a ticket. Browser-safe.

import { ymdPlusDays } from "./schedule"
import { formatLisbon, lisbonPeriods } from "./tz"

/** The booking at its last step ("Confirmar") with this time already picked. */
export function slotBookingHref(slot: { services: readonly string[]; location: string; startIso: string }): string {
  const q = new URLSearchParams({
    services: slot.services.join(","),
    cidade: slot.location,
    dia: formatLisbon(new Date(slot.startIso), "yyyy-MM-dd"),
    hora: slot.startIso,
    passo: "confirmar",
  })
  return `/marcar?${q}`
}

/** "hoje", "amanhã" or "ter 14/10" — short enough for a ticket stub. */
export function shortWhen(startIso: string, now = new Date()): string {
  const d = new Date(startIso)
  const ymd = formatLisbon(d, "yyyy-MM-dd")
  const { today } = lisbonPeriods(now)
  if (ymd === today) return "hoje"
  if (ymd === ymdPlusDays(today, 1)) return "amanhã"
  return formatLisbon(d, "EEE dd/MM").toLowerCase()
}
