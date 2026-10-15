"use client"

import { STAMPS_TO_FREE } from "@/lib/loyalty"
import { Suspense, createContext, use, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarCheck, Zap } from "lucide-react"
import { ExpressSlot } from "@/components/ExpressSlot"
import { formatPriceShort } from "@/lib/services"
import { cn } from "@/lib/utils"
import type { AccountSummary } from "@/lib/account-summary"
import type { FreeSlot } from "@/lib/next-slot"
import { shortWhen, slotBookingHref } from "@/lib/booking-links"
import { SESSION_ENDED_EVENT } from "@/lib/nav-events"

// A signed-in client's bits are read on the server while the page renders
// and streamed with it (a promise from page.tsx), so they're in the HTML
// rather than fetched by the browser afterwards. The parts that use them sit
// in Suspense boundaries, so the rest of the page doesn't wait.
const Ctx = createContext<{ summary: Promise<AccountSummary>; ended: boolean } | null>(null)

export function AccountSummaryProvider({
  summary,
  children,
}: {
  summary: Promise<AccountSummary>
  children: React.ReactNode
}) {
  const [ended, setEnded] = useState(false)
  // Signed out from the header/menu while on this page: drop their bits now
  useEffect(() => {
    const onEnded = () => setEnded(true)
    window.addEventListener(SESSION_ENDED_EVENT, onEnded)
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded)
  }, [])
  return <Ctx.Provider value={{ summary, ended }}>{children}</Ctx.Provider>
}

/** The signed-in client's summary, or null (suspends until it has arrived). */
export const useSignedIn = () => {
  const ctx = useContext(Ctx)
  const s = ctx ? use(ctx.summary) : null
  return s?.signedIn && !ctx?.ended ? s : null
}


/** Full-width bar right under the header with the client's next booking. */
export function NextBookingBar() {
  return (
    <Suspense fallback={null}>
      <NextBookingBarInner />
    </Suspense>
  )
}

function NextBookingBarInner() {
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
export function HeroCta({ nextSlot }: { nextSlot: FreeSlot | null }) {
  return (
    <>
      <Link id="hero-cta" href="/marcar" className="btn h-14 w-full text-lg">
        Marcar corte <ArrowRight className="h-5 w-5" />
      </Link>
      <Suspense fallback={null}>
        <HeroExtras nextSlot={nextSlot} />
      </Suspense>
    </>
  )
}

/**
 * Under the button: for clients with express times, the express button (its
 * stub shows the next one); for everyone else the "Próxima vaga" ticket.
 */
function HeroExtras({ nextSlot }: { nextSlot: FreeSlot | null }) {
  const s = useSignedIn()
  const express = s?.express
  if (express && express.slots.length > 0) return <ExpressBox express={express} />
  if (nextSlot) return <NextFreeSlot slot={nextSlot} />
  // Signed in, no ticket to show (no free time soon): what express will do
  if (!s) return null
  return (
    // contain:inline-size — takes the button's width instead of widening the hero column
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
  )
}

/** Phones: "Próxima vaga: hoje às 16:00 em Setúbal" under the main button. */
/** "Próxima vaga" ticket (the slot comes with the page, so it shows at once). */
function NextFreeSlot({ slot }: { slot: FreeSlot }) {
  return (
    // A ticket: "Próxima vaga" with a live dot on the stub, the time big on the
    // right, a dashed tear line with notches between. contain:inline-size:
    // takes the button's width instead of widening the column.
    <Link
      href={slotBookingHref({ services: ["corte"], location: slot.location, startIso: slot.startIso })}
      aria-label={`Próxima vaga: ${slot.label}. Marcar`}
      className="relative mt-3 flex w-full items-stretch rounded-md border-2 border-ink bg-jungle text-left text-paper shadow-[3px_3px_0_var(--ink)] transition [contain:inline-size] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--ink)] md:hidden"
    >
      <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5">
        <span className="caps flex items-center gap-2 text-[0.7rem] text-yellow">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7ee08a] opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#7ee08a]" />
          </span>
          Próxima vaga
        </span>
        <span className="text-sm font-semibold first-letter:uppercase">
          {slot.when} · {slot.city}
        </span>
      </span>
      {/* Tear line with a notch at each end */}
      <span aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-paper/40">
        <span className="absolute -top-[9px] -left-[8px] h-3.5 w-3.5 rounded-full border-2 border-ink bg-paper [clip-path:inset(50%_0_0_0)]" />
        <span className="absolute -bottom-[9px] -left-[8px] h-3.5 w-3.5 rounded-full border-2 border-ink bg-paper [clip-path:inset(0_0_50%_0)]" />
      </span>
      <span className="font-display flex items-center px-4 text-3xl tabular-nums">{slot.time}</span>
    </Link>
  )
}

type Express = NonNullable<Extract<AccountSummary, { signedIn: true }>["express"]>

/**
 * "Marcação express": a button in the style of "Marcar corte" (same height,
 * a little narrower, centred under it) with the usual booking on it. A click
 * presses it in and slides the next free times open below.
 */
function ExpressBox({ express }: { express: Express }) {
  const [open, setOpen] = useState(false)
  return (
    <div data-express className="mt-4 w-11/12 [contain:inline-size]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="express-slots"
        className={cn(
          // Same shape as "Marcar corte", in the box's earlier colours (cream, yellow bolt)
          "btn h-14 w-full gap-3 bg-paper px-4 py-0",
          // Stays pressed in while the times are open
          open && "[transform:translate(3px,3px)] shadow-[1px_1px_0_var(--ink)]",
        )}
      >
        <Zap className="h-5 w-5 shrink-0 fill-yellow" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col text-left leading-tight">
          <span className="text-base">Marcação express</span>
          <span className="truncate text-sm font-bold normal-case">
            {express.serviceName} · {formatPriceShort(express.priceEur)} · {express.city}
          </span>
        </span>
        {/* Ticket stub: the next usual time (all of them slide open below) */}
        <span className="flex h-full shrink-0 flex-col items-end justify-center border-l-2 border-dashed border-ink/40 pl-3 leading-none">
          <span className="caps text-[0.65rem] text-muted">{shortWhen(express.slots[0].startIso)}</span>
          <span className="font-display text-xl tabular-nums">{express.slots[0].time}</span>
        </span>
      </button>
      {/* grid-rows 0fr → 1fr animates the height to fit the content */}
      <div
        id="express-slots"
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        {/* Hidden times can't be tabbed to; visibility flips after the slide */}
        <div className={cn("overflow-hidden transition-[visibility] duration-300", open ? "visible" : "invisible")}>
          <div className="mt-3 mb-1 mr-1 rounded-lg border-2 border-ink bg-card p-2 text-left shadow-[3px_3px_0_var(--ink)] sm:p-3">
            <ul className="grid grid-cols-4 gap-1.5 sm:gap-2">
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
  return s ? { stamped: Math.min(s.visits, STAMPS_TO_FREE + 1), own: true } : { stamped: example, own: false }
}
