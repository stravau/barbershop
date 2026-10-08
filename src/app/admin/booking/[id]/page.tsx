import { notFound } from "next/navigation"
import Link from "next/link"
import { BackLink } from "@/components/BackLink"
import { prisma } from "@/lib/prisma"
import { formatLisbon } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import { emailLinkStillValid, isAdmin } from "@/lib/admin-auth"
import { LATE_CANCEL_HOURS, hoursUntil } from "@/lib/booking-status"
import { cn } from "@/lib/utils"
import { ActionForm } from "@/components/ActionForm"
import { ContactLinks } from "../../_components/ContactLinks"
import { FlashBanner } from "../../_components/FlashBanner"
import { DeleteBookingButton } from "./DeleteBookingButton"
import { RescheduleForm } from "./RescheduleForm"
import {
  cancelBookingAction,
  confirmBookingAction,
  markNoShowAction,
  undoNoShowAction,
  updateBooking,
} from "./actions"
import { CityTag, StatusPill } from "../../_components/ui"
import { NO_SHOW, isDone, received } from "../../_lib"

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
  const hasSession = await isAdmin()

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
  // Email links stop working a few days after the booking
  const tokenMatches =
    token && booking.adminToken === token && emailLinkStillValid(booking.startUtc)
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
  const isCancelled = booking.status === "CANCELLED"
  const isPast = booking.startUtc < now
  const canConfirm = isPending && !isPast
  const canCancel = isPending || (isConfirmed && !isPast)
  // The email's "Confirmar"/"Cancelar" buttons open this page with ?acao=…
  const asked = sp.acao === "confirmar" ? "confirm" : sp.acao === "cancelar" ? "cancel" : null
  const fields = { id: booking.id, token: booking.adminToken }
  const cancelConfirm = {
    title: isPending ? "Recusar o pedido?" : "Cancelar a marcação?",
    body: booking.email
      ? `O cliente recebe um email a avisar (${booking.email}).`
      : "Este cliente não tem email: avisa-o tu.",
    confirmLabel: isPending ? "Recusar" : "Cancelar marcação",
    danger: true,
  }
  const cancelledHoursBefore =
    isCancelled && booking.cancelledAt ? hoursUntil(booking.startUtc, booking.cancelledAt) : null

  const visits = booking.client.bookings.filter((b) => isDone(b, now))
  const lastVisit = visits
    .map((b) => b.startUtc)
    .filter((d) => d.getTime() !== booking.startUtc.getTime())
    .sort((a, b) => b.getTime() - a.getTime())[0]
  const cancellations = booking.client.bookings.filter((b) => b.status === "CANCELLED").length
  const noShows = booking.client.bookings.filter((b) => b.status === NO_SHOW).length
  const isNoShow = booking.status === NO_SHOW

  const notice = confirmed
    ? { tone: "success" as const, text: `Marcação confirmada.${booking.email ? ` Email enviado para ${booking.email}.` : ""}` }
    : rejected
      ? { tone: "danger" as const, text: `Marcação cancelada.${booking.email ? ` Email enviado para ${booking.email}.` : ""}` }
      : already
        ? { tone: "muted" as const, text: "Esta marcação já tinha sido tratada, não mudou nada." }
        : sp.saved && SAVED[String(sp.saved)]
          ? SAVED[String(sp.saved)]
          : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

      <div className="mx-auto max-w-2xl">
        {hasSession && (
          <BackLink href="/admin" />
        )}

        {notice && (
          <FlashBanner
            text={notice.text}
            tone={notice.tone}
            clearParams={["confirmed", "rejected", "already", "saved", "acao"]}
          />
        )}

        {/* Arrived from the email's "Confirmar"/"Cancelar": ask for the tap here */}
        {asked && !notice && (
          <div
            className={cn(
              "mb-6 rounded-lg border-2 border-ink p-5 shadow-[4px_4px_0_var(--ink)]",
              asked === "confirm" ? "bg-success/15" : "bg-danger/10",
            )}
          >
            {asked === "confirm" && canConfirm ? (
              <>
                <p className="text-xl font-semibold">Confirmar esta marcação?</p>
                <p className="mt-1 text-sm text-muted">
                  {booking.email ? "O cliente recebe a confirmação por email, com a morada." : "Este cliente não tem email: avisa-o tu."}
                </p>
                <div className="mt-4">
                  <ActionForm action={confirmBookingAction} fields={fields} className="btn bg-success text-paper">
                    Sim, confirmar
                  </ActionForm>
                </div>
              </>
            ) : asked === "cancel" && canCancel ? (
              <>
                <p className="text-xl font-semibold">{isPending ? "Recusar este pedido?" : "Cancelar esta marcação?"}</p>
                <p className="mt-1 text-sm text-muted">{cancelConfirm.body}</p>
                <div className="mt-4">
                  <ActionForm action={cancelBookingAction} fields={fields} className="btn border-ink bg-danger text-paper">
                    Sim, {isPending ? "recusar" : "cancelar"}
                  </ActionForm>
                </div>
              </>
            ) : (
              <p className="font-semibold">
                Esta marcação já não está à espera de resposta (estado: {statusText(booking.status, isPast)}).
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={booking.status} done={isDone(booking, now)} />
            {isNoShow && <span className="text-sm text-muted">não conta como visita</span>}
            <CityTag location={booking.location} />
          </div>
          <h1 className="mt-3 text-3xl">{booking.serviceName}</h1>
          <p className="mt-1 text-lg font-semibold">
            {formatLisbon(booking.startUtc, "EEEE, d 'de' MMMM 'às' HH:mm")}
          </p>
          <p className="text-muted">
            {booking.durationMin} min · {formatPrice(booking.servicePrice)}
            {booking.tipEur > 0 && (
              <>
                {" "}+ {formatPrice(booking.tipEur)} gorjeta ={" "}
                <strong className="text-ink">{formatPrice(received(booking))}</strong>
              </>
            )}
          </p>

          {cancelledHoursBefore !== null && booking.cancelledAt && (
            <p className="mt-2 text-sm">
              Cancelada a {formatLisbon(booking.cancelledAt, "dd/MM 'às' HH:mm")}
              {cancelledHoursBefore > 0 && (
                <>
                  {" · "}
                  {cancelledHoursBefore < 1 ? "menos de 1 h" : `${Math.floor(cancelledHoursBefore)} h`} antes
                  {cancelledHoursBefore < LATE_CANCEL_HOURS && booking.confirmedAt && (
                    <span className="caps ml-2 rounded bg-yellow px-1.5 py-0.5 text-xs ring-1 ring-ink">
                      Em cima da hora
                    </span>
                  )}
                </>
              )}
            </p>
          )}

          {canCancel && !asked && (
            <div className="mt-5 flex flex-wrap gap-2">
              {canConfirm && (
                <ActionForm action={confirmBookingAction} fields={fields} className="btn bg-success text-paper">
                  Confirmar
                </ActionForm>
              )}
              <ActionForm
                action={cancelBookingAction}
                fields={fields}
                confirm={cancelConfirm}
                className="btn-ghost border-danger text-danger hover:bg-danger/5"
              >
                {isPending ? "Recusar" : "Cancelar marcação"}
              </ActionForm>
            </div>
          )}

          {isConfirmed && isPast && (
            <div className="mt-5">
              <ActionForm
                action={markNoShowAction}
                fields={fields}
                confirm={{
                  title: "O cliente faltou?",
                  body: "A marcação deixa de contar como visita, para o cartão e para a faturação. Dá para desfazer.",
                  confirmLabel: "Sim, faltou",
                }}
                className="btn-ghost px-3 py-1.5 text-sm"
              >
                Faltou
              </ActionForm>
            </div>
          )}
          {isNoShow && (
            <div className="mt-5">
              <ActionForm action={undoNoShowAction} fields={fields} className="btn-ghost px-3 py-1.5 text-sm">
                Afinal veio
              </ActionForm>
            </div>
          )}

          <div className="mt-7 border-t-2 border-ink pt-5">
            <div className="caps mb-2 text-xs text-muted">Cliente</div>
            <div className="text-xl font-semibold">
              {hasSession ? (
                <Link href={`/admin/clientes/${booking.client.id}`} className="hover:underline">
                  {booking.client.name}
                </Link>
              ) : (
                booking.client.name
              )}
            </div>
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
              {noShows > 0 && <> · {noShows} {noShows === 1 ? "falta" : "faltas"}</>}
            </p>
            {booking.notes && (
              <p className="mt-4 rounded-md bg-yellow/25 px-3 py-2 italic">“{booking.notes}”</p>
            )}
            {booking.client.standingNote && (
              <p className="mt-3 rounded-md border border-ink/15 px-3 py-2 text-sm">
                <span className="caps mr-1.5 text-xs text-muted">Nota do cliente</span>
                {booking.client.standingNote}
              </p>
            )}
          </div>

          <form action={updateBooking} className="mt-7 border-t-2 border-ink pt-5">
            <div className="caps mb-2 text-xs text-muted">Editar</div>
            <input type="hidden" name="id" value={booking.id} />
            <input type="hidden" name="token" value={booking.adminToken} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[8rem_8rem_1fr]">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Preço</span>
                <span className="relative block">
                  <input
                    name="price"
                    inputMode="decimal"
                    defaultValue={String(booking.servicePrice).replace(".", ",")}
                    className="input pr-8"
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-muted">€</span>
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">Gorjeta</span>
                <span className="relative block">
                  <input
                    name="tip"
                    inputMode="decimal"
                    defaultValue={booking.tipEur > 0 ? String(booking.tipEur).replace(".", ",") : ""}
                    placeholder="0"
                    className="input pr-8"
                  />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-muted">€</span>
                </span>
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1 block text-sm font-semibold">Notas</span>
                <input name="notes" defaultValue={booking.notes ?? ""} className="input" />
              </label>
            </div>
            <p className="mt-1.5 text-xs text-muted">O corte grátis do cartão regista-se com preço 0.</p>
            <button type="submit" className="btn btn-sm mt-3">
              Guardar
            </button>
          </form>

          {(isPending || isConfirmed) && (
            <RescheduleForm
              id={booking.id}
              token={booking.adminToken}
              date={formatLisbon(booking.startUtc, "yyyy-MM-dd")}
              time={formatLisbon(booking.startUtc, "HH:mm")}
              location={booking.location}
              services={booking.serviceId.split("+")}
              hasEmail={!!booking.email}
            />
          )}

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
    case "not-allowed":
      return "Esta marcação já não pode ser alterada."
    default:
      return "Ocorreu um erro inesperado."
  }
}

/** Messages for ?saved=… after the edit, no-show and reschedule actions. */
const SAVED: Record<string, { tone: "success" | "danger" | "muted"; text: string }> = {
  "1": { tone: "success", text: "Alterações guardadas." },
  invalid: { tone: "danger", text: "Valor inválido. Escreve só o valor, por exemplo 10 ou 2,50." },
  falta: { tone: "muted", text: "Marcada como falta. Já não conta como visita." },
  veio: { tone: "success", text: "Voltou a contar como visita." },
  remarcada: { tone: "success", text: "Marcação mudada." },
  "remarcada-email": { tone: "success", text: "Marcação mudada. O cliente foi avisado por email." },
  "remarcada-email-falhou": { tone: "danger", text: "Marcação mudada, mas o email ao cliente falhou. Avisa-o tu." },
}

function statusText(status: string, past: boolean): string {
  if (status === "CANCELLED") return "cancelada"
  if (status === "CONFIRMED") return past ? "realizada" : "confirmada"
  if (status === "PENDING") return past ? "pendente, a hora já passou" : "pendente"
  if (status === NO_SHOW) return "faltou"
  return status.toLowerCase()
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
