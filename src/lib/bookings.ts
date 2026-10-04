// Creating a booking request (status PENDING) — shared by the public booking
// form (/api/bookings) and the client area's "Marcação express".

import { addMinutes } from "date-fns"
import { prisma } from "./prisma"
import { buildCombo, validateSelection } from "./services"
import { createEvent } from "./gcal"
import { formatLisbon } from "./tz"
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

/**
 * Validates, re-checks the slot is free, upserts the client by phone,
 * creates a PENDING booking and notifies the barber and the client
 * (emails and Google Calendar are best effort).
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

  if (startUtc.getTime() <= Date.now()) {
    return { ok: false, status: 400, error: "Slot no passado" }
  }

  // Race-condition safety: re-check no overlapping booking exists
  const overlapping = await prisma.booking.findFirst({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startUtc: { lt: endUtc },
      endUtc: { gt: startUtc },
    },
    select: { id: true },
  })
  if (overlapping) {
    return { ok: false, status: 409, error: "Esse horário foi marcado entretanto. Escolhe outro." }
  }

  const dbClient = await prisma.client.upsert({
    where: { phone: client.phone },
    update: { name: client.name, email: client.email },
    create: { phone: client.phone, name: client.name, email: client.email },
  })

  const booking = await prisma.booking.create({
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
