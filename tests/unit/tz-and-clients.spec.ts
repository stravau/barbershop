import { expect, test } from "@playwright/test"
import { combineDateTimeLisbon, getLisbonDayBounds, lisbonPeriods } from "@/lib/tz"
import { upcomingOpenDates, ymdPlusDays } from "@/lib/schedule"
import { findDuplicates, fixedPriceFor, normalizePhone, type ClientSummary } from "@/lib/clients"

test.describe("Lisbon time", () => {
  test("wall-clock times become the right UTC instant in summer and winter", () => {
    expect(combineDateTimeLisbon("2026-07-01", "12:00").toISOString()).toBe("2026-07-01T11:00:00.000Z")
    expect(combineDateTimeLisbon("2026-12-01", "12:00").toISOString()).toBe("2026-12-01T12:00:00.000Z")
  })

  test("the day the clocks go back is 25 hours long", () => {
    const { startUtc, endUtc } = getLisbonDayBounds("2026-10-25")
    expect((endUtc.getTime() - startUtc.getTime()) / 36e5).toBe(25)
  })

  test("today/this week follow Lisbon, not UTC (00:30 UTC is already 01:30 in Lisbon)", () => {
    const p = lisbonPeriods(new Date("2026-10-08T00:30:00Z"))
    expect(p.today).toBe("2026-10-08")
    expect(p.weekStart.toISOString()).toBe("2026-10-04T23:00:00.000Z") // Monday 5th, 00:00 Lisbon
  })

  test("calendar arithmetic and open days", () => {
    expect(ymdPlusDays("2026-12-31", 1)).toBe("2027-01-01")
    // Lisboa opens on Fridays and Saturdays only
    expect(upcomingOpenDates("lisboa", "2026-10-12", 6)).toEqual(["2026-10-16", "2026-10-17"])
  })
})

test.describe("clients", () => {
  test("Portuguese numbers get 351; spaces and + go away", () => {
    expect(normalizePhone("912 345 678")).toBe("351912345678")
    expect(normalizePhone("+351 912345678")).toBe("351912345678")
    expect(normalizePhone("212345678")).toBe("351212345678")
    expect(normalizePhone("447700900123")).toBe("447700900123")
  })

  test("fixed prices go by first name, accents and case ignored", () => {
    expect(fixedPriceFor("  arlindo  Gomes")).toBe(20)
    expect(fixedPriceFor("João")).toBeNull()
  })

  test("duplicates: same phone or email are sure; same full name is only probable", () => {
    const c = (id: string, name: string, phone: string, email: string | null = null): ClientSummary => ({
      id, name, phone, email, createdAt: new Date(`2026-01-0${id}`), bookingCount: Number(id),
    })
    const { sure, probable } = findDuplicates([
      c("1", "João Silva", "351912345601"),
      c("2", "Joao Silva", "912345601"), // same number without 351
      c("3", "Rui Costa", "351912345603", "rui@x.pt"),
      c("4", "Rui C.", "351912345604", "RUI@x.pt"), // same email
      c("5", "Pedro Sousa", "351912345605"),
      c("6", "Pedro Sousa", "351912345606"), // same full name, different numbers
    ])
    expect(sure.map((g) => g.clients.map((x) => x.id).sort())).toEqual([["1", "2"], ["3", "4"]])
    expect(probable.map((g) => g.clients.map((x) => x.id).sort())).toEqual([["5", "6"]])
    // The one with more bookings stays
    expect(sure[0].clients[0].id).toBe("2")
  })
})
