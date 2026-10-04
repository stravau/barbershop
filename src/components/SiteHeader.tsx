"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AdminHeaderNav } from "@/components/AdminHeaderNav"
import { InstagramIcon } from "@/components/InstagramIcon"
import { Wordmark } from "@/components/Wordmark"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site"

const NAV = [
  { href: "/servicos", label: "Preços", className: "hidden min-[380px]:inline" },
  { href: "/#horario", label: "Horário", className: "hidden sm:inline" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith("/admin")

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
          {/* On admin pages the tabs need the room on phones */}
          <span className={isAdmin ? "hidden sm:inline-flex" : "inline-flex"}>
            <Wordmark />
          </span>
        </Link>

        {isAdmin ? (
          pathname !== "/admin/login" && <AdminHeaderNav pathname={pathname} />
        ) : (
        <nav className="flex items-center gap-3 sm:gap-6">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link caps text-[0.95rem] ${item.className}`}
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
            className="grid h-9 w-9 place-items-center rounded-md transition hover:bg-paper-dark"
          >
            <InstagramIcon className="h-6 w-6" />
          </a>
          {pathname !== "/marcar" && (
            <Link href="/marcar" className="btn btn-sm">
              Marcar
            </Link>
          )}
        </nav>
        )}
      </div>
    </header>
  )
}
