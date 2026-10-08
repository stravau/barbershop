"use client"

import { startTransition, useActionState } from "react"
import { SERVICES } from "@/lib/services"
import { LOCATIONS } from "@/lib/schedule"
import { rescheduleBooking, type RescheduleState } from "./actions"

/**
 * "Mudar dia, hora ou serviço" on the booking page. Starts closed; on an
 * overlap it says with whom and offers "Mudar mesmo assim".
 */
export function RescheduleForm({
  id,
  token,
  date,
  time,
  location,
  services,
  hasEmail,
}: {
  id: string
  token: string
  date: string
  time: string
  location: string
  services: string[]
  hasEmail: boolean
}) {
  const [state, formAction, pending] = useActionState<RescheduleState, FormData>(rescheduleBooking, {})

  return (
    <details className="group mt-7 border-t-2 border-ink pt-5" open={!!(state.error || state.overlap)}>
      <summary className="caps cursor-pointer list-none text-xs text-muted hover:text-ink">
        <span className="mr-1 inline-block transition group-open:rotate-90">▸</span>
        Mudar dia, hora ou serviço
      </summary>
      <form
        action={formAction}
        // Dispatch by hand once hydrated: a plain form action makes React clear
        // every field afterwards, even when the answer is a warning
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          startTransition(() => formAction(data))
        }}
        className="mt-4 space-y-4"
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="token" value={token} />

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Dia</span>
            <input name="date" type="date" required defaultValue={date} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Hora</span>
            <input name="time" type="time" step={300} required defaultValue={time} className="input" />
          </label>
          <div>
            <span className="mb-1 block text-sm font-semibold">Cidade</span>
            <div className="flex gap-2">
              {LOCATIONS.map((l) => (
                <label
                  key={l.id}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border-2 border-ink/20 bg-card px-3 py-2 has-[:checked]:border-ink has-[:checked]:bg-yellow/30"
                >
                  <input
                    type="radio"
                    name="location"
                    value={l.id}
                    defaultChecked={l.id === location}
                    className="accent-[var(--ink)]"
                  />
                  {l.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="mb-1 block text-sm font-semibold">Serviços</span>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-ink/20 bg-card px-3 py-1.5 has-[:checked]:border-ink has-[:checked]:bg-yellow/30"
              >
                <input
                  type="checkbox"
                  name="services"
                  value={s.id}
                  defaultChecked={services.includes(s.id)}
                  className="accent-[var(--ink)]"
                />
                {s.name}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Com os mesmos serviços, o preço fica igual.</p>
        </div>

        {hasEmail ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked className="accent-[var(--ink)]" />
            Avisar o cliente por email
          </label>
        ) : (
          <p className="text-sm text-muted">Este cliente não tem email: avisa-o tu.</p>
        )}

        {state.error && (
          <p className="rounded-md border-2 border-danger/50 bg-danger/10 px-3 py-2 font-semibold text-danger">
            {state.error}
          </p>
        )}
        {state.overlap && (
          <div className="rounded-md border-2 border-ink bg-yellow/30 px-3 py-2">
            <p className="font-semibold">Já há uma marcação a essa hora: {state.overlap}.</p>
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" name="force" className="accent-[var(--ink)]" />
              Mudar mesmo assim
            </label>
          </div>
        )}

        <button type="submit" disabled={pending} className="btn btn-sm">
          {pending ? "A guardar…" : "Guardar mudança"}
        </button>
      </form>
    </details>
  )
}
