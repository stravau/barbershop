"use client"

import { useEffect, useRef } from "react"

/**
 * "Are you sure?" pop-up in the site's style, on the native <dialog> (focus
 * stays inside, Esc and a click outside cancel).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> itself
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border-2 border-ink bg-paper p-0 text-left text-ink shadow-[6px_6px_0_var(--ink)] backdrop:bg-ink/50 open:animate-[dialog-in_.2s_ease-out] motion-reduce:animate-none"
    >
      <div className="p-5">
        <h2 className="text-2xl">{title}</h2>
        <div className="mt-2 text-ink/80">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            {cancelLabel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={danger ? "btn btn-sm border-ink bg-danger text-paper" : "btn btn-sm"}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
