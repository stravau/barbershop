"use client"

import { useEffect } from "react"

/** Remembers (for this visit) that the hero's entrance animation has played. */
export const HERO_SEEN_KEY = "tarzans-hero-seen"

/**
 * After the hero's entrance has played once, flags it for the rest of the
 * visit: a script in the layout sets html[data-hero-seen] on later page
 * loads, and this sets it right away for in-app navigations back home.
 */
export function HeroIntro() {
  useEffect(() => {
    const timer = setTimeout(() => {
      document.documentElement.dataset.heroSeen = "1"
      try {
        sessionStorage.setItem(HERO_SEEN_KEY, "1")
      } catch {}
    }, 1500)
    return () => clearTimeout(timer)
  }, [])
  return null
}
