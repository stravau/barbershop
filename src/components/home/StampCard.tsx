"use client"

import { Wordmark } from "@/components/Wordmark"
import { STAMPS_TO_FREE } from "@/lib/loyalty"
import { useStamps } from "./AccountSummary"

const TILT = ["-rotate-12", "rotate-6", "-rotate-3", "rotate-12", "-rotate-6", "rotate-3"]

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
            {own ? `O teu cartão · ${Math.min(stamped, STAMPS_TO_FREE)}/${STAMPS_TO_FREE}` : "Cartão de cliente"}
          </span>
        </div>
        <ol
          className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2"
          aria-label={
            own
              ? `${Math.min(stamped, STAMPS_TO_FREE)} de ${STAMPS_TO_FREE} carimbos; o sétimo corte é grátis`
              : "Seis carimbos; o sétimo corte é grátis"
          }
        >
          {/* Six stamps, then the free 7th cut */}
          {Array.from({ length: STAMPS_TO_FREE + 1 }, (_, i) => {
            const isFree = i === STAMPS_TO_FREE
            const isStamped = i < stamped
            return (
              <li
                key={i}
                className={
                  isFree
                    ? "grid aspect-square place-items-center rounded-full border-2 border-ink bg-yellow"
                    : isStamped
                      ? `grid aspect-square place-items-center rounded-full border-2 border-jungle bg-jungle/90 text-paper ${TILT[i] ?? ""}`
                      : "grid aspect-square place-items-center rounded-full border-2 border-dashed border-ink/30"
                }
              >
                {isStamped ? (
                  <span className="text-lg leading-none sm:text-xl">★</span>
                ) : isFree ? (
                  <span className="caps text-[0.5rem] leading-none sm:text-[0.55rem]">Grátis</span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
