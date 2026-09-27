import type { Metadata } from "next"
import { Alfa_Slab_One, Archivo, Yellowtail } from "next/font/google"
import "./globals.css"
import { SiteHeader } from "@/components/SiteHeader"
import { SiteFooter } from "@/components/SiteFooter"
import { getServiceItem, formatPriceShort } from "@/lib/services"
import { getSiteUrl } from "@/lib/site"

const slab = Alfa_Slab_One({
  variable: "--font-slab",
  subsets: ["latin"],
  weight: "400",
})

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
})

const yellowtail = Yellowtail({
  variable: "--font-yellowtail",
  subsets: ["latin"],
  weight: "400",
})

const cutPrice = formatPriceShort(getServiceItem("corte")?.priceEur ?? 0)

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Tarzan's Barbershop — Barbeiro em Setúbal e Lisboa",
    template: "%s · Tarzan's Barbershop",
  },
  description: `Barbeiro em Setúbal e Lisboa. Corte a ${cutPrice}, barba, sobrancelha e combos — marca online em menos de um minuto.`,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-PT"
      className={`${slab.variable} ${archivo.variable} ${yellowtail.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
