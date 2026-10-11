import { NextResponse } from "next/server"
import { endClientSession } from "@/lib/client-auth"

/**
 * POST /api/conta/logout — ends the client's session. A plain request (not a
 * server action) so nothing else is re-rendered while the user waits; the
 * page refreshes itself afterwards (components/LogoutButton.tsx).
 */
export async function POST() {
  await endClientSession()
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
