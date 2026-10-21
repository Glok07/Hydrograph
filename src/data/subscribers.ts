import type { ZoneId } from './network'
import type { Lang } from '../engine/messages'

export interface Subscriber {
  id: string
  name: string
  /** numéro tel que saisi à l'inscription (format béninois à 10 chiffres) */
  phone: string
  zone: ZoneId
  lang: Lang
  channel: 'whatsapp' | 'sms'
  /** foyer, pour pondérer les messages (nombre de personnes) */
  members: number
  /** date d'inscription, ISO */
  joined: string
  /** vrai : numéro de testeur réel, le seul à qui l'envoi WhatsApp est autorisé */
  real: boolean
}

/** Testeurs réels de la démo : les seuls numéros qui reçoivent de vrais messages. */
const TESTERS: Subscriber[] = [
  { id: 'S001', name: 'Osias', phone: '0146910055', zone: 'Z6', lang: 'fr', channel: 'whatsapp', members: 5, joined: '2026-09-02', real: true },
  { id: 'S002', name: 'Happy', phone: '0158111896', zone: 'Z4', lang: 'fr', channel: 'whatsapp', members: 4, joined: '2026-09-02', real: true },
]

const FIRST = [
  'Koffi', 'Afi', 'Mathieu', 'Adjoa', 'Romuald', 'Sènami', 'Fiacre', 'Ginette', 'Landry', 'Ablavi',
  'Dossou', 'Mariam', 'Bernard', 'Rosine', 'Cyrille', 'Hortense', 'Éric', 'Pélagie', 'Gilbert', 'Nadège',
  'Prosper', 'Bénédicte', 'Armand', 'Chantal', 'Théophile', 'Odile', 'Serge', 'Flora', 'Wilfried', 'Judith',
]
const LAST = [
  'Agbodjan', 'Houngbo', 'Sossou', 'Dansou', 'Adjovi', 'Tokpo', 'Gbaguidi', 'Zinsou', 'Ahouansou', 'Kpadonou',
  'Hounkpatin', 'Alladaye', 'Dossa', 'Fassinou', 'Akpovi', 'Tchibozo', 'Yèhouénou', 'Codjia', 'Agossou', 'Lokossou',
]

/** Nombre d'abonnés fictifs par zone : plus de monde dans les zones les plus peuplées. */
const PER_ZONE: Record<ZoneId, number> = { Z1: 24, Z2: 18, Z3: 16, Z4: 20, Z5: 15, Z6: 22 }

/** Langue dominante par zone (Goun à Calavi/Togba, Fon à Ouèdo/Hêvié, Yoruba rare). */
const LANG_MIX: Record<ZoneId, Lang[]> = {
  Z1: ['fr', 'fr', 'fr', 'goun', 'fon'],
  Z2: ['fr', 'goun', 'goun', 'fon'],
  Z3: ['fr', 'fr', 'fon', 'goun'],
  Z4: ['fr', 'fon', 'fon', 'goun'],
  Z5: ['fr', 'fon', 'goun', 'yoruba'],
  Z6: ['fon', 'fon', 'fr', 'goun'],
}

/** Générateur pseudo-aléatoire déterministe : la base est identique à chaque lancement. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generate(): Subscriber[] {
  const rnd = mulberry32(229)
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const used = new Set(TESTERS.map((t) => t.phone))
  const out: Subscriber[] = []
  let n = TESTERS.length

  for (const zone of Object.keys(PER_ZONE) as ZoneId[]) {
    for (let i = 0; i < PER_ZONE[zone]; i++) {
      let phone: string
      do phone = `01${Math.floor(rnd() * 1e8).toString().padStart(8, '0')}`
      while (used.has(phone))
      used.add(phone)
      n++
      const day = 1 + Math.floor(rnd() * 28)
      const month = 6 + Math.floor(rnd() * 4)
      out.push({
        id: `S${String(n).padStart(3, '0')}`,
        name: `${pick(FIRST)} ${pick(LAST)}`,
        phone,
        zone,
        lang: pick(LANG_MIX[zone]),
        channel: rnd() < 0.78 ? 'whatsapp' : 'sms',
        members: 2 + Math.floor(rnd() * 7),
        joined: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        real: false,
      })
    }
  }
  return out
}

/** ~117 abonnés fictifs répartis sur les six zones, plus les deux testeurs réels. */
export const SUBSCRIBERS: Subscriber[] = [...TESTERS, ...generate()]

export const subscribersOf = (zone: ZoneId) => SUBSCRIBERS.filter((s) => s.zone === zone)
