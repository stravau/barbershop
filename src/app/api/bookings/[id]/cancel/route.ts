import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/bookings/[id]/cancel?token=<clientToken>
 *
 * The "Cancelar marcação" link of older confirmation/reminder emails.
 * Opening a link must not cancel anything (email scanners open links too),
 * so this only shows the booking page with the "cancel it?" question; the
 * button there does the cancelling (a POST).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.redirect(new URL("/?cancel=missing-token", req.url), 302)
  return NextResponse.redirect(new URL(`/marcacao/${id}?token=${encodeURIComponent(token)}&cancelar=1`, req.url), 302)
}
