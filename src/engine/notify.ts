import type { Subscriber } from '../data/subscribers'
import type { Zone } from '../data/network'
import type { EventType } from './events'
import type { ZoneForecast } from './forecast'
import { buildMessage } from './messages.js'

/** 0146000922 -> 2290146000922 (format international attendu par WhatsApp, sans « + »). */
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

export interface AlertReport {
  live: boolean
  count: number
  results: { name: string; status: string; error?: string }[]
}

/** Demande au serveur de diffuser l'alerte courante : le jeton WhatsApp ne quitte jamais le serveur. */
export async function sendAlerts(event: EventType | null, plan: boolean): Promise<AlertReport | { error: string }> {
  try {
    const res = await fetch('/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, plan }),
    })
    const body = await res.json().catch(() => ({}))
    return res.ok ? body : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'Serveur injoignable (en local, lancez npm run api).' }
  }
}
