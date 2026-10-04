"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { normalizePhone } from "@/lib/clients"
import {
  currentClientSession,
  normalizeEmail,
  sendClientCode,
  verifyClientCode,
} from "@/lib/client-auth"

/** Step 1: email → a code is sent. */
export async function requestLoginCode(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "")
  const error = await sendClientCode(email)
  if (error) redirect(`/conta/entrar?erro=${error}&email=${encodeURIComponent(email)}`)
  redirect(`/conta/entrar/codigo?email=${encodeURIComponent(normalizeEmail(email))}`)
}

/** Step 2: the code → signed in (then registration if it's a new email). */
export async function confirmLoginCode(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "")
  const result = await verifyClientCode(email, String(form.get("code") ?? ""))
  if (result !== "ok") {
    redirect(`/conta/entrar/codigo?email=${encodeURIComponent(email)}&erro=${result}`)
  }
  const current = await currentClientSession()
  redirect(current?.client ? "/conta" : "/conta/registo")
}

/**
 * Step 3 (first time only): name + phone. If someone already booked with
 * that phone, the account is linked to that client (their history comes
 * along) instead of creating a new one.
 */
export async function completeRegistration(form: FormData): Promise<void> {
  const current = await currentClientSession()
  if (!current) redirect("/conta/entrar")
  if (current.client) redirect("/conta")

  const name = String(form.get("name") ?? "").trim()
  const phone = normalizePhone(String(form.get("phone") ?? ""))
  if (name.length < 2) redirect("/conta/registo?erro=nome")
  if (!/^\d{11,15}$/.test(phone)) redirect("/conta/registo?erro=telefone")

  const existing = await prisma.client.findUnique({ where: { phone } })
  // Don't take over someone else's record: only link if the email matches or is unset
  if (existing && existing.email && normalizeEmail(existing.email) !== current.session.email) {
    redirect("/conta/registo?erro=telefone-usado")
  }
  const client = existing
    ? await prisma.client.update({
        where: { id: existing.id },
        data: { email: current.session.email, name },
      })
    : await prisma.client.create({ data: { name, phone, email: current.session.email } })

  await prisma.clientSession.update({
    where: { id: current.session.id },
    data: { clientId: client.id },
  })
  redirect("/conta")
}
