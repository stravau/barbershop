import Link from "next/link"
import { Wordmark } from "@/components/Wordmark"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappUrl } from "@/lib/site"

export function SiteFooter() {
  const whatsapp = whatsappUrl()

  return (
    <footer className="bg-ink text-paper">
      <div className="h-1.5 bg-yellow" aria-hidden="true" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6">
        <div>
          <Wordmark tone="inverted" className="text-[1.9rem]" />
          <p className="mt-4 max-w-sm text-sm text-paper/70">
            Barbeiro independente. Setúbal durante a semana, Lisboa à sexta e
            ao sábado.
          </p>
        </div>

        <ul className="caps flex flex-col gap-2 text-[0.95rem] sm:items-end">
          <li>
            <Link href="/marcar" className="hover:text-yellow">
              Marcar corte
            </Link>
          </li>
          <li>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener" className="hover:text-yellow">
              Instagram · @{INSTAGRAM_HANDLE}
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
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-paper/50 sm:px-6">
          {`© ${new Date().getFullYear()} Tarzan's Barbershop · Setúbal & Lisboa`}
        </p>
      </div>
    </footer>
  )
}
