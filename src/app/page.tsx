import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PriceBoard } from "@/components/PriceBoard"
import { Wordmark } from "@/components/Wordmark"
import { weeklyHours } from "@/lib/schedule"
import { getServiceItem, formatPriceShort } from "@/lib/services"

export default function HomePage() {
  return (
    <>
      <Hero />
      <PricesAndHowItWorks />
      <Timetable />
      <LoyaltyCard />
      <Rules />
    </>
  )
}

function Hero() {
  const cut = getServiceItem("corte")

  return (
    <section className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-20 md:pb-24">
        <div>
          <p className="caps text-sm text-muted">
            ★ Barbeiro independente · Setúbal &amp; Lisboa
          </p>
          <h1 className="print-shadow mt-4 text-[clamp(3.5rem,11vw,7.25rem)] leading-[0.9]">
            TARZAN&apos;S
          </h1>
          <p className="font-script ml-[0.5em] -mt-1 -rotate-3 text-[clamp(2.4rem,6vw,3.9rem)] leading-none text-jungle">
            Barbershop
          </p>

          <p className="font-display mt-9 text-2xl sm:text-3xl">
            Corte, barba e sobrancelha.
          </p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink/80">
            Em Setúbal durante a semana e em Lisboa à sexta e ao sábado.
            Escolhe o serviço, o dia e a hora — marcar demora menos de um
            minuto.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/marcar" className="btn text-lg">
              Marcar corte <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#precos" className="link font-semibold">
              Ver preços
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[420px]">
          <div className="-rotate-2 rounded-lg border-2 border-ink bg-black p-2 shadow-[8px_8px_0_var(--jungle)]">
            {/* The logo file has wide black margins — crop into the illustration */}
            <div className="relative aspect-[1.18] overflow-hidden rounded-md border border-yellow/50">
              <Image
                src="/logo.jpeg"
                alt="Ilustração do Tarzan entre dois postes de barbeiro"
                width={900}
                height={900}
                priority
                className="absolute max-w-none"
                style={{ width: "128.2%", left: "-14.1%", top: "-19.7%" }}
              />
            </div>
          </div>
          {cut && (
            <div className="absolute -top-5 -right-2 grid h-28 w-28 rotate-[10deg] place-items-center rounded-full border-2 border-ink bg-yellow text-center shadow-[3px_3px_0_var(--ink)] sm:-right-7">
              <div>
                <div className="caps text-xs">Corte</div>
                <div className="font-display text-[1.9rem] leading-none">
                  {formatPriceShort(cut.priceEur)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function PricesAndHowItWorks() {
  return (
    <section id="precos" className="scroll-mt-20 border-t-2 border-ink">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 md:grid-cols-[1.2fr_1fr] md:gap-16 md:py-24">
        <PriceBoard />

        <div>
          <h2 className="text-4xl sm:text-5xl">Como funciona</h2>
          <ol className="mt-9 space-y-8">
            <HowStep n={1} title="Escolhes o horário">
              Serviço, cidade, dia e hora. Demora um minuto.
            </HowStep>
            <HowStep n={2} title="Recebes a confirmação">
              Por email, normalmente em poucas horas, com a localização e
              todos os detalhes.
            </HowStep>
            <HowStep n={3} title="Pagas no fim">
              Em MB WAY ou dinheiro. Nada é cobrado antecipadamente.
            </HowStep>
          </ol>
        </div>
      </div>
    </section>
  )
}

function HowStep({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-5">
      <span className="font-display grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink bg-yellow text-2xl">
        {n}
      </span>
      <div>
        <h3 className="text-2xl">{title}</h3>
        <p className="mt-1.5 text-lg leading-relaxed text-ink/80">{children}</p>
      </div>
    </li>
  )
}

function Timetable() {
  const setubal = weeklyHours("setubal")
  const lisboa = weeklyHours("lisboa")

  return (
    <section id="horario" className="scroll-mt-20 bg-jungle text-paper">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.15fr] md:gap-16 md:py-24">
        <div>
          <h2 className="print-shadow-ink text-4xl text-yellow sm:text-5xl">
            Onde e quando
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-paper/80">
            Setúbal durante a semana, Lisboa à sexta e ao sábado. A localização
            exata segue no email de confirmação.
          </p>
          <Link href="/marcar" className="btn mt-8">
            Ver horários livres
          </Link>
        </div>

        <div className="rounded-lg border-2 border-paper/80 p-1.5">
          <table className="w-full border-collapse rounded-md text-left tabular-nums">
            <thead>
              <tr className="caps border-b-2 border-paper/80 text-sm text-yellow">
                <th className="px-4 py-3 font-bold" scope="col">Dia</th>
                <th className="px-4 py-3 font-bold" scope="col">Setúbal</th>
                <th className="px-4 py-3 font-bold" scope="col">Lisboa</th>
              </tr>
            </thead>
            <tbody>
              {setubal.map((d, i) => {
                const l = lisboa[i]
                const closed = !d.hours && !l.hours
                return (
                  <tr key={d.dow} className="border-b border-paper/15 last:border-b-0">
                    <th scope="row" className="caps px-4 py-3 text-left font-bold">
                      {d.day}
                    </th>
                    {closed ? (
                      <td colSpan={2} className="px-4 py-3 italic text-paper/50">
                        folga
                      </td>
                    ) : (
                      <>
                        <HoursCell hours={d.hours} />
                        <HoursCell hours={l.hours} />
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function HoursCell({ hours }: { hours: string | null }) {
  return hours ? (
    <td className="px-4 py-3 text-lg font-semibold">{hours}</td>
  ) : (
    <td className="px-4 py-3 text-paper/30" aria-label="fechado">—</td>
  )
}

function LoyaltyCard() {
  return (
    <section>
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div>
          <h2 className="text-4xl sm:text-5xl">O sexto corte é grátis</h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink/80">
            Na primeira visita recebes o cartão de cliente. Cada corte vale um
            carimbo — ao sexto, não pagas.
          </p>
          <p className="mt-3 text-sm text-muted">Válido apenas para o primeiro cartão.</p>
        </div>

        <StampCard />
      </div>
    </section>
  )
}

function StampCard() {
  const stamped = 3
  const tilt = ["-rotate-12", "rotate-6", "-rotate-3"]

  return (
    <div className="mx-auto w-full max-w-[400px] rotate-2 overflow-hidden rounded-xl border-2 border-ink bg-card shadow-[6px_6px_0_var(--ink)]">
      <div className="h-5 border-b-2 border-ink bg-yellow" aria-hidden="true" />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <Wordmark className="text-[1.4rem]" />
          <span className="caps pt-1 text-xs text-muted">Cartão de cliente</span>
        </div>
        <ol className="mt-6 grid grid-cols-6 gap-2" aria-label="Seis carimbos; o sexto corte é grátis">
          {Array.from({ length: 6 }, (_, i) => {
            const isFree = i === 5
            const isStamped = i < stamped
            return (
              <li
                key={i}
                className={
                  isFree
                    ? "grid aspect-square place-items-center rounded-full border-2 border-ink bg-yellow"
                    : isStamped
                      ? `grid aspect-square place-items-center rounded-full border-2 border-jungle bg-jungle/90 text-paper ${tilt[i]}`
                      : "grid aspect-square place-items-center rounded-full border-2 border-dashed border-ink/30"
                }
              >
                {isFree ? (
                  <span className="caps text-[0.55rem] leading-none sm:text-[0.6rem]">Grátis</span>
                ) : isStamped ? (
                  <span className="text-xl leading-none">★</span>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function Rules() {
  const rules = [
    {
      title: "Atrasos",
      body: "Com mais de 20 minutos de atraso, a marcação pode ser cancelada para não prejudicar os clientes seguintes.",
    },
    {
      title: "Cancelamentos",
      body: "Cancela com pelo menos 12 horas de antecedência, pelo link no email de confirmação. Cancelamentos tardios e faltas repetidas podem impedir marcações futuras.",
    },
  ]

  return (
    <section className="border-t-2 border-ink bg-paper-dark">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <h2 className="text-4xl sm:text-5xl">Atrasos e cancelamentos</h2>

        <ol className="mt-10 grid gap-x-14 gap-y-9 md:grid-cols-2">
          {rules.map((r, i) => (
            <li key={r.title} className="flex gap-5 border-t-2 border-ink pt-5">
              <span className="font-display w-10 shrink-0 text-4xl leading-none text-jungle">
                {i + 1}.
              </span>
              <div>
                <h3 className="text-2xl">{r.title}</h3>
                <p className="mt-2 leading-relaxed text-ink/80">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-4 border-t-2 border-ink pt-8">
          <p className="font-display text-2xl">Tudo combinado?</p>
          <Link href="/marcar" className="btn">
            Marcar corte <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
