"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/admin", label: "Agenda", match: (p: string) => p === "/admin" || p.startsWith("/admin/booking") || p.startsWith("/admin/nova") },
  { href: "/admin/historico", label: "Histórico", match: (p: string) => p.startsWith("/admin/historico") },
  { href: "/admin/clientes", label: "Clientes", match: (p: string) => p.startsWith("/admin/clientes") },
  { href: "/admin/dashboard", label: "Números", match: (p: string) => p.startsWith("/admin/dashboard") },
]

/**
 * Admin tabs shown in the site header on /admin pages (instead of the
 * public links). The active tab opens into the page below the header line.
 */
export function AdminHeaderNav({ pathname }: { pathname: string }) {
  const [pending, setPending] = useState(0)

  // Badge with requests waiting for confirmation; refreshed on navigation
  useEffect(() => {
    let cancelled = false
    fetch("/api/admin/pending-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => {
        if (!cancelled) setPending(d.count ?? 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pathname])

  return (
    <div className="-mb-3 flex min-w-0 flex-1 items-end justify-between gap-1 self-stretch sm:flex-none sm:justify-end sm:gap-3">
      <nav className="flex min-w-0 items-end gap-0.5 overflow-x-auto sm:gap-1">
        {TABS.map((t) => {
          const active = t.match(pathname)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "caps relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-2 border-b-0 px-1.5 pt-2 pb-2.5 text-[0.75rem] transition min-[380px]:px-2 min-[380px]:text-[0.8rem] sm:px-4 sm:text-[0.95rem]",
                active ? "z-10 border-ink bg-paper" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
              {t.href === "/admin" && pending > 0 && (
                <span className="rounded-full bg-yellow px-1.5 text-xs text-ink ring-1 ring-ink">
                  {pending}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <a
        href="/api/admin/auth/logout"
        title="Sair"
        className="mb-3 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </a>
    </div>
  )
}
