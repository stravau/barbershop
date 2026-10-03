"use client"

import { useActionState, useState } from "react"
import { SERVICES, buildCombo, formatPrice, validateSelection, type ServiceId } from "@/lib/services"
import { LOCATIONS } from "@/lib/schedule"
import { cn } from "@/lib/utils"
import { createManualBooking, type ManualBookingState } from "./actions"

export function ManualBookingForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState<ManualBookingState, FormData>(
    createManualBooking,
    {},
  )
  const [services, setServices] = useState<ServiceId[]>([])
  const valid = validateSelection(services)
  const combo = valid.ok ? buildCombo(services) : null

  return (
    <form action={formAction} className="space-y-6">
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
          {SERVICES.map((s) => {
            const checked = services.includes(s.id)
            return (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border-2 px-3 py-2.5 transition",
                  checked ? "border-ink bg-yellow/30" : "border-ink/20 bg-card hover:border-ink",
                )}
              >
                <input
                  type="checkbox"
                  name="services"
                  value={s.id}
                  checked={checked}
                  onChange={() =>
                    setServices((prev) =>
                      prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                    )
                  }
                  className="h-4 w-4 accent-[var(--ink)]"
                />
                <span className="font-semibold">{s.name}</span>
              </label>
            )
          })}
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

      <Field label="Notas (opcional)">
        <textarea name="notes" rows={2} className="input" />
      </Field>

      {state.error && (
        <p className="rounded-md border-2 border-danger/50 bg-danger/10 px-3 py-2 font-semibold text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || !combo} className="btn">
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
