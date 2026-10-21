import type { Subscriber } from '../data/subscribers'
import type { Zone } from '../data/network'
import type { EventType } from './events'
import type { ZoneForecast } from './forecast'
import { buildMessage } from './messages.js'

/**
 * Forme canonique stockée en base : 0146000922 -> 2290146000922.
 * C'est le numéro béninois officiel depuis la réforme de novembre 2024 (préfixe « 01 »).
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('229') ? digits : `229${digits}`
}

/**
 * Adresse WhatsApp : 2290146000922 -> 22946000922.
 * Les comptes WhatsApp béninois restent enregistrés sous l'ancien numéro à 8 chiffres,
 * antérieur au préfixe « 01 » ; Meta ne reconnaît pas la forme à 10 chiffres.
 */
export function toWhatsApp(phone: string): string {
  const national = toE164(phone).slice(3)
  return `229${national.length === 10 && national.startsWith('01') ? national.slice(2) : national}`
}

/** Inverse de toWhatsApp : rétablit la forme canonique d'un numéro reçu de Meta. */
export function fromWhatsApp(phone: string): string {
  const national = phone.replace(/\D/g, '').replace(/^229/, '')
  return `229${national.length === 8 ? `01${national}` : national}`
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

/**
 * Demande au serveur de diffuser l'alerte courante : le jeton WhatsApp ne quitte jamais le serveur.
 * `extra` : toutes les causes cumulées et la période, pour que les messages décrivent la même journée que l'écran.
 */
export async function sendAlerts(event: EventType | null, plan: boolean, extra?: { events?: EventType[]; period?: string }): Promise<AlertReport | { error: string }> {
  try {
    const res = await fetch('/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, plan, ...extra }),
    })
    const body = await res.json().catch(() => ({}))
    return res.ok ? body : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'Serveur injoignable (en local, lancez npm run api).' }
  }
}
