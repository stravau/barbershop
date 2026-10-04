import type { Metadata } from "next"
import Link from "next/link"
import { safeNext } from "@/lib/safe-next"
import { AuthCard, FormError } from "../../_components/AuthCard"
import { confirmLoginCode } from "../actions"

export const metadata: Metadata = { title: "Código", robots: "noindex" }
export const dynamic = "force-dynamic"

const ERRORS: Record<string, string> = {
  wrong: "Código incorreto. Tenta outra vez.",
  expired: "O código expirou ou já foi usado. Pede um novo.",
  blocked: "Demasiadas tentativas. Espera 15 minutos.",
}

interface PageProps {
  searchParams: Promise<{ email?: string; erro?: string; next?: string }>
}

/** Client sign-in, step 2: the code sent by email. */
export default async function CodigoPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const email = sp.email ?? ""
  const next = safeNext(sp.next)
  const nextQuery = next === "/conta" ? "" : `&next=${encodeURIComponent(next)}`

  return (
    <AuthCard
      title="Código"
      back={{ href: `/conta/entrar?email=${encodeURIComponent(email)}${nextQuery}`, fixed: true }}
      intro={
        <>
          Enviámos um código de 6 dígitos para <strong>{email}</strong>. É válido
          durante 10 minutos — vê também o spam.
        </>
      }
    >
      <form action={confirmLoginCode} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <input
          name="code"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="000000"
          aria-label="Código"
          className="input text-center text-2xl tracking-[0.4em] tabular-nums"
        />
        {sp.erro && ERRORS[sp.erro] && <FormError>{ERRORS[sp.erro]}</FormError>}
        <button type="submit" className="btn w-full">
          Entrar
        </button>
      </form>
      <Link href={`/conta/entrar?email=${encodeURIComponent(email)}${nextQuery}`} className="link mt-4 inline-block text-sm">
        Pedir outro código
      </Link>
    </AuthCard>
  )
}
