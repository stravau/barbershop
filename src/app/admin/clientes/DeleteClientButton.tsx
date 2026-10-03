"use client"

import { useRef } from "react"
import { Trash2 } from "lucide-react"
import { deleteClient } from "./actions"

/**
 * Trash button for a client row; asks first, since bookings go too. It's a
 * plain button that submits only after the confirm, so a click before the
 * page has hydrated does nothing instead of deleting without asking.
 */
export function DeleteClientButton({
  id,
  name,
  bookingCount,
}: {
  id: string
  name: string
  bookingCount: number
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const warning =
    bookingCount > 0
      ? `Apagar ${name} e ${bookingCount === 1 ? "a marcação" : `as ${bookingCount} marcações`} dele? Não dá para desfazer.`
      : `Apagar ${name}? Não dá para desfazer.`

  return (
    <form ref={formRef} action={deleteClient} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        onClick={() => {
          if (window.confirm(warning)) formRef.current?.requestSubmit()
        }}
        title="Apagar cliente"
        aria-label={`Apagar ${name}`}
        className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  )
}
