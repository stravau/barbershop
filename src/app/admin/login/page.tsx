import { Lock } from "lucide-react"

interface PageProps {
  searchParams: Promise<{ error?: string; next?: string; left?: string }>
}

const ERRORS: Record<string, (left?: string) => string> = {
  wrong: (left) =>
    left === "0"
      ? "Palavra-passe incorreta. Demasiadas tentativas, espera 15 minutos."
      : `Palavra-passe incorreta.${left ? ` Restam ${left} tentativas.` : ""}`,
  blocked: () => "Demasiadas tentativas falhadas. Espera 15 minutos e tenta outra vez.",
  expired: () => "O código expirou ou já foi usado. Entra outra vez com a palavra-passe.",
  email: () => "Não foi possível enviar o código por email. Tenta outra vez daqui a pouco.",
  config: () =>
    "O admin não está configurado no servidor: faltam ADMIN_PASSWORD e/ou ADMIN_SECRET (mín. 16 caracteres).",
}

/** Admin login, step 1: password (POST /api/admin/auth/login). */
export default async function AdminLoginPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const next = sp.next ?? "/admin"
  const error = sp.error && ERRORS[sp.error]?.(sp.left)

  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <div className="mb-8 text-center">
        <Lock className="mx-auto mb-3 h-10 w-10 text-accent" />
        <h1 className="text-3xl">Admin</h1>
        <p className="mt-3 text-sm text-muted">Acesso reservado ao barbeiro.</p>
      </div>

      <form
        action="/api/admin/auth/login"
        method="POST"
        className="space-y-4 rounded-lg border-2 border-ink bg-card p-6 shadow-[6px_6px_0_var(--ink)] sm:p-8"
      >
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Palavra-passe</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="input"
          />
        </label>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <button type="submit" className="btn w-full">
          Entrar
        </button>
      </form>
    </main>
  )
}

export function generateMetadata() {
  return { title: "Admin", robots: "noindex" }
}

export const dynamic = "force-dynamic"
