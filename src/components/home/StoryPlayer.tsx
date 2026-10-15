"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Pause, Play, Volume2, VolumeX, X } from "lucide-react"
import type { Reel } from "@/lib/reels"
import { INSTAGRAM_HANDLE } from "@/lib/site"
import { cn } from "@/lib/utils"

/** Whether the visitor asked for less motion (then nothing plays by itself). */
const REDUCED = "(prefers-reduced-motion: reduce)"
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
}

/**
 * Instagram-Stories-style player: one video at a time, progress bars on
 * top. Like Instagram, with a finger or the mouse: tap the left side to go
 * back, the right side to go forward, the middle to pause; press and hold
 * anywhere to watch at 2× while held. Pause and sound buttons too. Used
 * inside the drawn phone (desktop) and full screen (phones).
 *
 * `active`: allowed to play (on screen); `load`: may fetch the videos
 * (near the screen) — until then only the cover shows.
 */
/** How long a press must last to count as "hold" (2×) rather than a tap. */
const HOLD_MS = 250

export function StoryPlayer({
  reels,
  start = 0,
  active,
  load,
  startMuted = true,
  fit = "cover",
  onClose,
}: {
  reels: readonly Reel[]
  start?: number
  active: boolean
  load: boolean
  startMuted?: boolean
  /** "contain" shows the whole video (full screen on phones taller than 9:16) */
  fit?: "cover" | "contain"
  onClose?: () => void
}) {
  const [index, setIndex] = useState(start)
  const [muted, setMuted] = useState(startMuted)
  const reduced = useReducedMotion()
  // With reduced motion, nothing plays until asked
  const [paused, setPaused] = useState(false)
  const [userPlayed, setUserPlayed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLSpanElement>(null)
  const reel = reels[index]
  const playing = active && !paused && (!reduced || userPlayed)

  const go = (delta: number) => setIndex((i) => (i + delta + reels.length) % reels.length)
  const togglePause = () => {
    if (playing) setPaused(true)
    else {
      setPaused(false)
      setUserPlayed(true)
    }
  }

  // Press and hold = 2× while held; a quick tap = back / pause / forward
  const [fast, setFast] = useState(false)
  const press = useRef<{ x: number; y: number; timer: number; held: boolean } | null>(null)
  const endPress = () => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
    setFast(false)
  }
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = fast ? 2 : 1
  }, [fast, index])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (playing) v.play().catch(() => {})
    else v.pause()
  }, [playing, index, load])

  // The current progress bar follows the video (no re-render per frame)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const v = videoRef.current
      if (v && barRef.current && v.duration) {
        barRef.current.style.transform = `scaleX(${v.currentTime / v.duration})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index])

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink text-paper">
      <video
        key={reel.id}
        ref={videoRef}
        src={load ? reel.src : undefined}
        poster={reel.poster}
        muted={muted}
        playsInline
        preload={load ? "auto" : "none"}
        onEnded={() => go(1)}
        aria-label={reel.label}
        className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")}
      />

      {/* Gestures, like Instagram: left 30% = back, middle = pause, right 30%
          = forward; hold = 2×. No long-press menu, no double-tap zoom. */}
      <div
        data-story-gestures
        aria-hidden="true"
        className="absolute inset-0 cursor-pointer touch-manipulation select-none [-webkit-touch-callout:none]"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const p = { x: e.clientX, y: e.clientY, held: false, timer: 0 }
          p.timer = window.setTimeout(() => {
            p.held = true
            setFast(true)
          }, HOLD_MS)
          press.current = p
        }}
        onPointerMove={(e) => {
          // A swipe (e.g. down to close) is neither a tap nor a hold
          const p = press.current
          if (p && !p.held && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) endPress()
        }}
        onPointerUp={(e) => {
          const p = press.current
          endPress()
          if (!p || p.held) return
          const box = e.currentTarget.getBoundingClientRect()
          const at = (e.clientX - box.left) / box.width
          if (at < 0.3) go(-1)
          else if (at > 0.7) go(1)
          else togglePause()
        }}
        onPointerCancel={endPress}
        onPointerLeave={endPress}
      />
      {/* The same, for keyboards and screen readers */}
      <button type="button" onClick={() => go(-1)} className="sr-only">
        Vídeo anterior
      </button>
      <button type="button" onClick={() => go(1)} className="sr-only">
        Vídeo seguinte
      </button>

      {fast && (
        <span className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm font-bold">
          2×
        </span>
      )}
      {!playing && active && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45">
          <Play className="ml-1 h-8 w-8 fill-paper" />
        </span>
      )}

      {/* Progress, one bar per video */}
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 to-transparent px-3 pt-3 pb-6">
        <div className="flex gap-1">
          {reels.map((r, i) => (
            <span key={r.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-paper/35">
              <span
                ref={i === index ? barRef : undefined}
                className="block h-full origin-left bg-paper"
                style={{ transform: `scaleX(${i < index ? 1 : 0})` }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Bottom bar: handle, pause, sound (and close when full screen) */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-3 pt-8 pb-3">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">@{INSTAGRAM_HANDLE}</span>
        <RoundButton label={playing ? "Pausar" : "Reproduzir"} onClick={togglePause}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </RoundButton>
        <RoundButton label={muted ? "Ligar o som" : "Desligar o som"} onClick={() => setMuted((m) => !m)}>
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </RoundButton>
      </div>

      {onClose && (
        <RoundButton label="Fechar" onClick={onClose} className="absolute top-6 right-3">
          <X className="h-5 w-5" />
        </RoundButton>
      )}
    </div>
  )
}

function RoundButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/45 text-paper backdrop-blur transition hover:bg-black/70",
        className,
      )}
    >
      {children}
    </button>
  )
}
