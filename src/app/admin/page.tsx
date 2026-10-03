import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { combineDateTimeLisbon, formatLisbon, lisbonPeriods } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import { LOCATIONS, isLocationOpenOn, ymdDayOfWeek, ymdPlusDays } from "@/lib/schedule"
import { cn } from "@/lib/utils"
import { AdminNav } from "./_components/AdminNav"
import { ContactLinks } from "./_components/ContactLinks"
import { MonthCalendar, monthGrid } from "./_components/MonthCalendar"
import { CityTag, FilterChips, SectionTitle, Stat, StatusPill } from "./_components/ui"
import {
  BOOKED_STATUSES,
  bookingHref,
  groupBy,
  parseCity,
  relativeDay,
  type BookingWithClient,
} from "./_lib"

export const dynamic = "force-dynamic"

/** Confirmed bookings listed under "Próximas marcações" (pending ones are all shown). */
const UPCOMING_CONFIRMED = 10
/** …of which this many are shown on phones. */
const UPCOMING_ON_PHONES = 4

interface PageProps {
  searchParams: Promise<{
    cidade?: string
    mes?: string
    dia?: string
    flash?: string
    code?: string
  }>
}

/**
 * Admin landing page: requests waiting for a decision first, then a month
 * calendar of the agenda with the selected day's full list beside it.
 */
