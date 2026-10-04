import { Resend } from "resend"
import { mapsUrl } from "./addresses"
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, getSiteUrl, whatsappUrl } from "./site"

export { getSiteUrl }

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Tarzan's Barbershop <onboarding@resend.dev>"

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? "tarzans.barbershop@gmail.com"

interface SendOptions {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail(
  opts: SendOptions,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[email] No RESEND_API_KEY — skipping send to", opts.to)
    return { ok: false, error: "Email not configured" }
  }
  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    })
    if (result.error) {
      console.error("[email] Resend error:", result.error)
      return { ok: false, error: result.error.message }
    }
    return { ok: true, id: result.data?.id }
  } catch (e) {
    console.error("[email] Send failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Unknown" }
  }
}

// ---------- helpers ----------

/** Format Date for Google Calendar URL (YYYYMMDDTHHmmssZ) */
function gcalDateString(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function gcalAddUrl(opts: {
  title: string
  start: Date
  end: Date
  details: string
  location: string
}): string {
  const dates = `${gcalDateString(opts.start)}/${gcalDateString(opts.end)}`
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates,
    details: opts.details,
    location: opts.location,
  })
  return `https://www.google.com/calendar/render?${params.toString()}`
}

function priceFormat(p: number): string {
  return p.toFixed(2).replace(".", ",") + " €"
}

