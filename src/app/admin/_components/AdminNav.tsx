import Link from "next/link"
import { LogOut } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "agenda", href: "/admin", label: "Agenda" },
  { id: "historico", href: "/admin/historico", label: "Histórico" },
  { id: "clientes", href: "/admin/clientes", label: "Clientes" },
  { id: "numeros", href: "/admin/dashboard", label: "Números" },
] as const

export type AdminTab = (typeof TABS)[number]["id"]

/** Admin section header: tabs (with the pending-requests badge) + logout. */
export async function AdminNav({ active }: { active: AdminTab }) {
  const pending = await prisma.booking.count({ where: { status: "PENDING" } })

  return (
    <div className="mb-8 flex items-end justify-between gap-2 border-b-2 border-ink">
      <nav className="-mb-0.5 flex min-w-0 gap-0.5 overflow-x-auto sm:gap-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            className={cn(
              "caps inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-md border-2 border-b-0 px-1.5 py-2 text-[0.75rem] transition min-[380px]:px-2 min-[380px]:text-[0.8rem] sm:px-4 sm:text-[0.95rem]",
              t.id === active
                ? "border-ink bg-card"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {t.id === "agenda" && pending > 0 && (
              <span className="rounded-full bg-yellow px-1.5 text-xs text-ink ring-1 ring-ink">
                {pending}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <a
        href="/api/admin/auth/logout"
        title="Sair"
        className="mb-2 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </a>
    </div>
  )
}
