import { profileOf } from '../data/profiles.js'
import type { Zone } from '../data/network'
import { ACTIVITIES, ACTIVITY_IDS, HOURLY, periodMultiplier } from './activities.js'
import type { ActivityId } from './activities'
import { REFERENCE_PERIOD } from './periods.js'
import type { PeriodContext } from './periods'

/**
 * Modèle de demande en eau : pour une zone, une heure et une période, combien d'eau les habitants
 * et leurs activités consomment. Il répond à « quelles zones vont utiliser le plus d'eau, et quand ? ».
 *
 * demande(heure) = somme sur les activités de  unités × volume par unité × variation de période × profil horaire
 */

/** Nombre d'unités de chaque activité dans la zone. */
export function unitsOf(zone: Zone): Record<ActivityId, number> {
  const p = profileOf(zone)
  const c = p.counts
  return {
    domestic: zone.households * p.hhSize,
    school: c.school,
    university: c.university,
    health: c.health,
    market: c.market,
    food: c.food,
    lodging: c.lodging,
    carwash: c.carwash,
    mosque: c.mosque,
    church: c.church,
    agri: c.agri,
    craft: c.craft,
  }
}

/** Part de la consommation d'une activité qui passe par le réseau : pour les ménages, le mélange de sources de la zone. */
export function networkShareOf(zone: Zone, id: ActivityId): number {
  return id === 'domestic' ? profileOf(zone).mix.network : ACTIVITIES[id].networkShare
}

/** Volume (m3) consommé par chaque activité pendant l'heure `hour`, toutes sources confondues. */
export function hourlyVolumes(zone: Zone, hour: number, ctx: PeriodContext): Record<ActivityId, number> {
  const units = unitsOf(zone)
  const out = {} as Record<ActivityId, number>
  for (const id of ACTIVITY_IDS) {
    const a = ACTIVITIES[id]
    out[id] = units[id] * a.m3PerUnitDay * periodMultiplier(id, ctx) * HOURLY[a.profile][hour]
  }
  return out
}

/** Volume (m3) consommé par chaque activité sur la journée. */
export function dayVolumes(zone: Zone, ctx: PeriodContext): Record<ActivityId, number> {
  const units = unitsOf(zone)
  const out = {} as Record<ActivityId, number>
  for (const id of ACTIVITY_IDS) out[id] = units[id] * ACTIVITIES[id].m3PerUnitDay * periodMultiplier(id, ctx)
  return out
}

export const totalDay = (zone: Zone, ctx: PeriodContext) => Object.values(dayVolumes(zone, ctx)).reduce((a, b) => a + b, 0)

/** Volume total (m3) consommé pendant l'heure `hour`. */
export const totalHour = (zone: Zone, hour: number, ctx: PeriodContext) => Object.values(hourlyVolumes(zone, hour, ctx)).reduce((a, b) => a + b, 0)

/** Heure de la journée où la zone consomme le plus. */
export function peakHour(zone: Zone, ctx: PeriodContext): number {
  let best = 5
  let max = -1
  for (let h = 5; h < 23; h++) {
    const v = totalHour(zone, h, ctx)
    if (v > max) {
      max = v
      best = h
    }
  }
  return best
}

/** Volume (m3) que la zone demande au réseau entre `from` et `to` (heures), en tenant compte du mélange de sources. */
export function networkVolume(zone: Zone, from: number, to: number, ctx: PeriodContext): number {
  const units = unitsOf(zone)
  let sum = 0
  for (const id of ACTIVITY_IDS) {
    const a = ACTIVITIES[id]
    let share = 0
    for (let h = from; h < to; h++) share += HOURLY[a.profile][h]
    sum += units[id] * a.m3PerUnitDay * periodMultiplier(id, ctx) * networkShareOf(zone, id) * share
  }
  return sum
}

/**
 * Créneaux creux d'un jour ordinaire : la demande de référence d'une zone est sa demande moyenne
 * sur ces créneaux. Un indice de 1 signifie « demande de creux de journée », les pointes dépassent 1.
 */
const OFF_PEAK_STARTS = [9, 11, 13, 15, 21]
const refCache = new Map<string, number>()

function referenceVolume(zone: Zone, slotH: number): number {
  const key = `${zone.id}|${zone.households}|${slotH}`
  const hit = refCache.get(key)
  if (hit !== undefined) return hit
  const v = OFF_PEAK_STARTS.reduce((s, h) => s + networkVolume(zone, h, h + slotH, REFERENCE_PERIOD), 0) / OFF_PEAK_STARTS.length
  refCache.set(key, v)
  return v
}

/** Demande du créneau rapportée à la demande de référence de la zone : c'est ce qu'utilise le moteur de distribution. */
export function demandIndex(zone: Zone, slotStart: number, slotH: number, ctx: PeriodContext): number {
  const ref = referenceVolume(zone, slotH)
  return ref > 0 ? networkVolume(zone, slotStart, slotStart + slotH, ctx) / ref : 1
}

export interface ActivityShare {
  id: ActivityId
  label: string
  color: string
  m3: number
  share: number
}

/** Qui consomme dans la zone : volumes journaliers par activité, du plus gros au plus petit. */
export function breakdown(zone: Zone, ctx: PeriodContext): ActivityShare[] {
  const vols = dayVolumes(zone, ctx)
  const total = Object.values(vols).reduce((a, b) => a + b, 0) || 1
  return ACTIVITY_IDS.map((id) => ({ id, label: ACTIVITIES[id].label, color: ACTIVITIES[id].color, m3: vols[id], share: vols[id] / total }))
    .filter((a) => a.m3 > 0.01)
    .sort((a, b) => b.m3 - a.m3)
}
