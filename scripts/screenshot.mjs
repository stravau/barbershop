// Screenshots of the running site (npm run dev) on a phone and a desktop.
//
//   npm run shot -- / /servicos               public pages
//   npm run shot -- --as admin /admin         signed in as the admin
//   npm run shot -- --as client /conta        signed in as cliente@teste.local
//   npm run shot -- --as client=a@b.pt /conta signed in as another client
//
// Options: --mobile / --desktop (default: both), --fold (first screen only,
// default: full page), --base http://localhost:3001, --out .screenshots
//
// Signing in creates a session row straight in the LOCAL database (refuses
// any other) and signs the cookie with ADMIN_SECRET, like the real login does.

import { createHmac } from "node:crypto"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import fs from "node:fs"
import path from "node:path"
import { chromium, devices } from "@playwright/test"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
process.loadEnvFile(path.join(root, ".env"))

let as // "admin" | "client" | "client=<email>"
let base = "http://localhost:3001"
let out = ".screenshots"
let fold = false
let viewports = ["mobile", "desktop"]
const paths = []
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a === "--as") as = argv[++i]
  else if (a === "--base") base = argv[++i]
  else if (a === "--out") out = argv[++i]
  else if (a === "--fold") fold = true
  else if (a === "--mobile") viewports = ["mobile"]
  else if (a === "--desktop") viewports = ["desktop"]
  else if (a.startsWith("/")) paths.push(a)
  else throw new Error(`Unknown argument: ${a}`)
}
if (paths.length === 0) paths.push("/")
const outDir = path.resolve(root, out)

const VIEWPORTS = {
  // iPhone 13 size, touch and user agent, run in Chromium
  mobile: { ...devices["iPhone 13"], defaultBrowserType: undefined },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}

function signed(kind, id, ttlMs) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || secret.length < 16) throw new Error("ADMIN_SECRET missing in .env")
  const expires = Date.now() + ttlMs
  const sig = createHmac("sha256", secret).update(`${kind}:${id}:${expires}`).digest("hex")
  return `${id}.${expires}.${sig}`
}

/** Session cookie for --as admin / --as client[=email], or null. */
async function sessionCookie() {
  if (!as) return null
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("DATABASE_URL is not a local database — refusing to create a session.")
  }
  const require = createRequire(import.meta.url)
  const { PrismaClient } = require("../src/generated/prisma")
  const prisma = new PrismaClient()
  const ttl = 1000 * 60 * 60
  try {
    if (as === "admin") {
      const s = await prisma.adminSession.create({
        data: { ip: "127.0.0.1", userAgent: "scripts/screenshot.mjs", expiresAt: new Date(Date.now() + ttl) },
      })
      return { name: "tarzans-admin", value: signed("session", s.id, ttl) }
    }
    if (as !== "client" && !as.startsWith("client=")) throw new Error(`--as admin | client | client=<email>`)
    const email = (as === "client" ? "cliente@teste.local" : as.slice("client=".length)).toLowerCase()
    const client = await prisma.client.findFirst({ where: { email: { equals: email, mode: "insensitive" } } })
    if (!client) throw new Error(`No client with email ${email} (run npm run seed:dev?)`)
    const s = await prisma.clientSession.create({
      data: { email, clientId: client.id, expiresAt: new Date(Date.now() + ttl) },
    })
    return { name: "tarzans-cliente", value: signed("client", s.id, ttl) }
  } finally {
    await prisma.$disconnect()
  }
}

const fileName = (p, vp) => {
  const slug = p.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-") || "home"
  return `${as ? `${as.split("=")[0]}-` : ""}${slug}-${vp}.png`
}

const cookie = await sessionCookie()
fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
try {
  for (const vp of viewports) {
    const context = await browser.newContext({ ...VIEWPORTS[vp], locale: "pt-PT", timezoneId: "Europe/Lisbon" })
    if (cookie) await context.addCookies([{ ...cookie, url: base }])
    const page = await context.newPage()
    for (const p of paths) {
      const res = await page.goto(base + p, { waitUntil: "load", timeout: 180_000 })
      // Client-side fetches start only after hydration, which is slow on the dev
      // server — wait for the network to go quiet twice (never hang on sockets)
      for (const pause of [1000, 400]) {
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
        await page.waitForTimeout(pause)
      }
      // Hide the Next.js dev-mode indicator
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" })
      const file = path.join(outDir, fileName(p, vp))
      // caret "initial": hiding it injects styles, which React reports as a
      // hydration mismatch if the page hasn't hydrated yet
      await page.screenshot({ path: file, fullPage: !fold, caret: "initial" })
      console.log(`${res?.status() ?? "?"} ${page.url().replace(base, "")} -> ${path.relative(root, file)}`)
    }
    await context.close()
  }
} finally {
  await browser.close()
}
