import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { formatLisbon } from "@/lib/tz"
import { isLocationOpenOn, ymdDayOfWeek, ymdPlusDays, type LocationId } from "@/lib/schedule"
import { cn } from "@/lib/utils"
import type { BookingWithClient } from "../_lib"

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]

/** The Monday-to-Sunday weeks covering a month, as YYYY-MM-DD dates. */
export function monthGrid(month: string): { first: string; days: string[] } {
  const first = `${month}-01`
  const [y, m] = month.split("-").map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const lead = (ymdDayOfWeek(first) + 6) % 7 // days before the 1st, Monday-based
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7
  const start = ymdPlusDays(first, -lead)
  return { first, days: Array.from({ length: cells }, (_, i) => ymdPlusDays(start, i)) }
}

/** "2026-10" -> "2026-11" (delta +1) / "2026-09" (delta -1) */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}

/**
 * Month view of the agenda. Every day links to itself (`hrefFor`) so the
 * page can show that day's full list next to / below the calendar.
 */
export function MonthCalendar({
  month,
  byDay,
  today,
  selected,
  cities,
  hrefFor,
}: {
  month: string
  byDay: Map<string, BookingWithClient[]>
  today: string
  selected: string
  cities: LocationId[]
  hrefFor: (params: { month: string; day?: string }) => string
}) {
  const { first, days } = monthGrid(month)
  const label = formatLisbon(new Date(`${first}T12:00:00Z`), "MMMM 'de' yyyy")

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl">{label}</h2>
        <div className="flex items-center gap-1">
          <Link
            href={hrefFor({ month: shiftMonth(month, -1) })}
            scroll={false}
            aria-label="Mês anterior"
            className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink/20 hover:border-ink"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={hrefFor({ month: today.slice(0, 7), day: today })}
            scroll={false}
            className="caps rounded-md border-2 border-ink/20 px-3 py-1.5 text-sm hover:border-ink"
          >
            Hoje
          </Link>
          <Link
            href={hrefFor({ month: shiftMonth(month, 1) })}
            scroll={false}
            aria-label="Mês seguinte"
            className="grid h-9 w-9 place-items-center rounded-md border-2 border-ink/20 hover:border-ink"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="caps pb-1 text-center text-xs text-muted">
            {d}
          </div>
        ))}

        {days.map((ymd) => {
          const items = byDay.get(ymd) ?? []
          const inMonth = ymd.startsWith(month)
          const open = cities.some((c) => isLocationOpenOn(c, ymdDayOfWeek(ymd)))
          const isToday = ymd === today
          const isSelected = ymd === selected
          return (
            <Link
              key={ymd}
              href={hrefFor({ month: ymd.slice(0, 7), day: ymd })}
              scroll={false}
              aria-label={`${ymd}: ${items.length} marcações`}
              aria-current={isSelected ? "date" : undefined}
              className={cn(
                "flex min-h-14 flex-col rounded-md border-2 p-1 transition sm:min-h-24 sm:p-1.5",
                open ? "bg-card" : "bg-paper-dark/70",
                isSelected ? "border-ink shadow-[2px_2px_0_var(--ink)]" : "border-ink/10 hover:border-ink/40",
                !inMonth && "opacity-40",
              )}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    isToday && "rounded-full bg-yellow px-1.5 ring-1 ring-ink",
                  )}
                >
                  {Number(ymd.slice(8))}
                </span>
                {items.length > 0 && (
                  <span className="text-[0.7rem] font-semibold text-muted sm:hidden">
                    {items.length}
                  </span>
                )}
              </span>

              {/* Phones: one dot per booking */}
              <span className="mt-auto flex flex-wrap gap-0.5 sm:hidden">
                {items.slice(0, 8).map((b) => (
                  <span key={b.id} className={cn("h-1.5 w-1.5 rounded-full", tone(b, "dot"))} />
                ))}
              </span>

              {/* Larger screens: time + first name */}
              <span className="mt-1 hidden space-y-0.5 sm:block">
                {items.slice(0, 3).map((b) => (
                  <span
                    key={b.id}
                    className={cn(
                      "block truncate rounded px-1 text-[0.7rem] leading-snug",
                      tone(b, "chip"),
                    )}
                  >
                    {formatLisbon(b.startUtc, "HH:mm")} {b.client.name.split(" ")[0]}
                  </span>
                ))}
                {items.length > 3 && (
                  <span className="block px-1 text-[0.7rem] font-semibold text-muted">
                    +{items.length - 3}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <Legend className={tone(null, "chip", "setubal")}>Setúbal</Legend>
        <Legend className={tone(null, "chip", "lisboa")}>Lisboa</Legend>
        <Legend className={tone(null, "chip", undefined, true)}>Por confirmar</Legend>
        <Legend className="bg-paper-dark ring-1 ring-ink/10">Sem atendimento</Legend>
      </div>
    </div>
  )
}

/** Colour of a booking in the calendar: pending = yellow, else by city. */
function tone(
  b: BookingWithClient | null,
  kind: "dot" | "chip",
  location = b?.location,
  pending = b?.status === "PENDING",
): string {
  if (pending) return kind === "dot" ? "bg-yellow ring-1 ring-ink" : "bg-yellow ring-1 ring-ink/60"
  if (b?.status === "NO_SHOW") return kind === "dot" ? "bg-paper ring-1 ring-ink/40" : "bg-paper text-muted line-through ring-1 ring-ink/20"
  if (location === "lisboa") return kind === "dot" ? "bg-jungle" : "bg-jungle text-paper"
  return kind === "dot" ? "bg-ink/60" : "bg-ink/10"
}

function Legend({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-3 w-3 rounded-sm", className)} />
      {children}
    </span>
  )
}