function escape(s: string | null | undefined): string {
  if (!s) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// ---------- brand pieces (inline styles — email clients ignore <style>) ----------

const INK = "#1a1712"
const PAPER = "#f2eadb"
const CARD = "#fbf7ee"
const YELLOW = "#f5c518"
const MUTED = "#6b6152"
const DANGER = "#b42318"

const SLAB = "Rockwell,'Roboto Slab','Arial Black',Georgia,serif"

const baseStyle = `margin:0;padding:24px 12px;background:${PAPER};font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};`

const headerHtml = `<div style="background:${INK};padding:22px 24px 18px;border-radius:8px 8px 0 0;border-bottom:6px solid ${YELLOW};">
  <div style="font-family:${SLAB};font-weight:900;font-size:30px;line-height:1;color:${YELLOW};">TARZAN'S</div>
  <div style="font-family:Georgia,serif;font-style:italic;font-size:17px;color:${PAPER};margin:2px 0 0 34px;">Barbershop</div>
</div>`

const cardStyle = `background:${CARD};padding:28px;border:2px solid ${INK};border-top:0;border-radius:0 0 8px 8px;`

const footerHtml = `<div style="text-align:center;color:${MUTED};font-size:12px;margin-top:16px;line-height:1.6;">
  Tarzan's Barbershop · Setúbal &amp; Lisboa<br>
  <a href="${INSTAGRAM_URL}" style="color:${MUTED};">@${INSTAGRAM_HANDLE}</a>
</div>`

function button(href: string, label: string, kind: "primary" | "ghost" | "danger" = "primary"): string {
  const look =
    kind === "primary"
      ? `background:${YELLOW};color:${INK};border:2px solid ${INK};`
      : kind === "ghost"
        ? `background:transparent;color:${INK};border:2px solid ${INK};`
        : `background:transparent;color:${DANGER};border:2px solid ${DANGER};`
  return `<a href="${href}" target="_blank" style="display:inline-block;${look}text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.03em;margin:4px;">${label}</a>`
}

/**
 * "Falar no WhatsApp" button if NEXT_PUBLIC_SHOP_PHONE is configured, else
 * an empty string — callers can interpolate unconditionally.
 */
function whatsappButtonHtml(prefilledMessage?: string): string {
  const url = whatsappUrl(prefilledMessage)
  if (!url) return ""
  return `<a href="${url}" target="_blank" style="display:inline-block;background:#25D366;color:${INK};border:2px solid ${INK};text-decoration:none;padding:11px 22px;border-radius:6px;font-weight:700;font-size:14px;margin:4px;">Falar no WhatsApp</a>`
}

function detailRow(label: string, valueHtml: string): string {
  return `<tr><td style="padding:7px 0;color:${MUTED};width:32%;vertical-align:top;">${label}</td><td style="padding:7px 0;font-weight:600;">${valueHtml}</td></tr>`
}

/** Street address when known, otherwise just the city. */
function whereRow(booking: BookingForEmail): string {
  return booking.address
    ? detailRow("Morada", `${escape(booking.address)}, ${booking.location}`)
    : detailRow("Cidade", booking.location)
}

// ---------- Email templates ----------

export interface BookingForEmail {
  id: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  serviceName: string
  durationMin: number
  priceEur: number
  /** Pretty location name, e.g. "Lisboa" */
  location: string
  /** Street address (see lib/addresses.ts). Only pass it for confirmed bookings. */
  address?: string | null
  /** Pretty datetime string, e.g. "segunda, 12 de maio às 14:00" */
  whenLocal: string
  /** Booking start in UTC — used for Google Calendar URL */
  startUtc: Date
  /** Booking end in UTC */
  endUtc: Date
  notes?: string | null
  adminToken: string
  clientToken: string
}

/** Email sent to barber when a customer creates a new booking (PENDING) */
export function adminBookingEmail(booking: BookingForEmail): {
  subject: string
  html: string
} {
  const site = getSiteUrl()
  const confirmUrl = `${site}/api/admin/bookings/${booking.id}/confirm?token=${booking.adminToken}`
  const rejectUrl = `${site}/api/admin/bookings/${booking.id}/reject?token=${booking.adminToken}`

  const subject = `Nova marcação pendente: ${booking.serviceName}, ${booking.whenLocal}`
  const html = `<!DOCTYPE html>
<html><body style="${baseStyle}">
  <div style="max-width:600px;margin:0 auto;">
    ${headerHtml}
    <div style="${cardStyle}">
      <div style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:6px;">Nova marcação pendente</div>
      <h2 style="margin:0 0 16px 0;font-family:${SLAB};font-weight:900;">${booking.serviceName}</h2>

      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${detailRow("Quando", booking.whenLocal)}
        ${detailRow("Cidade", booking.location)}
        ${detailRow("Duração", `${booking.durationMin} minutos`)}
        ${detailRow("Preço", priceFormat(booking.priceEur))}
        <tr><td colspan="2"><div style="border-top:1px solid #d2c4a9;margin:8px 0;"></div></td></tr>
        ${detailRow("Cliente", escape(booking.clientName))}
        ${detailRow("Telefone", `<a href="tel:+${booking.clientPhone}" style="color:${INK};">+${booking.clientPhone}</a>`)}
        ${booking.clientEmail ? detailRow("Email", `<a href="mailto:${escape(booking.clientEmail)}" style="color:${INK};">${escape(booking.clientEmail)}</a>`) : ""}
        ${booking.notes ? detailRow("Notas", `<em>${escape(booking.notes)}</em>`) : ""}
      </table>

      <div style="margin-top:28px;text-align:center;">
        <a href="${confirmUrl}" style="display:inline-block;background:#2f7a3e;color:white;border:2px solid ${INK};text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;letter-spacing:0.05em;margin:4px;">CONFIRMAR</a>
        <a href="${rejectUrl}" style="display:inline-block;background:${DANGER};color:white;border:2px solid ${INK};text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;letter-spacing:0.05em;margin:4px;">CANCELAR</a>
      </div>

      <p style="font-size:11px;color:${MUTED};text-align:center;margin:20px 0 0;">Booking ID: ${booking.id}</p>
    </div>
  </div>
</body></html>`
  return { subject, html }
}

/**
 * Email sent to the customer right after they create a booking (status PENDING).
 * Tells them the barber reviews every booking personally and gives them a
 * way to track its status (private link) or follow up directly (WhatsApp).
 */
export function clientReceivedEmail(booking: BookingForEmail): {
  subject: string
  html: string
} {
  const site = getSiteUrl()
  const statusUrl = `${site}/marcacao/${booking.id}?token=${booking.clientToken}`
  const waMessage = `Olá! Fiz uma marcação para ${booking.serviceName} no dia ${booking.whenLocal}, em ${booking.location}. Obrigado!`
  const waButton = whatsappButtonHtml(waMessage)

  const subject = `Tarzan's Barbershop: recebemos o teu pedido`
  const html = `<!DOCTYPE html>
<html><body style="${baseStyle}">
  <div style="max-width:600px;margin:0 auto;">
    ${headerHtml}
    <div style="${cardStyle}">
      <p style="margin:0 0 12px 0;font-size:16px;">Olá, <strong>${escape(booking.clientName)}</strong>!</p>
      <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">Recebemos o teu pedido de marcação. Assim que for confirmado (costuma demorar poucas horas), recebes outro email com a confirmação e a localização.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
        ${detailRow("Serviço", booking.serviceName)}
        ${detailRow("Quando", booking.whenLocal)}
        ${detailRow("Cidade", booking.location)}
        ${detailRow("Duração", `${booking.durationMin} min`)}
        ${detailRow("Preço", `${priceFormat(booking.priceEur)} · pagas no fim`)}
      </table>

      <p style="margin:0 0 8px 0;font-size:14px;color:${MUTED};">Estado: <strong style="background:${YELLOW};color:${INK};padding:2px 8px;border-radius:10px;">PENDENTE</strong></p>

      <div style="text-align:center;margin-top:24px;">
        ${button(statusUrl, "Ver estado da marcação", "ghost")}
        ${waButton ? `<br>${waButton}` : ""}
      </div>

      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #d2c4a9;font-size:12px;color:${MUTED};line-height:1.6;">
        Guarda este email. O link acima mostra o estado da marcação a qualquer altura. Se este email foi parar ao spam, marca-o como &ldquo;não é spam&rdquo; para receberes a confirmação.
      </div>
    </div>
    ${footerHtml}
  </div>
</body></html>`
  return { subject, html }
}

/** Email sent to the customer once the barber has confirmed */
export function clientConfirmedEmail(booking: BookingForEmail): {
  subject: string
  html: string
} {
  const site = getSiteUrl()
  const cancelUrl = `${site}/api/bookings/${booking.id}/cancel?token=${booking.clientToken}`
  const gcalUrl = calendarUrl(booking)
  const map = booking.address ? mapsUrl(booking.address, booking.location) : null

  const subject = `Tarzan's Barbershop: marcação confirmada`
  const html = `<!DOCTYPE html>
<html><body style="${baseStyle}">
  <div style="max-width:600px;margin:0 auto;">
    ${headerHtml}
    <div style="${cardStyle}">
      <p style="margin:0 0 12px 0;font-size:16px;">Olá, <strong>${escape(booking.clientName)}</strong>!</p>
      <p style="margin:0 0 4px 0;font-family:${SLAB};font-weight:900;font-size:24px;">Está marcado!</p>
      <p style="margin:0 0 12px 0;font-size:16px;">A tua marcação está confirmada. Até breve!</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
        ${detailRow("Quando", booking.whenLocal)}
        ${detailRow("Serviço", `${booking.serviceName} (${booking.durationMin} min)`)}
        ${whereRow(booking)}
        ${detailRow("Pagamento", `${priceFormat(booking.priceEur)} no fim, em MB WAY ou dinheiro`)}
      </table>

      <div style="text-align:center;">
        ${map ? button(map, "Abrir no Google Maps") : ""}
        ${button(gcalUrl, "Adicionar ao calendário", "ghost")}
        ${whatsappButtonHtml() ? `<br>${whatsappButtonHtml()}` : ""}
        <br>
        ${button(cancelUrl, "Cancelar marcação", "danger")}
      </div>

      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #d2c4a9;font-size:12px;color:${MUTED};line-height:1.6;">
        Se não puderes vir, cancela com pelo menos 12 horas de antecedência.
        Com mais de 20 minutos de atraso, a marcação pode ser cancelada para não prejudicar os clientes seguintes.
      </div>
    </div>
    ${footerHtml}
  </div>
</body></html>`
  return { subject, html }
}

/** Reminder sent ~24h before a confirmed booking */
export function clientReminderEmail(booking: BookingForEmail): {
  subject: string
  html: string
} {
  const site = getSiteUrl()
  const cancelUrl = `${site}/api/bookings/${booking.id}/cancel?token=${booking.clientToken}`
  const gcalUrl = calendarUrl(booking)
  const map = booking.address ? mapsUrl(booking.address, booking.location) : null

  const subject = `Lembrete: tens marcação amanhã na Tarzan's Barbershop`
  const html = `<!DOCTYPE html>
<html><body style="${baseStyle}">
  <div style="max-width:600px;margin:0 auto;">
    ${headerHtml}
    <div style="${cardStyle}">
      <p style="margin:0 0 12px 0;font-size:16px;">Olá, <strong>${escape(booking.clientName)}</strong>!</p>
      <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">Só para lembrar: tens marcação daqui a cerca de <strong>24 horas</strong>.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0;">
        ${detailRow("Quando", booking.whenLocal)}
        ${detailRow("Serviço", `${booking.serviceName} (${booking.durationMin} min)`)}
        ${whereRow(booking)}
      </table>

      <div style="text-align:center;">
        ${map ? button(map, "Abrir no Google Maps") : ""}
        ${button(gcalUrl, "Adicionar ao calendário", "ghost")}
        ${whatsappButtonHtml() ? `<br>${whatsappButtonHtml()}` : ""}
        <br>
        ${button(cancelUrl, "Cancelar marcação", "danger")}
      </div>

      <div style="margin-top:24px;padding-top:18px;border-top:1px solid #d2c4a9;font-size:12px;color:${MUTED};line-height:1.6;">
        Se já não puderes vir, cancela agora pelo botão acima. Assim outra pessoa pode ficar com a hora.
      </div>
    </div>
    ${footerHtml}
  </div>
</body></html>`
  return { subject, html }
}

function calendarUrl(booking: BookingForEmail): string {
  return gcalAddUrl({
    title: `Tarzan's Barbershop: ${booking.serviceName}`,
    start: booking.startUtc,
    end: booking.endUtc,
    details: `${booking.serviceName} (${booking.durationMin} min · ${priceFormat(booking.priceEur)})\nID: ${booking.id}`,
    location: booking.address
      ? `${booking.address}, ${booking.location}`
      : booking.location,
  })
}

/** Email sent when the barber cancels a booking */
export function clientCancelledEmail(booking: BookingForEmail): {
  subject: string
  html: string
} {
  const site = getSiteUrl()
  const subject = `Tarzan's Barbershop: marcação cancelada`
  const html = `<!DOCTYPE html>
<html><body style="${baseStyle}">
  <div style="max-width:600px;margin:0 auto;">
    ${headerHtml}
    <div style="${cardStyle}">
      <p style="margin:0 0 12px 0;font-size:16px;">Olá, <strong>${escape(booking.clientName)}</strong>.</p>
      <p style="margin:0 0 12px 0;font-size:16px;line-height:1.5;">Infelizmente, esta marcação foi cancelada:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
        ${detailRow("Serviço", booking.serviceName)}
        ${detailRow("Quando", booking.whenLocal)}
        ${detailRow("Cidade", booking.location)}
      </table>
      <p style="margin:0 0 20px 0;font-size:16px;line-height:1.5;">Desculpa o incómodo! Podes escolher outra hora no site.</p>
      <div style="text-align:center;">
        ${button(`${site}/marcar`, "Marcar outra hora")}
        ${whatsappButtonHtml() ? `<br>${whatsappButtonHtml()}` : ""}
      </div>
    </div>
    ${footerHtml}
  </div>
</body></html>`
  return { subject, html }
}

/** Email sent to admin when the customer cancels via the email link */
export function adminCancelledByClientEmail(booking: BookingForEmail): {
  subject: string
  html: string
} {
  const subject = `Cliente cancelou: ${booking.serviceName}, ${booking.whenLocal}`
  const html = `<!DOCTYPE html>
<html><body style="${baseStyle}">
  <div style="max-width:600px;margin:0 auto;">
    ${headerHtml}
    <div style="${cardStyle}">
      <h2 style="margin:0 0 16px 0;font-family:${SLAB};font-weight:900;color:${DANGER};">Cliente cancelou marcação</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${detailRow("Cliente", escape(booking.clientName))}
        ${detailRow("Telefone", `+${booking.clientPhone}`)}
        ${detailRow("Serviço", booking.serviceName)}
        ${detailRow("Quando", booking.whenLocal)}
        ${detailRow("Cidade", booking.location)}
      </table>
      <p style="font-size:12px;color:${MUTED};margin:16px 0 0;">O slot ficou novamente disponível para outras marcações.</p>
    </div>
  </div>
</body></html>`
  return { subject, html }
}
