import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createBookingRequest } from "@/lib/bookings"
import { currentClientSession } from "@/lib/client-auth"

const bodySchema = z.object({
  location: z.enum(["lisboa", "setubal"]),
  /** Array of service item ids, e.g. ["corte", "barba"]. Order doesn't matter. */
  services: z.array(z.string().min(1)).min(1).max(4),
  startUtcIso: z.string().datetime(),
  client: z.object({
    name: z.string().trim().min(2, "Nome demasiado curto").max(80),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{9,15}$/, "Telefone deve conter 9-15 dígitos (sem +)"),
    email: z.string().trim().email("Email inválido"),
  }),
  notes: z.string().max(300).optional(),
})

/**
 * POST /api/bookings — the booking form. Needs a signed-in client account;
 * the booking goes under that account (its name, phone and email).
 */
export async function POST(req: NextRequest) {
  const current = await currentClientSession()
  if (!current?.client) {
    return NextResponse.json({ error: "Inicia sessão para marcar.", signIn: true }, { status: 401 })
  }
  const account = current.client

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 },
    )
  }

  const { location, services, startUtcIso, notes } = parsed.data
  const result = await createBookingRequest({
    location,
    services,
    startUtc: new Date(startUtcIso),
    client: { name: account.name, phone: account.phone, email: account.email ?? current.session.email },
    notes,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({
    ok: true,
    booking: {
      id: result.booking.id,
      clientToken: result.booking.clientToken,
      location,
      service: result.serviceName,
      priceEur: result.priceEur,
      whenLocal: result.whenLocal,
      startUtcIso,
    },
  })
}
