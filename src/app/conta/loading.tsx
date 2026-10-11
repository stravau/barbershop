"use client"

import { usePathname } from "next/navigation"
import { BookingsTabSkeleton, DetailsTabSkeleton, ExpressTabSkeleton } from "./_components/Skeletons"

/**
 * Coming into the client area from elsewhere: its frame (greeting and tabs)
 * and the tab's shape; on the sign-in pages, the sign-in card.
 */
export default function ContaEntryLoading() {
  const pathname = usePathname()
  const signIn = pathname.startsWith("/conta/entrar") || pathname.startsWith("/conta/registo")
  if (signIn) {
    return (
      <main role="status" aria-label="A carregar" className="mx-auto max-w-md px-4 py-12 sm:py-16">
        <span className="bone block h-4 w-16" />
        <span className="bone mt-6 block h-12 w-40" />
        <span className="bone mt-5 block h-4 w-full" />
        <span className="bone mt-2 block h-4 w-4/5" />
        <div className="mt-8 rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8">
          <span className="bone block h-4 w-14" />
          <span className="mt-2 block h-[42px] rounded-md border-2 border-ink/20 bg-paper" />
          <span className="mt-4 block h-12 rounded-md border-2 border-ink/20 bg-yellow/40" />
        </div>
      </main>
    )
  }
  const tabs = [
    { href: "/conta", label: "Express" },
    { href: "/conta/marcacoes", label: "Marcações" },
    { href: "/conta/dados", label: "Os meus dados" },
  ]
  return (
    <main role="status" aria-label="A carregar" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <span className="bone block h-4 w-16" />
      <p className="caps mt-4 text-sm text-muted">A tua conta</p>
      <span className="bone mt-2 block h-11 w-56" />
      <div className="mt-6 flex gap-1 border-b-2 border-ink" aria-hidden="true">
        {tabs.map((t) => (
          <span
            key={t.href}
            className={
              pathname === t.href
                ? "caps -mb-0.5 rounded-t-md border-2 border-ink border-b-paper bg-paper px-3 py-2 text-sm sm:px-4"
                : "caps -mb-0.5 border-2 border-transparent px-3 py-2 text-sm text-muted sm:px-4"
            }
          >
            {t.label}
          </span>
        ))}
      </div>
      <div className="mt-8">
        {pathname.startsWith("/conta/marcacoes") ? (
          <BookingsTabSkeleton />
        ) : pathname.startsWith("/conta/dados") ? (
          <DetailsTabSkeleton />
        ) : (
          <ExpressTabSkeleton />
        )}
      </div>
    </main>
  )
}
