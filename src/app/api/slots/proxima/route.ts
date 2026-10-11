import { NextResponse } from "next/server"
import { nextFreeCut } from "@/lib/next-slot"

/**
 * GET /api/slots/proxima — the next free time for a cut, in either city
 * ("Próxima vaga: hoje às 16:00 em Setúbal"). { slot: FreeSlot | null }.
 */
export async function GET() {
  return NextResponse.json({ slot: await nextFreeCut() }, { headers: { "Cache-Control": "no-store" } })
}
