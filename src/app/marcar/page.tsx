"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ChevronRight, Check, AlertCircle } from "lucide-react"
import {
  BOOKING_WINDOW_DAYS,
  DAY_SHORT,
  LOCATIONS,
  openDaysSummary,
  upcomingOpenDates,
  ymdDayOfWeek,
  ymdPlusDays,
  type LocationId,
} from "@/lib/schedule"
import {
  SERVICES,
  buildCombo,
  validateSelection,
  formatPrice,
  priceInSelection,
  parseServicesParam,
  type ServiceId,
  type Combo,
} from "@/lib/services"
import { formatLisbon } from "@/lib/tz"
import { whatsappUrl } from "@/lib/site"
import { BackLink } from "@/components/BackLink"
import { cn } from "@/lib/utils"

// The flow lives in the URL (?services=…&cidade=…&dia=…&hora=…&passo=…):
// the phone's back button goes back a step, and signing in on the last step
// comes back to it with everything still chosen.
type Step = "servico" | "quando" | "confirmar"

interface Choice {
  services: ServiceId[]
  location?: LocationId
  date?: string
  slotIso?: string
}

interface SuccessPayload {
  bookingId: string
  clientToken: string
  whenLocal: string
  serviceName: string
  priceEur: number
  location: LocationId
}

/** Days shown before "Ver mais dias". */
const DAYS_SHOWN = 14
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
/** Notes survive going back a step and the trip to the sign-in page. */
const NOTES_KEY = "marcar-notas"

const todayLisbon = () => formatLisbon(new Date(), "yyyy-MM-dd")
const noonUtc = (ymd: string) => new Date(`${ymd}T12:00:00Z`)

const STEPS: Step[] = ["servico", "quando", "confirmar"]

const STEP_LABEL: Record<Step, string> = {
  servico: "Serviço",
  quando: "Cidade, dia e hora",
  confirmar: "Confirmar",
}

const cityName = (id: LocationId) => (id === "lisboa" ? "Lisboa" : "Setúbal")
const otherCity = (id: LocationId): LocationId => (id === "lisboa" ? "setubal" : "lisboa")

function readNotes(): string {
  try {
    return sessionStorage.getItem(NOTES_KEY) ?? ""
  } catch {
    return ""
  }
}

function writeNotes(notes: string): void {
  try {
    if (notes) sessionStorage.setItem(NOTES_KEY, notes)
    else sessionStorage.removeItem(NOTES_KEY)
  } catch {}
}

function choiceUrl(choice: Choice, step: Step): string {
  const q = new URLSearchParams()
  if (choice.services.length > 0) q.set("services", choice.services.join(","))
  if (choice.location) q.set("cidade", choice.location)
  if (choice.date) q.set("dia", choice.date)
  if (choice.slotIso) q.set("hora", choice.slotIso)
  q.set("passo", step)
  return `/marcar?${q}`
}

export default function MarcarPage() {
  return (
    <Suspense fallback={<MarcarFallback />}>
      <MarcarFlow />
    </Suspense>
  )
}

function MarcarFallback() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 text-muted sm:px-6">
      A carregar…
    </main>
  )
}

