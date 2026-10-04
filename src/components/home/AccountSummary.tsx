"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarCheck, ChevronDown, Zap } from "lucide-react"
import { ExpressSlot } from "@/components/ExpressSlot"
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
  const s = useSignedIn()
  const express = s?.express
  return (
    <>
      <Link href="/marcar" className="btn w-full text-lg">
        Marcar corte <ArrowRight className="h-5 w-5" />
      </Link>
      {/* contain:inline-size — the boxes take the button's width instead of widening the hero column */}
      {s && !express?.slots.length && (
        <div data-express className="mt-4 w-full rounded-lg border-2 border-dashed border-ink/40 p-3 text-left [contain:inline-size]">
          <p className="font-display flex items-center gap-1.5">
            <Zap className="h-4 w-4 fill-yellow" aria-hidden="true" />
            Marcação express
          </p>
          <p className="mt-1 text-xs text-ink/70">
            {express
              ? "Não há horas livres para o teu serviço habitual nas próximas 3 semanas."
              : "Depois da tua primeira marcação, aparecem aqui as tuas horas habituais para marcares com um toque."}
          </p>
        </div>
      )}
      {express && express.slots.length > 0 && <ExpressBox express={express} />}
    </>
  )
}

type Express = NonNullable<Extract<AccountSummary, { signedIn: true }>["express"]>

/**
 * The usual booking and its next free times. On phones it starts closed,
 * showing just the usual booking; a tap slides the times open. Always open
 * from sm up.
 */
function ExpressBox({ express }: { express: Express }) {
  const [open, setOpen] = useState(false)
  return (
    <div data-express className="mt-4 w-full rounded-lg border-2 border-ink bg-card text-left shadow-[3px_3px_0_var(--ink)] [contain:inline-size]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="express-slots"
        className="flex w-full items-center justify-between gap-3 p-3 text-left sm:pointer-events-none sm:pb-0"
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-display flex items-center gap-1.5">
            <Zap className="h-4 w-4 fill-yellow" aria-hidden="true" />
            Marcação express
          </span>
          <span className="text-xs text-ink/70">
            {express.serviceName} · {formatPriceShort(express.priceEur)} · {express.city}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("h-5 w-5 shrink-0 transition-transform duration-300 sm:hidden", open && "rotate-180")}
        />
      </button>
      {/* grid-rows 0fr → 1fr animates the height to fit the content */}
      <div
        id="express-slots"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none sm:grid-rows-[1fr]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* Hidden times can't be tabbed to on phones; visibility flips after the slide */}
        <div
          className={cn(
            "overflow-hidden transition-[visibility] duration-300",
            open ? "visible" : "invisible sm:visible",
          )}
        >
          <div className="px-3 pt-2 pb-3">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {express.slots.map((slot) => (
                <li key={slot.startIso}>
                  <ExpressSlot
                    variant="compact"
                    startIso={slot.startIso}
                    day={slot.day}
                    short={slot.short}
                    time={slot.time}
                    serviceName={express.serviceName}
                    priceEur={express.priceEur}
                    city={express.city}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Escolhe uma hora e confirma · fica pendente até ser confirmada.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Stamps on the home page's loyalty card: the client's own, or the example. */
export function useStamps(example: number): { stamped: number; own: boolean } {
  const s = useSignedIn()
  return s ? { stamped: Math.min(s.visits, 6), own: true } : { stamped: example, own: false }
}
