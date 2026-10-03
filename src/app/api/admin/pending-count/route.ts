import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isSessionValid, SESSION_COOKIE_NAME } from "@/lib/admin-session"

/** GET → { count } of bookings waiting for confirmation (for the admin tab badge). */
export async function GET(req: NextRequest) {
  if (!(await isSessionValid(req.cookies.get(SESSION_COOKIE_NAME)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const count = await prisma.booking.count({ where: { status: "PENDING" } })
  return NextResponse.json({ count })
}
