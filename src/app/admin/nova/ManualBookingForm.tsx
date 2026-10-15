"use client"

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react"
import { Check } from "lucide-react"
import { SERVICES, buildCombo, formatPrice, validateSelection, type ServiceId } from "@/lib/services"
import { LOCATIONS } from "@/lib/schedule"
import { formatLisbon } from "@/lib/tz"
import type { ClientHint } from "@/lib/client-directory"
import { matchClients } from "@/lib/client-match"
import { createManualBooking, type ManualBookingState } from "./actions"

/** "351912345678" -> "912345678" (how it's typed here) */
const localPhone = (phone: string) => (phone.startsWith("351") ? phone.slice(3) : phone)

export function ManualBookingForm({ today, clients }: { today: string; clients: ClientHint[] }) {
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

  // The client: typed, or picked from the suggestions (fills everything they usually book)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [picked, setPicked] = useState<ClientHint | null>(null)
  const [typingIn, setTypingIn] = useState<"name" | "phone" | null>(null)
  const [highlight, setHighlight] = useState(0)
  const listId = useId()
  const query = typingIn === "name" ? name : typingIn === "phone" ? phone : ""
  const suggestions = picked ? [] : matchClients(clients, query)

  function pick(c: ClientHint) {
    setName(c.name)
    setPhone(localPhone(c.phone))
    setEmail(c.email ?? "")
    setPicked(c)
    setTypingIn(null)
    const form = formRef.current
    if (!form) return
    // Their usual services and city (a starting point — change freely)
    if (c.services.length > 0) {
      form.querySelectorAll<HTMLInputElement>('input[name="services"]').forEach((box) => {
        box.checked = c.services.includes(box.value)
      })
      syncServices()
    }
    if (c.location) {
      const radio = form.querySelector<HTMLInputElement>(`input[name="location"][value="${c.location}"]`)
      if (radio) radio.checked = true
    }
  }
  function forget() {
    setPicked(null)
    setName("")
    setPhone("")
    setEmail("")
  }
  /** Arrow keys / Enter / Esc in the name and phone fields */
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length === 0) return
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      const step = e.key === "ArrowDown" ? 1 : -1
      setHighlight((h) => (h + step + suggestions.length) % suggestions.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      pick(suggestions[Math.min(highlight, suggestions.length - 1)])
    } else if (e.key === "Escape") {
      setTypingIn(null)
    }
  }

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
            <input
              name="name"
              required
              autoComplete="off"
              className="input"
              placeholder="Zeca"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setHighlight(0)
                if (picked && e.target.value !== picked.name) setPicked(null)
              }}
              role="combobox"
              aria-expanded={typingIn === "name" && suggestions.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              onFocus={() => setTypingIn("name")}
              // (a click on a suggestion lands first: the options cancel mousedown)
              onBlur={() => setTypingIn(null)}
              onKeyDown={onKeyDown}
            />
          </Field>
          <Field label="Telemóvel (opcional)">
            <input
              name="phone"
              inputMode="tel"
              autoComplete="off"
              className="input"
              placeholder="912345678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setHighlight(0)
                if (picked && e.target.value !== localPhone(picked.phone)) setPicked(null)
              }}
              role="combobox"
              aria-expanded={typingIn === "phone" && suggestions.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              onFocus={() => setTypingIn("phone")}
              // (a click on a suggestion lands first: the options cancel mousedown)
              onBlur={() => setTypingIn(null)}
              onKeyDown={onKeyDown}
            />
          </Field>
          <Field label="Email (opcional)">
            <input name="email" type="email" autoComplete="off" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        {/* Clients that match what's being typed */}
        {typingIn && suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Clientes parecidos"
            className="mt-2 divide-y divide-ink/10 overflow-hidden rounded-md border-2 border-ink bg-paper shadow-[3px_3px_0_var(--ink)]"
          >
            {suggestions.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === highlight}
                // mousedown would blur the field and close the list before the click
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setHighlight(i)}
                className={`cursor-pointer px-3 py-2 ${i === highlight ? "bg-yellow/40" : ""}`}
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-muted">
                  {c.phone && <> · {localPhone(c.phone)}</>}
                  {c.serviceName && <> · {c.serviceName}</>}
                  {c.location && <> · {c.location === "lisboa" ? "Lisboa" : "Setúbal"}</>}
                  {" · "}
                  {c.visits === 1 ? "1 visita" : `${c.visits} visitas`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {picked ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-success/10 px-3 py-2 text-sm">
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            <span>
              <strong>{picked.name}</strong>, cliente já registado
              {picked.visits > 0 && <> · {picked.visits === 1 ? "1 visita" : `${picked.visits} visitas`}</>}
              {picked.lastVisit && <>, a última a {formatLisbon(new Date(picked.lastVisit), "dd/MM")}</>}
              {picked.serviceName && <> · costuma: {picked.serviceName}</>}
            </span>
            <button type="button" onClick={forget} className="ml-auto text-sm font-semibold underline-offset-4 hover:underline">
              Não é este
            </button>
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted">
            Escreve o nome ou o número: aparecem os clientes parecidos. Com o mesmo telemóvel, junta-se ao cliente que já existe.
          </p>
        )}
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
