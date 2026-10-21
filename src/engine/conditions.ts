import type { Network, PipeId, Zone, ZoneId } from '../data/network'
import type { HydroEvent } from './events'
import { downstream } from './graph'

/** Journée de service : 9 créneaux de 2 h, de 5 h à 23 h. */
export const DAY_START = 5
export const SLOT_H = 2
export const SLOT_COUNT = 9
export const SLOT_STARTS = Array.from({ length: SLOT_COUNT }, (_, i) => DAY_START + i * SLOT_H)

/** Heures de pointe : 6 h-8 h et 18 h-20 h. */
const PEAKS: [number, number][] = [[6, 8], [18, 20]]
const PEAK_FACTOR = 1.5
const POWER_CUT_FACTOR = 0.25
/** Pression perdue en bout de réseau : la demande effective grimpe avec la distance. */
const PRESSURE_PENALTY = 0.1

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

export const isPeak = (start: number) => PEAKS.some(([a, b]) => overlaps(start, start + SLOT_H, a, b))

export interface Conditions {
  /** capacité du château d'eau pour chaque créneau */
  capacity: number[]
  /** conduites hors service */
  broken: Set<PipeId>
  /** zones dont l'eau est à risque sanitaire */
  qualityRisk: Set<ZoneId>
}

export function conditionsFor(net: Network, event: HydroEvent | null): Conditions {
  const broken = new Set<PipeId>()
  const qualityRisk = new Set<ZoneId>()
  const capacity = SLOT_STARTS.map((start) => {
    if (event?.type === 'power_cut' && overlaps(start, start + SLOT_H, event.startsAt, event.startsAt + event.durationH)) {
      return net.tower.capacity * POWER_CUT_FACTOR
    }
    return net.tower.capacity
  })

  if (event?.type === 'pipe_burst' && event.pipe) {
    broken.add(event.pipe)
    const cut = net.pipes.find((p) => p.id === event.pipe)
    if (cut) for (const z of [cut.to, ...downstream(net, cut.to)]) qualityRisk.add(z)
  }
  if (event?.type === 'heavy_rain') {
    for (const z of net.zones) if (z.wells) qualityRisk.add(z.id)
  }
  return { capacity, broken, qualityRisk }
}

export function demandAt(zone: Zone, slotStart: number): number {
  const peak = isPeak(slotStart) ? PEAK_FACTOR : 1
  return zone.demand * peak * (1 + PRESSURE_PENALTY * zone.depth)
}
