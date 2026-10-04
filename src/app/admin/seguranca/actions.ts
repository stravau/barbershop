"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { currentAdminSession, requireAdmin } from "@/lib/admin-auth"

const PAGE = "/admin/seguranca"

/** Ends every admin session except the one making the request. */
export async function endOtherSessions(): Promise<void> {
  await requireAdmin(PAGE)
  const me = await currentAdminSession()
  const { count } = await prisma.adminSession.updateMany({
    where: { revokedAt: null, id: { not: me?.id } },
    data: { revokedAt: new Date() },
  })
  redirect(`${PAGE}?terminadas=${count}`)
}

/** Ends every admin session, this one included, and forgets every device. */
export async function endAllSessions(): Promise<void> {
  await requireAdmin(PAGE)
  await prisma.adminSession.updateMany({ where: { revokedAt: null }, data: { revokedAt: new Date() } })
  await prisma.trustedDevice.updateMany({ where: { revokedAt: null }, data: { revokedAt: new Date() } })
  redirect("/admin/login")
}

/** Next logins on any device will need the emailed code again. */
export async function forgetDevices(): Promise<void> {
  await requireAdmin(PAGE)
  const { count } = await prisma.trustedDevice.updateMany({
    where: { revokedAt: null },
    data: { revokedAt: new Date() },
  })
  redirect(`${PAGE}?esquecidos=${count}`)
}
