"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"
import { ArrowRight, Zap } from "lucide-react"
import { expressBook } from "@/app/conta/actions"
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
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:py-6">
        <p className="caps text-xs text-muted">
          A tua área
          {/* Phones already greet in the header */}
          <span className="hidden md:inline"> · Olá, {s.firstName}</span>
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_3fr] md:gap-4">
          <NextBooking next={s.next} />
          <Express express={s.express} />
        </div>
      </div>
    </section>
  )
}

const card = "rounded-lg border-2 border-ink bg-card p-4 shadow-[3px_3px_0_var(--ink)]"

function NextBooking({ next }: { next: SignedIn["next"] }) {
  return (
    <div className={cn(card, "flex flex-col")}>
      <div className="flex items-center justify-between gap-2">
        <p className="caps text-xs text-muted">Próxima marcação</p>
        {next && (
          <span
            className={cn(
              "caps shrink-0 rounded-full border-2 border-ink px-2 py-px text-[0.65rem]",
              next.status === "CONFIRMED" ? "bg-success text-paper" : "bg-yellow",
            )}
          >
            {next.status === "CONFIRMED" ? "Confirmada" : "Pendente"}
          </span>
        )}
      </div>
      {next ? (
        <>
          <p className="font-display mt-1.5 text-lg leading-snug">
            {next.day} · <span className="tabular-nums">{next.time}</span>
          </p>
          <p className="text-sm text-ink/80">
            {next.serviceName} · {formatPriceShort(next.priceEur)} · {next.city}
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-ink/80">Nada marcado.</p>
      )}
      <Link href="/conta/marcacoes" className="link mt-auto inline-flex items-center gap-1 self-start pt-2 text-sm font-semibold">
        {next ? "Ver marcações" : "Histórico"} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function Express({ express }: { express: SignedIn["express"] }) {
  return (
    <div className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h3 className="flex items-center gap-1.5 text-lg">
          <Zap className="h-4 w-4 fill-yellow" aria-hidden="true" />
          Marcação express
        </h3>
        {express && (
          <p className="text-sm text-ink/80">
            {express.serviceName} · {formatPriceShort(express.priceEur)} · {express.city}
          </p>
        )}
      </div>
      {express ? (
        <>
          {express.slots.length > 0 ? (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {express.slots.map((slot) => (
                <li key={slot.startIso}>
                  <form action={expressBook}>
                    <input type="hidden" name="startIso" value={slot.startIso} />
                    <SlotButton short={slot.short} day={slot.day} time={slot.time} />
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink/80">Não há horários livres nas próximas 3 semanas.</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p className="text-xs text-muted">Um toque faz o pedido · fica pendente até ser confirmado.</p>
            <Link href="/marcar" className="link text-sm font-semibold">
              Outro serviço ou hora
            </Link>
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink/80">Depois da primeira visita, as tuas horas habituais aparecem aqui.</p>
          <Link href="/marcar" className="btn btn-sm">
            Fazer marcação
          </Link>
        </div>
      )}
    </div>
  )
}

/** One express time: "Seg 05/10" over "13:00"; disabled while its request is sent. */
function SlotButton({ short, day, time }: { short: string; day: string; time: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Marcar ${day} às ${time}`}
      className="w-full rounded-md border-2 border-ink bg-paper px-2 py-1.5 text-center transition hover:bg-yellow disabled:opacity-60"
    >
      <span className="block text-xs text-ink/80">{short}</span>
      <span className="font-display block text-lg leading-tight tabular-nums">{pending ? "…" : time}</span>
    </button>
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
