"use client"

import { useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { ConfirmDialog } from "./ConfirmDialog"

export interface ActionConfirm {
  title: string
  body: React.ReactNode
  confirmLabel: string
  /** Label of the button that closes the dialog without doing anything. */
  cancelLabel?: string
  danger?: boolean
}

/**
 * One button that runs a server action (a POST — never a link, so email
 * scanners and link prefetching can't trigger it). With `confirm`, the
 * button first opens a "tens a certeza?" dialog; it is then type=button, so
 * a tap before the page has hydrated does nothing.
 */
export function ActionForm({
  action,
  fields,
  confirm,
  className,
  children,
}: {
  action: (form: FormData) => Promise<void>
  fields: Record<string, string>
  confirm?: ActionConfirm
  className?: string
  children: React.ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [asking, setAsking] = useState(false)

  return (
    <form ref={formRef} action={action} className="contents">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton
        type={confirm ? "button" : "submit"}
        onClick={confirm ? () => setAsking(true) : undefined}
        className={className}
      >
        {children}
      </SubmitButton>
      {confirm && (
        <ConfirmDialog
          open={asking}
          title={confirm.title}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel ?? "Voltar"}
          danger={confirm.danger}
          onClose={() => setAsking(false)}
          onConfirm={() => {
            setAsking(false)
            formRef.current?.requestSubmit()
          }}
        >
          {confirm.body}
        </ConfirmDialog>
      )}
    </form>
  )
}

/** Disabled while the action runs, so a double tap sends it once. */
function SubmitButton({
  type,
  onClick,
  className,
  children,
}: {
  type: "button" | "submit"
  onClick?: () => void
  className?: string
  children: React.ReactNode
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} ${pending ? "cursor-wait opacity-70" : ""}`}
    >
      {children}
    </button>
  )
}