function MarcarFlow() {
  const params = useSearchParams()
  const router = useRouter()
  const [success, setSuccess] = useState<SuccessPayload | null>(null)

  // Everything chosen so far comes from the URL
  const services = parseServicesParam(params.get("services")) as ServiceId[]
  const servicesOk = services.length > 0 && validateSelection(services).ok
  const cidade = params.get("cidade")
  const location = cidade === "lisboa" || cidade === "setubal" ? cidade : undefined
  const dia = params.get("dia") ?? ""
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined
  const hora = params.get("hora") ?? ""
  const slotIso = !Number.isNaN(Date.parse(hora)) ? hora : undefined
  const choice: Choice = { services: servicesOk ? services : [], location, date, slotIso }

  const passo = params.get("passo")
  const step: Step =
    !servicesOk || passo === "servico"
      ? "servico"
      : passo === "confirmar" && location && slotIso
        ? "confirmar"
        : "quando"

  // A new step: start at its title (screen readers too)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    document.getElementById("marcar-passo")?.focus({ preventScroll: true })
  }, [step, success])

  /** A new step = a new history entry, so "back" returns to the previous one. */
  const goTo = (next: Choice, nextStep: Step) => router.push(choiceUrl(next, nextStep))
  /** Choices inside a step (city, day) only update the URL. */
  const update = (next: Choice) => router.replace(choiceUrl(next, step), { scroll: false })

  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          {/* Later steps have their own "Voltar" (to the previous step) */}
          {step === "servico" && !success && <BackLink href="/" />}
          <h1 className="print-shadow text-5xl sm:text-6xl">Marcar</h1>
          {!success && <StepProgress step={step} />}
        </div>

        <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-[6px_6px_0_var(--ink)] sm:p-8">
          {success ? (
            <SuccessStep
              payload={success}
              onReset={() => {
                setSuccess(null)
                router.push("/marcar")
              }}
            />
          ) : step === "servico" ? (
            <ServicesStep
              initial={choice.services}
              onPick={(picked) => goTo({ ...choice, services: picked, slotIso: undefined }, "quando")}
            />
          ) : step === "quando" ? (
            <WhenStep
              services={choice.services}
              location={location}
              date={date}
              onBack={() => goTo(choice, "servico")}
              onLocation={(id) => update({ ...choice, location: id, date: undefined, slotIso: undefined })}
              onDate={(d) => update({ ...choice, date: d, slotIso: undefined })}
              onPick={(picked) => goTo({ ...choice, slotIso: picked }, "confirmar")}
            />
          ) : (
            <ConfirmStep
              choice={choice as Required<Choice>}
              onBack={() => goTo({ ...choice, slotIso: undefined }, "quando")}
              onPickAnother={() => goTo({ ...choice, slotIso: undefined }, "quando")}
              onSuccess={(payload) => {
                writeNotes("")
                setSuccess(payload)
                // Back from here goes to the choices, not to this (sent) step
                router.replace("/marcar?passo=enviado", { scroll: true })
              }}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function StepProgress({ step }: { step: Step }) {
  const n = STEPS.indexOf(step) + 1
  return (
    <div className="mt-5">
      <div className="flex gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-2.5 flex-1 rounded-full border-2 border-ink",
              i < n ? "bg-yellow" : "bg-transparent",
            )}
          />
        ))}
      </div>
      <p className="caps mt-2 text-sm text-muted">
        Passo {n} de {STEPS.length} · {STEP_LABEL[step]}
      </p>
    </div>
  )
}

