import type { ZoneId } from '../data/network'
import type { Lang } from './messages'

export interface DisplaySubscriber {
  id: string
  name: string
  zone: ZoneId
  lang: Lang
  channel: 'whatsapp' | 'sms'
  members: number
  /** testeur réel : seul numéro à qui un vrai envoi WhatsApp est autorisé */
  real: boolean
  /** jamais le numéro en clair : voir api/subscribers/index.ts */
  phoneMasked: string
}

/** Liste des abonnés depuis Neon, pour l'affichage (jamais utilisée pour un envoi réel : voir server/aiPlan.ts et api/alerts/send.ts). */
export async function fetchSubscribers(): Promise<DisplaySubscriber[] | { error: string }> {
  try {
    const res = await fetch('/api/subscribers')
    const body = await res.json().catch(() => ({}))
    return res.ok ? body : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'Serveur injoignable (en local, lancez npm run api).' }
  }
}
