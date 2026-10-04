import { NextRequest, NextResponse } from "next/server"
import {
  DEVICE_COOKIE_NAME,
  DEVICE_TTL_MS,
  PENDING_2FA_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  makeSessionCookie,
  readPending2faCookie,
} from "@/lib/admin-session"
import {
  checkLoginCode,
  failedAttemptsLeft,
  recordAttempt,
  rememberDevice,
  requestInfo,
  startSession,
} from "@/lib/admin-auth"

const cookieOpts = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
})

function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin"
}

/** POST /api/admin/auth/verify (form): the emailed code → signed in. */
export async function POST(req: NextRequest) {
  const data = await req.formData()
  const code = data.get("code")?.toString() ?? ""
  const remember = data.get("remember") === "on"
  const next = safeNext(data.get("next")?.toString() || "/admin")

  const toLogin = (error: string) => {
    const url = new URL("/admin/login", req.url)
    url.searchParams.set("error", error)
    url.searchParams.set("next", next)
    const res = NextResponse.redirect(url, 303)
    res.cookies.delete(PENDING_2FA_COOKIE_NAME)
    return res
  }

  const { ip, userAgent } = await requestInfo()
  if ((await failedAttemptsLeft(ip)) === 0) return toLogin("blocked")

  const codeId = await readPending2faCookie(req.cookies.get(PENDING_2FA_COOKIE_NAME)?.value)
  if (!codeId) return toLogin("expired")

  const result = await checkLoginCode(codeId, code)
  if (result === "expired") return toLogin("expired")
  if (result === "wrong") {
    await recordAttempt(ip, "code", false, userAgent)
    const url = new URL("/admin/login/codigo", req.url)
    url.searchParams.set("next", next)
    url.searchParams.set("error", "wrong")
    return NextResponse.redirect(url, 303)
  }
  await recordAttempt(ip, "code", true, userAgent)

  const cookie = await startSession(ip, userAgent, makeSessionCookie)
  if (!cookie) return toLogin("config")
  const res = NextResponse.redirect(new URL(next, req.url), 303)
  res.cookies.set(SESSION_COOKIE_NAME, cookie, cookieOpts(SESSION_TTL_MS))
  res.cookies.delete(PENDING_2FA_COOKIE_NAME)
  if (remember) {
    res.cookies.set(DEVICE_COOKIE_NAME, await rememberDevice(userAgent), cookieOpts(DEVICE_TTL_MS))
  }
  return res
}
