"use client"

import { useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { expressBook } from "@/app/conta/actions"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { formatPriceShort } from "@/lib/services"

/**
 * One "Marcação express" time. Tapping it asks first ("Corte para Segunda,
 * 05 de Outubro às 16:00 em Setúbal?"); confirming sends the (pending) request.
 * compact: "Seg 05/10" over the time (home); wide: a ticket with the weekday
 * and date on the stub and the time big (/conta).
 */
export function ExpressSlot({
  startIso,
  day,
  short,
  weekday,
  date,
  time,
  serviceName,
  priceEur,
  city,
  variant,
}: {
  startIso: string
  day: string
  short?: string
  /** wide: "Sexta" */
  weekday?: string
  /** wide: "16 out" */
  date?: string
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
          weekday={weekday}
          date={date}
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
  weekday,
  date,
  time,
  onClick,
}: {
  variant: "compact" | "wide"
  day: string
  short?: string
  weekday?: string
  date?: string
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
      className="group relative flex w-full items-stretch rounded-md border-2 border-ink bg-paper text-left shadow-[3px_3px_0_var(--ink)] transition hover:-translate-x-px hover:-translate-y-px hover:bg-yellow hover:shadow-[4px_4px_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--ink)] disabled:opacity-60"
    >
      {/* Stub: weekday and date */}
      <span className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
        <span className="caps text-[0.7rem] text-muted group-hover:text-ink/70">{weekday ?? day}</span>
        <span className="font-display text-xl leading-tight">{date}</span>
      </span>
      {/* Tear line with a notch at each end */}
      <span aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-ink/30">
        <span className="absolute -top-[9px] -left-[8px] h-3.5 w-3.5 rounded-full border-2 border-ink bg-card [clip-path:inset(50%_0_0_0)]" />
        <span className="absolute -bottom-[9px] -left-[8px] h-3.5 w-3.5 rounded-full border-2 border-ink bg-card [clip-path:inset(0_0_50%_0)]" />
      </span>
      <span className="font-display flex items-center px-4 text-3xl tabular-nums">{pending ? "…" : time}</span>
    </button>
  )
}
