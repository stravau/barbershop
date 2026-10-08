import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE_NAME, isSessionValid } from "@/lib/admin-session"

/**
 * Admin gate (Next 16 "proxy", formerly middleware).
 *  - /admin/login(/codigo) → public (password and code steps)
 *  - /admin/booking/[id]   → public (page itself enforces token OR session)
 *  - /admin/*              → require a validly signed session cookie.
 * This only checks the signature, so each admin page and action also calls
 * requireAdmin() (lib/admin-auth.ts) to reject revoked sessions.
 *
 * /marcar is open to everyone (pick a time first); signing in is asked for
 * only to send the request, and /api/bookings checks the session itself.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/booking/")) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value
  if (await isSessionValid(cookie)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = "/admin/login"
  url.search = ""
  url.searchParams.set("next", pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/admin/:path*"],
}
