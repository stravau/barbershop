import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocationAddress } from "@/lib/addresses"
import { formatPrice } from "@/lib/services"
import { getSiteUrl } from "@/lib/site"

/**
 * GET /api/bookings/[id]/ics?token=<clientToken>
 *
 * The booking as a calendar file, for Apple Calendar and Outlook (the emails
 * also link Google Calendar directly). Opened on an iPhone it offers "Add to
 * calendar". The street address is only included once the booking is
 * confirmed, as everywhere else.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const token = new URL(req.url).searchParams.get("token")
  const booking = await prisma.booking.findUnique({ where: { id } })
  if (!booking || !token || booking.clientToken !== token) {
    return new NextResponse("Not found", { status: 404 })
  }
  if (booking.status === "CANCELLED") {
    return NextResponse.redirect(new URL(`/marcacao/${id}?token=${token}`, req.url), 302)
  }

  const city = booking.location === "lisboa" ? "Lisboa" : "Setúbal"
  const address = booking.status === "CONFIRMED" ? getLocationAddress(booking.location) : null
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tarzan's Barbershop//Marcacoes//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.id}@tarzans-barbershop`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(booking.startUtc)}`,
    `DTEND:${icsDate(booking.endUtc)}`,
    `SUMMARY:${icsText(`Tarzan's Barbershop: ${booking.serviceName}`)}`,
    `LOCATION:${icsText(address ? `${address}, ${city}` : city)}`,
    `DESCRIPTION:${icsText(
      `${booking.serviceName} (${booking.durationMin} min, ${formatPrice(booking.servicePrice)}). ` +
        `Pagas no fim, em MB WAY ou dinheiro.\n` +
        `${getSiteUrl()}/marcacao/${booking.id}?token=${booking.clientToken}`,
    )}`,
    `STATUS:${booking.status === "CONFIRMED" ? "CONFIRMED" : "TENTATIVE"}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText("Marcação na Tarzan's Barbershop")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]

  return new NextResponse(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tarzans-barbershop.ics"',
      "Cache-Control": "no-store",
    },
  })
}

/** 20261009T130000Z */
function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** Escapes a TEXT value (RFC 5545 §3.3.11). */
function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

/** Folds long lines (the limit is 75 octets; 60 characters stays under it with accents). */
function fold(line: string): string {
  const parts: string[] = []
  for (let i = 0; i < line.length; i += 60) parts.push(line.slice(i, i + 60))
  return parts.join("\r\n ")
}
