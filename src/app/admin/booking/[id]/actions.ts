"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { emailLinkStillValid, isAdmin } from "@/lib/admin-auth"
import { deleteEvent } from "@/lib/gcal"
import { formatLisbon } from "@/lib/tz"

/**
 * Permanently deletes a booking WITHOUT notifying the client (unlike
 * "Cancelar", which emails them). Auth matches the booking page: an admin
 * session or the booking's adminToken.
 */
export async function deleteBooking(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) redirect("/admin?flash=error&code=not-found")

  // Admin session, or the email link's token while it's still valid
  const allowed =
    (await isAdmin()) || (booking.adminToken === token && emailLinkStillValid(booking.startUtc))
  if (!allowed) redirect("/admin?flash=error&code=invalid-token")

  // Remove it from Google Calendar too (best effort)
  if (booking.gcalEventId) {
    try {
      await deleteEvent(booking.gcalEventId)
    } catch (e) {
      console.error("[admin/delete] gcal delete failed:", e)
    }
  }

  await prisma.booking.delete({ where: { id } })

  const day = formatLisbon(booking.startUtc, "yyyy-MM-dd")
  redirect(`/admin?flash=deleted&mes=${day.slice(0, 7)}&dia=${day}`)
}
