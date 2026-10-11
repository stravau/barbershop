import { expect, test } from "@playwright/test"
import { filterFutureSlots, generateSlots } from "@/lib/slots"
import { combineDateTimeLisbon, formatLisbon } from "@/lib/tz"

const times = (slots: Date[]) => slots.map((s) => formatLisbon(s, "HH:mm"))
const lisbon = (ymd: string, hhmm: string) => combineDateTimeLisbon(ymd, hhmm)

// 2026-10-12 is a Monday (Setúbal 08:00–08:30 and 13:30–21:00, around
// classes); 2026-10-14 a Wednesday; 2026-10-16 a Friday; 2026-10-17 a Saturday
test.describe("generateSlots", () => {
  test("a free Monday in Setúbal: a 45-min cut fits only the afternoon period, up to 21:00", () => {
    const slots = times(generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy: [] }))
    expect(slots[0]).toBe("13:30")
    expect(slots.at(-1)).toBe("20:15")
    expect(slots).toHaveLength(28)
  })

  test("short gaps between classes still take short services", () => {
    const slots = times(generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 10, busy: [] }))
    expect(slots.slice(0, 3)).toEqual(["08:00", "08:15", "13:30"])
    expect(slots).not.toContain("10:00") // class 08:30–10:00, then a gap left out
  })

  test("no slot during a class (Wednesday 14:00–18:30)", () => {
    const slots = times(generateSlots({ isoDate: "2026-10-14", location: "setubal", durationMin: 45, busy: [] }))
    expect(slots).toContain("13:15") // ends 14:00, as the class starts
    expect(slots.filter((s) => s > "13:15" && s < "18:30")).toEqual([])
    expect(slots).toContain("18:30")
  })

  test("a booking blocks its time plus 10 minutes on each side", () => {
    const busy = [{ start: lisbon("2026-10-12", "15:00"), end: lisbon("2026-10-12", "15:45") }]
    const slots = times(generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy }))
    expect(slots).toContain("14:00") // ends 14:45, 15 min before
    expect(slots).not.toContain("14:15") // would end 15:00, inside the 10-min gap
    expect(slots).not.toContain("15:45") // starts right at the end, inside the gap
    expect(slots).toContain("16:00")
  })

  test("closed days have no slots", () => {
    expect(generateSlots({ isoDate: "2026-10-18", location: "setubal", durationMin: 45, busy: [] })).toEqual([])
    expect(generateSlots({ isoDate: "2026-10-12", location: "lisboa", durationMin: 45, busy: [] })).toEqual([])
  })

  test("Friday: no Setúbal, Lisboa from 17:00", () => {
    const setubal = generateSlots({ isoDate: "2026-10-16", location: "setubal", durationMin: 45, busy: [] })
    const lisboa = times(generateSlots({ isoDate: "2026-10-16", location: "lisboa", durationMin: 45, busy: [] }))
    expect(setubal).toEqual([])
    expect(lisboa[0]).toBe("17:00")
  })

  test("a service longer than the opening hours has no slot", () => {
    // Saturday in Lisboa is 2h30: a 160-min job doesn't fit
    expect(generateSlots({ isoDate: "2026-10-17", location: "lisboa", durationMin: 160, busy: [] })).toEqual([])
  })

  test("summer and winter time: 13:30 in Lisbon is 12:30 or 13:30 UTC", () => {
    const summer = generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy: [] })[0]
    const winter = generateSlots({ isoDate: "2026-11-02", location: "setubal", durationMin: 45, busy: [] })[0]
    expect(summer.toISOString()).toBe("2026-10-12T12:30:00.000Z")
    expect(winter.toISOString()).toBe("2026-11-02T13:30:00.000Z")
  })
})

test("filterFutureSlots drops what starts within the notice", () => {
  const now = lisbon("2026-10-12", "13:00")
  const slots = generateSlots({ isoDate: "2026-10-12", location: "setubal", durationMin: 45, busy: [] })
  expect(times(filterFutureSlots(slots, now, 60))[0]).toBe("14:15")
})
