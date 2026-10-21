import type { Network, ZoneId } from '../data/network'
import { SLOT_H, SLOT_STARTS, conditionsFor, demandAt } from './conditions.js'
import type { HydroEvent } from './events'
import { isReachable } from './graph.js'

export type Status = 'ok' | 'warn' | 'risk'

export interface Slot {
  start: number
  end: number
  guaranteed?: boolean
}

export interface ZoneForecast {
  zone: ZoneId
  status: Status
  /** statut lié au seul débit, avant prise en compte de la qualité */
  flowStatus: Status
  hoursOfWater: number
  slots: Slot[]
  qualityRisk: boolean
}

/** Vrai si la zone a l'eau à cette heure ; sans heure précise, on regarde la journée. */
export function servedAt(f: { slots: Slot[] }, hour: number | null): boolean {
  return hour === null || f.slots.some((s) => s.start <= hour && hour < s.end)
}

export const OK_HOURS = 14
export const WARN_HOURS = 6

export function statusFromHours(hours: number): Status {
  return hours >= OK_HOURS ? 'ok' : hours >= WARN_HOURS ? 'warn' : 'risk'
}

const WORSE: Record<Status, Status> = { ok: 'warn', warn: 'risk', risk: 'risk' }

export function toForecast(zone: ZoneId, slots: Slot[], qualityRisk: boolean): ZoneForecast {
  const hoursOfWater = slots.length * SLOT_H
  const flowStatus = statusFromHours(hoursOfWater)
  return { zone, status: qualityRisk ? WORSE[flowStatus] : flowStatus, flowStatus, hoursOfWater, slots, qualityRisk }
}

/**
 * Situation « sans HydroGraph » : le réseau sert les zones les plus proches
 * du château d'eau en premier, et s'arrête quand le débit manque.
 */
export function forecast(net: Network, event: HydroEvent | null): ZoneForecast[] {
  const cond = conditionsFor(net, event)
  const byDepth = [...net.zones].sort((a, b) => a.depth - b.depth)
  const slots = new Map<ZoneId, Slot[]>(net.zones.map((z) => [z.id, []]))

  SLOT_STARTS.forEach((start, i) => {
    let left = cond.capacity[i]
    for (const z of byDepth) {
      if (!isReachable(net, z.id, cond.broken)) continue
      const need = demandAt(z, start)
      if (need <= left) {
        left -= need
        slots.get(z.id)!.push({ start, end: start + SLOT_H })
      }
    }
  })

  return net.zones.map((z) => toForecast(z.id, slots.get(z.id)!, cond.qualityRisk.has(z.id)))
}
