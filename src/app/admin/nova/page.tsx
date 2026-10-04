import { BackLink } from "@/components/BackLink"
import { lisbonPeriods } from "@/lib/tz"
import { ManualBookingForm } from "./ManualBookingForm"
import { requireAdmin } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

/** Register a booking arranged outside the site (WhatsApp, phone, walk-in). */
export default async function NovaMarcacaoPage() {
  await requireAdmin("/admin/nova")
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <BackLink href="/admin" />
        <h1 className="text-3xl">Nova marcação</h1>
        <p className="mt-2 mb-8 text-muted">
          Para marcações combinadas fora do site — por WhatsApp, telefone ou ao
          balcão. Ficam logo confirmadas e o cliente não recebe email.
        </p>
        <div className="rounded-lg border-2 border-ink bg-card p-5 shadow-[6px_6px_0_var(--ink)] sm:p-7">
          <ManualBookingForm today={lisbonPeriods().today} />
        </div>
      </div>
    </main>
  )
}
