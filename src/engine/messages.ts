import type { Zone } from '../data/network'
import type { EventType } from './events'
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

export function reasonFor(event: EventType | null, zone: Zone, f: ZoneForecast, plan: boolean): string {
  if (f.hoursOfWater === 0 && event === 'pipe_burst') return 'Une conduite en amont est cassée : la zone n’est plus alimentée.'
  if (event === 'power_cut') return 'Coupure de courant : la pompe tourne au ralenti pendant plusieurs heures.'
  if (event === 'heavy_rain') return f.qualityRisk ? 'Forte pluie : l’eau des puits et l’eau stockée risquent d’être salies.' : 'Forte pluie : pas d’effet sur le débit de cette zone.'
  if (event === 'pipe_burst') return 'Tuyau cassé ailleurs sur le réseau : la zone n’est pas coupée.'
  if (plan) return 'Tours d’eau HydroGraph : les créneaux sont répartis pour que personne ne soit oublié.'
  if (f.status === 'ok') return 'Zone proche du château d’eau : la pression reste bonne toute la journée.'
  return `Zone éloignée du château d’eau : la pression baisse aux heures de pointe${zone.depth >= 3 ? ' et l’eau arrive en dernier' : ''}.`
}

export function adviceFor(event: EventType | null, f: ZoneForecast): string {
  if (f.qualityRisk) return 'Faites bouillir ou traitez l’eau avant de la boire, et lavez les récipients.'
  if (f.hoursOfWater === 0) return 'Gardez vos réserves pour boire et cuisiner, et allez à la borne la plus proche.'
  if (event === 'power_cut') return 'Remplissez vos bidons dès que l’eau revient et couvrez-les.'
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
  const why = event === 'power_cut' ? 'Coupure de courant à la station. ' : event === 'pipe_burst' && f.hoursOfWater === 0 ? 'Tuyau cassé en amont. ' : event === 'heavy_rain' ? 'Forte pluie prévue. ' : ''
  const guaranteed = f.slots.some((s) => s.guaranteed) && plan ? ' Un créneau vous est garanti.' : ''
  return {
    title: zone.name,
    body: `${why}${when}${guaranteed} ${adviceFor(event, f)}`.replace(/\s+/g, ' ').trim(),
  }
}
