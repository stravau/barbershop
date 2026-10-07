import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { CalendarPlus, MapPin } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatLisbon } from "@/lib/tz"
import { formatPrice } from "@/lib/services"
import { getLocationAddress, mapsUrl } from "@/lib/addresses"
import { whatsappUrl } from "@/lib/site"
import { hasPhone } from "@/lib/clients"
import { LATE_CANCEL_HOURS, bookingForEmail, hoursUntil } from "@/lib/booking-status"
import { calendarUrl, icsUrl } from "@/lib/email"
import { cn } from "@/lib/utils"
import { BackLink } from "@/components/BackLink"
import { ActionForm } from "@/components/ActionForm"
import { cancelByClientAction } from "./actions"

// Private page (the link carries the booking's token)
export const metadata: Metadata = { title: "A tua marcação", robots: "noindex" }

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const CANCEL_ERRORS: Record<string, string> = {
  past: "Esta marcação já passou, por isso já não dá para cancelar.",
  "already-cancelled": "Esta marcação já estava cancelada.",
}

/**
 * Public-facing booking detail page. The customer reaches it via a link
 * sent in their booking emails. Token gate prevents booking-id enumeration.
 * The emails' "Cancelar marcação" opens it with ?cancelar=1, which asks for
 * the tap that cancels (opening a link never cancels anything).
 */
