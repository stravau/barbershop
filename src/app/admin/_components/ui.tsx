import Link from "next/link"
import { formatPrice, formatPriceShort } from "@/lib/services"
import { cn } from "@/lib/utils"

const STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Por confirmar", className: "bg-yellow text-ink border-ink" },
  CONFIRMED: { label: "Confirmada", className: "bg-success/10 text-success border-success/40" },
  DONE: { label: "Realizada", className: "bg-ink/5 text-ink/70 border-ink/20" },
  CANCELLED: { label: "Cancelada", className: "bg-danger/10 text-danger border-danger/40" },
}

/** Status badge. Pass `done` for a confirmed booking whose time has passed. */
export function StatusPill({ status, done }: { status: string; done?: boolean }) {
  const cfg = done ? STATUS.DONE : (STATUS[status] ?? STATUS.DONE)
  return (
    <span
      className={cn(
        "caps inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[0.7rem]",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  )
}

/** Service price, plus a small green "+5 €" when a tip was recorded. */
export function PriceWithTip({
  price,
  tip,
  className,
}: {
  price: number
  tip: number
  className?: string
}) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatPrice(price)}
      {tip > 0 && (
        <span
          title="Gorjeta"
          className="ml-1 rounded bg-success/10 px-1 text-xs font-semibold text-success"
        >
          +{formatPriceShort(tip)}
        </span>
      )}
    </span>
  )
}

export function CityTag({ location }: { location: string }) {
  return (
    <span
      className={cn(
        "caps inline-block rounded px-1.5 py-0.5 text-[0.7rem]",
        location === "lisboa" ? "bg-jungle text-paper" : "bg-ink/10 text-ink",
      )}
    >
      {location === "lisboa" ? "Lisboa" : "Setúbal"}
    </span>
  )
}

export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-2xl">{children}</h2>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </div>
  )
}

export function FilterChips({
  options,
}: {
  options: { href: string; label: string; active: boolean }[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          className={cn(
            "rounded-full border px-3 py-1 text-sm transition",
            o.active
              ? "border-ink bg-yellow font-semibold"
              : "border-ink/20 bg-card hover:border-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}

export function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 p-4",
        highlight ? "border-ink bg-yellow/30 shadow-[3px_3px_0_var(--ink)]" : "border-ink/15 bg-card",
      )}
    >
      <div className="caps text-xs text-muted">{label}</div>
      <div className="font-display mt-1 text-xl sm:text-2xl">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-ink/20 p-8 text-center text-muted">
      {children}
    </div>
  )
}
