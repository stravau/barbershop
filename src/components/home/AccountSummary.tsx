"use client"

import { createContext, useContext, useEffect, useState } from "react"
import Link from "next/link"
import { useFormStatus } from "react-dom"
import { ArrowRight, Zap } from "lucide-react"
import { expressBook } from "@/app/conta/actions"
import { formatPriceShort } from "@/lib/services"
import type { AccountSummary } from "@/app/api/conta/resumo/route"

// The home page stays static for everyone; a signed-in client's bits are
// fetched in the browser and filled in once they arrive.
const Ctx = createContext<AccountSummary | null>(null)

export function AccountSummaryProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  useEffect(() => {
    fetch("/api/conta/resumo", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary({ signedIn: false }))
  }, [])
  return <Ctx.Provider value={summary}>{children}</Ctx.Provider>
}

const useSignedIn = () => {
  const s = useContext(Ctx)
  return s?.signedIn ? s : null
}

/** Strip under the header: the next booking, or the usual one bookable in one tap. */
export function AccountStrip() {
  const s = useSignedIn()
  if (!s) return null

  return (
    <div className="border-b-2 border-ink bg-jungle text-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm sm:px-6 sm:text-base">
        <span className="font-display text-lg">Olá, {s.firstName}</span>
        {s.next ? (
          <>
            <Link href="/conta/marcacoes" className="underline-offset-4 hover:underline">
              Próxima marcação: <strong>{s.next.when}</strong>
            </Link>
            <span
              className={
                s.next.status === "CONFIRMED"
                  ? "caps rounded-full border-2 border-paper bg-success px-2 py-0.5 text-[0.7rem]"
                  : "caps rounded-full border-2 border-ink bg-yellow px-2 py-0.5 text-[0.7rem] text-ink"
              }
            >
              {s.next.status === "CONFIRMED" ? "Confirmada" : "Pendente"}
            </span>
            <Link href="/conta/marcacoes" className="ml-auto hidden font-semibold underline underline-offset-4 sm:inline">
              Ver
            </Link>
          </>
        ) : s.express ? (
          <>
            <span>
              O costume ({s.express.serviceName}, {formatPriceShort(s.express.priceEur)}) —{" "}
              <strong>{s.express.when}</strong>
            </span>
            <span className="ml-auto flex items-center gap-4">
              <Link href="/conta" className="font-semibold underline underline-offset-4">
                Outras horas
              </Link>
              <form action={expressBook}>
                <input type="hidden" name="startIso" value={s.express.startIso} />
                <ExpressButton />
              </form>
            </span>
          </>
        ) : (
          <Link href="/conta" className="ml-auto font-semibold underline underline-offset-4">
            A minha conta
          </Link>
        )}
      </div>
    </div>
  )
}

function ExpressButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="btn btn-sm disabled:opacity-60">
      <Zap className="h-4 w-4 fill-ink" aria-hidden="true" />
      {pending ? "A marcar…" : "Marcar"}
    </button>
  )
}

/** Hero button: "Marcação express" for clients with a history, else "Marcar corte". */
export function HeroCta() {
  const s = useSignedIn()
  return s?.hasHabit ? (
    <Link href="/conta" className="btn w-full text-lg">
      <Zap className="h-5 w-5 fill-ink" aria-hidden="true" /> Marcação express
    </Link>
  ) : (
    <Link href="/marcar" className="btn w-full text-lg">
      Marcar corte <ArrowRight className="h-5 w-5" />
    </Link>
  )
}

/** Stamps on the home page's loyalty card: the client's own, or the example. */
export function useStamps(example: number): { stamped: number; own: boolean } {
  const s = useSignedIn()
  return s ? { stamped: Math.min(s.visits, 6), own: true } : { stamped: example, own: false }
}
