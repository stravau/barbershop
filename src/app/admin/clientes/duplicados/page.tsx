import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  findDuplicates,
  loadClientSummaries,
  hasPhone,
  mergedPreview,
  normalizePhone,
  type DuplicateGroup,
} from "@/lib/clients"
import { AdminNav } from "../../_components/AdminNav"
import { formatPhone } from "../../_components/ContactLinks"
import { FlashBanner } from "../../_components/FlashBanner"
import { Empty, SectionTitle } from "../../_components/ui"
import { prisma } from "@/lib/prisma"
import { mergeAllSure, mergeGroup } from "./actions"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ juntos?: string; numeros?: string }>
}

/** Clients registered more than once, ready to be merged. */
export default async function DuplicadosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const summaries = await loadClientSummaries(prisma)
  const { sure, probable } = findDuplicates(summaries)
  const bareNumbers = summaries.filter(
    (c) => hasPhone(c.phone) && normalizePhone(c.phone) !== c.phone,
  ).length

  const merged = Number(sp.juntos ?? 0)
  const fixed = Number(sp.numeros ?? 0)
  const notice =
    sp.juntos !== undefined
      ? `${merged} ${merged === 1 ? "grupo juntado" : "grupos juntados"}${fixed > 0 ? ` · ${fixed} números corrigidos com o 351` : ""}.`
      : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav active="clientes" />
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin/clientes"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Clientes
        </Link>
        <h1 className="text-3xl">Clientes repetidos</h1>
        <p className="mt-2 mb-6 text-muted">
          Ao juntar, as marcações passam todas para um só cliente, que fica com
          o nome mais completo, o telemóvel (com 351) e o email.
        </p>

        {notice && (
          <FlashBanner text={notice} tone="success" clearParams={["juntos", "numeros"]} />
        )}

        {(sure.length > 0 || bareNumbers > 0) && (
          <form action={mergeAllSure} className="mb-8">
            <button type="submit" className="btn">
              Juntar os seguros ({sure.length})
              {bareNumbers > 0 && <> e corrigir {bareNumbers} números</>}
            </button>
          </form>
        )}

        <section className="mb-10">
          <SectionTitle aside="mesmo telemóvel ou mesmo email">Seguros</SectionTitle>
          {sure.length === 0 ? (
            <Empty>Não há clientes repetidos com o mesmo telemóvel ou email.</Empty>
          ) : (
            <ul className="space-y-3">
              {sure.map((g) => (
                <GroupCard key={g.clients[0].id} group={g} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle aside="confirma um a um">Prováveis</SectionTitle>
          {probable.length === 0 ? (
            <Empty>Sem sugestões.</Empty>
          ) : (
            <ul className="space-y-3">
              {probable.map((g) => (
                <GroupCard key={g.clients.map((c) => c.id).join("-")} group={g} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

function GroupCard({ group }: { group: DuplicateGroup }) {
  const preview = mergedPreview(group.clients)
  return (
    <li className="rounded-lg border-2 border-ink/20 bg-card p-4">
      <div className="flex flex-wrap gap-1.5">
        {group.reasons.map((r) => (
          <span key={r} className="caps rounded bg-yellow/40 px-1.5 py-0.5 text-[0.7rem]">
            {r}
          </span>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-ink/10">
        {group.clients.map((c) => (
          <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5 text-sm">
            <span className="font-semibold">{c.name}</span>
            <span className="text-muted">
              {hasPhone(c.phone) ? formatPhone(c.phone) : "sem telefone"} ·{" "}
              {c.email ?? "sem email"} · {c.bookingCount}{" "}
              {c.bookingCount === 1 ? "marcação" : "marcações"}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/10 pt-3">
        <p className="text-sm">
          Fica: <strong>{preview.name}</strong> ·{" "}
          {hasPhone(preview.phone) ? formatPhone(preview.phone) : "sem telefone"} ·{" "}
          {preview.email ?? "sem email"}
        </p>
        <form action={mergeGroup}>
          <input type="hidden" name="ids" value={group.clients.map((c) => c.id).join(",")} />
          <button type="submit" className="btn btn-sm">
            Juntar
          </button>
        </form>
      </div>
    </li>
  )
}
