import { toE164, toWhatsApp } from '../src/engine/notify.js'

export type SendOutcome = { ok: true; id: string | null; dryRun: boolean } | { ok: false; error: string }

const GRAPH = 'https://graph.facebook.com/v21.0'

async function post(to: string, text: string, token: string, phoneId: string): Promise<SendOutcome> {
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string }; messages?: { id: string }[] }
  if (!res.ok) return { ok: false, error: body.error?.message ?? `Meta HTTP ${res.status}` }
  return { ok: true, id: body.messages?.[0]?.id ?? null, dryRun: false }
}

/**
 * Envoie un message texte WhatsApp. Sans jeton configuré : « dry run », le texte part dans les logs.
 * Les comptes béninois existent sous l'ancien format à 8 chiffres ; en cas d'échec on retente
 * avec la forme à 10 chiffres, pour les comptes créés après la réforme.
 */
export async function sendText(phone: string, text: string): Promise<SendOutcome> {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env
  const short = toWhatsApp(phone)
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[dry-run whatsapp] -> ${short}: ${text}`)
    return { ok: true, id: null, dryRun: true }
  }
  const first = await post(short, text, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
  const full = toE164(phone)
  if (first.ok || full === short) return first
  const retry = await post(full, text, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)
  return retry.ok ? retry : first
}
