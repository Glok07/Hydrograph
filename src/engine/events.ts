import type { PipeId, ZoneId } from '../data/network'

/**
 * Les causes qui font varier le service de l'eau. Plusieurs peuvent se cumuler le même jour.
 * Leur effet détaillé sur chaque type d'eau est décrit dans causes.ts.
 */
export type EventType =
  | 'power_cut'
  | 'voltage_drop'
  | 'pump_failure'
  | 'maintenance'
  | 'pipe_burst'
  | 'leak'
  | 'heavy_rain'
  | 'flood'
  | 'dry_season'
  | 'heat_wave'
  | 'market_day'
  | 'festival'

export interface HydroEvent {
  type: EventType
  /** heure de début (0-24) */
  startsAt: number
  durationH: number
  /** conduite cassée, pour pipe_burst */
  pipe?: PipeId
  /** zones concernées, pour les causes locales (panne de forage, inondation) ; absent = selon la cause */
  zones?: ZoneId[]
}

export const EVENT_LABEL: Record<EventType, string> = {
  power_cut: 'Coupure de courant',
  voltage_drop: 'Tension électrique trop basse',
  pump_failure: 'Panne de pompe ou de forage',
  maintenance: 'Travaux de l’opérateur',
  pipe_burst: 'Tuyau cassé',
  leak: 'Fuites sur le réseau',
  heavy_rain: 'Forte pluie',
  flood: 'Inondation',
  dry_season: 'Saison sèche',
  heat_wave: 'Pic de chaleur',
  market_day: 'Jour de marché',
  festival: 'Fête ou jour férié',
}

export const DEFAULT_EVENTS: Record<EventType, HydroEvent> = {
  power_cut: { type: 'power_cut', startsAt: 8, durationH: 6 },
  voltage_drop: { type: 'voltage_drop', startsAt: 17, durationH: 6 },
  pump_failure: { type: 'pump_failure', startsAt: 6, durationH: 18, zones: ['Z4', 'Z5', 'Z6'] },
  maintenance: { type: 'maintenance', startsAt: 9, durationH: 8 },
  pipe_burst: { type: 'pipe_burst', startsAt: 6, durationH: 18, pipe: 'P3' },
  leak: { type: 'leak', startsAt: 5, durationH: 18 },
  heavy_rain: { type: 'heavy_rain', startsAt: 6, durationH: 12 },
  flood: { type: 'flood', startsAt: 6, durationH: 18 },
  dry_season: { type: 'dry_season', startsAt: 5, durationH: 18 },
  heat_wave: { type: 'heat_wave', startsAt: 11, durationH: 8 },
  market_day: { type: 'market_day', startsAt: 6, durationH: 14 },
  festival: { type: 'festival', startsAt: 8, durationH: 14 },
}

/** Accepte un événement seul, une liste ou rien : l'API d'origine ne connaissait qu'un événement à la fois. */
export function toEvents(e: HydroEvent | HydroEvent[] | null | undefined): HydroEvent[] {
  return e == null ? [] : Array.isArray(e) ? e : [e]
}
