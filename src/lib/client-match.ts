// Suggestions while typing a client in the admin: by name (accents and case
// ignored, any word's start — "joao sil" finds "João Silva") or by number
// (3+ digits anywhere in the phone, with or without 351). Browser-safe.

import { normalizeName } from "./clients"
import type { ClientHint } from "./client-directory"

export function matchClients(clients: readonly ClientHint[], typed: string, limit = 6): ClientHint[] {
  const digits = typed.replace(/\D/g, "")
  const looksLikeNumber = digits.length >= 3 && /^[\d\s+()-]+$/.test(typed.trim())
  if (looksLikeNumber) {
    return clients
      .filter((c) => c.phone.includes(digits) || c.phone.replace(/^351/, "").startsWith(digits))
      .slice(0, limit)
  }

  const words = normalizeName(typed).split(" ").filter(Boolean)
  if (words.join("").length < 2) return []
  const scored = clients.flatMap((c) => {
    const name = normalizeName(c.name)
    const parts = name.split(" ")
    const byWordStart = words.every((w) => parts.some((p) => p.startsWith(w)))
    if (!byWordStart && !words.every((w) => name.includes(w))) return []
    // Same name > first name starts with it > any word starts with it > inside a word
    const score = name === words.join(" ") ? 0 : parts[0].startsWith(words[0]) ? 1 : byWordStart ? 2 : 3
    return [{ c, score }]
  })
  return scored
    .sort((a, b) => a.score - b.score || b.c.visits - a.c.visits)
    .slice(0, limit)
    .map((x) => x.c)
}
