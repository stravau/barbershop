"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
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

type Step = "services" | "when" | "details" | "confirm" | "success"

interface BookingState {
  services?: ServiceId[]
  location?: LocationId
  date?: string
  slotIso?: string
  name?: string
  phone?: string
  email?: string
  notes?: string
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

const todayLisbon = () => formatLisbon(new Date(), "yyyy-MM-dd")
const noonUtc = (ymd: string) => new Date(`${ymd}T12:00:00Z`)

const STEPS: Step[] = ["services", "when", "details", "confirm"]

const STEP_LABEL: Record<Step, string> = {
  services: "Serviço",
  when: "Cidade, dia e hora",
  details: "Os teus dados",
  confirm: "Confirmar",
  success: "",
}

const cityName = (id: LocationId) => (id === "lisboa" ? "Lisboa" : "Setúbal")

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
  const initialServices = parseServicesParam(params.get("services")) as ServiceId[]
  const validInitial = validateSelection(initialServices)

  // Skip "services" step if URL pre-fills a valid selection
  const [step, setStep] = useState<Step>(
    validInitial.ok && initialServices.length > 0 ? "when" : "services",
  )
  const [state, setState] = useState<BookingState>(
    validInitial.ok ? { services: initialServices } : {},
  )
  const [success, setSuccess] = useState<SuccessPayload | null>(null)

  function reset() {
    setStep("services")
    setState({})
    setSuccess(null)
  }

  return (
    <main>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          {/* Later steps have their own "Voltar" (to the previous step) */}
          {step === "services" && <BackLink href="/" />}
          <h1 className="print-shadow text-5xl sm:text-6xl">Marcar</h1>
          {step !== "success" && <StepProgress step={step} />}
        </div>

        <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-[6px_6px_0_var(--ink)] sm:p-8">
          {step === "services" && (
            <ServicesStep
              initial={state.services ?? []}
              onPick={(services) => {
                setState((s) => ({ ...s, services }))
                setStep("when")
              }}
            />
          )}

          {step === "when" && state.services && (
            <WhenStep
              services={state.services}
              initialLocation={state.location}
              initialDate={state.date}
              onBack={() => setStep("services")}
              onPick={({ location, date, slotIso }) => {
                setState((s) => ({ ...s, location, date, slotIso }))
                setStep("details")
              }}
            />
          )}

          {step === "details" && (
            <DetailsStep
              initial={{
                name: state.name ?? "",
                phone: state.phone ?? "",
                email: state.email ?? "",
                notes: state.notes ?? "",
              }}
              onBack={() => setStep("when")}
              onSubmit={(data) => {
                setState((s) => ({ ...s, ...data }))
                setStep("confirm")
              }}
            />
          )}

          {step === "confirm" &&
            state.location &&
            state.services &&
            state.slotIso && (
              <ConfirmStep
                state={state as Required<BookingState>}
                onBack={() => setStep("details")}
                onSuccess={(payload) => {
                  setSuccess(payload)
                  setStep("success")
                }}
              />
            )}

          {step === "success" && success && (
            <SuccessStep payload={success} onReset={reset} />
          )}
        </div>
      </div>
    </main>
  )
}

function stepNumber(step: Step): number {
  return Math.min(STEPS.indexOf(step) + 1, STEPS.length)
}

