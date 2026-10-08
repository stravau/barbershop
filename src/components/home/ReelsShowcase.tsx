"use client"

import { useEffect, useRef, useState } from "react"
import { Play } from "lucide-react"
import type { Reel } from "@/lib/reels"
import { StoryPlayer, useReducedMotion } from "./StoryPlayer"

/**
 * Whether an element is on screen (`margin` widens the check, e.g. to start
 * loading early). With `once`, it stays true after the first time.
 */
function useInView<T extends Element>(margin = "0px", threshold = 0.25, once = false) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting)
        if (once && e.isIntersecting) io.disconnect()
      },
      { rootMargin: margin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [margin, threshold, once])
  return [ref, inView] as const
}

// The Instagram videos on the home page. Desktop: a drawn phone in the
// hero playing them one after another (ReelsPhone). Phones: a row of
// vertical videos to swipe in the Instagram band (ReelsRow) — the one in
// view plays, muted; tapping one opens it full screen, with sound.

/** `className` sizes it (width); the screen keeps the videos' 9:16. */
export function ReelsPhone({ reels, className }: { reels: readonly Reel[]; className?: string }) {
  // Videos start loading a little before the phone scrolls into view
  const [nearRef, loaded] = useInView<HTMLDivElement>("300px", 0, true)
  const [viewRef, inView] = useInView<HTMLDivElement>("0px", 0.4)

  return (
    <div ref={nearRef} data-reels="phone" className={className}>
      <div
        ref={viewRef}
        className="relative rotate-2 rounded-[2.75rem] border-2 border-ink bg-ink p-2.5 shadow-[10px_10px_0_var(--jungle)]"
      >
        {/* Side buttons */}
        <span aria-hidden="true" className="absolute top-24 -left-[5px] h-12 w-[3px] rounded-l bg-ink" />
        <span aria-hidden="true" className="absolute top-40 -left-[5px] h-12 w-[3px] rounded-l bg-ink" />
        <span aria-hidden="true" className="absolute top-32 -right-[5px] h-16 w-[3px] rounded-r bg-ink" />
        <div className="relative aspect-[9/16] overflow-hidden rounded-[2.1rem]">
          <StoryPlayer reels={reels} active={inView} load={loaded} />
          {/* Dynamic island */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black"
          />
        </div>
      </div>
    </div>
  )
}

export function ReelsRow({ reels }: { reels: readonly Reel[] }) {
  const [current, setCurrent] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const [rowRef, rowInView] = useInView<HTMLUListElement>("0px", 0.5)

  // The card most in view (horizontally) is the one that plays
  useEffect(() => {
    const ratios = new Map<Element, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio)
        let best = -1
        let bestRatio = 0.6
        items.current.forEach((el, i) => {
          const r = el ? (ratios.get(el) ?? 0) : 0
          if (r > bestRatio) {
            best = i
            bestRatio = r
          }
        })
        if (best >= 0) setCurrent(best)
      },
      { threshold: [0, 0.6, 0.8, 1] },
    )
    items.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <ul
        ref={rowRef}
        data-reels="row"
        aria-label="Vídeos do Instagram"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reels.map((r, i) => (
          <li
            key={r.id}
            ref={(el) => {
              items.current[i] = el
            }}
            className="w-[64vw] max-w-[260px] shrink-0 snap-center"
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Ver em ecrã inteiro: ${r.label}`}
              className="relative block aspect-[9/16] w-full overflow-hidden rounded-xl border-2 border-ink bg-ink shadow-[4px_4px_0_var(--ink)]"
            >
              <PreviewVideo reel={r} playing={rowInView && current === i && open === null} />
              <span className="pointer-events-none absolute right-2 bottom-2 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-paper">
                <Play className="h-4 w-4 fill-paper" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <FullScreenStory reels={reels} start={open} onClose={() => setOpen(null)} />}
    </>
  )
}

/**
 * A card's video: muted loop while it's the one in view. preload="none":
 * nothing is downloaded until it first plays — only the cover shows.
 */
function PreviewVideo({ reel, playing }: { reel: Reel; playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const reduced = useReducedMotion()
  const play = playing && !reduced

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (play) v.play().catch(() => {})
    else v.pause()
  }, [play])

  return (
    <video
      ref={ref}
      src={reel.src}
      poster={reel.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className="h-full w-full object-cover"
    />
  )
}

/** Full-screen story viewer (phones). Closes with ✕, Esc, or a swipe down. */
function FullScreenStory({
  reels,
  start,
  onClose,
}: {
  reels: readonly Reel[]
  start: number
  onClose: () => void
}) {
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Vídeos do Instagram"
      className="fixed inset-0 z-[60] bg-black animate-[dialog-in_.2s_ease-out] motion-reduce:animate-none"
      onPointerDown={(e) => {
        startY.current = e.clientY
      }}
      onPointerUp={(e) => {
        if (startY.current !== null && e.clientY - startY.current > 90) onClose()
        startY.current = null
      }}
    >
      {/* Tapping the card was the gesture: this one may play with sound */}
      <StoryPlayer reels={reels} start={start} active load startMuted={false} fit="contain" onClose={onClose} />
    </div>
  )
}
