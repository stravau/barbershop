// Changing a booking's status: the barber confirms or cancels, the client
// cancels. Shared by the admin pages, the pages the email links open and the
// client area, so every change updates Google Calendar and sends the same
// emails. Each update is conditional on the current status, so a double tap
// (or two tabs) can't send the emails twice.

import type { Booking, Client } from "@/generated/prisma"
import { prisma } from "./prisma"
import { formatLisbon } from "./tz"
import { getLocationAddress } from "./addresses"
import { deleteEvent, updateEvent } from "./gcal"
import {
  ADMIN_EMAIL,
  adminCancelledByClientEmail,
  clientCancelledEmail,
  clientConfirmedEmail,
  sendEmail,
  type BookingForEmail,
} from "./email"

/** Cancelling less than this many hours before the start is "late" (house rules). */
export const LATE_CANCEL_HOURS = 12

/** Hours from now until the booking starts (negative once it has started). */
export function hoursUntil(startUtc: Date, now = new Date()): number {
  return (startUtc.getTime() - now.getTime()) / 36e5
}

/** The fields the email templates need. The street address only once confirmed. */
export function bookingForEmail(b: Booking & { client: Client }, withAddress = false): BookingForEmail {
  return {
    id: b.id,
    clientName: b.client.name,
    clientPhone: b.client.phone,
    clientEmail: b.email,
    serviceName: b.serviceName,
    durationMin: b.durationMin,
    priceEur: b.servicePrice,
    location: b.location === "lisboa" ? "Lisboa" : "Setúbal",
    address: withAddress ? getLocationAddress(b.location) : null,
    whenLocal: formatLisbon(b.startUtc, "EEEE, dd 'de' MMMM 'às' HH:mm"),
    startUtc: b.startUtc,
    endUtc: b.endUtc,
    notes: b.notes,
    adminToken: b.adminToken,
    clientToken: b.clientToken,
  }
}

async function bestEffort(what: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn()
  } catch (e) {
    console.error(`[booking-status] ${what} failed:`, e)
  }
}

export type StatusChange =
  | { ok: true; booking: Booking & { client: Client } }
  | { ok: false; reason: "not-found" | "already-confirmed" | "already-cancelled" | "past" | "not-allowed" }

/** Why a conditional update matched nothing, from the booking's current state. */
async function whyNot(id: string, needsFuture = false): Promise<StatusChange & { ok: false }> {
  const b = await prisma.booking.findUnique({ where: { id }, select: { status: true, startUtc: true } })
  if (!b) return { ok: false, reason: "not-found" }
  if (b.status === "CANCELLED") return { ok: false, reason: "already-cancelled" }
  if (needsFuture && b.startUtc <= new Date()) return { ok: false, reason: "past" }
  if (b.status === "CONFIRMED") return { ok: false, reason: "already-confirmed" }
  return { ok: false, reason: "not-allowed" }
}

/** Barber accepts a request: PENDING → CONFIRMED, client gets the confirmation (with the address). */
export async function confirmBooking(id: string): Promise<StatusChange> {
  const { count } = await prisma.booking.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  })
  if (count === 0) return whyNot(id)
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, include: { client: true } })

  if (booking.gcalEventId) {
    // Drop the "[PENDENTE]" prefix from the event title
    await bestEffort("gcal rename", () =>
      updateEvent(booking.gcalEventId!, { summary: `${booking.serviceName} - ${booking.client.name}` }),
    )
  }
  if (booking.email) {
    const tpl = clientConfirmedEmail(bookingForEmail(booking, true))
    await bestEffort("client confirmed email", () => sendEmail({ to: booking.email!, ...tpl }))
  }
  return { ok: true, booking }
}

/** Barber refuses a request or cancels a booking; the client is told by email. */
export async function cancelBookingByBarber(id: string): Promise<StatusChange> {
  const { count } = await prisma.booking.updateMany({
    where: { id, status: { in: ["PENDING", "CONFIRMED"] } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  })
  if (count === 0) return whyNot(id)
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, include: { client: true } })

  if (booking.gcalEventId) await bestEffort("gcal delete", () => deleteEvent(booking.gcalEventId!))
  if (booking.email) {
    const tpl = clientCancelledEmail(bookingForEmail(booking))
    await bestEffort("client cancelled email", () => sendEmail({ to: booking.email!, ...tpl }))
  }
  return { ok: true, booking }
}

/**
 * The client cancels an upcoming booking; the barber is told by email, with a
 * warning when it's less than LATE_CANCEL_HOURS before the start.
 */
export async function cancelBookingByClient(id: string): Promise<StatusChange> {
  const now = new Date()
  const { count } = await prisma.booking.updateMany({
    where: { id, status: { in: ["PENDING", "CONFIRMED"] }, startUtc: { gt: now } },
    data: { status: "CANCELLED", cancelledAt: now },
  })
  if (count === 0) return whyNot(id, true)
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id }, include: { client: true } })

  if (booking.gcalEventId) await bestEffort("gcal delete", () => deleteEvent(booking.gcalEventId!))
  const tpl = adminCancelledByClientEmail(bookingForEmail(booking), {
    hoursBefore: hoursUntil(booking.startUtc, now),
    wasConfirmed: booking.confirmedAt !== null,
  })
  await bestEffort("admin cancel notice", () => sendEmail({ to: ADMIN_EMAIL, ...tpl }))
  return { ok: true, booking }
}
