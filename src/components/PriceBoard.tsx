import Link from "next/link"
import { ChevronRight } from "lucide-react"
import {
  SERVICES,
  discountedCombos,
  formatPriceShort,
  listPrice,
} from "@/lib/services"

/**
 * The price list as a painted sign board. Every row links straight into
 * /marcar with that service (or combo) pre-selected.
 */
export function PriceBoard({ showTitle = true }: { showTitle?: boolean }) {
  const combos = discountedCombos()

  return (
    <div className="rounded-lg border-2 border-ink bg-ink p-1.5 text-paper shadow-[6px_6px_0_var(--yellow)]">
      <div className="rounded-md border border-yellow/60 px-5 py-6 sm:px-8 sm:py-8">
        {showTitle && (
          <h3 className="mb-1 text-center text-3xl text-yellow sm:text-4xl">Preços</h3>
        )}
        <p className="caps text-center text-xs text-paper/60">
          ★ Pagas no fim — MB WAY ou dinheiro ★
        </p>

        <ul className="mt-6 space-y-1">
          {SERVICES.map((s) => (
            <PriceRow
              key={s.id}
              href={`/marcar?services=${s.id}`}
              name={s.name}
              detail={`${s.description} ${s.durationMin} min.`}
              price={formatPriceShort(s.priceEur)}
            />
          ))}
        </ul>

        <div className="caps mt-7 flex items-center gap-3 text-sm text-yellow">
          <span>Combos</span>
          <span className="h-px flex-1 bg-yellow/40" />
        </div>
        <ul className="mt-2 space-y-1">
          {combos.map((c) => {
            const savings = listPrice(c.itemIds) - c.priceEur
            return (
              <PriceRow
                key={c.key}
                href={`/marcar?services=${c.itemIds.join(",")}`}
                name={c.name}
                detail={`${c.durationMin} min · poupas ${formatPriceShort(savings)}`}
                price={formatPriceShort(c.priceEur)}
              />
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function PriceRow({
  href,
  name,
  detail,
  price,
}: {
  href: string
  name: string
  detail: string
  price: string
}) {
  return (
    <li>
      <Link
        href={href}
        className="group -mx-2 block rounded px-2 py-2 transition-colors hover:bg-paper/10"
      >
        <div className="flex items-baseline gap-2">
          <span className="caps text-lg sm:text-xl">{name}</span>
          <span className="min-w-4 flex-1 translate-y-[-0.3em] border-b-2 border-dotted border-paper/35" />
          <span className="font-display shrink-0 whitespace-nowrap text-xl text-yellow sm:text-2xl">
            {price}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-3 text-sm text-paper/60">
          <span>{detail}</span>
          <span className="caps hidden shrink-0 items-center text-xs text-yellow group-hover:inline-flex">
            Marcar <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </li>
  )
}
