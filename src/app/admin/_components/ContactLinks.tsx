import { MessageCircle, Phone } from "lucide-react"
import { hasPhone, whatsappHref } from "../_lib"

/** "351912345678" -> "+351 912 345 678" (other formats are shown as given). */
export function formatPhone(phone: string): string {
  const m = phone.match(/^351(\d{3})(\d{3})(\d{3})$/)
  return m ? `+351 ${m[1]} ${m[2]} ${m[3]}` : `+${phone}`
}

/** WhatsApp + call links for a client's phone. */
export function ContactLinks({ phone, showNumber }: { phone: string; showNumber?: boolean }) {
  if (!hasPhone(phone)) {
    return showNumber ? <span className="text-sm text-muted">sem telefone</span> : null
  }
  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={whatsappHref(phone)}
        target="_blank"
        rel="noopener"
        title="WhatsApp"
        aria-label="Abrir no WhatsApp"
        className="grid h-8 w-8 place-items-center rounded-md text-muted transition hover:bg-paper-dark hover:text-ink"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <a
        href={`tel:+${phone}`}
        title="Ligar"
        aria-label="Ligar"
        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-muted transition hover:bg-paper-dark hover:text-ink"
      >
        <Phone className="h-4 w-4" />
        {showNumber && <span className="text-sm tabular-nums">{formatPhone(phone)}</span>}
      </a>
    </span>
  )
}
