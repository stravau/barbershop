import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { currentClientSession } from "@/lib/client-auth"
import { safeNext } from "@/lib/safe-next"
import { AuthCard, FormError } from "../_components/AuthCard"
import { completeRegistration } from "../entrar/actions"

export const metadata: Metadata = { title: "Registo", robots: "noindex" }
export const dynamic = "force-dynamic"

const ERRORS: Record<string, string> = {
  nome: "Escreve o teu nome.",
  telefone: "Telemóvel inválido.",
  "telefone-usado":
    "Esse telemóvel já está associado a outro email. Entra com esse email ou fala connosco por WhatsApp.",
}

interface PageProps {
  searchParams: Promise<{ erro?: string; next?: string }>
}

/** First sign-in with a new email: name and phone to finish the account. */
export default async function RegistoPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const next = safeNext(sp.next)
  const current = await currentClientSession()
  if (!current) redirect("/conta/entrar")
  if (current.client) redirect(next)

  return (
    <AuthCard
      title="Quase lá"
      back={{ href: "/", fixed: true }}
      intro={
        <>
          Entraste como <strong>{current.session.email}</strong>. Falta só o nome e o
          telemóvel. Se já marcaste antes com este número, juntamos o teu histórico.
        </>
      }
    >
      <form action={completeRegistration} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nome</span>
          <input name="name" required autoComplete="name" placeholder="João Silva" className="input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Telemóvel</span>
          <input
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="912345678"
            className="input"
          />
        </label>
        {sp.erro && ERRORS[sp.erro] && <FormError>{ERRORS[sp.erro]}</FormError>}
        <button type="submit" className="btn w-full">
          Criar conta
        </button>
      </form>
    </AuthCard>
  )
}
