import { NextRequest, NextResponse } from "next/server"
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/admin-session"

/**
 * Admin gate.
 *  - /admin/login(/codigo) → public (password and code steps)
 *  - /admin/booking/[id]   → public (page itself enforces token OR session)
 *  - /admin/*              → require a validly signed session cookie.
 * The Edge runtime can't reach the database, so each admin page and action
 * also calls requireAdmin() (lib/admin-auth.ts) to reject revoked sessions.
 */
export async function middleware(req: NextRequest) {
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
