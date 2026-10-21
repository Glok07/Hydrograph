// Passerelle WhatsApp Cloud API (Meta). Lancer avec : npm run api
// Variables : WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ALLOWED_RECIPIENTS (numéros E.164 séparés par des virgules)
// Sans jeton, le serveur répond en « dry run » : rien n'est envoyé.
import http from 'node:http'

const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, PORT = 8787 } = process.env
// Seuls les testeurs réels reçoivent de vrais messages : les numéros fictifs de la base ne sont jamais contactés.
const ALLOWED = new Set((process.env.ALLOWED_RECIPIENTS ?? '2290146910055,2290158111896').split(',').map((s) => s.trim()))

const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

http
  .createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/api/whatsapp/send') return json(res, 404, { error: 'not found' })
    let raw = ''
    for await (const chunk of req) raw += chunk
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return json(res, 400, { error: 'JSON invalide' })
    }
    const { to, text } = data
    if (typeof to !== 'string' || typeof text !== 'string' || !text) return json(res, 400, { error: 'to et text requis' })
    if (!ALLOWED.has(to)) return json(res, 403, { error: 'Destinataire non autorisé (numéro fictif ou hors liste).' })
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      console.log(`[dry-run] -> ${to}: ${text}`)
      return json(res, 200, { dryRun: true })
    }
    const r = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) return json(res, 502, { error: body.error?.message ?? `Meta HTTP ${r.status}` })
    json(res, 200, { dryRun: false })
  })
  .listen(PORT, () => console.log(`Passerelle WhatsApp sur http://localhost:${PORT}`))
