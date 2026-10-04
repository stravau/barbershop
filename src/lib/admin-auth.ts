// Admin authentication backed by the database (Node only — the middleware
// uses lib/admin-session.ts). Sessions can be revoked, failed attempts are
// rate-limited per IP, and logins need a code emailed to the admin unless
// the device was remembered.

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "./prisma"
import { ADMIN_EMAIL, sendEmail } from "./email"
import {
  DEVICE_COOKIE_NAME,
  DEVICE_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  readSessionCookie,
} from "./admin-session"

/** Failed attempts allowed per IP inside the window before blocking. */
export const MAX_FAILED_ATTEMPTS = 5
const ATTEMPT_WINDOW_MS = 1000 * 60 * 15
const CODE_TTL_MS = 1000 * 60 * 10
const CODE_MAX_TRIES = 5
/** Email links (confirm/reject/booking page) work until this long after the booking. */
export const EMAIL_LINK_GRACE_MS = 1000 * 60 * 60 * 24 * 3

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex")

/** Compares two secrets in constant time (hashing first evens out lengths). */
export function secretsMatch(given: string, expected: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(given).digest(),
    createHash("sha256").update(expected).digest(),
  )
}

export async function requestInfo(): Promise<{ ip: string; userAgent: string | null }> {
  const h = await headers()
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "?"
  return { ip, userAgent: h.get("user-agent") }
}

// ---------- rate limiting ----------

/** Admin and client logins are limited separately (one can't lock out the other). */
const SCOPE_STAGES = {
  admin: ["password", "code"],
  client: ["client-email", "client-code"],
} as const
export type AttemptStage = (typeof SCOPE_STAGES)[keyof typeof SCOPE_STAGES][number]

export async function failedAttemptsLeft(
  ip: string,
  scope: keyof typeof SCOPE_STAGES = "admin",
): Promise<number> {
  const fails = await prisma.loginAttempt.count({
    where: {
      ip,
      success: false,
      stage: { in: [...SCOPE_STAGES[scope]] },
      createdAt: { gte: new Date(Date.now() - ATTEMPT_WINDOW_MS) },
    },
  })
  return Math.max(0, MAX_FAILED_ATTEMPTS - fails)
}

export async function recordAttempt(
  ip: string,
  stage: AttemptStage,
  success: boolean,
  userAgent: string | null,
): Promise<void> {
  await prisma.loginAttempt.create({ data: { ip, stage, success, userAgent } })
  // Keep the log small: drop entries older than 60 days
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60) } },
  })
}

// ---------- second factor ----------

/** Creates a one-time code, emails it to the admin, returns the code row id. */
export async function sendLoginCode(): Promise<{ codeId: string } | { error: string }> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const row = await prisma.adminLoginCode.create({
    data: { codeHash: sha256(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  })
  const sent = await sendEmail({
    to: ADMIN_EMAIL,
    subject: `Código de acesso ao admin: ${code}`,
    html: `<p style="font-family:Arial,sans-serif;font-size:16px">O teu código para entrar no admin do Tarzan's Barbershop é:</p>
<p style="font-family:Arial,sans-serif;font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
<p style="font-family:Arial,sans-serif;font-size:13px;color:#666">Válido durante 10 minutos. Se não foste tu a tentar entrar, muda a palavra-passe do admin.</p>`,
  })
  if (!sent.ok) {
    if (process.env.NODE_ENV !== "production") {
      // Local dev without Resend: show the code in the server log
      console.warn(`[admin-auth] login code (dev only): ${code}`)
      return { codeId: row.id }
    }
    return { error: "email" }
  }
  return { codeId: row.id }
}

export async function checkLoginCode(
  codeId: string,
  given: string,
): Promise<"ok" | "wrong" | "expired"> {
  const row = await prisma.adminLoginCode.findUnique({ where: { id: codeId } })
  if (!row || row.usedAt || row.expiresAt < new Date() || row.attempts >= CODE_MAX_TRIES) {
    return "expired"
  }
  if (!secretsMatch(sha256(given.replace(/\D/g, "")), row.codeHash)) {
    await prisma.adminLoginCode.update({ where: { id: codeId }, data: { attempts: { increment: 1 } } })
    return "wrong"
  }
  await prisma.adminLoginCode.update({ where: { id: codeId }, data: { usedAt: new Date() } })
  return "ok"
}

// ---------- remembered devices ----------

/** Creates a remembered device; returns the raw token for the cookie. */
export async function rememberDevice(userAgent: string | null): Promise<string> {
  const token = randomBytes(32).toString("hex")
  await prisma.trustedDevice.create({
    data: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + DEVICE_TTL_MS), userAgent },
  })
  return token
}

export async function isRememberedDevice(token: string | undefined): Promise<boolean> {
  if (!token) return false
  const device = await prisma.trustedDevice.findUnique({ where: { tokenHash: sha256(token) } })
  return !!device && !device.revokedAt && device.expiresAt > new Date()
}

// ---------- sessions ----------

/** Creates a session row and returns the signed cookie value for it. */
export async function startSession(
  ip: string,
  userAgent: string | null,
  makeCookie: (id: string) => Promise<string | null>,
): Promise<string | null> {
  const session = await prisma.adminSession.create({
    data: { ip, userAgent, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return makeCookie(session.id)
}

/** The live session behind a cookie value, or null (bad signature, expired or revoked). */
export async function sessionFromCookie(value: string | undefined | null) {
  const id = await readSessionCookie(value)
  if (!id) return null
  const session = await prisma.adminSession.findUnique({ where: { id } })
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null
  // Touch lastSeenAt at most every 5 minutes
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.adminSession.update({ where: { id }, data: { lastSeenAt: new Date() } })
  }
  return session
}

/** The current request's admin session (server components / actions). */
export async function currentAdminSession() {
  const cookieStore = await cookies()
  return sessionFromCookie(cookieStore.get(SESSION_COOKIE_NAME)?.value)
}

export async function isAdmin(): Promise<boolean> {
  return (await currentAdminSession()) !== null
}

/** For server actions and admin-only pages: go to login unless signed in. */
export async function requireAdmin(next = "/admin"): Promise<void> {
  if (!(await isAdmin())) redirect(`/admin/login?next=${encodeURIComponent(next)}`)
}

export async function deviceCookieValue(): Promise<string | undefined> {
  return (await cookies()).get(DEVICE_COOKIE_NAME)?.value
}

/** Whether an email-link token (adminToken) is still usable for this booking. */
export function emailLinkStillValid(bookingStart: Date): boolean {
  return Date.now() < bookingStart.getTime() + EMAIL_LINK_GRACE_MS
}