export default async function AgendaPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const city = parseCity(sp.cidade)
  const byCity = city ? { location: city } : {}
  const now = new Date()
  const p = lisbonPeriods(now)

  // Calendar month (?mes=YYYY-MM) and selected day (?dia=YYYY-MM-DD)
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : p.today.slice(0, 7)
  const grid = monthGrid(month).days
  const gridFrom = combineDateTimeLisbon(grid[0], "00:00")
  const gridTo = combineDateTimeLisbon(ymdPlusDays(grid[grid.length - 1], 1), "00:00")

  const [pending, nextConfirmed, monthBookings, today, week] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "PENDING", ...byCity },
      include: { client: true },
      orderBy: { startUtc: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: { in: BOOKED_STATUSES }, startUtc: { gte: now }, ...byCity },
      include: { client: true },
      orderBy: { startUtc: "asc" },
      take: UPCOMING_CONFIRMED,
    }),
    prisma.booking.findMany({
      where: {
        status: { in: [...BOOKED_STATUSES, "PENDING"] },
        startUtc: { gte: gridFrom, lt: gridTo },
        ...byCity,
      },
      include: { client: true },
      orderBy: { startUtc: "asc" },
    }),
    prisma.booking.aggregate({
      where: { status: { in: BOOKED_STATUSES }, startUtc: { gte: p.dayStart, lt: p.dayEnd }, ...byCity },
      _sum: { servicePrice: true },
      _count: true,
    }),
    prisma.booking.aggregate({
      where: {
        status: { in: BOOKED_STATUSES },
        startUtc: { gte: p.weekStart, lt: p.weekEnd },
        ...byCity,
      },
      _sum: { servicePrice: true },
      _count: true,
    }),
  ])

  const byDay = groupBy(monthBookings, (b) => formatLisbon(b.startUtc, "yyyy-MM-dd"))
  // Default day: today in the current month, otherwise the month's first busy day
  const selected =
    sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) && grid.includes(sp.dia)
      ? sp.dia
      : month === p.today.slice(0, 7)
        ? p.today
        : (grid.find((d) => d.startsWith(month) && byDay.has(d)) ?? `${month}-01`)
  const dayItems = byDay.get(selected) ?? []
  const cities = city ? [city] : LOCATIONS.map((l) => l.id)
  // Every pending request (they need an answer) plus the next confirmed ones
  const upcoming = [...pending, ...nextConfirmed].sort(
    (a, b) => a.startUtc.getTime() - b.startUtc.getTime(),
  )

  const href = (params: { city?: string; month?: string; day?: string }) => {
    const q = new URLSearchParams()
    if (params.city) q.set("cidade", params.city)
    if (params.month && params.month !== p.today.slice(0, 7)) q.set("mes", params.month)
    if (params.day) q.set("dia", params.day)
    const qs = q.toString()
    return `/admin${qs ? `?${qs}` : ""}`
  }
  // City filter keeps the month/day being looked at
  const cityHref = (c?: string) => href({ city: c, month, day: selected })

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav active="agenda" />

      {sp.flash && <FlashBanner flash={sp.flash} code={sp.code} />}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat
          label="Hoje"
          value={String(today._count)}
          sub={`marcações · ${formatPrice(today._sum.servicePrice ?? 0)}`}
        />
        <Stat
          label="Esta semana"
          value={String(week._count)}
          sub={`marcações · ${formatPrice(week._sum.servicePrice ?? 0)}`}
        />
        <Stat
          label="Por confirmar"
          value={String(pending.length)}
          sub={pending.length > 0 ? "à espera de resposta" : "tudo respondido"}
          highlight={pending.length > 0}
        />
      </div>

      <div className="mb-8">
        <FilterChips
          options={[
            { href: cityHref(), label: "Todas as cidades", active: !city },
            { href: cityHref("setubal"), label: "Setúbal", active: city === "setubal" },
            { href: cityHref("lisboa"), label: "Lisboa", active: city === "lisboa" },
          ]}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        {/* Left: calendar, with the selected day's bookings underneath */}
        <div>
          <MonthCalendar
            month={month}
            byDay={byDay}
            today={p.today}
            selected={selected}
            cities={cities}
            hrefFor={({ month: m, day }) => href({ city, month: m, day })}
          />
          <DayPanel
            day={selected}
            items={dayItems}
            today={p.today}
            now={now}
            showCity={!city}
            open={cities.some((c) => isLocationOpenOn(c, ymdDayOfWeek(selected)))}
          />
        </div>

        {/* Right: what's coming up; first on phones so requests are seen */}
        <section className="order-first lg:order-none">
          <SectionTitle
            aside={pending.length > 0 ? `${pending.length} por confirmar` : undefined}
          >
            Próximas marcações
          </SectionTitle>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-muted">Sem marcações à frente.</p>
          ) : (
            <ul className="space-y-2.5">
              {upcoming.map((b) => {
                // On phones keep the list short (the calendar sits below it):
                // every request, but only the next few confirmed bookings
                const confirmedBefore = upcoming
                  .slice(0, upcoming.indexOf(b))
                  .filter((x) => x.status !== "PENDING").length
                const phoneHidden = b.status !== "PENDING" && confirmedBefore >= UPCOMING_ON_PHONES
                return (
                  <UpcomingItem
                    key={b.id}
                    b={b}
                    now={now}
                    today={p.today}
                    showCity={!city}
                    className={phoneHidden ? "hidden lg:block" : undefined}
                  />
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

/** Full list for the day picked in the calendar. */
function DayPanel({
  day,
  items,
  today,
  now,
  showCity,
  open,
}: {
  day: string
  items: BookingWithClient[]
  today: string
  now: Date
  showCity: boolean
  open: boolean
}) {
  const noon = new Date(`${day}T12:00:00Z`)
  const rel = relativeDay(noon, today)
  const booked = items.filter((b) => b.status !== "PENDING")
  return (
    <div className="mt-8">
      <div className="border-b-2 border-ink pb-1.5">
        <h3 className="text-xl">
          {rel && (
            <span className="caps mr-2 rounded bg-yellow px-1.5 py-0.5 align-middle text-xs ring-1 ring-ink">
              {rel}
            </span>
          )}
          {formatLisbon(noon, "EEEE, d 'de' MMMM")}
        </h3>
        {items.length > 0 && (
          <p className="mt-0.5 text-sm text-muted">
            {booked.length} {booked.length === 1 ? "marcação" : "marcações"} ·{" "}
            {formatPrice(sum(booked))}
            {items.length > booked.length && <> · {items.length - booked.length} por confirmar</>}
          </p>
        )}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-muted">
          {open ? "Sem marcações neste dia." : "Dia sem atendimento."}
        </p>
      ) : (
        <ul className="divide-y divide-ink/10">
          {items.map((b) => (
            <DayRow key={b.id} b={b} now={now} showCity={showCity} />
          ))}
        </ul>
      )}
    </div>
  )
}

function sum(bookings: { servicePrice: number }[]): number {
  return bookings.reduce((s, b) => s + b.servicePrice, 0)
}

/** One entry of "Próximas marcações"; pending requests get the actions. */
function UpcomingItem({
  b,
  now,
  today,
  showCity,
  className,
}: {
  b: BookingWithClient
  now: Date
  today: string
  showCity: boolean
  className?: string
}) {
  const pending = b.status === "PENDING"
  const past = b.startUtc < now
  const day = relativeDay(b.startUtc, today) ?? formatLisbon(b.startUtc, "EEE, d MMM")
  const action = (kind: "confirm" | "reject") =>
    `/api/admin/bookings/${b.id}/${kind}?token=${b.adminToken}&from=admin`

  return (
    <li
      className={cn(
        "rounded-lg border-2 p-3",
        pending ? "border-ink bg-yellow/25 shadow-[3px_3px_0_var(--ink)]" : "border-ink/15 bg-card",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">
          {day} · <span className="tabular-nums">{formatLisbon(b.startUtc, "HH:mm")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {showCity && <CityTag location={b.location} />}
          <span className="text-sm tabular-nums">{formatPrice(b.servicePrice)}</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link href={bookingHref(b)} className="min-w-0 truncate hover:underline">
          <span className="font-semibold">{b.client.name}</span>
          <span className="text-muted"> · {b.serviceName}</span>
        </Link>
        {!pending && <ContactLinks phone={b.client.phone} />}
      </div>
      {b.notes && <p className="truncate text-sm italic text-muted">“{b.notes}”</p>}
      {pending && (
        <>
          {past && (
            <p className="mt-1 text-sm font-semibold text-danger">
              A hora já passou sem resposta.
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {!past && (
              <a href={action("confirm")} className="btn btn-sm bg-success text-paper">
                Confirmar
              </a>
            )}
            <a
              href={action("reject")}
              className="btn-ghost border-danger px-3 py-1 text-sm text-danger hover:bg-danger/5"
            >
              Recusar
            </a>
            <span className="ml-auto">
              <ContactLinks phone={b.client.phone} />
            </span>
          </div>
        </>
      )}
    </li>
  )
}

function DayRow({
  b,
  now,
  showCity,
}: {
  b: BookingWithClient
  now: Date
  showCity: boolean
}) {
  const done = b.startUtc < now && b.status !== "PENDING"
  return (
    <li className={cn("py-2.5", done && "opacity-50")}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {formatLisbon(b.startUtc, "HH:mm")}
          <span className="text-muted">–{formatLisbon(b.endUtc, "HH:mm")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {b.status === "PENDING" && <StatusPill status="PENDING" />}
          {showCity && <CityTag location={b.location} />}
          <span className="tabular-nums">{formatPrice(b.servicePrice)}</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Link href={bookingHref(b)} className="min-w-0 hover:underline">
          <span className="font-semibold">{b.client.name}</span>
          <span className="text-muted"> · {b.serviceName}</span>
        </Link>
        <ContactLinks phone={b.client.phone} />
      </div>
      {b.notes && <p className="truncate text-sm italic text-muted">“{b.notes}”</p>}
    </li>
  )
}

function FlashBanner({ flash, code }: { flash: string; code?: string }) {
  const messages: Record<string, { tone: "success" | "danger" | "muted"; text: string }> = {
    confirmed: { tone: "success", text: "Marcação confirmada — o cliente foi avisado por email." },
    cancelled: { tone: "danger", text: "Marcação cancelada — o cliente foi avisado por email." },
    "already-confirmed": { tone: "muted", text: "Esta marcação já estava confirmada." },
    "already-cancelled": { tone: "muted", text: "Esta marcação já estava cancelada." },
    error: { tone: "danger", text: `Ocorreu um erro${code ? ` (${code})` : ""}.` },
  }
  const m = messages[flash]
  if (!m) return null
  return (
    <div
      className={cn(
        "mb-6 rounded-lg border-2 px-4 py-3 font-semibold",
        m.tone === "success" && "border-success/50 bg-success/10 text-success",
        m.tone === "danger" && "border-danger/50 bg-danger/10 text-danger",
        m.tone === "muted" && "border-ink/20 bg-card",
      )}
    >
      {m.text}
    </div>
  )
}
