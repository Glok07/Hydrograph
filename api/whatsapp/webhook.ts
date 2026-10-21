import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from '../../server/db.js'
import { sendText } from '../../server/whatsapp.js'

interface Payload {
  entry?: {
    changes?: {
      value?: {
        statuses?: { id: string; status: string; errors?: { title?: string }[] }[]
        messages?: { from: string; type: string; text?: { body: string } }[]
      }
    }[]
  }[]
}

/** Vérification initiale demandée par Meta quand on enregistre l'URL du webhook. */
export function GET(request: Request) {
  const q = new URL(request.url).searchParams
  if (q.get('hub.mode') === 'subscribe' && q.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(q.get('hub.challenge') ?? '', { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return true // non configuré : acceptable en test uniquement
  if (!header) return false
  const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected))
}

/** Accusés de livraison/lecture, et commandes STOP / START envoyées par les abonnés. */
export async function POST(request: Request) {
  const raw = await request.text()
  if (!validSignature(raw, request.headers.get('x-hub-signature-256'))) return new Response('Forbidden', { status: 403 })
  let body: Payload
  try {
    body = JSON.parse(raw)
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  for (const change of body.entry?.flatMap((e) => e.changes ?? []) ?? []) {
    for (const st of change.value?.statuses ?? []) {
      const status = st.status === 'delivered' ? 'delivered' : st.status === 'read' ? 'read' : st.status === 'failed' ? 'failed' : null
      if (status) await prisma.notification.updateMany({ where: { providerId: st.id }, data: { status, ...(status === 'failed' ? { error: st.errors?.[0]?.title ?? 'échec' } : {}) } })
    }
    for (const m of change.value?.messages ?? []) {
      const word = m.text?.body.trim().toUpperCase()
      if (word === 'STOP') {
        const r = await prisma.subscriber.updateMany({ where: { phone: m.from }, data: { unsubscribedAt: new Date() } })
        if (r.count) await sendText(m.from, '💧 HydroGraph : vous êtes désabonné. Répondez START pour réactiver les alertes.')
      } else if (word === 'START') {
        const r = await prisma.subscriber.updateMany({ where: { phone: m.from, verifiedAt: { not: null } }, data: { unsubscribedAt: null } })
        if (r.count) await sendText(m.from, '💧 HydroGraph : alertes réactivées.')
      }
    }
  }
  return new Response('ok', { status: 200 })
}
