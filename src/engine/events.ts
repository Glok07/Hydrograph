import type { PipeId } from '../data/network'

export type EventType = 'power_cut' | 'heavy_rain' | 'pipe_burst'

export interface HydroEvent {
  type: EventType
  /** heure de début (0-24) */
  startsAt: number
  durationH: number
  /** conduite cassée, pour pipe_burst */
  pipe?: PipeId
}

export const EVENT_LABEL: Record<EventType, string> = {
  power_cut: 'Coupure de courant',
  heavy_rain: 'Forte pluie',
  pipe_burst: 'Tuyau cassé',
}

export const DEFAULT_EVENTS: Record<EventType, HydroEvent> = {
  power_cut: { type: 'power_cut', startsAt: 8, durationH: 6 },
  heavy_rain: { type: 'heavy_rain', startsAt: 6, durationH: 12 },
  pipe_burst: { type: 'pipe_burst', startsAt: 6, durationH: 18, pipe: 'P3' },
}
