"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { UserRound } from "lucide-react"
import { LogoutButton } from "@/components/LogoutButton"
import { SignupHint, retireSignupHint } from "@/components/SignupHint"

export type HeaderSession = { signedIn: false } | { signedIn: true; name: string }

/** Who's signed in (null while loading); re-checked on every navigation. */
export function useHeaderSession(pathname: string) {
  const [session, setSession] = useState<HeaderSession | null>(null)
  useEffect(() => {
    let live = true
    fetch("/api/conta/sessao", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: HeaderSession) => {
        // Someone who has signed in here doesn't need the sign-up hint again
        if (s.signedIn) retireSignupHint()
        if (live) setSession(s)
      })
      .catch(() => live && setSession({ signedIn: false }))
    return () => {
      live = false
    }
  }, [pathname])
  return [session, setSession] as const
}

/** Header corner: "Login/Registar", or the account link + "Terminar sessão". */
export function HeaderAccount({
  pathname,
  session,
  onLogout,
}: {
  pathname: string
  session: HeaderSession | null
  onLogout: () => void
}) {
  // Reserve the room while loading so the header doesn't jump
  if (!session) return <span className="btn btn-sm invisible" aria-hidden="true">Login/Registar</span>

  if (!session.signedIn) {
    return pathname.startsWith("/conta/entrar") ? null : (
      <span className="relative">
        <Link href="/conta/entrar" onClick={retireSignupHint} className="btn btn-sm whitespace-nowrap">
          Login/Registar
        </Link>
        <SignupHint />
      </span>
    )
  }

  return (
    <>
      <Link
        href="/conta"
        aria-label={`A minha conta (${session.name})`}
        title="A minha conta"
        data-active={pathname.startsWith("/conta")}
        className="nav-link caps flex items-center gap-1.5 text-[0.95rem]"
      >
        <UserRound className="h-5 w-5" aria-hidden="true" />
        <span className="hidden lg:inline">Conta</span>
      </Link>
      <LogoutButton onLoggedOut={onLogout} className="btn btn-sm whitespace-nowrap">
        Terminar sessão
      </LogoutButton>
    </>
  )
}
