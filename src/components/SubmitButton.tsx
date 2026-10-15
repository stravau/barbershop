"use client"

import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"

/**
 * A form's button, disabled (showing `pendingText`) from the moment the form
 * is sent until the answer arrives, so a second tap — or Enter, which needs
 * an enabled button — can't send it again. Server-action forms: useFormStatus.
 * Plain POST forms (`native`): from the form's submit event until the next
 * page loads (or this one comes back from the back/forward cache).
 */
export function SubmitButton({
  type = "submit",
  onClick,
  pendingText,
  native,
  className,
  children,
}: {
  type?: "button" | "submit"
  onClick?: () => void
  /** Shown instead of the label while sending, e.g. "A entrar…" */
  pendingText?: string
  native?: boolean
  className?: string
  children: React.ReactNode
}) {
  const { pending } = useFormStatus()
  const [sent, setSent] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const form = ref.current?.form
    if (!native || !form) return
    const onSubmit = (e: SubmitEvent) => {
      if (!e.defaultPrevented) setSent(true)
    }
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setSent(false)
    }
    form.addEventListener("submit", onSubmit)
    window.addEventListener("pageshow", onShow)
    return () => {
      form.removeEventListener("submit", onSubmit)
      window.removeEventListener("pageshow", onShow)
    }
  }, [native])

  const busy = pending || sent
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className={`${className ?? ""} ${busy ? "cursor-wait opacity-70" : ""}`}
    >
      {busy && pendingText ? pendingText : children}
    </button>
  )
}
