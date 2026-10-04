"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AdminHeaderNav } from "@/components/AdminHeaderNav"
import { HeaderAccount, useHeaderSession } from "@/components/HeaderAccount"
import { InstagramIcon } from "@/components/InstagramIcon"
import { Wordmark } from "@/components/Wordmark"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site"

// A signed-in client's header also carries the account link and "Terminar
// sessão", so the other links need wider screens
const NAV = [
  { href: "/servicos", label: "Preços", className: "hidden min-[440px]:inline", signedIn: "hidden min-[420px]:inline" },
  { href: "/#horario", label: "Horário", className: "hidden sm:inline", signedIn: "hidden md:inline" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")
  const [session, setSession] = useHeaderSession(pathname)
  const signedIn = !isAdmin && !!session?.signedIn

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-3 sm:px-6">
        <Link
          href="/"
          aria-label="Tarzan's Barbershop — início"
          className="flex shrink-0 items-center gap-2 text-[1.15rem] sm:gap-3 sm:text-[1.6rem]"
        >
          {/* Round crop into the illustration (the file has wide black margins) */}
          <span className={`relative ${isAdmin ? "h-8 w-8" : "h-10 w-10"} shrink-0 overflow-hidden rounded-full border-2 border-ink bg-black sm:h-12 sm:w-12`}>
            <Image
              src="/logo.jpeg"
              alt=""
              fill
              sizes="48px"
              priority
              className="origin-[50%_45%] scale-[1.4] object-cover"
            />
          </span>
          {/* On admin pages (and for signed-in clients) the buttons need the room on phones */}
          <span className={isAdmin || signedIn ? "hidden sm:inline-flex" : "inline-flex"}>
            <Wordmark />
          </span>
        </Link>

        {isAdmin ? (
          !pathname.startsWith("/admin/login") && <AdminHeaderNav pathname={pathname} />
        ) : (
        <nav className="flex items-center gap-3 sm:gap-6">
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
            onLogout={() => setSession({ signedIn: false })}
          />
        </nav>
        )}
      </div>
    </header>
  )
}
