// The loyalty card: every cut that happened is a stamp and the 6th cut is
// free (first card only). One rule for the client area, the home page and
// the admin.

/** Stamps per card; the last one is the free cut. */
export const CARD_SIZE = 6

/** A visit that happened: confirmed and its time has passed (a no-show isn't). */
export function happened(b: { status: string; startUtc: Date }, now: Date): boolean {
  return (b.status === "CONFIRMED" || b.status === "COMPLETED") && b.startUtc < now
}

/** Whether a booking's services include a cut ("corte", "barba+corte"…). */
export function isCut(serviceId: string): boolean {
  return serviceId.split("+").includes("corte")
}

/** Stamps on the card: the cuts that happened. */
export function stamps(
  bookings: { status: string; startUtc: Date; serviceId: string }[],
  now = new Date(),
): number {
  return bookings.filter((b) => happened(b, now) && isCut(b.serviceId)).length
}
