import type { Metadata } from "next"
import Link from "next/link"
import { MapPin } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireClient } from "@/lib/client-auth"
import { formatPrice } from "@/lib/services"
import { formatLisbon } from "@/lib/tz"
import { getLocationAddress, mapsUrl } from "@/lib/addresses"
import { cn } from "@/lib/utils"
import { Card, ContaShell, Notice } from "../_components/ContaShell"
import { ActionForm } from "@/components/ActionForm"
import { LATE_CANCEL_HOURS, hoursUntil } from "@/lib/booking-status"
import { cancelByClientAction } from "../../marcacao/[id]/actions"

export const metadata: Metadata = { title: "As minhas marcações", robots: "noindex" }
export const dynamic = "force-dynamic"

const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-yellow" },
  CONFIRMED: { label: "Confirmada", className: "bg-success text-paper" },
  CANCELLED: { label: "Cancelada", className: "bg-danger text-paper" },
  COMPLETED: { label: "Concluída", className: "bg-ink text-paper" },
  DONE: { label: "Concluída", className: "bg-ink text-paper" },
  EXPIRED: { label: "Não confirmada", className: "bg-paper-dark" },
}

interface PageProps {
  searchParams: Promise<{ pedido?: string; cancelada?: string }>
}

/** Upcoming bookings (status, address once confirmed, cancel) and history. */
export default async function MarcacoesPage({ searchParams }: PageProps) {
  const { client } = await requireClient()
  const sp = await searchParams
  const now = new Date()

  const bookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    orderBy: { startUtc: "desc" },
  })
  const upcoming = bookings
    .filter((b) => b.startUtc >= now && (b.status === "PENDING" || b.status === "CONFIRMED"))
    .reverse()
  const past = bookings.filter((b) => !upcoming.includes(b))

  return (
    <ContaShell name={client.name} active="/conta/marcacoes">
      {sp.cancelada === "1" && <Notice tone="ok">Marcação cancelada. O barbeiro já foi avisado.</Notice>}
      {sp.cancelada && sp.cancelada !== "1" && (
        <Notice tone="error">
          {sp.cancelada === "past" ? "Essa marcação já passou, já não dá para cancelar." : "Essa marcação já estava cancelada."}
        </Notice>
      )}
      {sp.pedido && (
        <Notice tone="ok">
          Pedido enviado! Fica pendente até ser confirmado e recebes um email nessa altura.
        </Notice>
      )}

      <h2 className="text-2xl sm:text-3xl">Próximas</h2>
      {upcoming.length === 0 ? (
        <p className="mt-3 text-ink/80">
          Não tens marcações agendadas.{" "}
          <Link href="/conta" className="link">
            Marcação express
          </Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {upcoming.map((b) => {
            const city = b.location === "lisboa" ? "Lisboa" : "Setúbal"
            const address = b.status === "CONFIRMED" ? getLocationAddress(b.location) : null
            return (
              <li key={b.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-display text-xl first-letter:uppercase sm:text-2xl">
                      {formatLisbon(b.startUtc, "EEEE, dd 'de' MMMM 'às' HH:mm")}
                    </p>
                    <StatusPill status={b.status} />
                  </div>
                  <p className="mt-2 text-ink/80">
                    {b.serviceName} · {formatPrice(b.servicePrice)} · {city}
                  </p>
                  {address ? (
                    <a
                      href={mapsUrl(address, city)}
                      target="_blank"
                      rel="noopener"
                      className="link mt-2 inline-flex items-center gap-1.5 text-sm"
                    >
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                      {address}, {city}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-muted">A morada aparece quando for confirmada.</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/marcacao/${b.id}?token=${b.clientToken}`} className="btn-ghost px-3 py-1.5 text-sm">
                      Detalhes
                    </Link>
                    <ActionForm
                      action={cancelByClientAction}
                      fields={{ id: b.id, token: b.clientToken, from: "conta" }}
                      confirm={{
                        title: "Cancelar a marcação?",
                        body:
                          b.status === "CONFIRMED" && hoursUntil(b.startUtc, now) < LATE_CANCEL_HOURS
                            ? `Faltam menos de ${LATE_CANCEL_HOURS} horas. Podes cancelar na mesma, mas cancelamentos em cima da hora podem impedir marcações futuras.`
                            : "O barbeiro é avisado e a hora fica livre.",
                        confirmLabel: "Sim, cancelar",
                        cancelLabel: "Não, manter",
                        danger: true,
                      }}
                      className="btn-ghost border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger/5"
                    >
                      Cancelar
                    </ActionForm>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted">
        Cancela com pelo menos 12 horas de antecedência.
      </p>

      <h2 className="mt-12 text-2xl sm:text-3xl">Histórico</h2>
      {past.length === 0 ? (
        <p className="mt-3 text-ink/80">Ainda sem visitas.</p>
      ) : (
        <ul className="mt-4 divide-y divide-rule border-y-2 border-ink">
          {past.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <div>
                <p className="font-semibold tabular-nums">{formatLisbon(b.startUtc, "dd/MM/yyyy · HH:mm")}</p>
                <p className="text-sm text-ink/80">
                  {b.serviceName} · {b.location === "lisboa" ? "Lisboa" : "Setúbal"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{formatPrice(b.servicePrice)}</span>
                <StatusPill status={b.status === "CONFIRMED" ? "DONE" : b.status === "PENDING" ? "EXPIRED" : b.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ContaShell>
  )
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS.DONE
  return (
    <span
      className={cn(
        "caps inline-block whitespace-nowrap rounded-full border-2 border-ink px-2.5 py-0.5 text-xs",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  )
}
