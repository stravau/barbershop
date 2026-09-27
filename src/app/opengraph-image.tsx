import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ogFonts } from "@/lib/og-fonts"
import { formatPriceShort, getServiceItem } from "@/lib/services"

export const alt = "Tarzan's Barbershop — barbeiro independente em Setúbal e Lisboa"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const INK = "#1a1712"
const PAPER = "#f2eadb"
const YELLOW = "#f5c518"
const JUNGLE = "#1f3a2b"

// Shown when the link is shared on WhatsApp/Instagram/etc. — same poster
// look as the homepage hero.
export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/logo.jpeg"))
  const logoSrc = `data:image/jpeg;base64,${logo.toString("base64")}`
  const cut = getServiceItem("corte")

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: PAPER,
          color: INK,
          fontFamily: "Archivo",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 0 0 72px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#6b6152", letterSpacing: 1 }}>
            BARBEIRO INDEPENDENTE · SETÚBAL & LISBOA
          </div>
          <div
            style={{
              fontFamily: "Alfa Slab One",
              fontSize: 112,
              lineHeight: 1,
              marginTop: 24,
              textShadow: `8px 8px 0 ${YELLOW}`,
            }}
          >
            TARZAN&apos;S
          </div>
          <div
            style={{
              fontFamily: "Yellowtail",
              fontSize: 86,
              lineHeight: 1,
              color: JUNGLE,
              marginLeft: 48,
              transform: "rotate(-3deg)",
            }}
          >
            Barbershop
          </div>
          <div style={{ fontFamily: "Alfa Slab One", fontSize: 42, marginTop: 40 }}>
            Corte · Barba · Sobrancelha
          </div>
          <div style={{ display: "flex", marginTop: 30 }}>
            <div
              style={{
                display: "flex",
                background: YELLOW,
                border: `3px solid ${INK}`,
                borderRadius: 8,
                boxShadow: `6px 6px 0 ${INK}`,
                padding: "12px 26px",
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              MARCA ONLINE
            </div>
          </div>
        </div>

        {/* Logo plaque, cropped into the illustration like on the homepage */}
        <div
          style={{
            position: "absolute",
            right: 64,
            top: 120,
            width: 400,
            height: 339,
            display: "flex",
            overflow: "hidden",
            background: "#000",
            border: `4px solid ${INK}`,
            borderRadius: 14,
            boxShadow: `10px 10px 0 ${JUNGLE}`,
            transform: "rotate(-2deg)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
          <img
            src={logoSrc}
            width={513}
            height={513}
            style={{ position: "absolute", left: -56, top: -67 }}
          />
        </div>

        {cut && (
          <div
            style={{
              position: "absolute",
              right: 44,
              top: 78,
              width: 150,
              height: 150,
              borderRadius: 75,
              background: YELLOW,
              border: `4px solid ${INK}`,
              boxShadow: `4px 4px 0 ${INK}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(10deg)",
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700 }}>CORTE</div>
            <div style={{ fontFamily: "Alfa Slab One", fontSize: 46, lineHeight: 1 }}>
              {formatPriceShort(cut.priceEur)}
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 26,
            display: "flex",
            background: INK,
          }}
        />
      </div>
    ),
    { ...size, fonts: await ogFonts("slab", "script", "archivo") },
  )
}
