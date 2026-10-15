"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FreeSlot } from "@/lib/next-slot"
import { shortWhen, slotBookingHref } from "@/lib/booking-links"
import { useSignedIn } from "./AccountSummary"

/**
 * Phones: "Marcar corte" fixed at the bottom of the screen once the hero's
 * button has scrolled out of view (and out of the way again at the footer),
 * with a ticket stub beside it: the next free time — the client's usual one
 * when they have express times — opening that booking at its last step.
 */
export function StickyCta({ nextSlot }: { nextSlot: FreeSlot | null }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const hero = document.getElementById("hero-cta")
    const footer = document.querySelector("footer")
    if (!hero) return
    let heroGone = false
    let atFooter = false
    const update = () => setShow(heroGone && !atFooter)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroGone = !e.isIntersecting && e.boundingClientRect.top < 0
        else atFooter = e.isIntersecting
      }
      update()
    })
    io.observe(hero)
    if (footer) io.observe(footer)
    return () => io.disconnect()
  }, [])

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition duration-300 motion-reduce:transition-none md:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
      inert={!show}
    >
      <div className="flex gap-2">
        <Link href="/marcar" className="btn h-14 min-w-0 flex-1 text-lg">
          Marcar corte <ArrowRight className="h-5 w-5" />
        </Link>
        {/* The generic next slot until the client's own has arrived */}
        <Suspense fallback={nextSlot && <Stub slot={{ services: ["corte"], ...nextSlot }} label="Próxima" />}>
          <ClientStub nextSlot={nextSlot} />
        </Suspense>
      </div>
    </div>
  )
}

/** The client's usual next time when they have express times, else the next free one. */
function ClientStub({ nextSlot }: { nextSlot: FreeSlot | null }) {
  const express = useSignedIn()?.express
  const mine = express?.slots[0]
  if (express && mine) {
    return <Stub slot={{ services: express.services, location: express.location, startIso: mine.startIso, time: mine.time }} label="A tua" />
  }
  return nextSlot ? <Stub slot={{ services: ["corte"], ...nextSlot }} label="Próxima" /> : null
}

/** Ticket stub: "PRÓXIMA · HOJE" over "16:00", in the green of the hero ticket. */
function Stub({
  slot,
  label,
}: {
  slot: { services: readonly string[]; location: string; startIso: string; time: string }
  label: string
}) {
  const when = shortWhen(slot.startIso)
  return (
    <Link
      href={slotBookingHref(slot)}
      aria-label={`${label} vaga: ${when} às ${slot.time}. Marcar`}
      className="flex h-14 shrink-0 flex-col items-center justify-center rounded-md border-2 border-ink bg-jungle px-3 leading-none text-paper shadow-[3px_3px_0_var(--ink)] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--ink)]"
    >
      <span className="caps text-[0.6rem] text-yellow">
        {label} · {when}
      </span>
      <span className="font-display mt-1 text-2xl tabular-nums">{slot.time}</span>
    </Link>
  )
}
