import { expect, test } from "@playwright/test"
import { shortWhen, slotBookingHref } from "@/lib/booking-links"

test("a ticket opens the booking at its last step with that time", () => {
  const href = slotBookingHref({ services: ["corte", "barba"], location: "setubal", startIso: "2026-10-19T09:00:00.000Z" })
  const q = new URL(href, "http://x").searchParams
  expect(q.get("services")).toBe("corte,barba")
  expect(q.get("cidade")).toBe("setubal")
  expect(q.get("dia")).toBe("2026-10-19")
  expect(q.get("hora")).toBe("2026-10-19T09:00:00.000Z")
  expect(q.get("passo")).toBe("confirmar")
})

test("ticket dates read hoje / amanhã / the short day, in Lisbon time", () => {
  const now = new Date("2026-10-15T22:30:00Z") // 23:30 in Lisbon
  expect(shortWhen("2026-10-15T22:45:00Z", now)).toBe("hoje")
  expect(shortWhen("2026-10-16T08:00:00Z", now)).toBe("amanhã")
  expect(shortWhen("2026-10-19T09:00:00Z", now)).toBe("seg 19/10")
})
