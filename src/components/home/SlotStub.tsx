import Link from "next/link"
import { shortWhen, slotBookingHref } from "@/lib/booking-links"

/**
 * Ticket stub: "PRÓXIMA · HOJE" over "16:00", in the green of the hero
 * ticket — a button of its own that opens that booking at its last step.
 * Beside "Marcar corte" in the sticky bar and "Marcação express" in the hero.
 */
export function SlotStub({
  slot,
  label,
}: {
  slot: { services: readonly string[]; location: string; startIso: string; time: string }
  label: string
}) {
  const when = shortWhen(slot.startIso)
  return (
    <Link
      href={slotBookingHref(slot)}
      aria-label={`${label} vaga: ${when} às ${slot.time}. Marcar`}
      className="flex h-14 shrink-0 flex-col items-center justify-center rounded-md border-2 border-ink bg-jungle px-3 leading-none text-paper shadow-[3px_3px_0_var(--ink)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--ink)]"
    >
      <span className="caps text-[0.6rem] text-yellow">
        {label} · {when}
      </span>
      <span className="font-display mt-1 text-2xl tabular-nums">{slot.time}</span>
    </Link>
  )
}
