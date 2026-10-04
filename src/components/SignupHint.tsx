"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"

const KEY = "tarzans-signup-hint"

/** Remembers that this browser no longer needs the hint (dismissed or signed in). */
export function retireSignupHint() {
  try {
    localStorage.setItem(KEY, "done")
  } catch {}
}

/**
 * Speech bubble under the header's "Login/Registar" button, pointing at it,
 * for visitors who haven't signed in on this browser. Appears shortly after
 * the page loads; gone for good once closed or used.
 */
export function SignupHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(KEY) === "done"
    } catch {}
    if (seen) return
    const timer = setTimeout(() => setShow(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  const close = () => {
    retireSignupHint()
    setShow(false)
  }

  return (
    <div
      role="status"
      className="absolute top-full right-0 z-40 mt-3.5 w-max max-w-[calc(100vw-2rem)] animate-[hint-in_.35s_ease-out,hint-bob_2.4s_ease-in-out_.35s_infinite] motion-reduce:animate-none"
    >
      <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-yellow py-2 pr-1.5 pl-3.5 shadow-[3px_3px_0_var(--ink)]">
        <p className="text-sm leading-snug">
          É a tua primeira vez?{" "}
          <Link href="/conta/entrar" onClick={close} className="font-bold underline underline-offset-2">
            Regista-te aqui!
          </Link>
        </p>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md transition hover:bg-ink/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Arrow pointing up at the button (drawn over the bubble's top border) */}
      <span
        aria-hidden="true"
        className="absolute -top-[7px] right-12 h-3 w-3 rotate-45 border-t-2 border-l-2 border-ink bg-yellow"
      />
    </div>
  )
}
