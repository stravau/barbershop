import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireClient } from "@/lib/client-auth"
import { clientHabit, suggestSlots } from "@/lib/express"
import { formatPrice } from "@/lib/services"
import { formatLisbon } from "@/lib/tz"
import { STAMPS_TO_FREE, cardMessage, stamps } from "@/lib/loyalty"
import { Card, Notice } from "@/app/conta/_components/ContaShell"
import { ExpressFrame } from "@/app/conta/_components/ExpressFrame"
import { ExpressCardSkeleton } from "@/app/conta/_components/Skeletons"
import { ExpressSlot } from "@/components/ExpressSlot"

export const metadata: Metadata = { title: "A minha conta", robots: "noindex" }
export const dynamic = "force-dynamic"

const ERRORS: Record<string, string> = {
  ocupado: "Esse horário já não está livre. Escolhe outro.",
  falhou: "Não foi possível fazer o pedido. Tenta outra vez.",
  "sem-historico": "Ainda não temos marcações tuas para sugerir.",
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

interface PageProps {
  searchParams: Promise<{ erro?: string }>
}

/** Client area home: "Marcação express" + loyalty card. */
export default async function ContaPage({ searchParams }: PageProps) {
  const { client } = await requireClient()
  const sp = await searchParams
  const now = new Date()

  const bookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    select: { status: true, startUtc: true, serviceId: true },
  })
  const visits = stamps(bookings, now)
  const hasUpcoming = bookings.some(
    (b) => b.startUtc >= now && (b.status === "PENDING" || b.status === "CONFIRMED"),
  )

  return (
    <>
      {sp.erro && ERRORS[sp.erro] && <Notice tone="error">{ERRORS[sp.erro]}</Notice>}

      {/* The suggestions check the agenda: they stream in, the rest shows at once */}
      <Suspense fallback={<ExpressCardSkeleton />}>
        <ExpressCard clientId={client.id} preferredLocation={client.preferredLocation} hasUpcoming={hasUpcoming} />
      </Suspense>

      <LoyaltyCard visits={visits} />
    </>
  )
}

/** "Marcação express": the usual booking and the next free times that fit it. */
async function ExpressCard({
  clientId,
  preferredLocation,
  hasUpcoming,
}: {
  clientId: string
  preferredLocation: string | null
  hasUpcoming: boolean
}) {
  const habit = await clientHabit(clientId, preferredLocation)
  const suggestions = habit ? await suggestSlots(habit) : []

  const city = habit?.location === "lisboa" ? "Lisboa" : "Setúbal"

  return (
    <ExpressFrame>
      {habit ? (
        <>
          {/* The usual booking, read like a receipt line (not buttons) */}
          <p className="border-b-2 border-dashed border-ink/20 bg-paper-dark/50 px-5 py-3 text-sm sm:px-6">
            <span className="caps mr-2 text-xs text-muted">O teu costume</span>
            <strong>{habit.serviceName}</strong> · {formatPrice(habit.priceEur)} · {city}
            {habit.weekday !== null && (
              <span className="text-ink/70">
                {" "}
                · normalmente {habit.weekday === 0 || habit.weekday === 6 ? "ao" : "à"} {WEEKDAYS[habit.weekday]}
              </span>
            )}
          </p>
          <div className="p-5 sm:p-6">
            {hasUpcoming && (
              <p className="mb-4 text-sm text-ink/80">
                Já tens uma marcação agendada.{" "}
                <Link href="/conta/marcacoes" className="link font-semibold">
                  Ver marcação
                </Link>
              </p>
            )}
            {suggestions.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {suggestions.map((s) => {
                  const d = new Date(s.startIso)
                  return (
                    <li key={s.startIso}>
                      <ExpressSlot
                        variant="wide"
                        startIso={s.startIso}
                        day={formatLisbon(d, "EEEE, dd 'de' MMMM").replace("-feira", "")}
                        weekday={formatLisbon(d, "EEEE").replace("-feira", "")}
                        date={formatLisbon(d, "d MMM").toLowerCase().replace(".", "")}
                        time={formatLisbon(d, "HH:mm")}
                        serviceName={habit.serviceName}
                        priceEur={habit.priceEur}
                        city={city}
                      />
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-ink/80">Não há horas livres para o teu costume nas próximas 3 semanas.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-2 border-dashed border-ink/20 px-5 py-3.5 sm:px-6">
            <p className="text-xs text-muted">Escolhe uma hora e confirma. Recebes a morada por email quando for confirmada.</p>
            <Link href="/marcar" className="link inline-flex items-center gap-1 text-sm font-semibold">
              Outro serviço ou hora <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <div className="p-5 sm:p-6">
          <p className="text-ink/80">
            Depois da tua primeira marcação, aparecem aqui o teu serviço e as tuas horas habituais
            para marcares com um toque.
          </p>
          <Link href="/marcar" className="btn btn-sm mt-4">
            Fazer uma marcação <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </ExpressFrame>
  )
}

/** `visits`: stamps on the card (cuts that happened, see lib/loyalty.ts). */
function LoyaltyCard({ visits }: { visits: number }) {
  const stamped = Math.min(visits, STAMPS_TO_FREE)
  const freeUsed = visits > STAMPS_TO_FREE
  return (
    <Card className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl">Cartão de cliente</h2>
        <span className="caps text-sm tabular-nums">
          {stamped}/{STAMPS_TO_FREE}
        </span>
      </div>
      {/* Six stamps, then the free 7th cut */}
      <ol
        className="mt-5 grid max-w-sm grid-cols-7 gap-2"
        aria-label={`${stamped} de ${STAMPS_TO_FREE} carimbos; o sétimo corte é grátis`}
      >
        {Array.from({ length: STAMPS_TO_FREE + 1 }, (_, i) => {
          const isFree = i === STAMPS_TO_FREE
          const isStamped = isFree ? freeUsed : i < stamped
          return (
            <li
              key={i}
              className={
                isFree
                  ? "grid aspect-square place-items-center rounded-full border-2 border-ink bg-yellow"
                  : isStamped
                    ? "grid aspect-square place-items-center rounded-full border-2 border-jungle bg-jungle/90 text-paper"
                    : "grid aspect-square place-items-center rounded-full border-2 border-dashed border-ink/30"
              }
            >
              {isStamped ? (
                <span className="text-lg leading-none">★</span>
              ) : isFree ? (
                <span className="caps text-[0.5rem] leading-none">Grátis</span>
              ) : null}
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-sm text-ink/80">{cardMessage(visits)}</p>
      <p className="mt-1 text-xs text-muted">Cada corte feito vale um carimbo. Válido apenas para o primeiro cartão.</p>
    </Card>
  )
}
