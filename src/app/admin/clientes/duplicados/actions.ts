"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/admin-session"
import {
  findDuplicates,
  loadClientSummaries,
  mergeClients,
  normalizeClientPhones,
} from "@/lib/clients"

const PAGE = "/admin/clientes/duplicados"

async function requireSession(): Promise<void> {
  const cookieStore = await cookies()
  if (!(await isSessionValid(cookieStore.get(SESSION_COOKIE_NAME)?.value))) {
    redirect(`/admin/login?next=${encodeURIComponent(PAGE)}`)
  }
}

/** Merge one group; the first id is the client that stays. */
export async function mergeGroup(form: FormData): Promise<void> {
  await requireSession()
  const ids = String(form.get("ids") ?? "").split(",").filter(Boolean)
  if (ids.length > 1) await mergeClients(prisma, ids[0], ids.slice(1))
  redirect(`${PAGE}?juntos=1`)
}

/** Merge every "sure" group (same phone / email) and add 351 to bare numbers. */
export async function mergeAllSure(): Promise<void> {
  await requireSession()
  const { sure } = findDuplicates(await loadClientSummaries(prisma))
  for (const group of sure) {
    await mergeClients(prisma, group.clients[0].id, group.clients.slice(1).map((c) => c.id))
  }
  const fixed = await normalizeClientPhones(prisma)
  redirect(`${PAGE}?juntos=${sure.length}&numeros=${fixed}`)
}
