// Admin cookies — HMAC-signed values, verified with Web Crypto so this file
// works in the middleware (Edge runtime) as well as in Node. No database
// access here: revocation is checked separately in lib/admin-auth.ts.
//
//   session cookie:  "<sessionId>.<expiresMs>.<signature>"
//   2FA cookie:      "<codeId>.<expiresMs>.<signature>"   (between password and code)

const SESSION_COOKIE = "tarzans-admin"
const PENDING_2FA_COOKIE = "tarzans-admin-2fa"
const DEVICE_COOKIE = "tarzans-admin-device"

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const PENDING_2FA_TTL_MS = 1000 * 60 * 10 // 10 minutes
const DEVICE_TTL_MS = 1000 * 60 * 60 * 24 * 15 // "lembrar este dispositivo": 15 days

/**
 * The signing secret. There is deliberately no fallback: with no
 * ADMIN_SECRET every admin cookie is rejected (a default value would be
 * public in the repo and let anyone forge a session).
 */
export function adminSecret(): string | null {
  const s = process.env.ADMIN_SECRET
  return s && s.length >= 16 ? s : null
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return bytesToHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)))
}

/** Constant-time string comparison (length is not secret here). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Signs "<id>.<expires>" for a given purpose (kind); null without ADMIN_SECRET. */
export async function sign(kind: string, id: string, ttlMs: number): Promise<string | null> {
  const secret = adminSecret()
  if (!secret) return null
  const expires = Date.now() + ttlMs
  return `${id}.${expires}.${await hmacHex(`${kind}:${id}:${expires}`, secret)}`
}

/** Returns the id inside a signed value if the signature and expiry are good. */
export async function verify(kind: string, value: string | undefined | null): Promise<string | null> {
  const secret = adminSecret()
  if (!secret || !value) return null
  const [id, expiresStr, sig] = value.split(".")
  const expires = Number.parseInt(expiresStr ?? "", 10)
  if (!id || !sig || !Number.isFinite(expires) || expires < Date.now()) return null
  const expected = await hmacHex(`${kind}:${id}:${expires}`, secret)
  return timingSafeEqualStr(sig, expected) ? id : null
}

export const makeSessionCookie = (sessionId: string) => sign("session", sessionId, SESSION_TTL_MS)
export const readSessionCookie = (value: string | undefined | null) => verify("session", value)
export const makePending2faCookie = (codeId: string) => sign("2fa", codeId, PENDING_2FA_TTL_MS)
export const readPending2faCookie = (value: string | undefined | null) => verify("2fa", value)

/** Edge-safe check used by the middleware (signature + expiry only). */
export async function isSessionValid(value: string | undefined | null): Promise<boolean> {
  return (await readSessionCookie(value)) !== null
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const PENDING_2FA_COOKIE_NAME = PENDING_2FA_COOKIE
export const DEVICE_COOKIE_NAME = DEVICE_COOKIE
export { SESSION_TTL_MS, PENDING_2FA_TTL_MS, DEVICE_TTL_MS }
