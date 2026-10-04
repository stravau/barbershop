import { NextRequest, NextResponse } from "next/server"
import {
  DEVICE_COOKIE_NAME,
  PENDING_2FA_COOKIE_NAME,
  PENDING_2FA_TTL_MS,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  adminSecret,
  makePending2faCookie,
  makeSessionCookie,
} from "@/lib/admin-session"
import {
  failedAttemptsLeft,
  isRememberedDevice,
  recordAttempt,
  requestInfo,
  secretsMatch,
  sendLoginCode,
  startSession,
} from "@/lib/admin-auth"

const cookieOpts = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
})

/** Keep the redirect destination on this site. */
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin"
}

/**
 * POST /api/admin/auth/login (form): password step.
 * Blocks an IP after too many failures; on success either signs in straight
 * away (remembered device) or emails a code and goes to the code step.
 */
export async function POST(req: NextRequest) {
  const data = await req.formData()
  const password = data.get("password")?.toString() ?? ""
  const next = safeNext(data.get("next")?.toString() || "/admin")
  const back = (error: string, extra: Record<string, string> = {}) => {
    const url = new URL("/admin/login", req.url)
    url.searchParams.set("error", error)
    url.searchParams.set("next", next)
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v)
    return NextResponse.redirect(url, 303)
  }

  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword || !adminSecret()) return back("config")

  const { ip, userAgent } = await requestInfo()
  if ((await failedAttemptsLeft(ip)) === 0) return back("blocked")

  if (!secretsMatch(password, adminPassword)) {
    await recordAttempt(ip, "password", false, userAgent)
    return back("wrong", { left: String(await failedAttemptsLeft(ip)) })
  }
  await recordAttempt(ip, "password", true, userAgent)

  // Remembered device: no code needed
  if (await isRememberedDevice(req.cookies.get(DEVICE_COOKIE_NAME)?.value)) {
    const cookie = await startSession(ip, userAgent, makeSessionCookie)
    if (!cookie) return back("config")
    const res = NextResponse.redirect(new URL(next, req.url), 303)
    res.cookies.set(SESSION_COOKIE_NAME, cookie, cookieOpts(SESSION_TTL_MS))
    return res
  }

  const sent = await sendLoginCode()
  if ("error" in sent) return back("email")
  const pending = await makePending2faCookie(sent.codeId)
  if (!pending) return back("config")

  const url = new URL("/admin/login/codigo", req.url)
  url.searchParams.set("next", next)
  const res = NextResponse.redirect(url, 303)
  res.cookies.set(PENDING_2FA_COOKIE_NAME, pending, cookieOpts(PENDING_2FA_TTL_MS))
  return res
}
