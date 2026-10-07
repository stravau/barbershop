"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { emailLinkStillValid, isAdmin } from "@/lib/admin-auth"
import { cancelBookingByBarber, confirmBooking, type StatusChange } from "@/lib/booking-status"
import { deleteEvent } from "@/lib/gcal"
import { formatLisbon } from "@/lib/tz"
import { parseEuros } from "../../_lib"

/**
 * "Confirmar" / "Recusar" / "Cancelar marcação" — from the agenda (form
 * field from=agenda, back=<agenda URL>) or the booking page (also reached
 * from the email links, signed in or with the booking's token).
 */
export async function confirmBookingAction(form: FormData): Promise<void> {
  await changeStatus(form, confirmBooking, "confirmed")
}

export async function cancelBookingAction(form: FormData): Promise<void> {
  await changeStatus(form, cancelBookingByBarber, "cancelled")
}

async function changeStatus(
  form: FormData,
  change: (id: string) => Promise<StatusChange>,
  done: "confirmed" | "cancelled",
): Promise<void> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")
  const fromAgenda = form.get("from") === "agenda"
  const back = String(form.get("back") ?? "")
  const agenda = (flash: string) => {
    const url = new URL(back.startsWith("/admin") ? back : "/admin", "http://x")
    url.searchParams.set("flash", flash)
    return url.pathname + url.search
  }

  const booking = await prisma.booking.findUnique({ where: { id }, select: { adminToken: true, startUtc: true } })
  if (!booking) redirect(fromAgenda ? `${agenda("error")}&code=not-found` : `/admin/booking/${id}?error=not-found`)
  await assertAllowed(booking, token)

  const result = await change(id)
  const page = `/admin/booking/${id}?token=${booking.adminToken}`
  if (result.ok) redirect(fromAgenda ? agenda(done) : `${page}&${done === "confirmed" ? "confirmed" : "rejected"}=1`)
  if (result.reason === "already-confirmed" || result.reason === "already-cancelled") {
    redirect(fromAgenda ? agenda(result.reason) : `${page}&already=1`)
  }
  redirect(fromAgenda ? `${agenda("error")}&code=${result.reason}` : `/admin/booking/${id}?error=${result.reason}`)
}

/** Updates the tip and notes of a booking (no email is sent). */
export async function updateBooking(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")
  const tip = parseEuros(String(form.get("tip") ?? ""))
  const notes = String(form.get("notes") ?? "").trim() || null

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) redirect("/admin?flash=error&code=not-found")
  await assertAllowed(booking, token)
  if (tip === null) redirect(`/admin/booking/${id}?token=${booking.adminToken}&saved=invalid`)

  await prisma.booking.update({ where: { id }, data: { tipEur: tip, notes } })
  redirect(`/admin/booking/${id}?token=${booking.adminToken}&saved=1`)
}

/** Admin session, or the email link's token while it's still valid (as on the booking page). */
async function assertAllowed(booking: { adminToken: string; startUtc: Date }, token: string): Promise<void> {
  const allowed =
    (await isAdmin()) || (booking.adminToken === token && emailLinkStillValid(booking.startUtc))
  if (!allowed) redirect("/admin?flash=error&code=invalid-token")
}

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
  await assertAllowed(booking, token)

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
