import { expect, test } from "@playwright/test"
import { filterFutureSlots, generateSlots } from "@/lib/slots"
import { combineDateTimeLisbon, formatLisbon } from "@/lib/tz"

const times = (slots: Date[]) => slots.map((s) => formatLisbon(s, "HH:mm"))
const lisbon = (ymd: string, hhmm: string) => combineDateTimeLisbon(ymd, hhmm)

// 2026-10-12 is a Monday (Setúbal 12:00–20:00); 2026-10-16 a Friday; 2026-10-18 a Sunday
test.describe("generateSlots", () => {
  test("a free Monday in Setúbal: every 15 min from opening, last one ends at closing", () => {
    const slots = times(generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy: [] }))
    expect(slots[0]).toBe("12:00")
    expect(slots.at(-1)).toBe("19:15")
    expect(slots).toHaveLength(30)
  })

  test("a booking blocks its time plus 10 minutes on each side", () => {
    const busy = [{ start: lisbon("2026-10-12", "14:00"), end: lisbon("2026-10-12", "14:45") }]
    const slots = times(generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy }))
    expect(slots).toContain("13:00") // ends 13:45, 15 min before
    expect(slots).not.toContain("13:15") // would end 14:00, inside the 10-min gap
    expect(slots).not.toContain("14:45") // starts right at the end, inside the gap
    expect(slots).toContain("15:00")
  })

  test("closed days have no slots", () => {
    expect(generateSlots({ isoDate: "2026-10-18", location: "setubal", durationMin: 45, busy: [] })).toEqual([])
    expect(generateSlots({ isoDate: "2026-10-12", location: "lisboa", durationMin: 45, busy: [] })).toEqual([])
  })

  test("Friday: Setúbal ends by 15:00 and Lisboa starts at 17:00 (travel time)", () => {
    const setubal = times(generateSlots({ isoDate: "2026-10-16", location: "setubal", durationMin: 45, busy: [] }))
    const lisboa = times(generateSlots({ isoDate: "2026-10-16", location: "lisboa", durationMin: 45, busy: [] }))
    expect(setubal).toEqual(["14:00", "14:15"])
    expect(lisboa[0]).toBe("17:00")
  })

  test("a service longer than the opening hours has no slot", () => {
    // Friday Setúbal is one hour; Corte + Barba + Sobrancelha takes 60 min, a 75-min job doesn't fit
    expect(generateSlots({ isoDate: "2026-10-16", location: "setubal", durationMin: 75, busy: [] })).toEqual([])
  })

  test("summer and winter time: 12:00 in Lisbon is 11:00 or 12:00 UTC", () => {
    const summer = generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy: [] })[0]
    const winter = generateSlots({ isoDate: "2026-11-02", location: "setubal", durationMin: 45, busy: [] })[0]
    expect(summer.toISOString()).toBe("2026-10-12T11:00:00.000Z")
    expect(winter.toISOString()).toBe("2026-11-02T12:00:00.000Z")
  })
})

test("filterFutureSlots drops what starts within the notice", () => {
  const now = lisbon("2026-10-12", "13:00")
  const slots = generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy: [] })
  expect(times(filterFutureSlots(slots, now, 60))[0]).toBe("14:15")
})
