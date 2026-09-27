// Site-wide constants and URL helpers shared by pages, metadata and emails.

export const INSTAGRAM_HANDLE = "tarzansbarbershop"
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3001"
}

/** wa.me link for the barber's phone, or null if NEXT_PUBLIC_SHOP_PHONE isn't set. */
export function whatsappUrl(prefilledMessage?: string): string | null {
  const phone = process.env.NEXT_PUBLIC_SHOP_PHONE
  if (!phone) return null
  return prefilledMessage
    ? `https://wa.me/${phone}?text=${encodeURIComponent(prefilledMessage)}`
    : `https://wa.me/${phone}`
}
