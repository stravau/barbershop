import { ImageResponse } from "next/og"
import { ogFonts } from "@/lib/og-fonts"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

// iOS rounds the corners itself, so this one is a plain full-bleed square.
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5c518",
          color: "#1a1712",
          fontFamily: "Alfa Slab One",
          fontSize: 132,
          lineHeight: 1,
          paddingBottom: 10,
        }}
      >
        T
      </div>
    ),
    { ...size, fonts: await ogFonts("slab") },
  )
}
