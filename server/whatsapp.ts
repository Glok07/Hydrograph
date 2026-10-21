export type SendOutcome = { ok: true; id: string | null; dryRun: boolean } | { ok: false; error: string }

const GRAPH = 'https://graph.facebook.com/v21.0'

/** Envoie un message texte WhatsApp. Sans jeton configuré : « dry run », le texte part dans les logs. */
export async function sendText(to: string, text: string): Promise<SendOutcome> {
  const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID } = process.env
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[dry-run whatsapp] -> ${to}: ${text}`)
    return { ok: true, id: null, dryRun: true }
  }
  const res = await fetch(`${GRAPH}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string }; messages?: { id: string }[] }
  if (!res.ok) return { ok: false, error: body.error?.message ?? `Meta HTTP ${res.status}` }
  return { ok: true, id: body.messages?.[0]?.id ?? null, dryRun: false }
}
