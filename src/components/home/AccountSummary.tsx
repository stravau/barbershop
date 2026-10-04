"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"
import { ArrowRight, CalendarCheck, Zap } from "lucide-react"
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


/** Full-width bar right under the header with the client's next booking. */
export function NextBookingBar() {
  const next = useSignedIn()?.next
  if (!next) return null

  return (
    <Link
      href="/conta/marcacoes"
      className="group block border-b-2 border-ink bg-jungle text-paper"
      aria-label={`Próxima marcação: ${next.day} às ${next.time}. Ver as minhas marcações`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-x-3 px-4 py-2.5 text-sm sm:px-6">
        <CalendarCheck className="h-5 w-5 shrink-0 text-yellow" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="caps hidden text-xs text-paper/70 sm:inline">Próxima marcação</span>
          <span className="font-display text-base">
            <span className="sm:hidden">{next.short}</span>
            <span className="hidden sm:inline">{next.day}</span> · <span className="tabular-nums">{next.time}</span>
          </span>
          <span className="hidden text-paper/80 md:inline">
            {next.serviceName} · {formatPriceShort(next.priceEur)} · {next.city}
          </span>
          <span
            className={cn(
              "caps rounded-full border-2 px-2 py-px text-[0.65rem]",
              next.status === "CONFIRMED" ? "border-paper bg-success" : "border-ink bg-yellow text-ink",
            )}
          >
            {next.status === "CONFIRMED" ? "Confirmada" : "Pendente"}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 font-semibold group-hover:underline">
          <span className="hidden sm:inline">Ver marcações</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

/**
 * Hero: the main "Marcar corte" button and, for clients with a history,
 * their usual booking at the next free times right under it (one tap each).
 */
export function HeroCta() {
  const express = useSignedIn()?.express
  return (
    <>
      <Link href="/marcar" className="btn w-full text-lg">
        Marcar corte <ArrowRight className="h-5 w-5" />
      </Link>
      {express && express.slots.length > 0 && (
        <div className="mt-4 w-full rounded-lg border-2 border-ink bg-card p-3 text-left shadow-[3px_3px_0_var(--ink)]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-display flex items-center gap-1.5">
              <Zap className="h-4 w-4 fill-yellow" aria-hidden="true" />
              Marcação express
            </p>
            <p className="text-xs text-ink/70">
              {express.serviceName} · {formatPriceShort(express.priceEur)} · {express.city}
            </p>
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {express.slots.map((slot) => (
              <li key={slot.startIso}>
                <form action={expressBook}>
                  <input type="hidden" name="startIso" value={slot.startIso} />
                  <SlotButton short={slot.short} day={slot.day} time={slot.time} />
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Um toque faz o pedido · fica pendente até ser confirmado.</p>
        </div>
      )}
    </>
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
      className="w-full rounded-md border-2 border-ink bg-paper px-1.5 py-1 text-center transition hover:bg-yellow disabled:opacity-60"
    >
      <span className="block text-xs text-ink/80">{short}</span>
      <span className="font-display block text-lg leading-tight tabular-nums">{pending ? "…" : time}</span>
    </button>
  )
}

/** Stamps on the home page's loyalty card: the client's own, or the example. */
export function useStamps(example: number): { stamped: number; own: boolean } {
  const s = useSignedIn()
  return s ? { stamped: Math.min(s.visits, 6), own: true } : { stamped: example, own: false }
}
