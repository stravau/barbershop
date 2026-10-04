import { prisma } from "@/lib/prisma"
import { formatLisbon } from "@/lib/tz"
import { currentAdminSession, requireAdmin } from "@/lib/admin-auth"
import { cn } from "@/lib/utils"
import { FlashBanner } from "../_components/FlashBanner"
import { Empty, SectionTitle } from "../_components/ui"
import { endAllSessions, endOtherSessions, forgetDevices } from "./actions"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ terminadas?: string; esquecidos?: string }>
}

/** "Chrome · Windows" style label from a user-agent string. */
function deviceLabel(ua: string | null): string {
  if (!ua) return "Dispositivo desconhecido"
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "?"
  return `${browser} · ${os}`
}

const when = (d: Date) => formatLisbon(d, "dd/MM/yyyy 'às' HH:mm")

/** Admin security: live sessions, remembered devices and the login log. */
export default async function SegurancaPage({ searchParams }: PageProps) {
  await requireAdmin("/admin/seguranca")
  const sp = await searchParams
  const now = new Date()
  const me = await currentAdminSession()

  const [sessions, devices, attempts] = await Promise.all([
    prisma.adminSession.findMany({
      where: { revokedAt: null, expiresAt: { gt: now } },
      orderBy: { lastSeenAt: "desc" },
    }),
    prisma.trustedDevice.findMany({
      where: { revokedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loginAttempt.findMany({
      // Client sign-ins have their own stages; this page is about the admin
      where: { stage: { in: ["password", "code"] } },
      orderBy: { createdAt: "desc" }, take: 30 }),
  ])
  const failedLast24h = attempts.filter(
    (a) => !a.success && now.getTime() - a.createdAt.getTime() < 864e5,
  ).length

  const notice =
    sp.terminadas !== undefined
      ? `${sp.terminadas} ${sp.terminadas === "1" ? "sessão terminada" : "sessões terminadas"}.`
      : sp.esquecidos !== undefined
        ? "Dispositivos esquecidos — a próxima entrada em cada um pede o código."
        : null

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl">Segurança</h1>
        <p className="mt-2 mb-6 text-muted">
          Quem tem o admin aberto, os dispositivos que não pedem código e as
          últimas tentativas de entrada.
        </p>
        {notice && (
          <FlashBanner text={notice} tone="success" clearParams={["terminadas", "esquecidos"]} />
        )}

        <section className="mb-10">
          <SectionTitle aside={`${sessions.length} ativas`}>Sessões</SectionTitle>
          <ul className="divide-y divide-ink/10 border-y-2 border-ink">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                <span className="font-semibold">
                  {deviceLabel(s.userAgent)}
                  {s.id === me?.id && (
                    <span className="caps ml-2 rounded bg-yellow px-1.5 py-0.5 text-[0.7rem] ring-1 ring-ink">
                      esta
                    </span>
                  )}
                </span>
                <span className="text-muted">
                  entrou {when(s.createdAt)} · visto {when(s.lastSeenAt)} · IP {s.ip ?? "?"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={endOtherSessions}>
              <button type="submit" className="btn btn-sm" disabled={sessions.length <= 1}>
                Terminar as outras sessões
              </button>
            </form>
            <form action={endAllSessions}>
              <button type="submit" className="btn-ghost border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger/5">
                Terminar todas (incluindo esta)
              </button>
            </form>
          </div>
        </section>

        <section className="mb-10">
          <SectionTitle aside="não pedem o código durante 15 dias">Dispositivos lembrados</SectionTitle>
          {devices.length === 0 ? (
            <Empty>Nenhum dispositivo lembrado.</Empty>
          ) : (
            <>
              <ul className="divide-y divide-ink/10 border-y-2 border-ink">
                {devices.map((d) => (
                  <li key={d.id} className="flex flex-wrap justify-between gap-x-4 py-2.5 text-sm">
                    <span className="font-semibold">{deviceLabel(d.userAgent)}</span>
                    <span className="text-muted">
                      desde {when(d.createdAt)} · até {formatLisbon(d.expiresAt, "dd/MM/yyyy")}
                    </span>
                  </li>
                ))}
              </ul>
              <form action={forgetDevices} className="mt-4">
                <button type="submit" className="btn-ghost px-3 py-1.5 text-sm">
                  Esquecer todos os dispositivos
                </button>
              </form>
            </>
          )}
        </section>

        <section>
          <SectionTitle aside={`${failedLast24h} falhadas nas últimas 24 h`}>Entradas recentes</SectionTitle>
          {attempts.length === 0 ? (
            <Empty>Ainda sem registos.</Empty>
          ) : (
            <ul className="divide-y divide-ink/10 border-y-2 border-ink">
              {attempts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "caps rounded px-1.5 py-0.5 text-[0.7rem]",
                        a.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                      )}
                    >
                      {a.success ? "ok" : "falhou"}
                    </span>
                    {a.stage === "code" ? "Código" : "Palavra-passe"} · {deviceLabel(a.userAgent)}
                  </span>
                  <span className="text-muted">
                    {when(a.createdAt)} · IP {a.ip}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            Ao fim de 5 tentativas falhadas, esse endereço fica bloqueado 15 minutos.
          </p>
        </section>
      </div>
    </main>
  )
}
