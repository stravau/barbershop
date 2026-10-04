import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE_NAME, readSessionCookie } from "@/lib/admin-session"

/** Ends this session for good (revoked in the database) and clears the cookie. */
export async function POST(req: NextRequest) {
  const id = await readSessionCookie(req.cookies.get(SESSION_COOKIE_NAME)?.value)
  if (id) {
    await prisma.adminSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303)
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
  return res
}

// Allow GET for convenience (the "Sair" link)
export async function GET(req: NextRequest) {
  return POST(req)
}
