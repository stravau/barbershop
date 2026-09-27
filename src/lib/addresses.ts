import type { LocationId } from "./schedule"

// Street address of each location — the single source for everything that
// shows one: the confirmation/reminder emails, the confirmed booking page,
// the Google Maps link and the "add to calendar" event.
//
// Addresses are only shown to a client once the booking is CONFIRMED, never
// on the public pages, and this module is only imported server-side.
export const ADDRESSES: Record<LocationId, string> = {
  lisboa: "Rua Comandante Fontoura da Costa, 16",
  setubal: "Rua da Concha, 142",
}

export function getLocationAddress(location: string): string | null {
  return ADDRESSES[location as LocationId] ?? null
}

export function mapsUrl(address: string, city: string): string {
  const query = encodeURIComponent(`${address}, ${city}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
