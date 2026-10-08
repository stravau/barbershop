import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/admin-auth"
import { formatLisbon } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import { stamps } from "@/lib/loyalty"
import { cn } from "@/lib/utils"
import { BackLink } from "@/components/BackLink"
import { ContactLinks } from "../../_components/ContactLinks"
import { CityTag, Empty, LoyaltyBadge, PriceWithTip, SectionTitle, Stat, StatusPill } from "../../_components/ui"
import { NO_SHOW, bookingHref, cityName, isDone, received } from "../../_lib"
import { DeleteClientButton } from "../DeleteClientButton"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

/** One client: contacts, numbers, what's coming up and every past booking. */
export default async function ClientePage({ params }: PageProps) {
  const { id } = await params
  await requireAdmin(`/admin/clientes/${id}`)

  const client = await prisma.client.findUnique({
    where: { id },
    include: { bookings: { orderBy: { startUtc: "desc" } } },
  })
  if (!client) notFound()

  const now = new Date()
  const done = client.bookings.filter((b) => isDone(b, now))
  const upcoming = client.bookings
    .filter((b) => b.startUtc >= now && (b.status === "PENDING" || b.status === "CONFIRMED"))
    .reverse()
  const history = client.bookings.filter((b) => !upcoming.includes(b))
  const noShows = client.bookings.filter((b) => b.status === NO_SHOW).length
  const cancelled = client.bookings.filter((b) => b.status === "CANCELLED").length
  const spent = done.reduce((s, b) => s + received(b), 0)
  const stamped = stamps(client.bookings, now)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <BackLink href="/admin/clientes" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-4xl break-words sm:text-5xl">{client.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <ContactLinks phone={client.phone} showNumber />
            {client.email && (
              <a href={`mailto:${client.email}`} className="text-sm text-muted hover:text-ink">
                {client.email}
              </a>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Cliente desde {formatLisbon(client.createdAt, "dd/MM/yyyy")}
            {client.preferredLocation && <> · prefere {cityName(client.preferredLocation)}</>}
          </p>
        </div>
        <DeleteClientButton id={client.id} name={client.name} bookingCount={client.bookings.length} />
      </div>

      {client.standingNote && (
        <p className="mt-5 rounded-md border border-ink/15 bg-card px-3 py-2 text-sm">
          <span className="caps mr-1.5 text-xs text-muted">Nota do cliente</span>
          {client.standingNote}
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Visitas" value={String(done.length)} sub={<LoyaltyBadge stamped={stamped} />} />
        <Stat label="Gasto" value={formatPrice(spent)} sub="serviços e gorjetas" />
        <Stat label="Faltas" value={String(noShows)} highlight={noShows >= 2} />
        <Stat label="Canceladas" value={String(cancelled)} />
      </div>

      <section className="mt-10">
        <SectionTitle>Próximas</SectionTitle>
        {upcoming.length === 0 ? (
          <p className="text-muted">Sem marcações à frente.</p>
        ) : (
          <ul className="divide-y divide-ink/10 border-y-2 border-ink">
            {upcoming.map((b) => (
              <BookingRow key={b.id} b={b} now={now} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle aside={history.length > 0 ? `${history.length} no total` : undefined}>Histórico</SectionTitle>
        {history.length === 0 ? (
          <Empty>Ainda sem histórico.</Empty>
        ) : (
          <ul className="divide-y divide-ink/10 border-y-2 border-ink">
            {history.map((b) => (
              <BookingRow key={b.id} b={b} now={now} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function BookingRow({
  b,
  now,
}: {
  b: {
    id: string
    adminToken: string
    startUtc: Date
    status: string
    serviceName: string
    location: string
    servicePrice: number
    tipEur: number
    notes: string | null
  }
  now: Date
}) {
  const struck = b.status === "CANCELLED" || b.status === NO_SHOW
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-24 shrink-0 text-sm tabular-nums">
        <span className="block font-semibold">{formatLisbon(b.startUtc, "dd/MM/yyyy")}</span>
        <span className="text-muted">{formatLisbon(b.startUtc, "EEE, HH:mm")}</span>
      </span>
      <Link href={bookingHref(b)} className="min-w-0 flex-1 hover:underline">
        <span className={cn("font-semibold", struck && "text-muted line-through")}>{b.serviceName}</span>
        {b.notes && <span className="block truncate text-sm italic text-muted">“{b.notes}”</span>}
      </Link>
      <span className="hidden sm:block">
        <CityTag location={b.location} />
      </span>
      {struck ? (
        <span className="w-16 shrink-0 text-right text-muted tabular-nums line-through">
          {formatPrice(b.servicePrice)}
        </span>
      ) : (
        <PriceWithTip price={b.servicePrice} tip={b.tipEur} className="min-w-16 shrink-0 text-right" />
      )}
      <span className="hidden w-28 text-right sm:block">
        <StatusPill status={b.status} done={isDone(b, now)} />
      </span>
    </li>
  )
}
