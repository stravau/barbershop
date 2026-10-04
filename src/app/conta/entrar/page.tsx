import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { currentClientSession } from "@/lib/client-auth"
import { safeNext } from "@/lib/safe-next"
import { AuthCard, FormError } from "../_components/AuthCard"
import { requestLoginCode } from "./actions"

export const metadata: Metadata = { title: "Entrar", robots: "noindex" }
export const dynamic = "force-dynamic"

const ERRORS: Record<string, string> = {
  invalid: "Esse email não parece válido.",
  blocked: "Pediste demasiados códigos. Espera 15 minutos e tenta outra vez.",
  email: "Não foi possível enviar o código. Tenta outra vez daqui a pouco.",
}

interface PageProps {
  searchParams: Promise<{ erro?: string; email?: string; next?: string }>
}

/** Client sign-in / sign-up, step 1: email. */
export default async function EntrarPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const next = safeNext(sp.next)
  if ((await currentClientSession())?.client) redirect(next)
  // Sent here by "Marcar corte" (booking needs an account)
  const toBook = next.startsWith("/marcar")

  return (
    <AuthCard
      title="Entrar"
      back={{ href: "/" }}
      intro={
        toBook
          ? "Para marcares, entra com o teu email — enviamos-te um código. É a primeira vez? A conta fica criada já, e a seguir continuas a marcação."
          : "Sem palavras-passe: escreve o teu email e enviamos-te um código. Se ainda não tens conta, fica criada já."
      }
    >
      <form action={requestLoginCode} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Email</span>
          <input
            type="email"
            name="email"
            required
            autoFocus
            autoComplete="email"
            defaultValue={sp.email ?? ""}
            placeholder="o-teu@email.com"
            className="input"
          />
        </label>
        {sp.erro && ERRORS[sp.erro] && <FormError>{ERRORS[sp.erro]}</FormError>}
        <button type="submit" className="btn w-full">
          Enviar código
        </button>
      </form>
      <p className="mt-4 text-xs text-muted">
        Usa o mesmo email das tuas marcações para veres o teu histórico.
      </p>
    </AuthCard>
  )
}
