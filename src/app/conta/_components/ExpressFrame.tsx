import { Zap } from "lucide-react"

/** The express card's frame: a black band with the title on top (card and its skeleton). */
export function ExpressFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border-2 border-ink bg-card shadow-[6px_6px_0_var(--ink)]">
      <h2 className="flex items-center gap-2.5 border-b-2 border-ink bg-ink px-5 py-3.5 text-2xl text-yellow sm:px-6 sm:text-3xl">
        <Zap className="h-6 w-6 fill-yellow" aria-hidden="true" />
        Marcação express
      </h2>
      {children}
    </section>
  )
}
