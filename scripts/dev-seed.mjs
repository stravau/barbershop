// Fills the LOCAL database with sample clients and bookings, so the admin and
// the client area have something to show in development and screenshots.
//
//   npm run seed:dev            (refuses if there are clients already)
//   npm run seed:dev -- --reset (wipes clients, bookings and sessions first)
//
// Refuses to run unless DATABASE_URL points at localhost.

import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { fromZonedTime } from "date-fns-tz"
import { buildCombo } from "../src/lib/services.ts"
import { getWorkingHours } from "../src/lib/schedule.ts"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
process.loadEnvFile(path.join(root, ".env"))
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
  console.error("DATABASE_URL is not a local database — refusing to seed.")
  process.exit(1)
}

const require = createRequire(import.meta.url)
const { PrismaClient } = require("../src/generated/prisma")
const prisma = new PrismaClient()

// Deterministic randomness, so every reset gives the same data
let seed = 42
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32)
const pick = (items) => items[Math.floor(rand() * items.length)]
const weighted = (pairs) => {
  let r = rand() * pairs.reduce((s, [, w]) => s + w, 0)
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v
  return pairs[0][0]
}

const TZ = "Europe/Lisbon"
const lisbonToUtc = (ymd, hhmm) => fromZonedTime(`${ymd}T${hhmm}:00`, TZ)
const ymdPlus = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
const dow = (ymd) => new Date(`${ymd}T12:00:00Z`).getUTCDay()
const minutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`

const CLIENTS = [
  { name: "João Silva", phone: "351912345601", email: "joao.silva@exemplo.pt" },
  { name: "Miguel Santos", phone: "351912345602", email: "miguel.santos@exemplo.pt" },
  { name: "Rui Costa", phone: "351912345603", email: null },
  { name: "Tiago Ferreira", phone: "351912345604", email: "tiago.f@exemplo.pt" },
  { name: "André Martins", phone: "351912345605", email: "andre.martins@exemplo.pt" },
  { name: "Pedro Sousa", phone: "351912345606", email: null },
  { name: "Diogo Pereira", phone: "351912345607", email: "diogo.p@exemplo.pt" },
  { name: "Bruno Almeida", phone: "351912345608", email: "bruno.almeida@exemplo.pt" },
  { name: "Arlindo Gomes", phone: "351912345609", email: null },
  { name: "Ricardo Lopes", phone: "351912345610", email: "ricardo.lopes@exemplo.pt" },
  { name: "Hugo Carvalho", phone: "351912345611", email: "hugo.c@exemplo.pt" },
  { name: "Zeca", phone: "sem-telefone-zeca0001", email: null },
  // The account used for client-area screenshots (scripts/screenshot.mjs --as client)
  { name: "Cliente Teste", phone: "351912345699", email: "cliente@teste.local" },
]

const SERVICE_MIX = [
  [["corte"], 50],
  [["corte", "barba"], 25],
  [["corte", "sobrancelha"], 10],
  [["barba"], 8],
  [["corte", "barba", "sobrancelha"], 5],
  [["sobrancelha"], 2],
]

const NOTES = ["Degradê baixo", "Só aparar em cima", "Barba curta", "Risca do lado esquerdo"]

async function main() {
  const reset = process.argv.includes("--reset")
  if (reset) {
    await prisma.$transaction([
      prisma.clientSession.deleteMany(),
      prisma.clientLoginCode.deleteMany(),
      prisma.booking.deleteMany(),
      prisma.client.deleteMany(),
    ])
  } else if ((await prisma.client.count()) > 0) {
    console.error("There are clients already. Use --reset to wipe and seed again.")
    process.exit(1)
  }

  const clients = []
  for (const c of CLIENTS) clients.push(await prisma.client.create({ data: c }))
  const testClient = clients.find((c) => c.email === "cliente@teste.local")
  const regulars = clients.filter((c) => c !== testClient)

  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ })
  const now = new Date()
  const bookings = []
  /** Busy [start, end] minutes per Lisbon day — one barber, so shared by both cities. */
  const takenByDay = new Map()
  const takenOn = (ymd) => takenByDay.get(ymd) ?? takenByDay.set(ymd, []).get(ymd)

  // The test client: three past visits (so "Marcação express" has a habit)
  const corte = buildCombo(["corte"])
  for (const offset of [-42, -28, -14]) {
    let ymd = ymdPlus(today, offset)
    while (dow(ymd) !== 2) ymd = ymdPlus(ymd, 1) // a Tuesday in Setúbal
    const startUtc = lisbonToUtc(ymd, "18:00")
    takenOn(ymd).push([minutes("18:00"), minutes("18:00") + corte.durationMin])
    bookings.push({
      clientId: testClient.id,
      email: testClient.email,
      serviceId: corte.key,
      serviceName: corte.name,
      servicePrice: corte.priceEur,
      durationMin: corte.durationMin,
      location: "setubal",
      startUtc,
      endUtc: new Date(startUtc.getTime() + corte.durationMin * 60000),
      status: "CONFIRMED",
      confirmedAt: startUtc,
    })
  }

  for (let offset = -56; offset <= 14; offset++) {
    const ymd = ymdPlus(today, offset)
    for (const location of ["setubal", "lisboa"]) {
      const hours = getWorkingHours(location, dow(ymd))
      if (!hours) continue
      const open = minutes(hours.start)
      const close = minutes(hours.end)
      const wanted = offset < 0 ? 1 + Math.floor(rand() * 4) : Math.floor(rand() * 3)
      const taken = takenOn(ymd)
      let added = 0
      for (let i = 0; i < wanted * 4 && added < wanted; i++) {
        const services = weighted(SERVICE_MIX)
        const combo = buildCombo(services)
        const latest = close - combo.durationMin
        if (latest < open) continue
        const start = open + Math.floor((rand() * (latest - open + 1)) / 15) * 15
        const end = start + combo.durationMin
        if (taken.some(([s, e]) => start < e + 10 && end > s - 10)) continue
        taken.push([start, end])
        added++

        const startUtc = lisbonToUtc(ymd, hhmm(start))
        const endUtc = lisbonToUtc(ymd, hhmm(end))
        const client = pick(regulars)
        const past = startUtc < now
        const status = past
          ? weighted([["CONFIRMED", 9], ["CANCELLED", 1]])
          : offset <= 7
            ? weighted([["CONFIRMED", 6], ["PENDING", 3], ["CANCELLED", 1]])
            : weighted([["CONFIRMED", 8], ["PENDING", 2]])
        bookings.push({
          clientId: client.id,
          email: client.email,
          serviceId: combo.key,
          serviceName: combo.name,
          servicePrice: client.name.startsWith("Arlindo") ? 20 : combo.priceEur,
          durationMin: combo.durationMin,
          tipEur: past && status === "CONFIRMED" && rand() < 0.3 ? pick([1, 2, 2.5, 5]) : 0,
          location,
          startUtc,
          endUtc,
          status,
          confirmedAt: status === "CONFIRMED" ? startUtc : null,
          cancelledAt: status === "CANCELLED" ? startUtc : null,
          notes: rand() < 0.15 ? pick(NOTES) : null,
          createdAt: new Date(startUtc.getTime() - 1000 * 60 * 60 * 24 * 3),
        })
      }
    }
  }

  await prisma.booking.createMany({ data: bookings })
  const counts = bookings.reduce((m, b) => ({ ...m, [b.status]: (m[b.status] ?? 0) + 1 }), {})
  console.log(`Seeded ${clients.length} clients and ${bookings.length} bookings`, counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
