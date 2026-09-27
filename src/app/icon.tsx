import { ImageResponse } from "next/og"
import { ogFonts } from "@/lib/og-fonts"

export const size = { width: 64, height: 64 }
export const contentType = "image/png"

// The illustrated logo is unreadable at favicon size — use a slab "T" instead.
export default async function Icon() {
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
          border: "5px solid #1a1712",
          borderRadius: 14,
          color: "#1a1712",
          fontFamily: "Alfa Slab One",
          fontSize: 48,
          lineHeight: 1,
          paddingBottom: 4,
        }}
      >
        T
      </div>
    ),
    { ...size, fonts: await ogFonts("slab") },
  )
}
