"use client"

import { useFormStatus } from "react-dom"

/** One express suggestion; disabled while its request is being sent. */
export function SubmitSlotButton({ day, time }: { day: string; time: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-between gap-3 rounded-md border-2 border-ink bg-paper px-4 py-3 text-left transition hover:bg-yellow disabled:opacity-60"
    >
      <span className="first-letter:uppercase">{day}</span>
      <span className="font-display text-xl tabular-nums">{pending ? "…" : time}</span>
    </button>
  )
}