export default async function MarcacaoPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const token = typeof sp.token === "string" ? sp.token : undefined

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true },
  })

  if (!booking) notFound()

  if (!token || booking.clientToken !== token) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <div className="rounded-lg border-2 border-ink bg-card p-8 text-center shadow-[6px_6px_0_var(--ink)]">
          <h1 className="text-3xl text-danger">Link inválido</h1>
          <p className="mt-3 text-muted">
            O link que recebeste por email pode ter ficado cortado. Tenta
            abri-lo diretamente a partir do email original.
          </p>
          <Link href="/" className="btn mt-6">
            Voltar ao site
          </Link>
        </div>
      </main>
    )
  }

  const now = new Date()
  const isConfirmed = booking.status === "CONFIRMED"
  const isCancelled = booking.status === "CANCELLED"
  const isPending = booking.status === "PENDING"
  const isCompleted = booking.status === "COMPLETED"
  const isUpcoming = booking.startUtc > now
  const canCancel = (isPending || isConfirmed) && isUpcoming
  const lateCancel = isConfirmed && hoursUntil(booking.startUtc, now) < LATE_CANCEL_HOURS
  const askCancel = sp.cancelar === "1" && canCancel
  const justCancelled = sp.cancelled === "1"
  const cancelError = typeof sp.erro === "string" ? CANCEL_ERRORS[sp.erro] : undefined

  const city = booking.location === "lisboa" ? "Lisboa" : "Setúbal"
  // The address is only revealed once the barber has accepted the booking.
  const address = isConfirmed ? getLocationAddress(booking.location) : null
  const whatsapp = whatsappUrl()
  const forCalendar = bookingForEmail(booking, isConfirmed)

  const whenForCopy = formatLisbon(
    booking.startUtc,
    "EEEE, dd 'de' MMMM 'às' HH:mm",
  )
  const cancelFields = { id: booking.id, token }
  const lateNote = lateCancel
    ? `Faltam menos de ${LATE_CANCEL_HOURS} horas. Podes cancelar na mesma, mas cancelamentos em cima da hora podem impedir marcações futuras.`
    : null

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <BackLink href="/" />

      {(justCancelled || cancelError) && (
        <div
          role="status"
          className={cn(
            "mb-6 rounded-md border-2 border-ink px-4 py-3 font-semibold",
            justCancelled ? "bg-success/15" : "bg-yellow/40",
          )}
        >
          {justCancelled ? "Marcação cancelada. O barbeiro já foi avisado." : cancelError}
        </div>
      )}

      {askCancel && (
        <div className="mb-8 rounded-lg border-2 border-ink bg-danger/10 p-5 shadow-[4px_4px_0_var(--ink)]">
          <p className="text-xl font-semibold">Queres cancelar esta marcação?</p>
          <p className="mt-1 text-ink/80">
            {booking.serviceName}, {whenForCopy}, em {city}.
          </p>
          {lateNote && <p className="mt-2 text-sm font-semibold">{lateNote}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionForm action={cancelByClientAction} fields={cancelFields} className="btn border-ink bg-danger text-paper">
              Sim, cancelar
            </ActionForm>
            <Link href={`/marcacao/${booking.id}?token=${token}`} className="btn-ghost">
              Não, manter
            </Link>
          </div>
        </div>
      )}

      <div className="mb-8">
        <span
          className={cn(
            "caps inline-block rounded-full border-2 border-ink px-3 py-0.5 text-xs",
            isConfirmed && "bg-success text-paper",
            isPending && "bg-yellow",
            isCancelled && "bg-danger text-paper",
            isCompleted && "bg-ink text-paper",
          )}
        >
          {isConfirmed
            ? "Confirmada"
            : isCancelled
              ? "Cancelada"
              : isCompleted
                ? "Concluída"
                : "Pendente"}
        </span>
        <h1 className="print-shadow mt-4 text-4xl sm:text-5xl">
          {isConfirmed
            ? "Está marcado!"
            : isCancelled
              ? "Marcação cancelada"
              : isCompleted
                ? "Até à próxima!"
                : "À espera de confirmação"}
        </h1>
        <p className="mt-4 text-lg text-ink/80">
          {isConfirmed && `Obrigado pela confiança. Até ${whenForCopy}!`}
          {isPending &&
            "Ainda não está confirmada. Assim que for, recebes um email com a confirmação e a localização."}
          {isCancelled &&
            "Esta marcação foi cancelada. Se quiseres, marca outra hora aqui em baixo."}
          {isCompleted && "Obrigado pela visita!"}
        </p>
      </div>

      <div className="rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8">
        <div className="font-display text-2xl">{booking.serviceName}</div>
        <div className="mt-1 text-sm text-muted">
          {booking.durationMin} min · {formatPrice(booking.servicePrice)} ·
          pagas no fim
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <Row
            label="Quando"
            value={formatLisbon(booking.startUtc, "EEEE, dd/MM/yyyy 'às' HH:mm")}
            bold
          />
          <Row label="Cidade" value={city} />
          <div className="my-3 border-t border-border"></div>
          <Row label="Nome" value={booking.client.name} />
          {hasPhone(booking.client.phone) && <Row label="Telefone" value={booking.client.phone} />}
          {booking.email && <Row label="Email" value={booking.email} />}
        </div>

        {address && (
          <div className="mt-6 rounded-md border-2 border-ink bg-yellow/30 p-4">
            <div className="caps flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" /> Morada
            </div>
            <p className="mt-1 text-lg font-semibold">
              {address}, {city}
            </p>
            <a
              href={mapsUrl(address, city)}
              target="_blank"
              rel="noopener"
              className="link mt-1 inline-block text-sm font-semibold"
            >
              Abrir no Google Maps
            </a>
          </div>
        )}

        {isConfirmed && isUpcoming && (
          <div className="mt-5">
            <p className="caps flex items-center gap-1.5 text-xs text-muted">
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Adicionar ao calendário
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={calendarUrl(forCalendar)} target="_blank" rel="noopener" className="btn-ghost px-3 py-1.5 text-sm">
                Google Calendar
              </a>
              <a href={icsUrl(forCalendar)} className="btn-ghost px-3 py-1.5 text-sm">
                iPhone / Outlook
              </a>
            </div>
          </div>
        )}

        {isConfirmed && (
          <p className="mt-5 text-sm text-ink/80">
            <strong>Lembra-te:</strong> com mais de 20 minutos de atraso, a
            marcação pode ser cancelada.
          </p>
        )}
      </div>

      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        {isCancelled || isCompleted ? (
          <Link href="/marcar" className="btn">
            Fazer nova marcação
          </Link>
        ) : (
          <Link href="/" className="btn-ghost">
            Voltar ao site
          </Link>
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener" className="btn-whatsapp">
            Falar no WhatsApp
          </a>
        )}
      </div>

      {canCancel && !askCancel && (
        <div className="mt-8 text-center">
          <ActionForm
            action={cancelByClientAction}
            fields={cancelFields}
            confirm={{
              title: "Cancelar a marcação?",
              body: lateNote ?? `${booking.serviceName}, ${whenForCopy}. O barbeiro é avisado e a hora fica livre.`,
              confirmLabel: "Sim, cancelar",
              cancelLabel: "Não, manter",
              danger: true,
            }}
            className="text-sm font-semibold text-danger underline-offset-4 hover:underline"
          >
            Cancelar marcação
          </ActionForm>
          <p className="mt-1 text-xs text-muted">
            Cancela com pelo menos {LATE_CANCEL_HOURS} horas de antecedência.
          </p>
        </div>
      )}

      <p className="mt-9 text-center text-xs text-muted">Referência: {booking.id}</p>
    </main>
  )
}

function Row({
  label,
  value,
  bold,
}: {
  label: string
  value: string
  bold?: boolean
}) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={bold ? "font-semibold" : undefined}>{value}</span>
    </div>
  )
}