function StepProgress({ step }: { step: Step }) {
  const n = stepNumber(step)
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
  initialLocation,
  initialDate,
  onBack,
  onPick,
}: {
  services: ServiceId[]
  initialLocation?: LocationId
  initialDate?: string
  onBack: () => void
  onPick: (p: { location: LocationId; date: string; slotIso: string }) => void
}) {
  const combo = buildCombo(services)
  const [location, setLocation] = useState<LocationId | undefined>(initialLocation)
  const [date, setDate] = useState<string | undefined>(initialDate)
  const [showAllDays, setShowAllDays] = useState(false)

  const today = todayLisbon()
  // Only the days the barber is actually in the chosen city
  const days = useMemo(
    () => (location ? upcomingOpenDates(location, today, BOOKING_WINDOW_DAYS) : []),
    [location, today],
  )
  const activeDate = date && days.includes(date) ? date : days[0]
  const activeIdx = activeDate ? days.indexOf(activeDate) : -1
  const visibleDays =
    showAllDays || activeIdx >= DAYS_SHOWN ? days : days.slice(0, DAYS_SHOWN)
  const nextDay = activeIdx >= 0 ? days[activeIdx + 1] : undefined

  function pickLocation(id: LocationId) {
    setLocation(id)
    setDate(undefined)
    setShowAllDays(false)
  }

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
              onClick={() => pickLocation(loc.id)}
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
                onClick={() => setDate(d)}
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
            onPick={(slotIso) => onPick({ location, date: activeDate, slotIso })}
            onNextDay={nextDay ? () => setDate(nextDay) : undefined}
            nextDayLabel={
              nextDay ? formatLisbon(noonUtc(nextDay), "EEEE, dd 'de' MMMM") : undefined
            }
            onOtherCity={() => pickLocation(location === "lisboa" ? "setubal" : "lisboa")}
          />
        </>
      )}
    </div>
  )
}

