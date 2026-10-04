"use client"

import { useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { expressBook } from "@/app/conta/actions"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { formatPriceShort } from "@/lib/services"
import { cn } from "@/lib/utils"

/**
 * One "Marcação express" time. Tapping it asks first ("Corte para Segunda,
 * 05 de Outubro às 16:00 em Setúbal?"); confirming sends the (pending) request.
 * compact: "Seg 05/10" over the time (home); wide: day left, time right (/conta).
 */
export function ExpressSlot({
  startIso,
  day,
  short,
  time,
  serviceName,
  priceEur,
  city,
  variant,
}: {
  startIso: string
  day: string
  short?: string
  time: string
  serviceName: string
  priceEur: number
  city: string
  variant: "compact" | "wide"
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [asking, setAsking] = useState(false)

  return (
    <>
      <form ref={formRef} action={expressBook}>
        <input type="hidden" name="startIso" value={startIso} />
        <SlotFace
          variant={variant}
          day={day}
          short={short}
          time={time}
          onClick={() => setAsking(true)}
        />
      </form>
      <ConfirmDialog
        open={asking}
        title="Marcação express"
        confirmLabel="Sim, marcar"
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          formRef.current?.requestSubmit()
        }}
      >
        <p>
          Queres marcar <strong>{serviceName}</strong> para{" "}
          <strong>
            {day} às {time}
          </strong>{" "}
          em <strong>{city}</strong>?
        </p>
        <p className="mt-2 text-sm text-muted">
          {formatPriceShort(priceEur)} · Fica pendente até ser confirmada e recebes um email nessa altura.
        </p>
      </ConfirmDialog>
    </>
  )
}

/** The button itself; shows "…" while its request is being sent. */
function SlotFace({
  variant,
  day,
  short,
  time,
  onClick,
}: {
  variant: "compact" | "wide"
  day: string
  short?: string
  time: string
  onClick: () => void
}) {
  const { pending } = useFormStatus()
  const label = `Marcar ${day} às ${time}`

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={label}
        className="w-full rounded-md border-2 border-ink bg-paper px-0.5 py-1 text-center transition hover:bg-yellow disabled:opacity-60 sm:px-1.5"
      >
        <span className="block text-[clamp(0.58rem,2.9vw,0.75rem)] whitespace-nowrap text-ink/80">{short ?? day}</span>
        <span className="font-display block text-[clamp(0.9rem,4.6vw,1.125rem)] leading-tight tabular-nums">
          {pending ? "…" : time}
        </span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-label={label}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border-2 border-ink bg-paper px-4 py-3 text-left transition hover:bg-yellow disabled:opacity-60",
      )}
    >
      <span className="first-letter:uppercase">{day}</span>
      <span className="font-display text-xl tabular-nums">{pending ? "…" : time}</span>
    </button>
  )
}
