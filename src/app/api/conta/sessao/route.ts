import { NextResponse } from "next/server"
import { currentClientSession } from "@/lib/client-auth"

/**
 * GET /api/conta/sessao — who's signed in, for the (client-side) site header
 * and to prefill the booking form. Never cached.
 */
export async function GET() {
  const current = await currentClientSession()
  const client = current?.client
  return NextResponse.json(
    client
      ? { signedIn: true, name: client.name, phone: client.phone, email: client.email ?? current.session.email }
      : { signedIn: false },
    { headers: { "Cache-Control": "no-store" } },
  )
}
