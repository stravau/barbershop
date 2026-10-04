/**
 * A "next" (where to go after signing in) only if it's a path on this site —
 * never another site (open redirect). Otherwise the fallback.
 */
export function safeNext(value: string | null | undefined, fallback = "/conta"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback
  return value
}
