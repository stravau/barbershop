import { defineConfig } from "@playwright/test"

// `npm test` — unit tests of the booking logic (no browser, no database).
// For screenshots of the running site see scripts/screenshot.mjs.
export default defineConfig({
  testDir: "tests",
  projects: [{ name: "unit", testMatch: /unit\/.*\.spec\.ts$/ }],
  reporter: "list",
  fullyParallel: true,
})
