"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { cancelBookingByClient } from "@/lib/booking-status"

/**
 * The client cancels a booking — from its page (reached from the emails) or
 * from "As minhas marcações" (from=conta). The booking's clientToken is the
 * proof, the same as for viewing the page.
 */
export async function cancelByClientAction(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")
  const fromAccount = form.get("from") === "conta"

  const booking = await prisma.booking.findUnique({ where: { id }, select: { clientToken: true } })
  if (!booking || !token || booking.clientToken !== token) redirect(`/marcacao/${id}`)

  const result = await cancelBookingByClient(id)
  const outcome = result.ok ? "1" : result.reason
  if (fromAccount) redirect(`/conta/marcacoes?cancelada=${outcome}`)
  redirect(`/marcacao/${id}?token=${token}&${result.ok ? "cancelled=1" : `erro=${result.reason}`}`)
}
