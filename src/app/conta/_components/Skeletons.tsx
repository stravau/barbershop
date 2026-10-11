// Loading states for the client area, in the shape of each tab: the real
// titles and frames are drawn, only what's still loading shines (.bone).

import { STAMPS_TO_FREE } from "@/lib/loyalty"
import { ExpressFrame } from "./ExpressFrame"

const card = "rounded-lg border-2 border-ink bg-card p-5 shadow-[4px_4px_0_var(--ink)] sm:p-6"

/** The express card while its times load: receipt line and four tickets. */
export function ExpressCardSkeleton() {
  return (
    <ExpressFrame>
      <div aria-label="A procurar horas livres">
        <div className="flex items-center gap-3 border-b-2 border-dashed border-ink/20 bg-paper-dark/50 px-5 py-3 sm:px-6">
          <span className="caps text-xs text-muted">O teu costume</span>
          <span className="bone h-4 w-48 max-w-[50%]" />
        </div>
        <ul className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex h-[70px] items-stretch rounded-md border-2 border-ink/25 bg-paper">
              <span className="flex flex-1 flex-col justify-center gap-2 px-4">
                <span className="bone h-2.5 w-14" />
                <span className="bone h-5 w-20" />
              </span>
              <span aria-hidden="true" className="w-0 border-l-2 border-dashed border-ink/15" />
              <span className="flex items-center px-4">
                <span className="bone h-8 w-20" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ExpressFrame>
  )
}

function LoyaltyCardSkeleton() {
  return (
    <div className={`${card} mt-8`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl sm:text-3xl">Cartão de cliente</h2>
        <span className="bone h-4 w-8" />
      </div>
      <ol className="mt-5 grid max-w-sm grid-cols-7 gap-2" aria-hidden="true">
        {Array.from({ length: STAMPS_TO_FREE + 1 }, (_, i) => (
          <li key={i} className="aspect-square rounded-full border-2 border-dashed border-ink/25" />
        ))}
      </ol>
      <span className="bone mt-4 block h-4 w-2/3" />
    </div>
  )
}

/** Express tab. */
export function ExpressTabSkeleton() {
  return (
    <>
      <ExpressCardSkeleton />
      <LoyaltyCardSkeleton />
    </>
  )
}

/** Marcações tab: upcoming as cards, then the history list. */
export function BookingsTabSkeleton() {
  return (
    <>
      <h2 className="text-2xl sm:text-3xl">Próximas</h2>
      <div className={`${card} mt-4`}>
        <div className="flex items-start justify-between gap-3">
          <span className="bone h-7 w-3/5" />
          <span className="bone h-6 w-24 rounded-full" />
        </div>
        <span className="bone mt-3 block h-4 w-1/2" />
        <span className="bone mt-2 block h-4 w-2/5" />
        <div className="mt-4 flex gap-2">
          <span className="h-8 w-24 rounded-md border-2 border-ink/20" />
          <span className="h-8 w-24 rounded-md border-2 border-ink/20" />
        </div>
      </div>
      <h2 className="mt-12 text-2xl sm:text-3xl">Histórico</h2>
      <ul className="mt-4 divide-y divide-rule border-y-2 border-ink" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex items-center justify-between gap-4 py-3.5">
            <span className="flex flex-col gap-2">
              <span className="bone h-4 w-36" />
              <span className="bone h-3 w-24" />
            </span>
            <span className="bone h-5 w-20 rounded-full" />
          </li>
        ))}
      </ul>
    </>
  )
}

/** Os meus dados tab: the form's fields. */
export function DetailsTabSkeleton() {
  return (
    <div className={card}>
      <div className="space-y-5">
        {["Nome", "Telemóvel", "Email", "Cidade preferida"].map((label) => (
          <div key={label}>
            <span className="mb-1.5 block text-sm font-semibold">{label}</span>
            <span className="block h-[42px] rounded-md border-2 border-ink/20 bg-paper px-3 py-2.5">
              <span className="bone block h-4 w-1/3" />
            </span>
          </div>
        ))}
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Nota para todas as marcações</span>
          <span className="block h-20 rounded-md border-2 border-ink/20 bg-paper" />
        </div>
        <span className="block h-11 w-28 rounded-md border-2 border-ink/20 bg-yellow/40" />
      </div>
    </div>
  )
}
