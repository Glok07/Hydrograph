import type { Network, ZoneId } from '../data/network'
import { SLOT_H, SLOT_STARTS, conditionsFor, demandAt } from './conditions.js'
import type { Conditions } from './conditions'
import type { HydroEvent } from './events'
import { isReachable } from './graph.js'
import { zoneImpact } from './impact.js'
import type { ZoneImpact } from './impact'
import { REFERENCE_PERIOD } from './periods.js'
import type { PeriodContext } from './periods'

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
  /** impact par type d'eau, rempli par finalize() une fois l'eau répartie */
  impact?: ZoneImpact
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
 * Dernière étape commune à toutes les répartitions : une fois les créneaux du robinet connus,
 * calcule l'impact sur chaque type d'eau, en déduit l'alerte qualité (donc le statut) et l'attache.
 */
export function finalize(net: Network, cond: Conditions, raw: ZoneForecast[]): ZoneForecast[] {
  return raw.map((f) => {
    const zone = net.zones.find((z) => z.id === f.zone)!
    const impact = zoneImpact(net, zone, cond.scenario, f.slots)
    return { ...toForecast(f.zone, f.slots, impact.qualityRisk), impact }
  })
}

/**
 * Situation « sans HydroGraph » : le réseau sert les zones les plus proches
 * du château d'eau en premier, et s'arrête quand le débit manque.
 * `event` : un événement, plusieurs causes cumulées, ou rien ; `ctx` : la période (jour de marché, vacances…).
 */
export function forecast(net: Network, event: HydroEvent | HydroEvent[] | null, ctx: PeriodContext = REFERENCE_PERIOD): ZoneForecast[] {
  const cond = conditionsFor(net, event, ctx)
  const byDepth = [...net.zones].sort((a, b) => a.depth - b.depth)
  const slots = new Map<ZoneId, Slot[]>(net.zones.map((z) => [z.id, []]))

  SLOT_STARTS.forEach((start, i) => {
    let left = cond.capacity[i]
    for (const z of byDepth) {
      if (!isReachable(net, z.id, cond.broken)) continue
      const need = demandAt(z, start, cond)
      // Le réseau sert les zones dans l'ordre et s'arrête au premier manque de débit : sauter une zone
      // proche pour en servir une plus loin ferait gagner des heures à une zone quand la capacité baisse.
      if (need > left) break
      left -= need
      slots.get(z.id)!.push({ start, end: start + SLOT_H })
    }
  })

  return finalize(
    net,
    cond,
    net.zones.map((z) => toForecast(z.id, slots.get(z.id)!, false)),
  )
}
