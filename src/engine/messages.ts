import type { Zone } from '../data/network'
import type { EventType } from './events'
import type { CauseShare } from './explain'
import type { Slot, Status, ZoneForecast } from './forecast'

export const STATUS_LABEL: Record<Status, string> = {
  ok: 'Eau toute la journée',
  warn: 'Eau par créneaux',
  risk: 'Risque de manque',
}

export type Lang = 'fr' | 'fon' | 'goun' | 'yoruba'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'fon', label: 'Fon' },
  { id: 'goun', label: 'Goun' },
  { id: 'yoruba', label: 'Yoruba' },
]

const h = (n: number) => `${n} h`

/** Fusionne les créneaux qui se suivent : [5-7, 7-9, 15-17] -> ["5 h-9 h", "15 h-17 h"]. */
export function slotRanges(slots: Slot[]): string[] {
  const out: { start: number; end: number }[] = []
  for (const s of slots) {
    const last = out[out.length - 1]
    if (last && last.end === s.start) last.end = s.end
    else out.push({ start: s.start, end: s.end })
  }
  return out.map((r) => `${h(r.start)}-${h(r.end)}`)
}

/** Une phrase par cause, utilisée dans les messages aux familles. */
const WHY: Record<EventType, string> = {
  power_cut: 'Coupure de courant à la station. ',
  voltage_drop: 'Tension électrique trop basse. ',
  pump_failure: 'Panne de pompe. ',
  maintenance: 'Travaux sur le réseau. ',
  pipe_burst: 'Tuyau cassé en amont. ',
  leak: 'Fuites sur le réseau. ',
  heavy_rain: 'Forte pluie prévue. ',
  flood: 'Inondation. ',
  dry_season: 'Saison sèche : la nappe est basse. ',
  heat_wave: 'Forte chaleur. ',
  market_day: 'Jour de marché : forte demande. ',
  festival: 'Jour de fête : forte demande. ',
}

/**
 * Pourquoi la zone a ce service aujourd'hui. Avec `causes` (voir explain.ts), la phrase vient des vraies
 * causes cumulées ; sans elles, on retombe sur une explication générale.
 */
export function reasonFor(_event: EventType | null, zone: Zone, f: ZoneForecast, plan: boolean, causes?: CauseShare[]): string {
  if (causes && causes.length > 0) {
    const [top, ...rest] = causes
    const effect = top.hoursLost > 0 ? `${top.hoursLost} h d’eau en moins` : top.hoursLost < 0 ? `${-top.hoursLost} h d’eau en plus` : top.exposedDelta > 0 ? `${Math.round(top.exposedDelta * 100)} points de foyers exposés en plus` : 'effet sur la qualité de l’eau'
    return `${top.label} : ${effect}${rest.length ? `, avec ${rest.length} autre${rest.length > 1 ? 's' : ''} cause${rest.length > 1 ? 's' : ''} cumulée${rest.length > 1 ? 's' : ''}` : ''}.`
  }
  if (plan) return 'Tours d’eau HydroGraph : les créneaux sont répartis pour que personne ne soit oublié.'
  if (f.status === 'ok') return 'Zone proche du château d’eau : la pression reste bonne toute la journée.'
  return `Zone éloignée du château d’eau : la pression baisse aux heures de pointe${zone.depth >= 3 ? ' et l’eau arrive en dernier' : ''}.`
}

export function adviceFor(event: EventType | null, f: ZoneForecast): string {
  if (f.qualityRisk) return 'Faites bouillir ou traitez l’eau avant de la boire, et lavez les récipients.'
  if (f.hoursOfWater === 0) return 'Gardez vos réserves pour boire et cuisiner, et allez à la borne la plus proche.'
  const fallback = f.impact
  if (fallback && fallback.fallbackShare >= 0.3 && fallback.types.well.level !== 'good') return 'Beaucoup de foyers se rabattent sur les puits : traitez l’eau avant de la boire.'
  if (event === 'power_cut') return 'Remplissez vos bidons dès que l’eau revient et couvrez-les.'
  if (event === 'heat_wave') return 'Videz et renouvelez l’eau stockée plus souvent : elle se dégrade vite par forte chaleur.'
  if (f.status === 'risk') return 'Stockez l’eau dans des récipients fermés pendant les créneaux.'
  if (f.status === 'warn') return 'Remplissez vos récipients pendant les créneaux, avant les heures de pointe.'
  return 'Aucune précaution particulière aujourd’hui.'
}

export interface Confidence {
  value: number
  label: string
}

/** Prévision plus prudente quand un événement survient et en bout de réseau. */
export function confidenceFor(event: EventType | null, zone: Zone): Confidence {
  const value = Math.max(0.4, 0.9 - (event ? 0.15 : 0) - 0.05 * zone.depth)
  return { value, label: value >= 0.75 ? 'Confiance élevée' : value >= 0.6 ? 'Confiance moyenne' : 'Confiance prudente' }
}

export interface FamilyMessage {
  title: string
  body: string
}

export function buildMessage(event: EventType | null, zone: Zone, f: ZoneForecast, plan: boolean): FamilyMessage {
  const ranges = slotRanges(f.slots)
  const when =
    ranges.length === 0
      ? 'Pas d’eau prévue aujourd’hui.'
      : f.status === 'ok'
        ? 'L’eau coule presque toute la journée.'
        : `L’eau viendra ${ranges.slice(0, 3).join(', ')}.`
  const why = event && (event !== 'pipe_burst' || f.hoursOfWater === 0) ? WHY[event] : ''
  const guaranteed = f.slots.some((s) => s.guaranteed) && plan ? ' Un créneau vous est garanti.' : ''
  return {
    title: zone.name,
    body: `${why}${when}${guaranteed} ${adviceFor(event, f)}`.replace(/\s+/g, ' ').trim(),
  }
}
