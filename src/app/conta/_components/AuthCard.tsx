import { BackLink } from "@/components/BackLink"

/** Narrow card used by the client sign-in / registration steps. */
export function AuthCard({
  title,
  intro,
  back,
  children,
}: {
  title: string
  intro?: React.ReactNode
  /** Where "Voltar" leads; fixed = always there (not the browser history) */
  back: { href: string; fixed?: boolean }
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <BackLink href={back.href} fixed={back.fixed} />
      <h1 className="print-shadow text-4xl sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 text-ink/80">{intro}</p>}
      <div className="mt-8 rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8">
        {children}
      </div>
    </main>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-danger">{children}</p>
}
