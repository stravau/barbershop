"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import { expressBook } from "@/app/conta/actions"
import { SubmitSlotButton } from "@/app/conta/_components/SubmitSlotButton"
import { formatPriceShort } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { AccountSummary } from "@/app/api/conta/resumo/route"

// The home page stays static for everyone; a signed-in client's bits are
// fetched in the browser and filled in once they arrive.
const Ctx = createContext<AccountSummary | null>(null)

export function AccountSummaryProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  useEffect(() => {
    fetch("/api/conta/resumo", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary({ signedIn: false }))
  }, [])
  return <Ctx.Provider value={summary}>{children}</Ctx.Provider>
}

const useSignedIn = () => {
  const s = useContext(Ctx)
  return s?.signedIn ? s : null
}

type SignedIn = Extract<AccountSummary, { signedIn: true }>

/** Top of the home page for a signed-in client: next booking + express booking. */
export function AccountSection() {
  const s = useSignedIn()
  if (!s) return null

  return (
    <section className="border-b-2 border-ink bg-paper-dark">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10">
        <p className="caps text-sm text-muted">A tua área</p>
        {/* Phones already greet in the header */}
        <h2 className="mt-1 hidden text-3xl md:block">Olá, {s.firstName}</h2>
        <div className="mt-4 grid gap-5 md:mt-6 md:grid-cols-[1fr_1.6fr] md:gap-6">
          <NextBooking next={s.next} hasExpress={!!s.express?.slots.length} />
          <Express express={s.express} />
        </div>
      </div>
    </section>
  )
}

const card = "rounded-lg border-2 border-ink bg-card p-5 shadow-[4px_4px_0_var(--ink)] sm:p-6"

function NextBooking({ next, hasExpress }: { next: SignedIn["next"]; hasExpress: boolean }) {
  return (
    <div className={cn(card, "flex flex-col")}>
      <p className="caps text-xs text-muted">Próxima marcação</p>
      {next ? (
        <>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
            <p className="font-display text-xl leading-tight sm:text-2xl">{next.day}</p>
            <span
              className={cn(
                "caps shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs",
                next.status === "CONFIRMED" ? "bg-success text-paper" : "bg-yellow",
              )}
            >
              {next.status === "CONFIRMED" ? "Confirmada" : "Pendente"}
            </span>
          </div>
          <p className="font-display mt-1 text-4xl tabular-nums">{next.time}</p>
          <p className="mt-2 text-ink/80">
            {next.serviceName} · {formatPriceShort(next.priceEur)} · {next.city}
          </p>
          <Link href="/conta/marcacoes" className="link mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold">
            Ver as minhas marcações <ArrowRight className="h-4 w-4" />
          </Link>
        </>
      ) : (
        <>
          <p className="font-display mt-2 text-xl">Nada marcado.</p>
          <p className="mt-2 text-ink/80">
            {hasExpress ? "Escolhe uma das horas sugeridas — um toque e está pedido." : "Marca a tua próxima visita em menos de 1 minuto."}
          </p>
          <Link href="/conta/marcacoes" className="link mt-auto pt-4 text-sm font-semibold">
            Histórico de marcações
          </Link>
        </>
      )}
    </div>
  )
}

function Express({ express }: { express: SignedIn["express"] }) {
  return (
    <div className={card}>
      <h3 className="flex items-center gap-2 text-2xl">
        <Zap className="h-6 w-6 fill-yellow" aria-hidden="true" />
        Marcação express
      </h3>
      {express ? (
        <>
          <p className="mt-2 text-ink/80">
            O costume: <strong>{express.serviceName}</strong> · {formatPriceShort(express.priceEur)} · {express.city}
          </p>
          {express.slots.length > 0 ? (
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {express.slots.map((slot) => (
                <li key={slot.startIso}>
                  <form action={expressBook}>
                    <input type="hidden" name="startIso" value={slot.startIso} />
                    <SubmitSlotButton day={slot.day} time={slot.time} />
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-ink/80">Não há horários livres nas próximas 3 semanas.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-xs text-muted">Fica pendente até ser confirmada.</p>
            <Link href="/marcar" className="link text-sm font-semibold">
              Outro serviço ou horário
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-ink/80">
            Depois da primeira visita, aparecem aqui o teu serviço e horários habituais para marcares com um
            toque.
          </p>
          <Link href="/marcar" className="btn mt-4">
            Fazer marcação <ArrowRight className="h-5 w-5" />
          </Link>
        </>
      )}
    </div>
  )
}

/** Hero button: "Marcação express" for clients with a history, else "Marcar corte". */
export function HeroCta() {
  const s = useSignedIn()
  return s?.express ? (
    <Link href="/conta" className="btn w-full text-lg">
      <Zap className="h-5 w-5 fill-ink" aria-hidden="true" /> Marcação express
    </Link>
  ) : (
    <Link href="/marcar" className="btn w-full text-lg">
      Marcar corte <ArrowRight className="h-5 w-5" />
    </Link>
  )
}

/** Stamps on the home page's loyalty card: the client's own, or the example. */
export function useStamps(example: number): { stamped: number; own: boolean } {
  const s = useSignedIn()
  return s ? { stamped: Math.min(s.visits, 6), own: true } : { stamped: example, own: false }
}
