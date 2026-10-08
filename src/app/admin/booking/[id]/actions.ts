"use server"

import { redirect } from "next/navigation"
import { addMinutes } from "date-fns"
import { prisma } from "@/lib/prisma"
import { emailLinkStillValid, isAdmin } from "@/lib/admin-auth"
import {
  bookingForEmail,
  cancelBookingByBarber,
  confirmBooking,
  type StatusChange,
} from "@/lib/booking-status"
import { deleteEvent, updateEvent } from "@/lib/gcal"
import { combineDateTimeLisbon, formatLisbon } from "@/lib/tz"
import { buildCombo, validateSelection } from "@/lib/services"
import { fixedPriceFor } from "@/lib/clients"
import { clientRescheduledEmail, sendEmail } from "@/lib/email"
import { NO_SHOW, parseEuros } from "../../_lib"

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

/** Updates the price, tip and notes of a booking (no email is sent). */
export async function updateBooking(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")
  const tip = parseEuros(String(form.get("tip") ?? ""))
  const rawPrice = String(form.get("price") ?? "").trim()
  const notes = String(form.get("notes") ?? "").trim() || null

  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) redirect("/admin?flash=error&code=not-found")
  await assertAllowed(booking, token)
  // An empty price keeps the current one; 0 is a free cut (loyalty card)
  const price = rawPrice ? parseEuros(rawPrice) : booking.servicePrice
  if (tip === null || price === null) redirect(`/admin/booking/${id}?token=${booking.adminToken}&saved=invalid`)

  await prisma.booking.update({ where: { id }, data: { servicePrice: price, tipEur: tip, notes } })
  redirect(`/admin/booking/${id}?token=${booking.adminToken}&saved=1`)
}

/**
 * "Faltou": a confirmed booking whose time has passed, but the client didn't
 * come. It stops counting as a visit, for the loyalty card and the takings.
 */
export async function markNoShowAction(form: FormData): Promise<void> {
  await setNoShow(form, true)
}

/** "Afinal veio": undoes "Faltou". */
export async function undoNoShowAction(form: FormData): Promise<void> {
  await setNoShow(form, false)
}

async function setNoShow(form: FormData, noShow: boolean): Promise<void> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking) redirect("/admin?flash=error&code=not-found")
  await assertAllowed(booking, token)

  await prisma.booking.updateMany({
    where: noShow
      ? { id, status: "CONFIRMED", startUtc: { lt: new Date() } }
      : { id, status: NO_SHOW },
    data: { status: noShow ? NO_SHOW : "CONFIRMED" },
  })
  redirect(`/admin/booking/${id}?token=${booking.adminToken}&saved=${noShow ? "falta" : "veio"}`)
}

export interface RescheduleState {
  error?: string
  /** Who the new time overlaps with — the form then offers "Mudar mesmo assim". */
  overlap?: string
}

/**
 * Moves a booking to another day/time/city and/or changes its services.
 * Warns about overlaps (unless "Mudar mesmo assim"), moves the Google
 * Calendar event and, if asked, emails the client the new details.
 */
export async function rescheduleBooking(_prev: RescheduleState, form: FormData): Promise<RescheduleState> {
  const id = String(form.get("id") ?? "")
  const token = String(form.get("token") ?? "")
  const booking = await prisma.booking.findUnique({ where: { id }, include: { client: true } })
  if (!booking) return { error: "Marcação não encontrada." }
  await assertAllowed(booking, token)
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { error: "Só dá para mudar marcações por confirmar ou confirmadas." }
  }

  const date = String(form.get("date") ?? "")
  const time = String(form.get("time") ?? "")
  const location = String(form.get("location") ?? "")
  const services = form.getAll("services").map(String)
  const notify = form.get("notify") === "on"
  const force = form.get("force") === "on"

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Escolhe o dia." }
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Escolhe a hora." }
  if (location !== "lisboa" && location !== "setubal") return { error: "Escolhe a cidade." }
  const valid = validateSelection(services)
  if (!valid.ok) return { error: valid.error }

  const combo = buildCombo(services)
  const startUtc = combineDateTimeLisbon(date, time)
  const endUtc = addMinutes(startUtc, combo.durationMin)
  // Same services: keep the price (it may have been changed by hand)
  const price =
    combo.key === booking.serviceId ? booking.servicePrice : (fixedPriceFor(booking.client.name) ?? combo.priceEur)

  if (!force) {
    const clash = await prisma.booking.findFirst({
      where: {
        id: { not: id },
        status: { in: ["PENDING", "CONFIRMED"] },
        startUtc: { lt: endUtc },
        endUtc: { gt: startUtc },
      },
      include: { client: true },
    })
    if (clash) {
      return {
        overlap: `${clash.client.name}, ${formatLisbon(clash.startUtc, "HH:mm")}–${formatLisbon(clash.endUtc, "HH:mm")}`,
      }
    }
  }

  const previousWhen = formatLisbon(booking.startUtc, "EEEE, dd 'de' MMMM 'às' HH:mm")
  const updated = await prisma.booking.update({
    where: { id },
    data: {
      startUtc,
      endUtc,
      location,
      serviceId: combo.key,
      serviceName: combo.name,
      durationMin: combo.durationMin,
      servicePrice: price,
      reminderSentAt: null, // a new day gets its own reminder
    },
    include: { client: true },
  })

  if (updated.gcalEventId) {
    try {
      await updateEvent(updated.gcalEventId, {
        summary: `${updated.status === "PENDING" ? "[PENDENTE] " : ""}${updated.serviceName} - ${updated.client.name}`,
        location: location === "lisboa" ? "Lisboa" : "Setúbal",
        startUtc,
        endUtc,
      })
    } catch (e) {
      console.error("[admin/reschedule] gcal update failed:", e)
    }
  }

  let saved = "remarcada"
  if (notify && updated.email && startUtc > new Date()) {
    const confirmed = updated.status === "CONFIRMED"
    const tpl = clientRescheduledEmail(bookingForEmail(updated, confirmed), { previousWhen, confirmed })
    const sent = await sendEmail({ to: updated.email, ...tpl })
    saved = sent.ok ? "remarcada-email" : "remarcada-email-falhou"
  }
  redirect(`/admin/booking/${id}?token=${updated.adminToken}&saved=${saved}`)
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
