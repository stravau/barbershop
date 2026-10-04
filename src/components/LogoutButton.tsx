"use client"

import { useRef, useState } from "react"
import { logout } from "@/app/conta/actions"
import { ConfirmDialog } from "@/components/ConfirmDialog"

/**
 * "Terminar sessão" that asks first. The button only opens the pop-up (a
 * click before the page is interactive does nothing); confirming submits.
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
  const formRef = useRef<HTMLFormElement>(null)
  const [asking, setAsking] = useState(false)

  return (
    <>
      <form ref={formRef} action={logout}>
        <button type="button" onClick={() => setAsking(true)} className={className}>
          {children}
        </button>
      </form>
      <ConfirmDialog
        open={asking}
        title="Terminar sessão?"
        confirmLabel="Terminar sessão"
        danger
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          onLoggedOut?.()
          formRef.current?.requestSubmit()
        }}
      >
        Vais sair da tua conta neste dispositivo. Para voltar a entrar, pedes um código novo por email.
      </ConfirmDialog>
    </>
  )
}
