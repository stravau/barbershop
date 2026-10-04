"use client"

import { Wordmark } from "@/components/Wordmark"
import { useStamps } from "./AccountSummary"

const TILT = ["-rotate-12", "rotate-6", "-rotate-3", "rotate-12", "-rotate-6"]

/** The home page's loyalty card: an example, or the signed-in client's own stamps. */
export function StampCard() {
  const { stamped, own } = useStamps(3)

  return (
    <div className="mx-auto w-full max-w-[400px] rotate-2 overflow-hidden rounded-xl border-2 border-ink bg-card shadow-[6px_6px_0_var(--ink)]">
      <div className="h-5 border-b-2 border-ink bg-yellow" aria-hidden="true" />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <Wordmark className="text-[1.4rem]" />
          <span className="caps pt-1 text-xs text-muted">
            {own ? `O teu cartão · ${stamped}/6` : "Cartão de cliente"}
          </span>
        </div>
        <ol
          className="mt-6 grid grid-cols-6 gap-2"
          aria-label={own ? `${stamped} de 6 carimbos` : "Seis carimbos; o sexto corte é grátis"}
        >
          {Array.from({ length: 6 }, (_, i) => {
            const isFree = i === 5
            const isStamped = i < stamped
            return (
              <li
                key={i}
                className={
                  isStamped
                    ? `grid aspect-square place-items-center rounded-full border-2 border-jungle bg-jungle/90 text-paper ${TILT[i] ?? ""}`
                    : isFree
                      ? "grid aspect-square place-items-center rounded-full border-2 border-ink bg-yellow"
                      : "grid aspect-square place-items-center rounded-full border-2 border-dashed border-ink/30"
                }
              >
                {isStamped ? (
                  <span className="text-xl leading-none">★</span>
                ) : isFree ? (
                  <span className="caps text-[0.55rem] leading-none sm:text-[0.6rem]">Grátis</span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
