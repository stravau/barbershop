import { expect, test } from "@playwright/test"
import { STAMPS_TO_FREE, cardMessage, isCut, stamps } from "@/lib/loyalty"
import { adminCancelledByClientEmail, clientRescheduledEmail, type BookingForEmail } from "@/lib/email"

test("the loyalty card counts the cuts that happened — not no-shows, other services or future ones", () => {
  const now = new Date("2026-10-08T12:00:00Z")
  const past = new Date("2026-10-01T12:00:00Z")
  const future = new Date("2026-10-20T12:00:00Z")
  const b = (status: string, serviceId: string, startUtc = past) => ({ status, serviceId, startUtc })
  expect(
    stamps(
      [
        b("CONFIRMED", "corte"),
        b("CONFIRMED", "barba+corte"),
        b("CONFIRMED", "barba"), // not a cut
        b("NO_SHOW", "corte"), // didn't come
        b("CANCELLED", "corte"),
        b("PENDING", "corte"),
        b("CONFIRMED", "corte", future), // hasn't happened yet
      ],
      now,
    ),
  ).toBe(2)
  expect(isCut("corte+sobrancelha")).toBe(true)
})

test("six stamps, then the 7th cut is free", () => {
  expect(STAMPS_TO_FREE).toBe(6)
  expect(cardMessage(0)).toBe("Faltam 6 cortes para o corte grátis.")
  expect(cardMessage(5)).toBe("Falta 1 corte para o corte grátis.")
  expect(cardMessage(6)).toBe("O próximo corte é grátis.")
  expect(cardMessage(7)).toBe("Cartão completo! Já usaste o teu corte grátis.")
})

const booking: BookingForEmail = {
  id: "b1",
  clientName: "Zé <script>",
  clientPhone: "351912345678",
  clientEmail: "ze@x.pt",
  serviceName: "Corte",
  durationMin: 45,
  priceEur: 10,
  location: "Setúbal",
  whenLocal: "Segunda-feira, 12 de Outubro às 16:00",
  startUtc: new Date("2026-10-12T15:00:00Z"),
  endUtc: new Date("2026-10-12T15:45:00Z"),
  adminToken: "a",
  clientToken: "c",
}

test("the barber's cancellation email flags late cancellations of confirmed bookings", () => {
  expect(adminCancelledByClientEmail(booking, { hoursBefore: 3, wasConfirmed: true }).subject).toMatch(
    /^Cancelamento em cima da hora/,
  )
  expect(adminCancelledByClientEmail(booking, { hoursBefore: 30, wasConfirmed: true }).subject).toMatch(/^Cliente cancelou/)
  // A request the barber hadn't confirmed yet isn't "late"
  expect(adminCancelledByClientEmail(booking, { hoursBefore: 3, wasConfirmed: false }).subject).toMatch(/^Cliente cancelou/)
})

test("emails escape the client's name and never link straight to an action", () => {
  const { html } = clientRescheduledEmail(booking, { previousWhen: "Sexta", confirmed: true })
  expect(html).not.toContain("<script>")
  expect(html).toContain("Zé &lt;script&gt;")
  // The cancel button opens the booking page (which asks), not the API
  expect(html).toContain("/marcacao/b1?token=c&cancelar=1")
  expect(html).not.toContain("/api/bookings/b1/cancel")
})
