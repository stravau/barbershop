import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { InstagramIcon } from "@/components/InstagramIcon"
import { NextBookingBar, AccountSummaryProvider, HeroCta } from "@/components/home/AccountSummary"
import { StampCard } from "@/components/home/StampCard"
import { PriceBoard } from "@/components/PriceBoard"
import { LOCATIONS, groupedWeeklyHours } from "@/lib/schedule"
import { getServiceItem, formatPriceShort } from "@/lib/services"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site"
import { barbershopJsonLd } from "@/lib/structured-data"

const TAGLINE = "Corte, barba e sobrancelha."

export default function HomePage() {
  return (
    <AccountSummaryProvider>
      <main>
        {/* Hours, prices and links for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(barbershopJsonLd()).replace(/</g, "\\u003c") }}
        />
        {/* From md up the first screen is all cream: the bar and the hero fill the
            height under the header (70px) and the hero's content sits centred,
            so the next section only starts below the fold */}
        <div className="md:flex md:min-h-[calc(100svh-70px)] md:flex-col">
          <NextBookingBar />
          <Hero />
        </div>
        <InstagramBand />
        <PricesAndHowItWorks />
        <Timetable />
        <LoyaltyCard />
        <Rules />
      </main>
    </AccountSummaryProvider>
  )
}

function Hero() {
  const cut = getServiceItem("corte")

  return (
    // With the express box (signed-in client) the hero is taller; from md up it
    // then scales with the screen height so all of it fits on the first screen
    // (sizes only shrink as much as needed — tall screens keep them).
    <section className="group/hero overflow-hidden md:flex md:flex-1 md:items-center">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-12 pb-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-16 md:group-has-[[data-express]]/hero:pt-[clamp(1rem,4vh,5rem)] md:group-has-[[data-express]]/hero:pb-[clamp(1.25rem,4vh,6rem)]">
        {/* (On phones under ~400px the name and tagline shrink to fit the width.)
            Everything is centred under the name. From md up the grid column
            is exactly as wide as "TARZAN'S" (its min-content). */}
        <div className="flex flex-col items-center text-center">
          {/* "Barbershop" is sized in em so it scales with "TARZAN'S", and
              the inline-flex column centres it under the name */}
          <h1 className="inline-flex flex-col items-center text-[clamp(3.5rem,11vw,7.25rem)] leading-[0.9] max-[380px]:text-[calc((100vw-2rem)/5.7)] md:group-has-[[data-express]]/hero:text-[clamp(3.5rem,min(11vw,calc(27.5vh-5.15rem)),7.25rem)]">
            <span className="print-shadow">TARZAN&apos;S</span>
            <span className="font-script mt-[0.02em] -rotate-2 text-[0.66em] leading-none text-jungle">
              Barbershop
            </span>
          </h1>

          <p className="font-display mt-9 text-2xl max-[400px]:text-[calc((100vw-2rem)/14.8)] sm:text-3xl md:group-has-[[data-express]]/hero:mt-[clamp(0.75rem,3vh,2.25rem)]">{TAGLINE}</p>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink/80 md:group-has-[[data-express]]/hero:mt-[clamp(0.5rem,1.5vh,1rem)]">
            Em Setúbal durante a semana e em Lisboa à sexta e ao sábado.
            Escolhe o serviço, o dia e a hora. Faz a tua marcação em menos de
            1&nbsp;minuto.
          </p>

          {/* Same width as the tagline (an invisible copy of it sizes this
              column), centred under "Barbershop" */}
          <div className="mt-9 grid w-max max-w-full justify-items-center md:group-has-[[data-express]]/hero:mt-[clamp(0.75rem,3vh,2.25rem)]">
            <span
              aria-hidden="true"
              className="font-display invisible h-0 overflow-hidden whitespace-nowrap text-2xl max-[400px]:text-[calc((100vw-2rem)/14.8)] sm:text-3xl"
            >
              {TAGLINE}
            </span>
            <HeroCta />
            <Link href="#precos" className="link mt-4 font-semibold md:group-has-[[data-express]]/hero:mt-[clamp(0.5rem,1.5vh,1rem)]">
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
    <section id="precos" className="scroll-mt-20">
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

// The site has no photos, so this is where people go to see the work.
function InstagramBand() {
  return (
    <section className="border-y-2 border-ink bg-yellow">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 text-center sm:px-6 md:flex-row md:justify-between md:py-7 md:text-left">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper shadow-[3px_3px_0_var(--ink)]">
            <InstagramIcon className="h-7 w-7" />
          </span>
          <div>
            <h2 className="text-2xl sm:text-3xl">Segue-nos no Instagram!</h2>
            <p className="mt-1">
              Vê os últimos cortes e novidades em{" "}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className="font-bold underline underline-offset-4">
                @{INSTAGRAM_HANDLE}
              </a>
              .
            </p>
          </div>
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener"
          className="btn shrink-0 bg-ink text-yellow"
        >
          <InstagramIcon className="h-5 w-5" /> Visitar o Instagram
        </a>
      </div>
    </section>
  )
}

function Timetable() {
  return (
    <section id="horario" className="scroll-mt-20 bg-jungle text-paper">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.15fr] md:gap-16 md:py-16">
        <div>
          <h2 className="print-shadow-ink text-4xl text-yellow sm:text-5xl">
            Onde e quando
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-paper/80">
            Setúbal durante a semana, Lisboa à sexta e ao sábado. A localização
            exata segue no email de confirmação.
          </p>
          <Link href="/marcar" className="btn mt-6">
            Ver horários livres
          </Link>
        </div>

        {/* One compact card per city; days with the same hours are merged */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5">
          {LOCATIONS.map((loc) => (
            <div key={loc.id} className="rounded-lg border-2 border-paper/70 p-3 sm:p-5">
              <h3 className="border-b border-paper/30 pb-2 text-xl text-yellow sm:text-2xl">
                {loc.name}
              </h3>
              <ul className="mt-2 space-y-1.5 tabular-nums">
                {groupedWeeklyHours(loc.id).map((g) => (
                  <li key={g.days} className="flex items-baseline justify-between gap-2">
                    <span className="caps text-sm text-paper/70">{g.days}</span>
                    <span className="font-semibold">{g.hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function LoyaltyCard() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        {/* Spans the full width and scales with the viewport so it always
            fits on one line */}
        <h2 className="whitespace-nowrap text-[clamp(1.25rem,7.2vw,3rem)]">
          O sétimo corte é grátis
        </h2>
        <div className="mt-6 grid items-start gap-12 md:grid-cols-2">
          <div>
            <p className="max-w-md text-lg leading-relaxed text-ink/80">
              Recebes o cartão de cliente na primeira visita e cada corte vale
              um carimbo. Junta seis e o sétimo fica de oferta.
            </p>
            <p className="mt-3 text-sm text-muted">Válido apenas para o primeiro cartão.</p>
          </div>

          <StampCard />
        </div>
      </div>
    </section>
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
