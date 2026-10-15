import { expect, test } from "@playwright/test"
import type { ClientHint } from "@/lib/client-directory"
import { matchClients } from "@/lib/client-match"

const c = (name: string, phone: string, visits = 0): ClientHint => ({
  id: name,
  name,
  phone,
  email: null,
  visits,
  lastVisit: null,
  services: ["corte"],
  serviceName: "Corte",
  location: "setubal",
})
const CLIENTS = [
  c("João Silva", "351912345601", 3),
  c("Joana Sousa", "351912345602", 9),
  c("Pedro Sousa", "351912345606", 1),
  c("Zeca", ""),
]
const names = (typed: string) => matchClients(CLIENTS, typed).map((x) => x.name)

test("names: accents and case ignored, any word's start", () => {
  expect(names("joao sil")).toEqual(["João Silva"])
  expect(names("SOUSA")).toEqual(["Joana Sousa", "Pedro Sousa"]) // more visits first
  expect(names("jo")).toEqual(["Joana Sousa", "João Silva"])
  expect(names("ze")).toEqual(["Zeca"])
})

test("the same name comes first, then first names that start with it", () => {
  const list = [c("Rui Costa", "1", 9), c("Rui", "2", 0), c("Andre Rui", "3", 20)]
  expect(matchClients(list, "rui").map((x) => x.name)).toEqual(["Rui", "Rui Costa", "Andre Rui"])
})

test("numbers: 3+ digits anywhere in the phone, with or without 351", () => {
  expect(names("912 345 606")).toEqual(["Pedro Sousa"])
  expect(names("3516")).toEqual([]) // not a match anywhere
  expect(names("45602")).toEqual(["Joana Sousa"])
})

test("too little typed: no suggestions", () => {
  expect(names("j")).toEqual([])
  expect(names("12")).toEqual([])
})