// ---------- STEP 1: services (multi-select) ----------
function ServicesStep({
  initial,
  onPick,
}: {
  initial: ServiceId[]
  onPick: (s: ServiceId[]) => void
}) {
  const [selected, setSelected] = useState<Set<ServiceId>>(new Set(initial))

  const validation = useMemo(() => validateSelection([...selected]), [selected])
  const combo = useMemo(
    () => (validation.ok && selected.size > 0 ? buildCombo([...selected]) : null),
    [validation, selected],
  )

  function toggle(id: ServiceId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <StepTitle>Que serviços queres?</StepTitle>
      <p className="mb-5 text-muted">
        Podes escolher mais do que um. Os combos saem mais baratos.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {SERVICES.map((s) => {
          const isSelected = selected.has(s.id as ServiceId)
          const conflict =
            s.id === "alinhamento" && selected.has("corte")
          const price = priceInSelection([...selected], s.id as ServiceId)
          const hasDiscount =
            !conflict && price < s.priceEur - 0.01

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id as ServiceId)}
              aria-pressed={isSelected}
              className={cn(
                "relative rounded-md border-2 p-4 text-left transition",
                isSelected
                  ? "border-ink bg-yellow/30 shadow-[3px_3px_0_var(--ink)]"
                  : "border-ink/20 bg-paper hover:border-ink",
                conflict && !isSelected && "opacity-50",
              )}
            >
              <span
                className={cn(
                  "absolute top-3 right-3 grid h-5 w-5 place-items-center rounded border-2 border-ink",
                  isSelected && "bg-ink text-yellow",
                )}
              >
                {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>

              <span className="caps block pr-7 text-lg">{s.name}</span>
              <span className="mt-1 block pr-7 text-sm leading-relaxed text-muted">
                {s.description}
              </span>
              <span className="mt-3 flex items-baseline justify-between text-sm">
                <span className="text-muted">
                  {s.durationMin} min{hasDiscount ? " · com combo" : ""}
                </span>
                {hasDiscount ? (
                  <span className="inline-flex items-baseline gap-2">
                    <span className="text-xs text-muted line-through">
                      {formatPrice(s.priceEur)}
                    </span>
                    <span className="font-display text-lg">{formatPrice(price)}</span>
                  </span>
                ) : (
                  <span className="font-display text-lg">{formatPrice(s.priceEur)}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {!validation.ok && selected.size > 0 && (
        <div className="mt-5 flex gap-3 rounded-md border-2 border-danger/50 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{validation.error}</span>
        </div>
      )}

      {combo && (
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 rounded-md border-2 border-ink bg-paper p-4">
          <div>
            <div className="caps text-lg">{combo.name}</div>
            <div className="text-sm text-muted">{combo.durationMin} minutos</div>
          </div>
          <div className="font-display text-3xl">{formatPrice(combo.priceEur)}</div>
        </div>
      )}

      <div className="mt-7 flex justify-end">
        <button
          disabled={!combo}
          onClick={() => combo && onPick([...selected])}
          className="btn"
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ---------- STEP 2: city, day and time ----------
function WhenStep({
  services,
  location,
  date,
  onBack,
  onLocation,
  onDate,
  onPick,
}: {
  services: ServiceId[]
  location?: LocationId
  date?: string
  onBack: () => void
  onLocation: (id: LocationId) => void
  onDate: (ymd: string) => void
  onPick: (slotIso: string) => void
}) {
  const combo = buildCombo(services)
  const [showAllDays, setShowAllDays] = useState(false)
  const counts = useDayCounts(location, services)

  const today = todayLisbon()
  // Only the days the barber is actually in the chosen city
  const days = useMemo(
    () => (location ? upcomingOpenDates(location, today, BOOKING_WINDOW_DAYS) : []),
    [location, today],
  )
  const loaded = counts !== undefined
  const hasRoom = (d: string) => !counts || (counts[d] ?? 0) > 0
  // The day asked for, else (once we know) the first day with free times
  const activeDate = date && days.includes(date) ? date : loaded ? days.find(hasRoom) : undefined
  const activeIdx = activeDate ? days.indexOf(activeDate) : -1
  const visibleDays =
    showAllDays || activeIdx >= DAYS_SHOWN ? days : days.slice(0, DAYS_SHOWN)
  const nextDay = activeIdx >= 0 ? days.slice(activeIdx + 1).find(hasRoom) : undefined
  const allFull = !!counts && days.length > 0 && !days.some(hasRoom)

  return (
    <div>
      <BackButton onClick={onBack} />
      <StepTitle>Onde e quando?</StepTitle>
      <p className="mb-6 text-sm text-muted">
        {combo.name} · {combo.durationMin} min · {formatPrice(combo.priceEur)}
      </p>

      <FieldLabel>Cidade</FieldLabel>
      <div className="grid grid-cols-2 gap-3">
        {LOCATIONS.map((loc) => {
          const selected = location === loc.id
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => {
                setShowAllDays(false)
                onLocation(loc.id)
              }}
              aria-pressed={selected}
              className={cn(
                "rounded-md border-2 p-4 text-left transition",
                selected
                  ? "border-ink bg-yellow/30 shadow-[3px_3px_0_var(--ink)]"
                  : "border-ink/20 bg-paper hover:border-ink",
              )}
            >
              <span className="font-display block text-2xl sm:text-3xl">{loc.name}</span>
              <span className="caps mt-1 block text-sm text-muted">
                {openDaysSummary(loc.id)}
              </span>
            </button>
          )
        })}
      </div>

      {location && (
        <>
          <FieldLabel className="mt-7">Dia</FieldLabel>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {visibleDays.map((d) => (
              <DayChip
                key={d}
                ymd={d}
                today={today}
                selected={d === activeDate}
                full={!hasRoom(d)}
                onClick={() => onDate(d)}
              />
            ))}
          </div>
          {visibleDays.length < days.length && (
            <button
              type="button"
              onClick={() => setShowAllDays(true)}
              className="link mt-3 text-sm font-semibold"
            >
              Ver mais dias
            </button>
          )}
        </>
      )}

      {location && allFull && (
        <div className="mt-7 rounded-md border-2 border-ink/20 bg-paper p-4">
          <p className="font-semibold">
            Não há horas livres em {cityName(location)} nos próximos {BOOKING_WINDOW_DAYS} dias.
          </p>
          <button type="button" onClick={() => onLocation(otherCity(location))} className="btn btn-sm mt-3">
            Ver {cityName(otherCity(location))}
          </button>
        </div>
      )}

      {location && !activeDate && !allFull && (
        <p className="mt-7 text-muted" role="status">A ver a agenda…</p>
      )}

      {location && activeDate && (
        <>
          <FieldLabel className="mt-7">
            Horas livres: {formatLisbon(noonUtc(activeDate), "EEEE, dd 'de' MMMM")}
          </FieldLabel>
          <DaySlots
            key={`${location}|${activeDate}`}
            location={location}
            date={activeDate}
            services={services}
            onPick={onPick}
            onNextDay={nextDay ? () => onDate(nextDay) : undefined}
            nextDayLabel={
              nextDay ? formatLisbon(noonUtc(nextDay), "EEEE, dd 'de' MMMM") : undefined
            }
            onOtherCity={() => onLocation(otherCity(location))}
          />
        </>
      )}
    </div>
  )
}

/**
 * Free times per day for the chosen city and services: undefined while
 * loading, null if they couldn't be loaded (then every day stays pickable
 * and each day's list still loads on its own).
 */
function useDayCounts(location: LocationId | undefined, services: ServiceId[]) {
  const key = location ? `${location}|${services.join(",")}` : ""
  const [state, setState] = useState<{ key: string; counts: Record<string, number> | null } | null>(null)

  useEffect(() => {
    if (!location) return
    let cancelled = false
    fetch(`/api/slots/dias?location=${location}&services=${services.join(",")}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { days: Record<string, number> }) => {
        if (!cancelled) setState({ key, counts: d.days })
      })
      .catch(() => {
        if (!cancelled) setState({ key, counts: null })
      })
    return () => {
      cancelled = true
    }
    // `key` stands for location + services
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return state && state.key === key ? state.counts : undefined
}

function DayChip({
  ymd,
  today,
  selected,
  full,
  onClick,
}: {
  ymd: string
  today: string
  selected: boolean
  full: boolean
  onClick: () => void
}) {
  const d = noonUtc(ymd)
  const label =
    ymd === today
      ? "Hoje"
      : ymd === ymdPlusDays(today, 1)
        ? "Amanhã"
        : DAY_SHORT[ymdDayOfWeek(ymd)]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={full}
      aria-pressed={selected}
      aria-label={`${formatLisbon(d, "EEEE, d 'de' MMMM")}${full ? ", sem horas livres" : ""}`}
      className={cn(
        "rounded-md border-2 px-1 py-2 text-center transition",
        full
          ? "cursor-not-allowed border-ink/10 bg-paper-dark/40 text-muted"
          : selected
            ? "border-ink bg-yellow shadow-[3px_3px_0_var(--ink)]"
            : "border-ink/20 bg-paper hover:border-ink",
      )}
    >
      <span className="caps block text-xs">{label}</span>
      <span className={cn("font-display block text-2xl leading-tight", full && "line-through opacity-60")}>
        {d.getUTCDate()}
      </span>
      <span className="block text-xs text-muted">{full ? "cheio" : MONTH_SHORT[d.getUTCMonth()]}</span>
    </button>
  )
}

/** Free slots for one day. Remounted (via `key`) whenever the day or city changes. */
function DaySlots({
  location,
  date,
  services,
  onPick,
  onNextDay,
  nextDayLabel,
  onOtherCity,
}: {
  location: LocationId
  date: string
  services: ServiceId[]
  onPick: (slotIso: string) => void
  onNextDay?: () => void
  nextDayLabel?: string
  onOtherCity: () => void
}) {
  const [slots, setSlots] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const url = `/api/slots?location=${location}&date=${date}&services=${services.join(",")}`
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) setSlots(d.slots ?? [])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [location, services, date, attempt])

  if (failed) {
    return (
      <div className="rounded-md border-2 border-danger/40 bg-danger/5 p-4 text-sm" role="alert">
        <p className="font-semibold">Não deu para carregar as horas livres.</p>
        <p className="mt-1 text-muted">Verifica a ligação à internet e tenta outra vez.</p>
        <button
          type="button"
          onClick={() => {
            setFailed(false)
            setSlots(null)
            setAttempt((n) => n + 1)
          }}
          className="btn btn-sm mt-3"
        >
          Tentar outra vez
        </button>
      </div>
    )
  }

  if (slots === null) return <div className="text-muted" role="status">A ver a agenda…</div>

  if (slots.length === 0) {
    return (
      <div className="rounded-md border-2 border-ink/20 bg-paper p-4">
        <p className="font-semibold">Sem horas livres neste dia.</p>
        <p className="mt-1 text-sm text-muted">
          As horas já estão ocupadas ou o serviço não cabe nas que sobram.
        </p>
        <div className="mt-4 flex flex-col flex-wrap gap-3 sm:flex-row">
          {onNextDay && nextDayLabel && (
            <button type="button" onClick={onNextDay} className="btn btn-sm">
              Ver {nextDayLabel}
            </button>
          )}
          <button type="button" onClick={onOtherCity} className="btn-ghost px-4 py-1.5 text-sm">
            Tentar em {cityName(otherCity(location))}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {slots.map((iso) => (
        <button
          key={iso}
          type="button"
          onClick={() => onPick(iso)}
          className="rounded-md border-2 border-ink/20 bg-paper px-3 py-2.5 text-lg font-semibold tabular-nums transition hover:border-ink hover:bg-yellow"
        >
          {formatLisbon(new Date(iso), "HH:mm")}
        </button>
      ))}
    </div>
  )
}

// ---------- STEP 3: confirm (account details, notes, send) ----------
type Account =
  | { signedIn: false }
  | { signedIn: true; name: string; phone: string; email: string }

function ConfirmStep({
  choice,
  onBack,
  onPickAnother,
  onSuccess,
}: {
  choice: Required<Choice>
  onBack: () => void
  onPickAnother: () => void
  onSuccess: (p: SuccessPayload) => void
}) {
  const [account, setAccount] = useState<Account | null>(null)
  // (Rendered in the browser only: the flow reads the URL inside <Suspense>)
  const [notes, setNotes] = useState(readNotes)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<{ text: string; taken?: boolean } | null>(null)
  const combo: Combo = useMemo(() => buildCombo(choice.services), [choice.services])

  useEffect(() => {
    fetch("/api/conta/sessao", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Account) => setAccount(s))
      .catch(() => setAccount({ signedIn: false }))
  }, [])

  const whenLocal = useMemo(
    () => formatLisbon(new Date(choice.slotIso), "EEEE, dd/MM/yyyy 'às' HH:mm"),
    [choice.slotIso],
  )

  /** Sign in (or register) and come back to this step, with the choice in the URL. */
  function signIn() {
    writeNotes(notes.trim())
    const here = `${window.location.pathname}${window.location.search}`
    window.location.href = `/conta/entrar?next=${encodeURIComponent(here)}`
  }

  async function send() {
    if (!account?.signedIn) return signIn()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: choice.location,
          services: choice.services,
          startUtcIso: choice.slotIso,
          // The booking goes under the account; these only satisfy the schema
          client: { name: account.name, phone: account.phone, email: account.email },
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      // Session ended meanwhile: sign in again and come back
      if (res.status === 401 && json.signIn) return signIn()
      if (res.status === 409) {
        setError({ text: json.error ?? "Essa hora já não está disponível.", taken: true })
        return
      }
      if (!res.ok) {
        setError({ text: "Não deu para enviar o pedido. Tenta outra vez daqui a pouco." })
        return
      }
      onSuccess({
        bookingId: json.booking.id,
        clientToken: json.booking.clientToken,
        whenLocal: json.booking.whenLocal,
        serviceName: json.booking.service,
        priceEur: json.booking.priceEur,
        location: choice.location,
      })
    } catch {
      setError({ text: "Sem ligação. Verifica a internet e tenta outra vez." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      <StepTitle>Confere e envia</StepTitle>
      <div className="mt-5 space-y-2 rounded-md border-2 border-ink/20 bg-paper p-5">
        <Row label="Cidade" value={cityName(choice.location)} />
        <Row label="Serviço" value={`${combo.name} (${combo.durationMin} min)`} />
        <Row label="Preço" value={formatPrice(combo.priceEur)} />
        <Row label="Quando" value={whenLocal} />
        {account?.signedIn && (
          <>
            <div className="my-2 border-t border-ink/10" />
            <Row
              label="Nome"
              value={`${account.name} · ${account.phone.startsWith("351") ? account.phone.slice(3) : account.phone}`}
            />
            <Row label="Email" value={account.email} />
          </>
        )}
      </div>
      {account?.signedIn && (
        <p className="mt-2 text-xs text-muted">
          Dados da tua conta. Para os mudares, vai a{" "}
          <a href="/conta/dados" className="link">
            Os meus dados
          </a>
          .
        </p>
      )}

      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-semibold">Notas (opcional)</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value)
            // Kept for the way back from "Voltar" or from signing in
            writeNotes(e.target.value)
          }}
          maxLength={300}
          rows={2}
          placeholder="Ex.: o tipo de corte que queres"
          className="input"
        />
      </label>

      {account && !account.signedIn && (
        <div className="mt-5 rounded-md border-2 border-ink bg-yellow/25 p-4">
          <p className="font-semibold">Falta só entrares na tua conta.</p>
          <p className="mt-1 text-sm text-ink/80">
            Basta o teu email: recebes um código e voltas logo a este passo, com
            tudo o que escolheste.
          </p>
        </div>
      )}

      <p className="mt-4 text-sm text-muted">
        Pagas no fim, em <strong className="text-ink">MB WAY</strong> ou{" "}
        <strong className="text-ink">dinheiro</strong>. Depois de enviares o
        pedido, recebes a confirmação por email.
      </p>

      {error && (
        <div className="mt-4 rounded-md border-2 border-danger/40 bg-danger/5 p-3 text-sm" role="alert">
          <p className="font-semibold text-danger">{error.text}</p>
          {error.taken && (
            <button type="button" onClick={onPickAnother} className="btn btn-sm mt-3">
              Escolher outra hora
            </button>
          )}
        </div>
      )}

      {/* A taken time can only be changed, not sent again */}
      <div className={cn("mt-7 flex justify-end", error?.taken && "hidden")}>
        {account === null ? (
          <button disabled className="btn cursor-wait">
            A carregar…
          </button>
        ) : account.signedIn ? (
          <button
            disabled={submitting}
            onClick={send}
            className={cn("btn", submitting && "cursor-wait")}
          >
            {submitting ? "A enviar…" : "Enviar pedido"}
          </button>
        ) : (
          <button onClick={signIn} className="btn">
            Entrar e enviar <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- done: success ----------
function SuccessStep({
  payload,
  onReset,
}: {
  payload: SuccessPayload
  onReset: () => void
}) {
  const whatsapp = whatsappUrl()
  const viewUrl = `/marcacao/${payload.bookingId}?token=${payload.clientToken}`
  return (
    <div className="text-center">
      <p className="font-script -rotate-3 text-5xl text-jungle">Obrigado!</p>
      <h2 id="marcar-passo" tabIndex={-1} className="mt-4 text-3xl outline-none sm:text-4xl">
        Pedido enviado
      </h2>
      <p className="mt-4 text-lg font-semibold">{payload.whenLocal}</p>
      <p className="mt-1 text-muted">
        {payload.serviceName} · {formatPrice(payload.priceEur)} ·{" "}
        {cityName(payload.location)}
      </p>
      <p className="mx-auto mt-6 max-w-md text-ink/80">
        A marcação fica <strong>pendente</strong> até ser confirmada, o que
        costuma demorar poucas horas. Vais receber a confirmação por email, com
        a localização.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        Não chegou nada em alguns minutos? Espreita a pasta de{" "}
        <strong className="text-ink">spam / lixo eletrónico</strong> e marca
        como &ldquo;Não é spam&rdquo; para receberes os próximos.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <a href={viewUrl} className="btn-ghost">
          Ver estado da marcação
        </a>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener" className="btn-whatsapp">
            Falar no WhatsApp
          </a>
        )}
      </div>

      <button onClick={onReset} className="link mt-7 text-sm font-semibold">
        Fazer outra marcação
      </button>
    </div>
  )
}

// ---------- atoms ----------
function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 id="marcar-passo" tabIndex={-1} className="mb-2 text-2xl outline-none sm:text-3xl">
      {children}
    </h2>
  )
}

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <p className={cn("caps mb-2.5 text-sm text-muted", className)}>{children}</p>
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-ink"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Voltar
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}
