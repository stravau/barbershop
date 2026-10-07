import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/bookings/[id]/reject?token=…
 *
 * The "Cancelar" link of older notification emails. Opening a link must not
 * change anything (email scanners open links too), so this only shows the
 * booking page, which asks for the tap that cancels (a POST).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = new URL(req.url).searchParams.get("token")
  const qs = token ? `?token=${encodeURIComponent(token)}&acao=cancelar` : ""
  return NextResponse.redirect(new URL(`/admin/booking/${id}${qs}`, req.url), 302)
}
