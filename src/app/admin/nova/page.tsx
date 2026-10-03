import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { lisbonPeriods } from "@/lib/tz"
import { AdminNav } from "../_components/AdminNav"
import { ManualBookingForm } from "./ManualBookingForm"

export const dynamic = "force-dynamic"

/** Register a booking arranged outside the site (WhatsApp, phone, walk-in). */
export default function NovaMarcacaoPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <AdminNav active="agenda" />
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Agenda
        </Link>
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
