// schema.org description of the shop for search engines (JSON-LD on the home
// page): opening hours and prices come from the same modules the site uses,
// so they never drift. Street addresses stay private (see lib/addresses.ts):
// only the cities are given.

import { LOCATIONS, SCHEDULE } from "./schedule"
import { SERVICES, discountedCombos } from "./services"
import { INSTAGRAM_URL, getSiteUrl } from "./site"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function barbershopJsonLd(): Record<string, unknown> {
  const site = getSiteUrl()
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE

  const hours = LOCATIONS.flatMap((loc) =>
    Object.entries(SCHEDULE[loc.id]).map(([dow, h]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY_NAMES[Number(dow)]}`,
      opens: h!.start,
      closes: h!.end,
    })),
  )

  const offers = [
    ...SERVICES.filter((s) => s.id !== "alinhamento").map((s) => ({ name: s.name, price: s.priceEur })),
    ...discountedCombos().map((c) => ({ name: c.name, price: c.priceEur })),
  ].map((o) => ({
    "@type": "Offer",
    price: o.price.toFixed(2),
    priceCurrency: "EUR",
    itemOffered: { "@type": "Service", name: o.name },
  }))

  return {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: "Tarzan's Barbershop",
    url: site,
    image: `${site}/opengraph-image`,
    logo: `${site}/logo.jpeg`,
    ...(phone && { telephone: `+${phone}` }),
    priceRange: "€",
    paymentAccepted: "Cash, MB WAY",
    currenciesAccepted: "EUR",
    areaServed: LOCATIONS.map((l) => ({ "@type": "City", name: l.name })),
    address: LOCATIONS.map((l) => ({ "@type": "PostalAddress", addressLocality: l.name, addressCountry: "PT" })),
    openingHoursSpecification: hours,
    hasOfferCatalog: { "@type": "OfferCatalog", name: "Serviços", itemListElement: offers },
    sameAs: [INSTAGRAM_URL],
  }
}
