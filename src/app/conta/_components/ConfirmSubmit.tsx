"use client"

import { useRef } from "react"

/**
 * A form whose button asks first. The button is type=button and submits only
 * after the confirm, so a click before hydration does nothing.
 */
export function ConfirmForm({
  action,
  warning,
  className,
  children,
}: {
  action: () => Promise<void>
  warning: string
  className?: string
  children: React.ReactNode
}) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action={action}>
      <button
        type="button"
        onClick={() => {
          if (window.confirm(warning)) formRef.current?.requestSubmit()
        }}
        className={className}
      >
        {children}
      </button>
    </form>
  )
}
