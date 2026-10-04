"use client"

import { useCallback, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { AdminHeaderNav } from "@/components/AdminHeaderNav"
import { ClientMenu } from "@/components/ClientMenu"
import { HeaderAccount, useHeaderSession } from "@/components/HeaderAccount"
import { InstagramIcon } from "@/components/InstagramIcon"
import { Wordmark } from "@/components/Wordmark"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site"

// Signed-in clients get these from md up; on phones they're in ClientMenu
const NAV = [
  { href: "/servicos", label: "Preços", className: "hidden min-[450px]:inline", signedIn: "inline" },
  { href: "/#horario", label: "Horário", className: "hidden sm:inline", signedIn: "inline" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")
  const [session, setSession] = useHeaderSession(pathname)
  const signedIn = !isAdmin && !!session?.signedIn
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const logoutDone = useCallback(() => setSession({ signedIn: false }), [setSession])

  // A navigation (e.g. the browser's back button) closes the menu
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 min-[360px]:px-4 sm:gap-3 sm:px-6">
        {/* In the admin the logo goes back to the agenda */}
        <Link
          href={isAdmin ? "/admin" : "/"}
          aria-label={isAdmin ? "Tarzan's Barbershop — agenda" : "Tarzan's Barbershop — início"}
          // Signed-in client on a phone: menu on the left, logo on the right
          className={`flex shrink-0 items-center gap-2 text-[1.15rem] sm:gap-3 sm:text-[1.6rem] ${signedIn ? "max-md:order-last" : ""}`}
        >
          {/* The logo cut out of its black background (public/logo-mark.png) */}
          <Image
            src="/logo-mark.png"
            alt=""
            width={600}
            height={471}
            sizes="64px"
            priority
            className={`${isAdmin ? "h-8" : "h-9 min-[360px]:h-10"} w-auto shrink-0 sm:h-12`}
          />
          {/* On admin pages (and for signed-in clients) the buttons need the room on phones */}
          <span className={isAdmin ? "hidden lg:inline-flex" : signedIn ? "hidden md:inline-flex" : "inline-flex"}>
            <Wordmark />
          </span>
        </Link>

        {isAdmin ? (
          !pathname.startsWith("/admin/login") && <AdminHeaderNav pathname={pathname} />
        ) : (
        <>
        {signedIn && session?.signedIn && (
          <>
            {/* Phones: menu button left, greeting in the middle, logo right.
                The button's box is as wide as the logo so the greeting is centred. */}
            <p className="font-display min-w-0 flex-1 truncate text-center text-lg md:hidden">
              Olá, {session.name.split(" ")[0]}!
            </p>
            <div className="order-first flex w-[51px] shrink-0 justify-start md:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
                className="grid h-10 w-10 place-items-center rounded-md border-2 border-ink bg-yellow shadow-[2px_2px_0_var(--ink)] transition active:translate-x-px active:translate-y-px active:shadow-none"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
            <ClientMenu
              open={menuOpen}
              onClose={closeMenu}
              name={session.name}
              pathname={pathname}
              onLogout={logoutDone}
            />
          </>
        )}
        <nav className={`items-center gap-3 sm:gap-6 ${signedIn ? "hidden md:flex" : "flex"}`}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link caps text-[0.95rem] ${signedIn ? item.signedIn : item.className}`}
              data-active={pathname === item.href}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener"
            aria-label={`Instagram @${INSTAGRAM_HANDLE}`}
            title={`Segue-nos no Instagram @${INSTAGRAM_HANDLE}`}
            className="hidden h-9 w-9 place-items-center rounded-md transition hover:bg-paper-dark min-[380px]:grid"
          >
            <InstagramIcon className="h-6 w-6" />
          </a>
          <HeaderAccount
            pathname={pathname}
            session={isAdmin ? null : session}
            onLogout={logoutDone}
          />
        </nav>
        </>
        )}
      </div>
    </header>
  )
}
