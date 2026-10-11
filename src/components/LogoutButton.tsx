"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { NAV_DONE_EVENT, NAV_START_EVENT, SESSION_ENDED_EVENT } from "@/lib/nav-events"

/**
 * "Terminar sessão" that asks first. The button only opens the pop-up (a
 * click before the page is interactive does nothing); confirming signs out
 * and goes to the home page (or refreshes it, if already there), and tells
 * the top loading bar when it's done.
 */
export function LogoutButton({
  className,
  children,
  onLoggedOut,
}: {
  className?: string
  children: React.ReactNode
  /** Runs right before signing out (e.g. to update the header straight away) */
  onLoggedOut?: () => void
}) {
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  const [, startTransition] = useTransition()

  return (
    <>
      <button type="button" onClick={() => setAsking(true)} className={className}>
        {children}
      </button>
      <ConfirmDialog
        open={asking}
        title="Terminar sessão?"
        confirmLabel="Terminar sessão"
        danger
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          onLoggedOut?.()
          // Pages showing the client's bits drop them at once
          window.dispatchEvent(new Event(SESSION_ENDED_EVENT))
          window.dispatchEvent(new Event(NAV_START_EVENT))
          startTransition(async () => {
            await fetch("/api/conta/logout", { method: "POST" }).catch(() => {})
            if (window.location.pathname === "/") {
              // The page already dropped the client's bits: end the bar now and
              // let the refresh happen in the background
              window.dispatchEvent(new Event(NAV_DONE_EVENT))
              router.refresh()
            } else {
              router.push("/") // the URL change ends the bar
            }
          })
        }}
      >
        Vais sair da tua conta neste dispositivo. Para voltar a entrar, pedes um código novo por email.
      </ConfirmDialog>
    </>
  )
}
