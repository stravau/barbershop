import { MailCheck } from "lucide-react"
import { BackLink } from "@/components/BackLink"

interface PageProps {
  searchParams: Promise<{ error?: string; next?: string }>
}

/** Admin login, step 2: the code emailed to the admin (POST /api/admin/auth/verify). */
export default async function AdminCodePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const next = sp.next ?? "/admin"

  return (
    <main className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <BackLink href={`/admin/login?next=${encodeURIComponent(next)}`} fixed />
      <div className="mb-8 text-center">
        <MailCheck className="mx-auto mb-3 h-10 w-10 text-accent" />
        <h1 className="text-3xl">Código de acesso</h1>
        <p className="mt-3 text-sm text-muted">
          Enviámos um código de 6 dígitos para o email do admin. É válido durante 10 minutos.
        </p>
      </div>

      <form
        action="/api/admin/auth/verify"
        method="POST"
        className="space-y-4 rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8"
      >
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Código</span>
          <input
            name="code"
            required
            autoFocus
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            placeholder="000000"
            className="input text-center text-2xl tracking-[0.4em] tabular-nums"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remember" defaultChecked className="h-4 w-4 accent-[var(--ink)]" />
          Lembrar este dispositivo durante 15 dias
        </label>
        {sp.error === "wrong" && (
          <p className="text-sm font-semibold text-danger">Código incorreto. Tenta outra vez.</p>
        )}
        <button type="submit" className="btn w-full">
          Confirmar
        </button>
      </form>
    </main>
  )
}

export function generateMetadata() {
  return { title: "Admin", robots: "noindex" }
}

export const dynamic = "force-dynamic"
