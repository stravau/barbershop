import { expect, test } from "@playwright/test"
import { buildCombo, formatPrice, listPrice, priceInSelection, validateSelection } from "@/lib/services"

test("combos have their own price and duration, whatever the order picked", () => {
  const combo = buildCombo(["barba", "corte"])
  expect(combo).toMatchObject({ key: "barba+corte", name: "Corte + Barba", priceEur: 12.5, durationMin: 55 })
  expect(buildCombo(["corte", "barba", "sobrancelha"]).priceEur).toBe(15)
})

test("a selection without a special price is the sum of its items", () => {
  expect(buildCombo(["barba", "sobrancelha"])).toMatchObject({ priceEur: 10, durationMin: 15 })
  expect(listPrice(["barba", "sobrancelha"])).toBe(10)
})

test("alinhamento can't go with corte (it's included)", () => {
  expect(validateSelection(["corte", "alinhamento"]).ok).toBe(false)
  expect(validateSelection([]).ok).toBe(false)
  expect(validateSelection(["alinhamento", "barba"]).ok).toBe(true)
})

test("add-on prices shown in the picker add up to the combo price", () => {
  expect(priceInSelection(["corte"], "barba")).toBe(2.5)
  expect(priceInSelection(["corte", "barba"], "sobrancelha")).toBe(2.5)
  expect(priceInSelection([], "corte")).toBe(10)
  // Invalid pairing: the listed price
  expect(priceInSelection(["corte"], "alinhamento")).toBe(5)
})

test("prices are written the Portuguese way", () => {
  expect(formatPrice(12.5)).toBe("12,50 €")
})
