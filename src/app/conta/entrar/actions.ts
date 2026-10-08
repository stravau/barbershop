"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { normalizeName, normalizePhone } from "@/lib/clients"
import { safeNext } from "@/lib/safe-next"
import {
  currentClientSession,
  normalizeEmail,
  sendClientCode,
  verifyClientCode,
} from "@/lib/client-auth"

/** "  José Silva" -> "jose" */
const firstName = (name: string) => normalizeName(name).split(" ")[0]

/** "&next=…" for the following step's URL (where to go once signed in). */
const nextParam = (form: FormData) => {
  const next = safeNext(String(form.get("next") ?? ""))
  return next === "/conta" ? "" : `&next=${encodeURIComponent(next)}`
}

/** Step 1: email → a code is sent. */
export async function requestLoginCode(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "")
  const error = await sendClientCode(email)
  if (error) redirect(`/conta/entrar?erro=${error}&email=${encodeURIComponent(email)}${nextParam(form)}`)
  redirect(`/conta/entrar/codigo?email=${encodeURIComponent(normalizeEmail(email))}${nextParam(form)}`)
}

/** Step 2: the code → signed in (then registration if it's a new email). */
export async function confirmLoginCode(form: FormData): Promise<void> {
  const email = String(form.get("email") ?? "")
  const result = await verifyClientCode(email, String(form.get("code") ?? ""))
  if (result !== "ok") {
    redirect(`/conta/entrar/codigo?email=${encodeURIComponent(email)}&erro=${result}${nextParam(form)}`)
  }
  const current = await currentClientSession()
  redirect(current?.client ? safeNext(String(form.get("next") ?? "")) : `/conta/registo?${nextParam(form).slice(1)}`)
}

/**
 * Step 3 (first time only): name + phone. If someone already booked with
 * that phone, the account is linked to that client (their history comes
 * along) instead of creating a new one.
 */
export async function completeRegistration(form: FormData): Promise<void> {
  const current = await currentClientSession()
  const next = safeNext(String(form.get("next") ?? ""))
  if (!current) redirect("/conta/entrar")
  if (current.client) redirect(next)

  const name = String(form.get("name") ?? "").trim()
  const phone = normalizePhone(String(form.get("phone") ?? ""))
  if (name.length < 2) redirect(`/conta/registo?erro=nome${nextParam(form)}`)
  if (!/^\d{11,15}$/.test(phone)) redirect(`/conta/registo?erro=telefone${nextParam(form)}`)

  const existing = await prisma.client.findUnique({ where: { phone } })
  // Don't take over someone else's record (and see their visits): link only
  // if the email matches, or — for a record without email, e.g. added by the
  // barber — if the first name matches too. Knowing a number isn't enough.
  const claimable =
    !existing ||
    (existing.email
      ? normalizeEmail(existing.email) === current.session.email
      : firstName(existing.name) === firstName(name))
  if (!claimable) {
    redirect(`/conta/registo?erro=telefone-usado${nextParam(form)}`)
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
  redirect(next)
}
