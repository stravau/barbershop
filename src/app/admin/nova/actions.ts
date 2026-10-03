"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { addMinutes } from "date-fns"
import { prisma } from "@/lib/prisma"
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/admin-session"
import { buildCombo, validateSelection } from "@/lib/services"
import { getWorkingHours, type LocationId } from "@/lib/schedule"
import { combineDateTimeLisbon, getLisbonDayOfWeek } from "@/lib/tz"
import { createEvent } from "@/lib/gcal"
import { NO_PHONE_PREFIX } from "../_lib"

export interface ManualBookingState {
  error?: string
}

/**
 * Registers a booking the barber arranged outside the site (WhatsApp, phone,
 * walk-in) — past or future. It goes straight in as CONFIRMED: past ones
 * count as done, future ones block the slot online. No emails are sent.
 */
export async function createManualBooking(
  _prev: ManualBookingState,
  form: FormData,
): Promise<ManualBookingState> {
  const cookieStore = await cookies()
  if (!(await isSessionValid(cookieStore.get(SESSION_COOKIE_NAME)?.value))) {
    return { error: "Sessão expirada — faz login outra vez." }
  }

  const name = String(form.get("name") ?? "").trim()
  const rawPhone = String(form.get("phone") ?? "").replace(/\D/g, "")
  const email = String(form.get("email") ?? "").trim() || null
  const services = form.getAll("services").map(String)
  const location = String(form.get("location") ?? "") as LocationId
  const date = String(form.get("date") ?? "")
  const time = String(form.get("time") ?? "")
  const notes = String(form.get("notes") ?? "").trim() || null

  if (name.length < 2) return { error: "Escreve o nome do cliente." }
  // Portuguese numbers can be typed without the country code
  const phone = rawPhone.length === 9 ? `351${rawPhone}` : rawPhone
  if (phone && !/^\d{11,15}$/.test(phone)) return { error: "Telemóvel inválido." }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." }
  const valid = validateSelection(services)
  if (!valid.ok) return { error: valid.error }
  if (location !== "lisboa" && location !== "setubal") return { error: "Escolhe a cidade." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Escolhe o dia." }
  if (time && !/^\d{2}:\d{2}$/.test(time)) return { error: "Hora inválida." }

  const combo = buildCombo(services)
  // No time given: use the opening time of that city on that day
  const hhmm = time || getWorkingHours(location, getLisbonDayOfWeek(date))?.start || "12:00"
  const startUtc = combineDateTimeLisbon(date, hhmm)
  const endUtc = addMinutes(startUtc, combo.durationMin)

  // Same phone = same client. Without a phone, reuse a phoneless client with
  // the same name so repeat visits still add up.
  const client = phone
    ? await prisma.client.upsert({
        where: { phone },
        update: { name, ...(email ? { email } : {}) },
        create: { phone, name, email },
      })
    : ((await prisma.client.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          phone: { startsWith: NO_PHONE_PREFIX },
        },
      })) ??
      (await prisma.client.create({
        data: { phone: `${NO_PHONE_PREFIX}${crypto.randomUUID().slice(0, 8)}`, name, email },
      })))

  const booking = await prisma.booking.create({
    data: {
      clientId: client.id,
      email: email ?? client.email,
      serviceId: combo.key,
      serviceName: combo.name,
      servicePrice: combo.priceEur,
      durationMin: combo.durationMin,
      location,
      startUtc,
      endUtc,
      status: "CONFIRMED",
      confirmedAt: new Date(),
      notes,
    },
  })

  // Future bookings also go to Google Calendar (best effort)
  if (startUtc > new Date()) {
    try {
      const eventId = await createEvent({
        summary: `${combo.name} - ${name}`,
        description:
          `Cliente: ${name}\n` +
          (phone ? `Telefone: ${phone}\n` : "") +
          (email ? `Email: ${email}\n` : "") +
          `Serviço: ${combo.name} (${combo.durationMin}min — ${combo.priceEur}€)\n` +
          (notes ? `Notas: ${notes}\n` : "") +
          `\nMarcação registada no admin. ID: ${booking.id}`,
        location: location === "lisboa" ? "Lisboa" : "Setúbal",
        startUtc,
        endUtc,
      })
      if (eventId) {
        await prisma.booking.update({ where: { id: booking.id }, data: { gcalEventId: eventId } })
      }
    } catch (e) {
      console.error("[admin/nova] gcal create failed:", e)
    }
  }

  redirect(`/admin?flash=added&mes=${date.slice(0, 7)}&dia=${date}`)
}
