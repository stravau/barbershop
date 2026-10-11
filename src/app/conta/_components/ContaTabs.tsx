"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/conta", label: "Express" },
  { href: "/conta/marcacoes", label: "Marcações" },
  { href: "/conta/dados", label: "Os meus dados" },
] as const

/** The client area's tabs; the active one follows the URL at once on a click. */
export function ContaTabs() {
  const pathname = usePathname()
  // The tab just clicked shows as active straight away; the URL catches up
  const [clicked, setClicked] = useState<string | null>(null)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setClicked(null)
  }
  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b-2 border-ink">
      {TABS.map((t) => {
        const active = (clicked ?? pathname) === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            onClick={() => setClicked(t.href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "caps -mb-0.5 shrink-0 whitespace-nowrap rounded-t-md border-2 px-3 py-2 text-sm transition sm:px-4",
              active ? "border-ink border-b-paper bg-paper" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
