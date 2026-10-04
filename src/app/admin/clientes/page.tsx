import Link from "next/link"
import { ChevronRight, Search } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatLisbon, lisbonPeriods } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import type { Prisma } from "@/generated/prisma"
import { cn } from "@/lib/utils"
import { ContactLinks } from "../_components/ContactLinks"
import { FlashBanner } from "../_components/FlashBanner"
import { DeleteClientButton } from "./DeleteClientButton"
import { Empty, FilterChips, Stat } from "../_components/ui"
import { isDone } from "../_lib"
import { findDuplicates } from "@/lib/clients"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

const ORDERS = ["recentes", "visitas", "nome"] as const
type Order = (typeof ORDERS)[number]

interface PageProps {
  searchParams: Promise<{ q?: string; ordem?: string; apagado?: string }>
}

/**
 * Client list. Visits, spend and the loyalty card are derived from the
 * bookings made on the site (a past confirmed booking counts as a visit).
 */
export default async function ClientesPage({ searchParams }: PageProps) {
  await requireAdmin("/admin/clientes")
  const sp = await searchParams
  const q = (sp.q ?? "").trim()
  const order: Order = ORDERS.includes(sp.ordem as Order) ? (sp.ordem as Order) : "recentes"
  const now = new Date()
  const p = lisbonPeriods(now)

  const digits = q.replace(/\D/g, "")
  const search: Prisma.ClientWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          ...(digits ? [{ phone: { contains: digits } }] : []),
        ],
      }
    : {}

  const [clients, total, newThisMonth] = await Promise.all([
    prisma.client.findMany({
      where: search,
      include: { bookings: { select: { startUtc: true, status: true, servicePrice: true } } },
    }),
    prisma.client.count(),
    prisma.client.count({ where: { createdAt: { gte: p.monthStart } } }),
  ])

  // Repeated clients (only worth computing over the full list, not a search)
  const duplicates = q
    ? null
    : findDuplicates(clients.map((c) => ({ ...c, bookingCount: c.bookings.length })))
  const duplicateCount = duplicates
    ? duplicates.sure.reduce((n, g) => n + g.clients.length - 1, 0) + duplicates.probable.length
    : 0

  const rows = clients.map((c) => {
    const done = c.bookings.filter((b) => isDone(b, now))
    const next = c.bookings
      .filter((b) => b.startUtc >= now && (b.status === "CONFIRMED" || b.status === "PENDING"))
      .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime())[0]
    return {
      ...c,
      visits: done.length,
      spent: done.reduce((s, b) => s + b.servicePrice, 0),
      lastVisit: done.reduce<Date | null>((m, b) => (!m || b.startUtc > m ? b.startUtc : m), null),
      next: next?.startUtc ?? null,
      cancelled: c.bookings.filter((b) => b.status === "CANCELLED").length,
    }
  })

  rows.sort((a, b) =>
    order === "nome"
      ? a.name.localeCompare(b.name, "pt")
      : order === "visitas"
        ? b.visits - a.visits || a.name.localeCompare(b.name, "pt")
        : (b.lastVisit?.getTime() ?? 0) - (a.lastVisit?.getTime() ?? 0),
  )

  const href = (o: Order) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (o !== "recentes") params.set("ordem", o)
    const qs = params.toString()
    return `/admin/clientes${qs ? `?${qs}` : ""}`
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

      {sp.apagado && (
        <FlashBanner
          text={`${sp.apagado} foi apagado, com as marcações dele.`}
          tone="muted"
          clearParams={["apagado"]}
        />
      )}

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Clientes" value={String(total)} />
        <Stat label="Novos este mês" value={String(newThisMonth)} />
        <Stat
          label="Já vieram"
          value={String(rows.filter((r) => r.visits > 0).length)}
          sub={q ? "na pesquisa" : undefined}
        />
      </div>

      {duplicateCount > 0 && (
        <Link
          href="/admin/clientes/duplicados"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border-2 border-ink bg-yellow/30 px-4 py-3 font-semibold shadow-[3px_3px_0_var(--ink)] hover:bg-yellow/50"
        >
          <span>
            {duplicateCount} {duplicateCount === 1 ? "cliente parece repetido" : "clientes parecem repetidos"}
          </span>
          <span className="caps inline-flex items-center gap-1 text-sm">
            Rever e juntar <ChevronRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form action="/admin/clientes" className="flex w-full max-w-sm items-center gap-2">
          {order !== "recentes" && <input type="hidden" name="ordem" value={order} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Nome ou telemóvel"
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn btn-sm">
            Procurar
          </button>
        </form>
        <FilterChips
          options={[
            { href: href("recentes"), label: "Última visita", active: order === "recentes" },
            { href: href("visitas"), label: "Mais visitas", active: order === "visitas" },
            { href: href("nome"), label: "Nome", active: order === "nome" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <Empty>{q ? `Nenhum cliente encontrado para “${q}”.` : "Ainda não há clientes."}</Empty>
      ) : (
        <ul className="divide-y divide-ink/10 border-y-2 border-ink">
          <li className="caps hidden gap-4 py-2 text-xs text-muted sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_16.5rem]">
            <span>Cliente</span>
            <span>Visitas · cartão</span>
            <span>Última visita</span>
            <span>Próxima</span>
            <span className="text-right">Contacto</span>
          </li>
          {rows.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-2 items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_16.5rem]"
            >
              <div className="col-span-2 min-w-0 sm:col-span-1">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm break-words text-muted">
                  {c.email ?? "sem email"}
                  {c.spent > 0 && <> · {formatPrice(c.spent)} no total</>}
                  {c.cancelled > 0 && <> · {c.cancelled} cancel.</>}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-semibold">{c.visits}</span>{" "}
                <span className="text-muted">{c.visits === 1 ? "visita" : "visitas"}</span>
                <LoyaltyBadge visits={c.visits} />
              </div>
              <div className="text-sm">
                <span className="text-muted sm:hidden">Última: </span>
                {c.lastVisit ? formatLisbon(c.lastVisit, "dd/MM/yyyy") : "—"}
              </div>
              <div className={cn("text-sm", c.next && "font-semibold")}>
                <span className="font-normal text-muted sm:hidden">Próxima: </span>
                {c.next ? formatLisbon(c.next, "dd/MM 'às' HH:mm") : "—"}
              </div>
              <div className="flex items-center gap-1 sm:justify-end">
                <ContactLinks phone={c.phone} showNumber />
                <DeleteClientButton id={c.id} name={c.name} bookingCount={c.bookings.length} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-muted">
        Visitas e cartão contam só as marcações feitas pelo site. O cartão é
        válido apenas para o primeiro: ao sexto corte, é grátis.
      </p>
    </main>
  )
}

function LoyaltyBadge({ visits }: { visits: number }) {
  if (visits === 0) return null
  const label = visits >= 6 ? "cartão completo" : visits === 5 ? "5/6 · próximo grátis" : `${visits}/6`
  return (
    <span
      className={cn(
        "caps ml-1.5 inline-block rounded px-1.5 py-0.5 text-[0.7rem]",
        visits === 5 ? "bg-yellow ring-1 ring-ink" : "bg-ink/10",
      )}
    >
      {label}
    </span>
  )
}
