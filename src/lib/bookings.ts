// Creating a booking request (status PENDING) — shared by the public booking
// form (/api/bookings) and the client area's "Marcação express".

import { addMinutes } from "date-fns"
import { prisma } from "./prisma"
import { buildCombo, validateSelection } from "./services"
import { createEvent } from "./gcal"
import { formatLisbon } from "./tz"
import { freeSlots } from "./availability"
import { DEFAULT_BUFFER_MIN } from "./slots"
import { fixedPriceFor, normalizePhone } from "./clients"
import { sendEmail, adminBookingEmail, clientReceivedEmail, ADMIN_EMAIL } from "./email"
import type { LocationId } from "./schedule"

export interface BookingRequestInput {
  location: LocationId
  services: string[]
  startUtc: Date
  client: { name: string; phone: string; email: string }
  notes?: string
}

export type BookingRequestResult =
  | {
      ok: true
      booking: { id: string; clientToken: string }
      serviceName: string
      priceEur: number
      whenLocal: string
    }
  | { ok: false; status: number; error: string }

/** Postgres advisory lock held while a booking is checked and written. */
const BOOKING_LOCK = 7_202_604

/**
 * Validates, checks the time is one we'd offer (working hours, the gap
 * between bookings, Google Calendar blocks, minimum notice, booking window),
 * upserts the client by phone, creates a PENDING booking and notifies the
 * barber and the client (emails and Google Calendar are best effort).
 */
export async function createBookingRequest(input: BookingRequestInput): Promise<BookingRequestResult> {
  const { location, services, startUtc, notes } = input
  // Same person typed with or without 351 must end up as one client
  const client = { ...input.client, phone: normalizePhone(input.client.phone) }

  const v = validateSelection(services)
  if (!v.ok) return { ok: false, status: 400, error: v.error }

  const combo = buildCombo(services)
  // Some regulars always pay a fixed amount (see lib/clients.ts)
  const price = fixedPriceFor(client.name) ?? combo.priceEur
  const endUtc = addMinutes(startUtc, combo.durationMin)

  // Only a time the slot list would offer right now
  const offered = await freeSlots(location, formatLisbon(startUtc, "yyyy-MM-dd"), combo.durationMin)
  if (!offered.some((s) => s.getTime() === startUtc.getTime())) {
    return { ok: false, status: 409, error: "Essa hora já não está disponível. Escolhe outra." }
  }

  // Two requests for the same time at once: the lock makes the second one
  // wait, and then it sees the first booking
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BOOKING_LOCK})`
    const overlapping = await tx.booking.findFirst({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startUtc: { lt: addMinutes(endUtc, DEFAULT_BUFFER_MIN) },
        endUtc: { gt: addMinutes(startUtc, -DEFAULT_BUFFER_MIN) },
      },
      select: { id: true },
    })
    if (overlapping) return null

    const dbClient = await tx.client.upsert({
      where: { phone: client.phone },
      update: { name: client.name, email: client.email },
      create: { phone: client.phone, name: client.name, email: client.email },
    })
    return tx.booking.create({
      data: {
        clientId: dbClient.id,
        email: client.email,
        serviceId: combo.key,
        serviceName: combo.name,
        servicePrice: price,
        durationMin: combo.durationMin,
        location,
        startUtc,
        endUtc,
        status: "PENDING",
        notes,
      },
    })
  })
  if (!booking) {
    return { ok: false, status: 409, error: "Esse horário foi marcado entretanto. Escolhe outro." }
  }

  const whenLocal = formatLisbon(startUtc, "EEEE, dd 'de' MMMM 'às' HH:mm")
  const locationPretty = location === "lisboa" ? "Lisboa" : "Setúbal"
  const forEmail = {
    id: booking.id,
    clientName: client.name,
    clientPhone: client.phone,
    clientEmail: client.email,
    serviceName: combo.name,
    durationMin: combo.durationMin,
    priceEur: price,
    location: locationPretty,
    whenLocal,
    startUtc,
    endUtc,
    notes: notes ?? null,
    adminToken: booking.adminToken,
    clientToken: booking.clientToken,
  }

  try {
    const tpl = adminBookingEmail(forEmail)
    await sendEmail({ to: ADMIN_EMAIL, subject: tpl.subject, html: tpl.html })
  } catch (e) {
    console.error("[bookings] admin email failed:", e)
  }

  try {
    const tpl = clientReceivedEmail(forEmail)
    await sendEmail({ to: client.email, subject: tpl.subject, html: tpl.html })
  } catch (e) {
    console.error("[bookings] client received email failed:", e)
  }

  try {
    const eventId = await createEvent({
      summary: `[PENDENTE] ${combo.name} - ${client.name}`,
      description:
        `Cliente: ${client.name}\n` +
        `Telefone: ${client.phone}\n` +
        `Email: ${client.email}\n` +
        `Serviço: ${combo.name} (${combo.durationMin} min, ${price}€)\n` +
        (notes ? `Notas: ${notes}\n` : "") +
        `\nID: ${booking.id}`,
      location: locationPretty,
      startUtc,
      endUtc,
    })
    if (eventId) {
      await prisma.booking.update({ where: { id: booking.id }, data: { gcalEventId: eventId } })
    }
  } catch (e) {
    console.error("[bookings] gcal create failed:", e)
  }

  return {
    ok: true,
    booking: { id: booking.id, clientToken: booking.clientToken },
    serviceName: combo.name,
    priceEur: price,
    whenLocal,
  }
}
