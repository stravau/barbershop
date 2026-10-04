import { prisma } from "@/lib/prisma"
import { formatPrice } from "@/lib/services"
import { combineDateTimeLisbon, formatLisbon, lisbonPeriods } from "@/lib/tz"
import type { Prisma } from "@/generated/prisma"
import { SectionTitle, Stat } from "../_components/ui"
import { BOOKED_STATUSES, cityName, groupBy, received } from "../_lib"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/**
 * Numbers. "Faturado" only counts appointments that already happened;
 * confirmed bookings still ahead are shown separately as "previsto".
 * All periods follow Lisbon time.
 */
export default async function NumerosPage() {
  await requireAdmin("/admin/dashboard")
  const now = new Date()
  const p = lisbonPeriods(now)
  const [y, m] = p.today.split("-").map(Number)
  const sixMonthsAgo = combineDateTimeLisbon(
    new Date(Date.UTC(y, m - 6, 1)).toISOString().slice(0, 10),
    "00:00",
  )

  const booked = { in: BOOKED_STATUSES }
  // Already happened, within [from, min(to, now))
  const doneIn = (from: Date, to?: Date): Prisma.BookingWhereInput => ({
    status: booked,
    startUtc: { gte: from, lt: to && to < now ? to : now },
  })
  // Confirmed and still ahead, within [now, to)
  const aheadUntil = (to: Date): Prisma.BookingWhereInput => ({
    status: booked,
    startUtc: { gte: now, lt: to },
  })
  const sumOf = { _sum: { servicePrice: true, tipEur: true }, _count: true } as const

  const [
    today,
    week,
    month,
    year,
    allTime,
    weekAhead,
    monthAhead,
    lastSixMonths,
    byCity,
    byService,
    cancelledMonth,
    bookedMonth,
    clientsTotal,
    clientsNew,
    topClientIds,
  ] = await Promise.all([
    prisma.booking.aggregate({ where: doneIn(p.dayStart, p.dayEnd), ...sumOf }),
    prisma.booking.aggregate({ where: doneIn(p.weekStart, p.weekEnd), ...sumOf }),
    prisma.booking.aggregate({ where: doneIn(p.monthStart, p.monthEnd), ...sumOf }),
    prisma.booking.aggregate({ where: doneIn(p.yearStart, p.yearEnd), ...sumOf }),
    prisma.booking.aggregate({ where: { status: booked, startUtc: { lt: now } }, ...sumOf }),
    prisma.booking.aggregate({ where: aheadUntil(p.weekEnd), ...sumOf }),
    prisma.booking.aggregate({ where: aheadUntil(p.monthEnd), ...sumOf }),
    prisma.booking.findMany({
      where: doneIn(sixMonthsAgo),
      select: { startUtc: true, servicePrice: true, tipEur: true },
      orderBy: { startUtc: "asc" },
    }),
    prisma.booking.groupBy({
      by: ["location"],
      where: doneIn(p.yearStart, p.yearEnd),
      _count: true,
      _sum: { servicePrice: true, tipEur: true },
    }),
    prisma.booking.groupBy({
      by: ["serviceName"],
      where: doneIn(p.yearStart, p.yearEnd),
      _count: true,
      _sum: { servicePrice: true },
      orderBy: { _count: { serviceName: "desc" } },
      take: 6,
    }),
    prisma.booking.count({
      where: { status: "CANCELLED", startUtc: { gte: p.monthStart, lt: p.monthEnd } },
    }),
    prisma.booking.count({
      where: { status: booked, startUtc: { gte: p.monthStart, lt: p.monthEnd } },
    }),
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: p.monthStart } } }),
    prisma.booking.groupBy({
      by: ["clientId"],
      where: { status: booked, startUtc: { lt: now } },
      _count: true,
      orderBy: { _count: { clientId: "desc" } },
      take: 5,
    }),
  ])

  const topClients = await prisma.client.findMany({
    where: { id: { in: topClientIds.map((t) => t.clientId) } },
    select: { id: true, name: true },
  })
  const nameById = new Map(topClients.map((c) => [c.id, c.name]))

  const months = [...groupBy(lastSixMonths, (b) => formatLisbon(b.startUtc, "yyyy-MM"))].map(
    ([key, items]) => ({
      key,
      label: formatLisbon(items[0].startUtc, "MMMM"),
      count: items.length,
      total: items.reduce((s, b) => s + received(b), 0),
    }),
  )
  const maxMonth = Math.max(1, ...months.map((mo) => mo.total))

  const monthTotal = cancelledMonth + bookedMonth
  const cancelRate = monthTotal > 0 ? Math.round((cancelledMonth / monthTotal) * 100) : 0
  // Received = service prices + tips
  type Sums = { _sum: { servicePrice: number | null; tipEur?: number | null } }
  const money = (a: Sums) => formatPrice((a._sum.servicePrice ?? 0) + (a._sum.tipEur ?? 0))
  const tips = (a: Sums) =>
    (a._sum.tipEur ?? 0) > 0 ? <><br />inclui {formatPrice(a._sum.tipEur ?? 0)} gorjetas</> : null
  const cuts = (a: { _count: number }) => `${a._count} ${a._count === 1 ? "marcação" : "marcações"}`

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

      <section className="mb-10">
        <SectionTitle aside="Só marcações que já aconteceram">Faturado</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Hoje" value={money(today)} sub={<>{cuts(today)}{tips(today)}</>} />
          <Stat
            label="Esta semana"
            value={money(week)}
            sub={<>{cuts(week)}{tips(week)}<br />+ {money(weekAhead)} previsto</>}
          />
          <Stat
            label={formatLisbon(now, "MMMM")}
            value={money(month)}
            sub={<>{cuts(month)}{tips(month)}<br />+ {money(monthAhead)} previsto</>}
            highlight
          />
          <Stat label={`Ano ${y}`} value={money(year)} sub={<>{cuts(year)}{tips(year)}</>} />
          <Stat label="Desde sempre" value={money(allTime)} sub={<>{cuts(allTime)}{tips(allTime)}</>} />
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle>Últimos meses</SectionTitle>
        {months.length === 0 ? (
          <p className="text-muted">Ainda sem dados.</p>
        ) : (
          <ul className="space-y-2">
            {months.map((mo) => (
              <li key={mo.key} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
                <span className="caps text-sm">{mo.label}</span>
                <span className="h-6 rounded border-2 border-ink/15 bg-card">
                  <span
                    className="block h-full rounded-sm bg-yellow"
                    style={{ width: `${(mo.total / maxMonth) * 100}%` }}
                  />
                </span>
                <span className="w-36 text-right text-sm tabular-nums">
                  <strong>{formatPrice(mo.total)}</strong>{" "}
                  <span className="text-muted">· {mo.count}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
        <section>
          <SectionTitle aside={`Ano ${y}`}>Por cidade</SectionTitle>
          <Table
            rows={byCity.map((r) => ({
              label: cityName(r.location),
              count: r._count,
              total: (r._sum.servicePrice ?? 0) + (r._sum.tipEur ?? 0),
            }))}
          />
        </section>

        <section>
          <SectionTitle aside={`Ano ${y}`}>Serviços mais pedidos</SectionTitle>
          <Table
            rows={byService.map((r) => ({
              label: r.serviceName,
              count: r._count,
              total: r._sum.servicePrice ?? 0,
            }))}
          />
        </section>

        <section>
          <SectionTitle aside={`${clientsTotal} no total · ${clientsNew} novos este mês`}>
            Clientes mais fiéis
          </SectionTitle>
          {topClientIds.length === 0 ? (
            <p className="text-muted">Ainda sem visitas.</p>
          ) : (
            <ol className="divide-y divide-ink/10 border-y-2 border-ink">
              {topClientIds.map((t, i) => (
                <li key={t.clientId} className="flex items-center justify-between py-2">
                  <span>
                    <span className="mr-2 text-muted tabular-nums">{i + 1}.</span>
                    {nameById.get(t.clientId) ?? "—"}
                  </span>
                  <span className="tabular-nums">
                    {t._count} {t._count === 1 ? "visita" : "visitas"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <SectionTitle aside={formatLisbon(now, "MMMM")}>Cancelamentos</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Taxa" value={`${cancelRate}%`} />
            <Stat
              label="Canceladas"
              value={String(cancelledMonth)}
              sub={`de ${monthTotal} marcações`}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function Table({ rows }: { rows: { label: string; count: number; total: number }[] }) {
  if (rows.length === 0) return <p className="text-muted">Ainda sem dados.</p>
  return (
    <ul className="divide-y divide-ink/10 border-y-2 border-ink">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center justify-between gap-3 py-2">
          <span>{r.label}</span>
          <span className="tabular-nums">
            <strong>{formatPrice(r.total)}</strong>{" "}
            <span className="text-muted">· {r.count}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
