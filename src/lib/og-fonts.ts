import { readFile } from "node:fs/promises"
import { join } from "node:path"

// TTF copies of the site's fonts for next/og images (share image, icons),
// which can't use next/font. Files live in /assets/fonts.
const FONTS = {
  slab: { name: "Alfa Slab One", file: "AlfaSlabOne-Regular.ttf", weight: 400 },
  script: { name: "Yellowtail", file: "Yellowtail-Regular.ttf", weight: 400 },
  archivo: { name: "Archivo", file: "Archivo-Bold.ttf", weight: 700 },
} as const

export async function ogFonts(...which: (keyof typeof FONTS)[]) {
  return Promise.all(
    which.map(async (key) => {
      const f = FONTS[key]
      return {
        name: f.name,
        data: await readFile(join(process.cwd(), "assets/fonts", f.file)),
        weight: f.weight,
        style: "normal" as const,
      }
    }),
  )
}
