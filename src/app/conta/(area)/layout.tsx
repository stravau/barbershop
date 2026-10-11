import { requireClient } from "@/lib/client-auth"
import { BackLink } from "@/components/BackLink"
import { ContaTabs } from "../_components/ContaTabs"

/**
 * The client area's frame (greeting + tabs). Being a layout, it stays on
 * screen while switching tabs; only the tab's content loads (see loading.tsx).
 */
export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const { client } = await requireClient()
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <BackLink href="/" />
      <p className="caps text-sm text-muted">A tua conta</p>
      <h1 className="print-shadow mt-1 text-4xl sm:text-5xl">Olá, {client.name.split(" ")[0]}!</h1>
      <ContaTabs />
      <div className="mt-8">{children}</div>
    </main>
  )
}
