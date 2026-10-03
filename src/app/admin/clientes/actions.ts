"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/admin-session"
import { deleteEvent } from "@/lib/gcal"

/**
 * Deletes a client together with all their bookings (a booking can't exist
 * without its client). Nobody is notified; future bookings are also removed
 * from Google Calendar.
 */
export async function deleteClient(form: FormData): Promise<void> {
  const cookieStore = await cookies()
  if (!(await isSessionValid(cookieStore.get(SESSION_COOKIE_NAME)?.value))) {
    redirect("/admin/login?next=/admin/clientes")
  }

  const id = String(form.get("id") ?? "")
  const client = await prisma.client.findUnique({
    where: { id },
    include: { bookings: { select: { gcalEventId: true, startUtc: true } } },
  })
  if (!client) redirect("/admin/clientes")

  const now = new Date()
  for (const b of client.bookings) {
    if (!b.gcalEventId || b.startUtc < now) continue
    try {
      await deleteEvent(b.gcalEventId)
    } catch (e) {
      console.error("[admin/clientes] gcal delete failed:", e)
    }
  }

  await prisma.$transaction([
    prisma.booking.deleteMany({ where: { clientId: id } }),
    prisma.client.delete({ where: { id } }),
  ])

  redirect(`/admin/clientes?apagado=${encodeURIComponent(client.name)}`)
}
