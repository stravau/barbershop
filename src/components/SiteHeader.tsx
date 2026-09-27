"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Wordmark } from "@/components/Wordmark"

const NAV = [
  { href: "/servicos", label: "Preços", className: "hidden min-[360px]:inline" },
  { href: "/#horario", label: "Horário", className: "hidden sm:inline" },
] as const

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          aria-label="Tarzan's Barbershop — início"
          className="flex items-center gap-2.5 text-[1.3rem] sm:gap-3 sm:text-[1.6rem]"
        >
          {/* Round crop into the illustration (the file has wide black margins) */}
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-black sm:h-12 sm:w-12">
            <Image
              src="/logo.jpeg"
              alt=""
              fill
              sizes="48px"
              priority
              className="origin-[50%_45%] scale-[1.4] object-cover"
            />
          </span>
          <Wordmark />
        </Link>

        <nav className="flex items-center gap-4 sm:gap-7">
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
          {pathname !== "/marcar" && (
            <Link href="/marcar" className="btn btn-sm">
              Marcar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
