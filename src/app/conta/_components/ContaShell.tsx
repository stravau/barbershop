import Link from "next/link"
import { BackLink } from "@/components/BackLink"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/conta", label: "Express" },
  { href: "/conta/marcacoes", label: "Marcações" },
  { href: "/conta/dados", label: "Os meus dados" },
] as const

/** Page frame for the client area: greeting + tabs. */
export function ContaShell({
  name,
  active,
  children,
}: {
  name: string
  active: (typeof TABS)[number]["href"]
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <BackLink href="/" />
      <p className="caps text-sm text-muted">A tua conta</p>
      <h1 className="print-shadow mt-1 text-4xl sm:text-5xl">Olá, {name.split(" ")[0]}!</h1>
      <nav className="mt-6 flex gap-1 overflow-x-auto border-b-2 border-ink">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={cn(
              "caps -mb-0.5 shrink-0 whitespace-nowrap rounded-t-md border-2 px-3 py-2 text-sm transition sm:px-4",
              t.href === active
                ? "border-ink border-b-paper bg-paper"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8">{children}</div>
    </main>
  )
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border-2 border-ink bg-card p-5 shadow-[4px_4px_0_var(--ink)] sm:p-6", className)}>
      {children}
    </div>
  )
}

export function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p
      role="status"
      className={cn(
        "mb-6 rounded-md border-2 px-4 py-3 text-sm font-semibold",
        tone === "ok" ? "border-success bg-success/10 text-success" : "border-danger bg-danger/10 text-danger",
      )}
    >
      {children}
    </p>
  )
}
