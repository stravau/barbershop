// Runs in the browser before the app starts. Tells the top loading bar
// (components/TopLoader.tsx) that a navigation to another page began.

import { NAV_START_EVENT } from "@/lib/nav-events"

export function onRouterTransitionStart(url: string) {
  try {
    const target = new URL(url, window.location.href)
    // Same page (e.g. a #section link): nothing to load
    if (target.pathname === window.location.pathname && target.search === window.location.search) return
    window.dispatchEvent(new Event(NAV_START_EVENT))
  } catch {}
}
