"use client"

import { useRef } from "react"
import { Trash2 } from "lucide-react"
import { deleteBooking } from "./actions"

/**
 * Deletes the booking after a confirmation — the client is not notified.
 * A plain button that submits only after the confirm, so a click before
 * hydration does nothing instead of deleting without asking.
 */
export function DeleteBookingButton({ id, token }: { id: string; token: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action={deleteBooking}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="token" value={token} />
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Apagar esta marcação? O cliente não é avisado e não dá para desfazer.")) {
            formRef.current?.requestSubmit()
          }
        }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-danger hover:underline"
      >
        <Trash2 className="h-4 w-4" /> Apagar marcação
      </button>
      <span className="ml-2 text-xs text-muted">sem avisar o cliente</span>
    </form>
  )
}
