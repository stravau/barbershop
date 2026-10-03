import { notFound } from "next/navigation"
import Link from "next/link"
import { cookies } from "next/headers"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatLisbon } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/admin-session"
import { cn } from "@/lib/utils"
import { AdminNav } from "../../_components/AdminNav"
import { ContactLinks } from "../../_components/ContactLinks"
import { FlashBanner } from "../../_components/FlashBanner"
import { DeleteBookingButton } from "./DeleteBookingButton"
import { CityTag, StatusPill } from "../../_components/ui"
import { isDone } from "../../_lib"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * One booking. Reached from the admin lists (session) or from the links in
 * the barber's notification email (adminToken in the URL).
 */
export default async function AdminBookingPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const token = typeof sp.token === "string" ? sp.token : undefined
  const error = typeof sp.error === "string" ? sp.error : undefined
  const confirmed = sp.confirmed === "1"
  const rejected = sp.rejected === "1"
  const already = sp.already === "1"

  // Auth: either a valid admin session cookie OR a matching adminToken in URL
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const hasSession = await isSessionValid(sessionCookie)

  if (error) {
    return (
      <Message title="Erro" tone="danger">
        {errorMessage(error)}
      </Message>
    )
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: { include: { bookings: { select: { startUtc: true, status: true } } } } },
  })

  if (!booking) notFound()
  const tokenMatches = token && booking.adminToken === token
  if (!hasSession && !tokenMatches) {
    return (
      <Message
        title="Acesso negado"
        tone="danger"
        action={{ href: `/admin/login?next=${encodeURIComponent(`/admin/booking/${id}`)}`, label: "Login" }}
      >
        Token inválido ou sessão expirada. Faz login.
      </Message>
    )
  }

  const now = new Date()
  const isPending = booking.status === "PENDING"
  const isConfirmed = booking.status === "CONFIRMED"
  const isPast = booking.startUtc < now
  const action = (kind: "confirm" | "reject") =>
    `/api/admin/bookings/${booking.id}/${kind}?token=${booking.adminToken}&from=admin`

  const visits = booking.client.bookings.filter((b) => isDone(b, now))
  const lastVisit = visits
    .map((b) => b.startUtc)
    .filter((d) => d.getTime() !== booking.startUtc.getTime())
    .sort((a, b) => b.getTime() - a.getTime())[0]
  const cancellations = booking.client.bookings.filter((b) => b.status === "CANCELLED").length

  const notice = confirmed
    ? { tone: "success" as const, text: `Marcação confirmada${booking.email ? ` — email enviado para ${booking.email}` : ""}.` }
    : rejected
      ? { tone: "danger" as const, text: `Marcação cancelada${booking.email ? ` — email enviado para ${booking.email}` : ""}.` }
      : already
        ? { tone: "muted" as const, text: "Esta marcação já tinha sido tratada — nada mudou." }
        : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {hasSession && <AdminNav active="agenda" />}

      <div className="mx-auto max-w-2xl">
        {hasSession && (
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Agenda
          </Link>
        )}

        {notice && (
          <FlashBanner
            text={notice.text}
            tone={notice.tone}
            clearParams={["confirmed", "rejected", "already"]}
          />
        )}

        <div className="rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={booking.status} done={isDone(booking, now)} />
            <CityTag location={booking.location} />
          </div>
          <h1 className="mt-3 text-3xl">{booking.serviceName}</h1>
          <p className="mt-1 text-lg font-semibold">
            {formatLisbon(booking.startUtc, "EEEE, d 'de' MMMM 'às' HH:mm")}
          </p>
          <p className="text-muted">
            {booking.durationMin} min · {formatPrice(booking.servicePrice)}
          </p>

          {(isPending || (isConfirmed && !isPast)) && !confirmed && !rejected && (
            <div className="mt-5 flex flex-wrap gap-2">
              {isPending && !isPast && (
                <a href={action("confirm")} className="btn bg-success text-paper">
                  Confirmar
                </a>
              )}
              <a
                href={action("reject")}
                className="btn-ghost border-danger text-danger hover:bg-danger/5"
              >
                {isPending ? "Recusar" : "Cancelar marcação"}
              </a>
            </div>
          )}

          <div className="mt-7 border-t-2 border-ink pt-5">
            <div className="caps mb-2 text-xs text-muted">Cliente</div>
            <div className="text-xl font-semibold">{booking.client.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4">
              <ContactLinks phone={booking.client.phone} showNumber />
              {booking.email && (
                <a href={`mailto:${booking.email}`} className="text-sm text-muted hover:text-ink">
                  {booking.email}
                </a>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              {visits.length} {visits.length === 1 ? "visita" : "visitas"}
              {lastVisit && <> · última a {formatLisbon(lastVisit, "dd/MM/yyyy")}</>}
              {cancellations > 0 && <> · {cancellations} cancelada{cancellations > 1 ? "s" : ""}</>}
            </p>
            {booking.notes && (
              <p className="mt-4 rounded-md bg-yellow/25 px-3 py-2 italic">“{booking.notes}”</p>
            )}
          </div>

          <div className="mt-7 border-t border-ink/15 pt-4">
            <DeleteBookingButton id={booking.id} token={booking.adminToken} />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted">Referência: {booking.id}</p>
      </div>
    </main>
  )
}

function errorMessage(code: string): string {
  switch (code) {
    case "missing-token":
      return "Falta o token de autenticação."
    case "invalid-token":
      return "Token inválido ou expirado."
    case "not-found":
      return "Marcação não encontrada."
    case "already-cancelled":
      return "Esta marcação já foi cancelada e não pode ser confirmada."
    default:
      return "Ocorreu um erro inesperado."
  }
}

function Message({
  title,
  tone,
  action = { href: "/admin", label: "Voltar ao painel" },
  children,
}: {
  title: string
  tone: "danger"
  action?: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20">
      <div className="rounded-lg border-2 border-ink bg-card p-8 text-center shadow-[6px_6px_0_var(--ink)]">
        <h1 className={cn("text-3xl", tone === "danger" && "text-danger")}>{title}</h1>
        <p className="mt-3 text-muted">{children}</p>
        <Link href={action.href} className="btn mt-6">
          {action.label}
        </Link>
      </div>
    </main>
  )
}
