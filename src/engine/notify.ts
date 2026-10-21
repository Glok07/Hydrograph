import type { Subscriber } from '../data/subscribers'
import type { Zone } from '../data/network'
import type { EventType } from './events'
import type { ZoneForecast } from './forecast'
import { buildMessage } from './messages'

/** 0146910055 -> 2290146910055 (format international attendu par WhatsApp, sans « + »). */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('229') ? digits : `229${digits}`
}

export interface Outgoing {
  subscriber: Subscriber
  to: string
  text: string
}

/** Message personnalisé pour un abonné : prénom, puis texte de sa zone. */
export function messageFor(sub: Subscriber, event: EventType | null, zone: Zone, f: ZoneForecast, plan: boolean): Outgoing {
  const msg = buildMessage(event, zone, f, plan)
  const first = sub.name.split(' ')[0]
  return { subscriber: sub, to: toE164(sub.phone), text: `💧 Bonjour ${first}. ${msg.title} : ${msg.body}` }
}

export type SendResult = { ok: true; dryRun: boolean } | { ok: false; error: string }

/** Appelle le petit serveur local (server/whatsapp.mjs) : le jeton WhatsApp ne quitte jamais le serveur. */
export async function sendWhatsApp(to: string, text: string): Promise<SendResult> {
  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: body.error ?? `HTTP ${res.status}` }
    return { ok: true, dryRun: Boolean(body.dryRun) }
  } catch {
    return { ok: false, error: 'Serveur WhatsApp injoignable (npm run api).' }
  }
}
