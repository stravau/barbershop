"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * One-off message after an action (confirmed, cancelled…). The message comes
 * in through query params, so it strips them from the URL straight away —
 * a refresh won't show it again — and hides itself after a few seconds.
 */
export function FlashBanner({
  text,
  tone,
  clearParams,
}: {
  text: string
  tone: "success" | "danger" | "muted"
  clearParams: string[]
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const url = new URL(window.location.href)
    for (const p of clearParams) url.searchParams.delete(p)
    // Keep Next's history state so the router stays in sync
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
    const timer = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [clearParams])

  if (!visible) return null
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 font-semibold",
        tone === "success" && "border-success/50 bg-success/10 text-success",
        tone === "danger" && "border-danger/50 bg-danger/10 text-danger",
        tone === "muted" && "border-ink/20 bg-card",
      )}
    >
      {text}
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Fechar"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
