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
 * top, tap the left third to go back and the rest to go forward, pause and
 * sound buttons. Used inside the drawn phone (desktop) and full screen
 * (phones).
 *
 * `active`: allowed to play (on screen); `load`: may fetch the videos
 * (near the screen) — until then only the cover shows.
 */
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

      {/* Tap zones: left third = back, the rest = forward */}
      <button
        type="button"
        aria-label="Vídeo anterior"
        onClick={() => go(-1)}
        className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
      />
      <button
        type="button"
        aria-label="Vídeo seguinte"
        onClick={() => go(1)}
        className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize"
      />

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
        <RoundButton
          label={playing ? "Pausar" : "Reproduzir"}
          onClick={() => {
            if (playing) setPaused(true)
            else {
              setPaused(false)
              setUserPlayed(true)
            }
          }}
        >
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
