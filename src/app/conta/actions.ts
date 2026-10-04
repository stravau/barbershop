"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NO_PHONE_PREFIX, normalizePhone } from "@/lib/clients"
import { createBookingRequest } from "@/lib/bookings"
import { clientHabit, suggestSlots } from "@/lib/express"
import { endClientSession, requireClient } from "@/lib/client-auth"
import { deleteEvent } from "@/lib/gcal"

/** "Marcação express": books one of the suggested slots (always PENDING). */
export async function expressBook(form: FormData): Promise<void> {
  const { session, client } = await requireClient()
  const startIso = String(form.get("startIso") ?? "")

  const habit = await clientHabit(client.id, client.preferredLocation)
  if (!habit) redirect("/conta?erro=sem-historico")
  // Only a slot we'd suggest right now — it's free and inside working hours
  const offered = await suggestSlots(habit)
  const pick = offered.find((s) => s.startIso === startIso)
  if (!pick) redirect("/conta?erro=ocupado")

  const result = await createBookingRequest({
    location: pick.location,
    services: habit.services,
    startUtc: new Date(pick.startIso),
    client: { name: client.name, phone: client.phone, email: client.email ?? session.email },
  })
  if (!result.ok) redirect(`/conta?erro=${result.status === 409 ? "ocupado" : "falhou"}`)
  redirect("/conta/marcacoes?pedido=1")
}

const NOTE_MAX = 300

/** "Os meus dados": name, phone, preferred city and a standing note. */
export async function updateDetails(form: FormData): Promise<void> {
  const { client } = await requireClient()
  const name = String(form.get("name") ?? "").trim()
  const phone = normalizePhone(String(form.get("phone") ?? ""))
  const city = String(form.get("preferredLocation") ?? "")
  const note = String(form.get("standingNote") ?? "").trim().slice(0, NOTE_MAX)

  if (name.length < 2) redirect("/conta/dados?erro=nome")
  if (!/^\d{11,15}$/.test(phone)) redirect("/conta/dados?erro=telefone")
  if (phone !== client.phone) {
    const taken = await prisma.client.findUnique({ where: { phone }, select: { id: true } })
    if (taken) redirect("/conta/dados?erro=telefone-usado")
  }

  await prisma.client.update({
    where: { id: client.id },
    data: {
      name,
      phone,
      preferredLocation: city === "lisboa" || city === "setubal" ? city : null,
      standingNote: note || null,
    },
  })
  redirect("/conta/dados?guardado=1")
}

export async function logout(): Promise<void> {
  await endClientSession()
  redirect("/")
}

/**
 * Deletes the account (GDPR): future bookings are cancelled, personal data is
 * wiped from the client and their bookings, and every session ends. Past
 * appointments stay, anonymous, for the barber's accounts.
 */
export async function deleteAccount(): Promise<void> {
  const { session, client } = await requireClient()

  const future = await prisma.booking.findMany({
    where: { clientId: client.id, status: { in: ["PENDING", "CONFIRMED"] }, startUtc: { gte: new Date() } },
    select: { id: true, gcalEventId: true },
  })
  for (const b of future) {
    if (b.gcalEventId) await deleteEvent(b.gcalEventId).catch(() => {})
  }

  const emails = [session.email, client.email?.toLowerCase()].filter((e): e is string => !!e)
  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id: { in: future.map((b) => b.id) } },
      data: { status: "CANCELLED", cancelledAt: new Date(), gcalEventId: null },
    }),
    prisma.booking.updateMany({ where: { clientId: client.id }, data: { email: null, notes: null } }),
    prisma.client.update({
      where: { id: client.id },
      data: {
        name: "Cliente apagado",
        phone: `${NO_PHONE_PREFIX}${client.id}`,
        email: null,
        preferredLocation: null,
        standingNote: null,
      },
    }),
    prisma.clientSession.updateMany({
      where: { OR: [{ clientId: client.id }, { email: { in: emails } }], revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.clientLoginCode.deleteMany({ where: { email: { in: emails } } }),
  ])
  await endClientSession()
  redirect("/?conta=apagada")
}
