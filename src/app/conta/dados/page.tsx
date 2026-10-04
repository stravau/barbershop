import type { Metadata } from "next"
import { requireClient } from "@/lib/client-auth"
import { Card, ContaShell, Notice } from "../_components/ContaShell"
import { ConfirmForm } from "../_components/ConfirmSubmit"
import { LogoutButton } from "@/components/LogoutButton"
import { deleteAccount, updateDetails } from "../actions"

export const metadata: Metadata = { title: "Os meus dados", robots: "noindex" }
export const dynamic = "force-dynamic"

const ERRORS: Record<string, string> = {
  nome: "Escreve o teu nome.",
  telefone: "Telemóvel inválido.",
  "telefone-usado": "Esse telemóvel já está associado a outro cliente. Fala connosco por WhatsApp.",
}

interface PageProps {
  searchParams: Promise<{ erro?: string; guardado?: string }>
}

/** "Os meus dados": details, preferences, logout and account deletion. */
export default async function DadosPage({ searchParams }: PageProps) {
  const { session, client } = await requireClient()
  const sp = await searchParams
  // Stored as 351XXXXXXXXX; show the familiar 9 digits for Portuguese numbers
  const phone = client.phone.startsWith("351") ? client.phone.slice(3) : client.phone

  return (
    <ContaShell name={client.name} active="/conta/dados">
      {sp.guardado && <Notice tone="ok">Dados guardados.</Notice>}
      {sp.erro && ERRORS[sp.erro] && <Notice tone="error">{ERRORS[sp.erro]}</Notice>}

      <Card>
        <form action={updateDetails} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Nome</span>
            <input name="name" required defaultValue={client.name} autoComplete="name" className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Telemóvel</span>
            <input
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              defaultValue={phone}
              className="input"
            />
          </label>
          <div>
            <span className="mb-1.5 block text-sm font-semibold">Email</span>
            <p className="rounded-md border-2 border-rule bg-paper px-3 py-2 text-ink/80">{session.email}</p>
            <p className="mt-1 text-xs text-muted">É o email com que entras na conta.</p>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Cidade preferida</span>
            <select name="preferredLocation" defaultValue={client.preferredLocation ?? ""} className="input">
              <option value="">Sem preferência</option>
              <option value="lisboa">Lisboa</option>
              <option value="setubal">Setúbal</option>
            </select>
            <span className="mt-1 block text-xs text-muted">Usada nas sugestões da marcação express.</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Nota para todas as marcações</span>
            <textarea
              name="standingNote"
              rows={3}
              maxLength={300}
              defaultValue={client.standingNote ?? ""}
              placeholder="Ex.: pele sensível, prefiro máquina 2 dos lados…"
              className="input"
            />
          </label>
          <button type="submit" className="btn">
            Guardar
          </button>
        </form>
      </Card>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t-2 border-ink pt-6">
        <LogoutButton className="btn-ghost px-3 py-1.5 text-sm">Terminar sessão</LogoutButton>
        <ConfirmForm
          action={deleteAccount}
          warning="Apagar a tua conta? As marcações futuras são canceladas e os teus dados apagados. Não dá para desfazer."
          className="text-sm font-semibold text-danger underline-offset-4 hover:underline"
        >
          Apagar conta
        </ConfirmForm>
      </div>
    </ContaShell>
  )
}
