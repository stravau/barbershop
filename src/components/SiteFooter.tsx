import Link from "next/link"
import { InstagramIcon } from "@/components/InstagramIcon"
import { Wordmark } from "@/components/Wordmark"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappUrl } from "@/lib/site"

export function SiteFooter() {
  const whatsapp = whatsappUrl()

  return (
    <footer className="bg-ink text-paper">
      <div className="h-1.5 bg-yellow" aria-hidden="true" />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark tone="inverted" className="text-[1.6rem]" />

        <ul className="caps flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.95rem]">
          <li>
            <Link href="/marcar" className="hover:text-yellow">
              Marcar corte
            </Link>
          </li>
          <li>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 hover:text-yellow"
            >
              <InstagramIcon className="h-5 w-5" /> @{INSTAGRAM_HANDLE}
            </a>
          </li>
          {whatsapp && (
            <li>
              <a href={whatsapp} target="_blank" rel="noopener" className="hover:text-yellow">
                WhatsApp
              </a>
            </li>
          )}
        </ul>
      </div>
      <div className="border-t border-paper/15">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-paper/50 sm:px-6">
          {`© ${new Date().getFullYear()} Tarzan's Barbershop · Setúbal & Lisboa`}
        </p>
      </div>
    </footer>
  )
}
