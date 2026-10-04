import type { Metadata } from "next"
import Link from "next/link"
import { Zap } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireClient } from "@/lib/client-auth"
import { clientHabit, suggestSlots } from "@/lib/express"
import { formatPrice } from "@/lib/services"
import { formatLisbon } from "@/lib/tz"
import { isDone } from "@/app/admin/_lib"
import { Card, ContaShell, Notice } from "./_components/ContaShell"
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

  const [habit, bookings] = await Promise.all([
    clientHabit(client.id, client.preferredLocation),
    prisma.booking.findMany({ where: { clientId: client.id }, select: { status: true, startUtc: true } }),
  ])
  const suggestions = habit ? await suggestSlots(habit) : []
  const visits = bookings.filter((b) => isDone(b, now)).length
  const hasUpcoming = bookings.some(
    (b) => b.startUtc >= now && (b.status === "PENDING" || b.status === "CONFIRMED"),
  )

  return (
    <ContaShell name={client.name} active="/conta">
      {sp.erro && ERRORS[sp.erro] && <Notice tone="error">{ERRORS[sp.erro]}</Notice>}

      <Card>
        <h2 className="flex items-center gap-2 text-2xl sm:text-3xl">
          <Zap className="h-6 w-6 fill-yellow" aria-hidden="true" />
          Marcação express
        </h2>
        {habit ? (
          <>
            <p className="mt-3 text-ink/80">
              O costume: <strong>{habit.serviceName}</strong> · {formatPrice(habit.priceEur)} ·{" "}
              {habit.location === "lisboa" ? "Lisboa" : "Setúbal"}
              {habit.weekday !== null && <>, normalmente à {WEEKDAYS[habit.weekday]}</>}.
            </p>
            {hasUpcoming && (
              <p className="mt-2 text-sm text-muted">
                Já tens uma marcação agendada.{" "}
                <Link href="/conta/marcacoes" className="link">
                  Ver marcação
                </Link>
              </p>
            )}
            {suggestions.length > 0 ? (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <li key={s.startIso}>
                    <ExpressSlot
                      variant="wide"
                      startIso={s.startIso}
                      day={formatLisbon(new Date(s.startIso), "EEEE, dd 'de' MMMM").replace("-feira", "")}
                      time={formatLisbon(new Date(s.startIso), "HH:mm")}
                      serviceName={habit.serviceName}
                      priceEur={habit.priceEur}
                      city={habit.location === "lisboa" ? "Lisboa" : "Setúbal"}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-ink/80">Não há horários livres nas próximas 3 semanas.</p>
            )}
            <p className="mt-4 text-xs text-muted">
              Escolhe uma hora e confirma. Fica pendente até ser confirmada e, nessa altura,
              recebes um email com a morada.
            </p>
          </>
        ) : (
          <p className="mt-3 text-ink/80">
            Depois da primeira visita, aparecem aqui sugestões com o teu serviço e horário
            habituais, para marcares com um toque.
          </p>
        )}
        <Link href="/marcar" className="btn-ghost px-3 py-1.5 text-sm mt-5">
          {habit ? "Outro serviço ou horário" : "Fazer uma marcação"}
        </Link>
      </Card>

      <LoyaltyCard visits={visits} />
    </ContaShell>
  )
}

function LoyaltyCard({ visits }: { visits: number }) {
  const stamped = Math.min(visits, 6)
  return (
    <Card className="mt-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl">Cartão de cliente</h2>
        <span className="caps text-sm tabular-nums">{stamped}/6</span>
      </div>
      <ol className="mt-5 grid max-w-sm grid-cols-6 gap-2" aria-label={`${stamped} de 6 carimbos`}>
        {Array.from({ length: 6 }, (_, i) => {
          const isFree = i === 5
          const isStamped = i < stamped
          return (
            <li
              key={i}
              className={
                isStamped
                  ? "grid aspect-square place-items-center rounded-full border-2 border-jungle bg-jungle/90 text-paper"
                  : isFree
                    ? "grid aspect-square place-items-center rounded-full border-2 border-ink bg-yellow"
                    : "grid aspect-square place-items-center rounded-full border-2 border-dashed border-ink/30"
              }
            >
              {isStamped ? (
                <span className="text-lg leading-none">★</span>
              ) : isFree ? (
                <span className="caps text-[0.55rem] leading-none">Grátis</span>
              ) : null}
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-sm text-ink/80">
        {visits >= 6
          ? "Cartão completo! Já usaste o teu corte grátis."
          : visits === 5
            ? "O próximo corte é grátis."
            : `Faltam ${5 - visits} ${5 - visits === 1 ? "visita" : "visitas"} para o corte grátis.`}
      </p>
      <p className="mt-1 text-xs text-muted">Conta as visitas marcadas pelo site. Válido apenas para o primeiro cartão.</p>
    </Card>
  )
}
