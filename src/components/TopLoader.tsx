"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { NAV_START_EVENT } from "@/lib/nav-events"


// Whether this tab has moved between pages of the site (BackLink uses it to
// choose between history.back() and its fallback link)
let navigatedInApp = false
export const hasNavigatedInApp = () => navigatedInApp

/** A request with no new page after this long just ends the bar. */
const GIVE_UP_MS = 10_000

/**
 * Thin yellow bar at the very top while a page is on its way: from a link,
 * back/forward, or a form being sent. Grows towards ~85% and completes when
 * the new page is in.
 */
export function TopLoader() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const url = `${pathname}?${searchParams}`
  const [state, setState] = useState<"idle" | "loading" | "done">("idle")

  // Start: navigations, and forms being submitted (server actions redirect after their work)
  useEffect(() => {
    const start = () => setState("loading")
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement
      if (form.method?.toLowerCase() === "dialog" || form.dataset.noLoader !== undefined) return
      start()
    }
    window.addEventListener(NAV_START_EVENT, start)
    document.addEventListener("submit", onSubmit, true)
    return () => {
      window.removeEventListener(NAV_START_EVENT, start)
      document.removeEventListener("submit", onSubmit, true)
    }
  }, [])

  // Finish: the URL changed (new page in)
  const [lastUrl, setLastUrl] = useState(url)
  if (url !== lastUrl) {
    setLastUrl(url)
    if (state === "loading") setState("done")
  }
  const firstUrl = useRef(url)
  useEffect(() => {
    if (url !== firstUrl.current) navigatedInApp = true
  }, [url])

  // "done" fades out; a request that never lands a new page gives up
  useEffect(() => {
    if (state === "idle") return
    const timer = setTimeout(() => setState(state === "done" ? "idle" : "done"), state === "done" ? 450 : GIVE_UP_MS)
    return () => clearTimeout(timer)
  }, [state])

  if (state === "idle") return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className={
          state === "loading"
            ? "h-full w-0 animate-[toploader-grow_8s_cubic-bezier(.08,.82,.17,1)_forwards] bg-yellow shadow-[0_1px_0_var(--ink)]"
            : "h-full w-full bg-yellow opacity-0 shadow-[0_1px_0_var(--ink)] transition-opacity delay-150 duration-300"
        }
      />
    </div>
  )
}
