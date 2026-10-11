import { NextResponse } from "next/server"
import { getAccountSummary } from "@/lib/account-summary"

/** GET /api/conta/resumo — the signed-in client's home-page bits. Never cached. */
export async function GET() {
  return NextResponse.json(await getAccountSummary(), { headers: { "Cache-Control": "no-store" } })
}
