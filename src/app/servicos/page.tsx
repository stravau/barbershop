import Link from "next/link"
import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { PriceBoard } from "@/components/PriceBoard"
import { BackLink } from "@/components/BackLink"

export const metadata: Metadata = {
  title: "Preços",
}

export default function ServicosPage() {
  return (
    <main className="mx-auto grid max-w-6xl items-start gap-14 px-4 py-14 sm:px-6 md:grid-cols-[1fr_1.25fr] md:py-20">
      <div>
        <BackLink href="/" />
        <h1 className="print-shadow text-6xl sm:text-7xl">Preços</h1>
        <p className="mt-6 max-w-sm text-lg leading-relaxed text-ink/80">
          Toca num serviço para começares a marcação com ele já escolhido.
        </p>
        <ul className="mt-6 space-y-2.5 text-ink/80">
          <li>★ Os combos saem mais baratos do que os serviços em separado.</li>
          <li>★ O alinhamento já vem incluído no corte.</li>
          <li>★ Pagas no fim, em MB WAY ou dinheiro.</li>
        </ul>
        <Link href="/marcar" className="btn mt-9">
          Marcar corte <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      <PriceBoard showTitle={false} />
    </main>
  )
}
