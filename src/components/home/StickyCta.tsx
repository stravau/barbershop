"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Phones: "Marcar corte" fixed at the bottom of the screen once the hero's
 * button has scrolled out of view (and out of the way again at the footer).
 */
export function StickyCta() {
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
      <Link href="/marcar" className="btn h-14 w-full text-lg">
        Marcar corte <ArrowRight className="h-5 w-5" />
      </Link>
    </div>
  )
}
