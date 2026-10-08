// The loyalty card: every cut that happened is a stamp; after six stamps the
// next cut — the 7th — is free (first card only). One rule for the client
// area, the home page and the admin.

/** Stamps to collect; the cut after them (the 7th) is free. */
export const STAMPS_TO_FREE = 6

/** A visit that happened: confirmed and its time has passed (a no-show isn't). */
export function happened(b: { status: string; startUtc: Date }, now: Date): boolean {
  return (b.status === "CONFIRMED" || b.status === "COMPLETED") && b.startUtc < now
}

/** Whether a booking's services include a cut ("corte", "barba+corte"…). */
export function isCut(serviceId: string): boolean {
  return serviceId.split("+").includes("corte")
}

/** Stamps on the card: the cuts that happened (the free 7th one included). */
export function stamps(
  bookings: { status: string; startUtc: Date; serviceId: string }[],
  now = new Date(),
): number {
  return bookings.filter((b) => happened(b, now) && isCut(b.serviceId)).length
}

/** What the card says to the client for a number of stamps. */
export function cardMessage(stamped: number): string {
  if (stamped > STAMPS_TO_FREE) return "Cartão completo! Já usaste o teu corte grátis."
  if (stamped === STAMPS_TO_FREE) return "O próximo corte é grátis."
  const left = STAMPS_TO_FREE - stamped
  return `${left === 1 ? "Falta 1 corte" : `Faltam ${left} cortes`} para o corte grátis.`
}
