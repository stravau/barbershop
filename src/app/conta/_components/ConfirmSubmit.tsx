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

/** A link (e.g. the cancel route) that asks first. */
export function ConfirmLink({
  href,
  warning,
  className,
  children,
}: {
  href: string
  warning: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (!window.confirm(warning)) e.preventDefault()
      }}
      className={className}
    >
      {children}
    </a>
  )
}
