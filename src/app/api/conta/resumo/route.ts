import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentClientSession } from "@/lib/client-auth"
import { clientHabit, suggestSlots } from "@/lib/express"
import { formatLisbon } from "@/lib/tz"
import { isDone } from "@/app/admin/_lib"

export type AccountSummary =
  | { signedIn: false }
  | {
      signedIn: true
      firstName: string
      visits: number
      hasHabit: boolean
      /** Next pending/confirmed booking */
      next: { when: string; status: "PENDING" | "CONFIRMED" } | null
      /** First express suggestion — only when there's no booking ahead */
      express: { startIso: string; when: string; serviceName: string; priceEur: number } | null
    }

const when = (d: Date) => formatLisbon(d, "EEE dd/MM 'às' HH:mm").replace(/^./, (c) => c.toUpperCase())

/**
 * GET /api/conta/resumo — what the (static) home page personalises for a
 * signed-in client: greeting strip, hero button and loyalty card. Never cached.
 */
export async function GET() {
  const current = await currentClientSession()
  const client = current?.client
  if (!client) {
    return NextResponse.json({ signedIn: false } satisfies AccountSummary, { headers: { "Cache-Control": "no-store" } })
  }

  const now = new Date()
  const bookings = await prisma.booking.findMany({
    where: { clientId: client.id },
    select: { status: true, startUtc: true },
    orderBy: { startUtc: "asc" },
  })
  const upcoming = bookings.find(
    (b) => b.startUtc >= now && (b.status === "PENDING" || b.status === "CONFIRMED"),
  )
  const habit = await clientHabit(client.id, client.preferredLocation)
  const first = !upcoming && habit ? (await suggestSlots(habit))[0] : undefined

  const summary: AccountSummary = {
    signedIn: true,
    firstName: client.name.split(" ")[0],
    visits: bookings.filter((b) => isDone(b, now)).length,
    hasHabit: !!habit,
    next: upcoming ? { when: when(upcoming.startUtc), status: upcoming.status as "PENDING" | "CONFIRMED" } : null,
    express:
      first && habit
        ? {
            startIso: first.startIso,
            when: when(new Date(first.startIso)),
            serviceName: habit.serviceName,
            priceEur: habit.priceEur,
          }
        : null,
  }
  return NextResponse.json(summary, { headers: { "Cache-Control": "no-store" } })
}
