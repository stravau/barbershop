import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatLisbon } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import type { Prisma } from "@/generated/prisma"
import { DeleteCancelledButton } from "../_components/DeleteCancelledButton"
import { CityTag, Empty, FilterChips, PriceWithTip, StatusPill } from "../_components/ui"
import { BOOKED_STATUSES, NO_SHOW, bookingHref, groupBy, isDone, parseCity, received } from "../_lib"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const STATES = ["todas", "realizadas", "canceladas", "faltas"] as const
type State = (typeof STATES)[number]

interface PageProps {
  searchParams: Promise<{ estado?: string; cidade?: string }>
}

/** Past appointments, no-shows and every cancellation, newest first, grouped by month. */
export default async function HistoricoPage({ searchParams }: PageProps) {
  await requireAdmin("/admin/historico")
  const sp = await searchParams
  const state: State = STATES.includes(sp.estado as State) ? (sp.estado as State) : "todas"
  const city = parseCity(sp.cidade)
  const now = new Date()

  const done: Prisma.BookingWhereInput = { status: { in: BOOKED_STATUSES }, startUtc: { lt: now } }
  const cancelled: Prisma.BookingWhereInput = { status: "CANCELLED" }
  const noShow: Prisma.BookingWhereInput = { status: NO_SHOW }
  const where: Prisma.BookingWhereInput = {
    ...(city ? { location: city } : {}),
    ...(state === "realizadas"
      ? done
      : state === "canceladas"
        ? cancelled
        : state === "faltas"
          ? noShow
          : { OR: [done, cancelled, noShow] }),
  }

  const [bookings, cancelledCount] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { client: true },
      orderBy: { startUtc: "desc" },
      take: 500,
    }),
    prisma.booking.count({ where: cancelled }),
  ])

  const months = groupBy(bookings, (b) => formatLisbon(b.startUtc, "yyyy-MM"))
  const href = (s: State, c?: string) => {
    const q = new URLSearchParams()
    if (s !== "todas") q.set("estado", s)
    if (c) q.set("cidade", c)
    const qs = q.toString()
    return `/admin/historico${qs ? `?${qs}` : ""}`
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <FilterChips
            options={[
              { href: href("todas", city), label: "Todas", active: state === "todas" },
              { href: href("realizadas", city), label: "Realizadas", active: state === "realizadas" },
              { href: href("canceladas", city), label: "Canceladas", active: state === "canceladas" },
              { href: href("faltas", city), label: "Faltas", active: state === "faltas" },
            ]}
          />
          <FilterChips
            options={[
              { href: href(state), label: "Todas as cidades", active: !city },
              { href: href(state, "setubal"), label: "Setúbal", active: city === "setubal" },
              { href: href(state, "lisboa"), label: "Lisboa", active: city === "lisboa" },
            ]}
          />
        </div>
        {state !== "realizadas" && <DeleteCancelledButton count={cancelledCount} />}
      </div>

      {bookings.length === 0 ? (
        <Empty>Nada no histórico com estes filtros.</Empty>
      ) : (
        // One collapsible block per month; the two most recent start open
        [...months].map(([key, items], monthIdx) => {
          const realized = items.filter((b) => isDone(b, now))
          const cancelledInMonth = items.filter((b) => b.status === "CANCELLED").length
          const noShowsInMonth = items.filter((b) => b.status === NO_SHOW).length
          const tipsInMonth = realized.reduce((s, b) => s + b.tipEur, 0)
          return (
            <details key={key} open={monthIdx < 2} className="group mb-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-1.5 [&::-webkit-details-marker]:hidden">
                <h2 className="flex items-center gap-2 text-xl sm:text-2xl">
                  <ChevronRight className="h-5 w-5 shrink-0 transition group-open:rotate-90" />
                  {formatLisbon(items[0].startUtc, "MMMM 'de' yyyy")}
                </h2>
                <span className="text-sm text-muted">
                  {realized.length} realizadas ·{" "}
                  <strong className="text-ink">
                    {formatPrice(realized.reduce((s, b) => s + received(b), 0))}
                  </strong>
                  {tipsInMonth > 0 && <> (inclui {formatPrice(tipsInMonth)} de gorjetas)</>}
                  {cancelledInMonth > 0 && <> · {cancelledInMonth} canceladas</>}
                  {noShowsInMonth > 0 && <> · {noShowsInMonth} {noShowsInMonth === 1 ? "falta" : "faltas"}</>}
                </span>
              </summary>
              <ul className="divide-y divide-ink/10">
                {items.map((b) => {
                  // Neither counts in the takings
                  const isCancelled = b.status === "CANCELLED" || b.status === NO_SHOW
                  return (
                    <li key={b.id} className="flex items-center gap-3 py-2">
                      <span className="w-[4.5rem] shrink-0 text-sm tabular-nums">
                        <span className="block font-semibold">
                          {formatLisbon(b.startUtc, "EEE, dd")}
                        </span>
                        <span className="text-muted">{formatLisbon(b.startUtc, "HH:mm")}</span>
                      </span>
                      <Link href={bookingHref(b)} className="min-w-0 flex-1 hover:underline">
                        <span className={isCancelled ? "text-muted line-through" : "font-semibold"}>
                          {b.client.name}
                        </span>
                        <span className="block text-sm text-muted">{b.serviceName}</span>
                      </Link>
                      {!city && (
                        <span className="hidden sm:block">
                          <CityTag location={b.location} />
                        </span>
                      )}
                      {isCancelled ? (
                        <span className="w-16 shrink-0 text-right text-muted tabular-nums line-through">
                          {formatPrice(b.servicePrice)}
                        </span>
                      ) : (
                        <PriceWithTip
                          price={b.servicePrice}
                          tip={b.tipEur}
                          className="min-w-16 shrink-0 text-right"
                        />
                      )}
                      <span className="hidden w-24 text-right sm:block">
                        <StatusPill status={b.status} done={isDone(b, now)} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })
      )}
      {bookings.length === 500 && (
        <p className="text-center text-sm text-muted">A mostrar as 500 mais recentes.</p>
      )}
    </main>
  )
}
