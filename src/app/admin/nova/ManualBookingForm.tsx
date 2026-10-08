"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react"
import { SERVICES, buildCombo, formatPrice, validateSelection, type ServiceId } from "@/lib/services"
import { LOCATIONS } from "@/lib/schedule"
import { createManualBooking, type ManualBookingState } from "./actions"

export function ManualBookingForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState<ManualBookingState, FormData>(
    createManualBooking,
    {},
  )
  // Checkboxes are uncontrolled and the selection is read back from the form,
  // so ticks made before hydration still count (the server validates anyway).
  const formRef = useRef<HTMLFormElement>(null)
  const [services, setServices] = useState<ServiceId[]>([])
  const syncServices = () => {
    if (!formRef.current) return
    setServices(new FormData(formRef.current).getAll("services").map(String) as ServiceId[])
  }
  useEffect(() => {
    if (!formRef.current) return
    // Picks up anything ticked before hydration
    const ticked = new FormData(formRef.current).getAll("services").map(String) as ServiceId[]
    if (ticked.length > 0) startTransition(() => setServices(ticked))
  }, [])
  const valid = validateSelection(services)
  const combo = valid.ok ? buildCombo(services) : null

  return (
    <form
      ref={formRef}
      action={formAction}
      // Dispatch by hand once hydrated: a plain form action makes React clear
      // every field afterwards — even when the server answers with an error.
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        startTransition(() => formAction(data))
      }}
      className="space-y-6"
    >
      <fieldset>
        <Legend>Cliente</Legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome *">
            <input name="name" required autoComplete="off" className="input" placeholder="Zeca" />
          </Field>
          <Field label="Telemóvel (opcional)">
            <input name="phone" inputMode="tel" autoComplete="off" className="input" placeholder="912345678" />
          </Field>
          <Field label="Email (opcional)">
            <input name="email" type="email" autoComplete="off" className="input" />
          </Field>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Com o mesmo telemóvel, junta-se ao cliente que já existe.
        </p>
      </fieldset>

      <fieldset>
        <Legend>Serviços *</Legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SERVICES.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border-2 border-ink/20 bg-card px-3 py-2.5 transition hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-yellow/30"
            >
              <input
                type="checkbox"
                name="services"
                value={s.id}
                onChange={syncServices}
                className="h-4 w-4 accent-[var(--ink)]"
              />
              <span className="font-semibold">{s.name}</span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-sm">
          {combo ? (
            <>
              <strong>{combo.name}</strong> · {combo.durationMin} min · {formatPrice(combo.priceEur)}
            </>
          ) : services.length > 0 && !valid.ok ? (
            <span className="text-danger">{valid.error}</span>
          ) : (
            <span className="text-muted">Escolhe um ou mais.</span>
          )}
        </p>
      </fieldset>

      <fieldset>
        <Legend>Onde e quando *</Legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Cidade">
            <div className="flex gap-2">
              {LOCATIONS.map((l, i) => (
                <label
                  key={l.id}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border-2 border-ink/20 bg-card px-3 py-2 has-[:checked]:border-ink has-[:checked]:bg-yellow/30"
                >
                  <input
                    type="radio"
                    name="location"
                    value={l.id}
                    defaultChecked={i === 0}
                    className="accent-[var(--ink)]"
                  />
                  {l.name}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Dia">
            <input name="date" type="date" required defaultValue={today} className="input" />
          </Field>
          <Field label="Hora (opcional)">
            <input name="time" type="time" step={300} className="input" />
          </Field>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Sem hora, fica à hora de abertura dessa cidade nesse dia. Marcações já
          passadas contam logo como realizadas.
        </p>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Gorjeta (opcional)">
          <div className="relative">
            <input name="tip" inputMode="decimal" placeholder="0" className="input pr-8" />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-muted">€</span>
          </div>
        </Field>
        <Field label="Notas (opcional)">
          <textarea name="notes" rows={1} className="input" />
        </Field>
      </div>
      {combo && (
        <p className="-mt-3 text-xs text-muted">
          A gorjeta é o que recebeste a mais do que os {formatPrice(combo.priceEur)} do serviço.
        </p>
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
            Marcar mesmo assim
          </label>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn">
        {pending ? "A guardar…" : "Guardar marcação"}
      </button>
    </form>
  )
}

function Legend({ children }: { children: React.ReactNode }) {
  return <legend className="caps mb-2 text-sm text-muted">{children}</legend>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  )
}
