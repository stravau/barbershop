"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { CalendarPlus, Clock, LogOut, Tag, UserRound, X } from "lucide-react"
import { InstagramIcon } from "@/components/InstagramIcon"
import { logout } from "@/app/conta/actions"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

const PRIMARY = [
  { href: "/conta", label: "A minha conta", icon: UserRound, match: (p: string) => p.startsWith("/conta") },
  { href: "/marcar", label: "Fazer marcação", icon: CalendarPlus, match: (p: string) => p === "/marcar" },
]
const SECONDARY = [
  { href: "/servicos", label: "Preços", icon: Tag, match: (p: string) => p === "/servicos" },
  { href: "/#horario", label: "Horário", icon: Clock, match: () => false },
]

/**
 * Phone menu for a signed-in client: a panel that slides in from the right.
 * Account and booking on top, site info below, Instagram and "Terminar
 * sessão" at the bottom. Closes on a link, the backdrop, Esc or navigation.
 */
export function ClientMenu({
  open,
  onClose,
  name,
  pathname,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  name: string
  pathname: string
  onLogout: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Esc closes; the page behind doesn't scroll while it's open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = "hidden"
    closeRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.documentElement.style.overflow = overflow
    }
  }, [open, onClose])

  // Only ever rendered in the browser (after the session check), but be safe
  if (typeof document === "undefined") return null

  // Items slide in one after the other
  let i = 0
  const item = () => ({
    className: cn(
      "transition duration-300 ease-out motion-reduce:transition-none",
      open ? "translate-x-0 opacity-100" : "translate-x-6 opacity-0",
    ),
    style: { transitionDelay: open ? `${80 + i++ * 40}ms` : "0ms" },
  })

  const row = "flex items-center gap-3 rounded-md px-3 py-3 transition hover:bg-paper-dark"

  return createPortal(
    <div className={cn("fixed inset-0 z-50 md:hidden", !open && "pointer-events-none")} inert={!open}>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/50 transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Área de cliente"
        className={cn(
          "absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l-2 border-ink bg-paper shadow-[-6px_0_0_var(--ink)] transition-transform duration-300 ease-out motion-reduce:transition-none",
          open ? "translate-x-0" : "translate-x-[calc(100%+8px)]",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-5 py-4">
          <div className="min-w-0">
            <p className="caps text-xs text-muted">Área de cliente</p>
            <p className="font-display truncate text-xl">{name}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md transition hover:bg-paper-dark"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {PRIMARY.map((l) => (
              <li key={l.href} {...item()}>
                <Link
                  href={l.href}
                  onClick={onClose}
                  aria-current={l.match(pathname) ? "page" : undefined}
                  className={cn(row, "font-display text-xl", l.match(pathname) && "bg-yellow hover:bg-yellow")}
                >
                  <l.icon className="h-5 w-5" aria-hidden="true" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <ul className="mt-4 space-y-1 border-t-2 border-ink/15 pt-4">
            {SECONDARY.map((l) => (
              <li key={l.href} {...item()}>
                <Link
                  href={l.href}
                  onClick={onClose}
                  aria-current={l.match(pathname) ? "page" : undefined}
                  className={cn(row, "caps text-[0.95rem]", l.match(pathname) && "bg-paper-dark")}
                >
                  <l.icon className="h-5 w-5 text-muted" aria-hidden="true" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-auto space-y-1 border-t-2 border-ink/15 pt-4">
            <div {...item()}>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className={cn(row, "text-[0.95rem]")}>
                <InstagramIcon className="h-5 w-5" />@{INSTAGRAM_HANDLE}
              </a>
            </div>
            <form
              {...item()}
              action={logout}
              onSubmit={() => {
                onLogout()
                onClose()
              }}
            >
              <button type="submit" className={cn(row, "w-full text-[0.95rem] font-semibold text-danger")}>
                <LogOut className="h-5 w-5" aria-hidden="true" />
                Terminar sessão
              </button>
            </form>
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  )
}