function DayChip({
  ymd,
  today,
  selected,
  onClick,
}: {
  ymd: string
  today: string
  selected: boolean
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
      aria-pressed={selected}
      className={cn(
        "rounded-md border-2 px-1 py-2 text-center transition",
        selected
          ? "border-ink bg-yellow shadow-[3px_3px_0_var(--ink)]"
          : "border-ink/20 bg-paper hover:border-ink",
      )}
    >
      <span className="caps block text-xs">{label}</span>
      <span className="font-display block text-2xl leading-tight">{d.getUTCDate()}</span>
      <span className="block text-xs text-muted">{MONTH_SHORT[d.getUTCMonth()]}</span>
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const url = `/api/slots?location=${location}&date=${date}&services=${services.join(",")}`
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text())
        return r.json()
      })
      .then((d) => {
        if (!cancelled) setSlots(d.slots ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
    return () => {
      cancelled = true
    }
  }, [location, services, date])

  if (error) {
    return (
      <div className="text-sm text-danger">
        Não foi possível carregar as horas livres. Tenta outra vez daqui a pouco.
        <span className="mt-1 block text-xs opacity-70">{error}</span>
      </div>
    )
  }

  if (slots === null) return <div className="text-muted">A ver a agenda…</div>

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
            Tentar em {cityName(location === "lisboa" ? "setubal" : "lisboa")}
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

// ---------- STEP 3: details ----------
function DetailsStep({
  initial,
  onSubmit,
  onBack,
}: {
  initial: { name: string; phone: string; email: string; notes: string }
  onSubmit: (data: {
    name: string
    phone: string
    email: string
    notes?: string
  }) => void
  onBack: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [phone, setPhone] = useState(initial.phone)
  const [email, setEmail] = useState(initial.email)
  const [notes, setNotes] = useState(initial.notes)
  const [err, setErr] = useState<string | null>(null)
  // Booking needs an account: its details are used (changed in "Os meus dados")
  const [fromAccount, setFromAccount] = useState(false)

  useEffect(() => {
    fetch("/api/conta/sessao", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: { signedIn: boolean; name?: string; phone?: string; email?: string }) => {
        if (!s.signedIn) return
        setName(s.name ?? "")
        setPhone((s.phone?.startsWith("351") ? s.phone.slice(3) : s.phone) ?? "")
        setEmail(s.email ?? "")
        setFromAccount(true)
      })
      .catch(() => {})
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = phone.replace(/[^\d]/g, "")
    const cleanEmail = email.trim()
    if (name.trim().length < 2) return setErr("Nome demasiado curto")
    if (!/^\d{9,15}$/.test(cleanPhone))
      return setErr("Telefone inválido (9-15 dígitos, sem +)")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      return setErr("Email inválido")
    onSubmit({
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <BackButton onClick={onBack} />
      <StepTitle>Os teus dados</StepTitle>
      <div className="mt-5 space-y-4">
        <Field label="Nome">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={fromAccount}
            required
            autoComplete="name"
            placeholder="João Silva"
            className="input"
          />
        </Field>
        <Field label="Telemóvel (com indicativo, sem +)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            readOnly={fromAccount}
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="351912345678"
            className="input"
          />
        </Field>
        <Field label="Email (para receberes a confirmação)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={fromAccount}
            required
            inputMode="email"
            autoComplete="email"
            placeholder="joao@exemplo.com"
            className="input"
          />
        </Field>
        {fromAccount && (
          <p className="-mt-1 text-xs text-muted">
            Dados da tua conta. Para os mudares, vai a{" "}
            <a href="/conta/dados" className="link">
              Os meus dados
            </a>
            .
          </p>
        )}
        <Field label="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: o tipo de corte que queres"
            className="input"
          />
        </Field>
      </div>
      {err && <div className="mt-3 text-sm text-danger">{err}</div>}
      <div className="mt-7 flex justify-end">
        <button type="submit" className="btn">
          Continuar <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}

// ---------- STEP 4: confirm ----------
function ConfirmStep({
  state,
  onBack,
  onSuccess,
}: {
  state: Required<BookingState>
  onBack: () => void
  onSuccess: (p: SuccessPayload) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const combo: Combo = useMemo(() => buildCombo(state.services), [state.services])

  const whenLocal = useMemo(
    () =>
      formatLisbon(new Date(state.slotIso), "EEEE, dd/MM/yyyy 'às' HH:mm"),
    [state.slotIso],
  )

  async function confirm() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: state.location,
          services: state.services,
          startUtcIso: state.slotIso,
          client: {
            name: state.name,
            phone: state.phone,
            email: state.email,
          },
          notes: state.notes || undefined,
        }),
      })
      const json = await res.json()
      // Session ended meanwhile: sign in again and come back
      if (res.status === 401 && json.signIn) {
        window.location.href = "/conta/entrar?next=/marcar"
        return
      }
      if (!res.ok) throw new Error(json.error || "Erro desconhecido")
      onSuccess({
        bookingId: json.booking.id,
        clientToken: json.booking.clientToken,
        whenLocal: json.booking.whenLocal,
        serviceName: json.booking.service,
        priceEur: json.booking.priceEur,
        location: state.location,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <BackButton onClick={onBack} />
      <StepTitle>Confere e envia</StepTitle>
      <div className="mt-5 space-y-2 rounded-md border-2 border-ink/20 bg-paper p-5">
        <Row label="Cidade" value={cityName(state.location)} />
        <Row label="Serviço" value={`${combo.name} (${combo.durationMin} min)`} />
        <Row label="Preço" value={formatPrice(combo.priceEur)} />
        <Row label="Quando" value={whenLocal} />
        <Row label="Nome" value={`${state.name} · ${state.phone}`} />
        <Row label="Email" value={state.email} />
        {state.notes && <Row label="Notas" value={state.notes} />}
      </div>
      <p className="mt-4 text-sm text-muted">
        Pagas no fim, em <strong className="text-ink">MB WAY</strong> ou{" "}
        <strong className="text-ink">dinheiro</strong>. Depois de enviares o
        pedido, recebes a confirmação por email.
      </p>
      {error && <div className="mt-3 text-sm text-danger">{error}</div>}
      <div className="mt-7 flex justify-end">
        <button
          disabled={submitting}
          onClick={confirm}
          className={cn("btn", submitting && "cursor-wait")}
        >
          {submitting ? "A enviar…" : "Enviar pedido"}
        </button>
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
      <h2 className="mt-4 text-3xl sm:text-4xl">Pedido enviado</h2>
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
  return <h2 className="mb-2 text-2xl sm:text-3xl">{children}</h2>
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
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
