import type { Network, Zone, ZoneId } from '../data/network'
import { profileOf } from '../data/profiles.js'
import type { Scenario } from './causes'
import type { Slot } from './forecast'
import { isReachable } from './graph.js'
import { DAY_H, SLOT_H, SLOT_STARTS } from './slots.js'
import { RISK_AT, WATER_TYPES, levelOf } from './waterTypes.js'
import type { QualityLevel, WaterType } from './waterTypes'

/**
 * Impact d'une journée sur chacun des quatre types d'eau d'une zone, et sur les familles :
 * ce qui coule, ce qui est sûr, vers quoi les foyers se rabattent quand le robinet est à sec.
 *
 * Toutes les constantes ci-dessous sont des hypothèses de calage, à valider avec l'opérateur et
 * des relevés de terrain (qualité d'eau, niveaux de nappe).
 */
export interface TypeImpact {
  type: WaterType
  /** part nominale des foyers qui s'en servent, un jour normal */
  nominal: number
  /** part effective aujourd'hui, repli compris */
  share: number
  /** heures où cette eau est disponible dans la journée de 5 h à 23 h */
  hours: number
  /** risque sanitaire, 0 à 1 */
  quality: number
  level: QualityLevel
  /** ce qui pèse sur ce type d'eau aujourd'hui, en une phrase */
  note: string
}

export interface ZoneImpact {
  types: Record<WaterType, TypeImpact>
  /** part des foyers qui quittent le robinet faute d'eau */
  fallbackShare: number
  /** plus longue période sans eau au robinet, en heures */
  gapHours: number
  /** part des foyers qui dépendent d'une source à risque */
  exposedShare: number
  exposedHouseholds: number
  /** assez de foyers exposés pour déclasser la zone */
  qualityRisk: boolean
}

/** Au-delà de cette part de foyers exposés, la zone passe en alerte qualité. */
export const EXPOSED_ALERT = 0.3

const BOREHOLE_HOURS = 16
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Plus longue série de créneaux sans eau au robinet, en heures. */
export function longestGap(slots: Slot[]): number {
  let best = 0
  let run = 0
  for (const start of SLOT_STARTS) {
    if (slots.some((s) => s.start === start)) run = 0
    else best = Math.max(best, (run += SLOT_H))
  }
  return best
}

function floodOf(zone: Zone, sc: Scenario, exposure: number): number {
  return sc.flood && (!sc.floodZones || sc.floodZones.has(zone.id)) ? exposure : 0
}

/**
 * `slots` = créneaux servis au robinet. Sans eux (null), on suppose le robinet normal sauf
 * conduite coupée : sert à repérer les zones à risque avant même de répartir l'eau.
 */
export function zoneImpact(net: Network, zone: Zone, sc: Scenario, slots: Slot[] | null): ZoneImpact {
  const p = profileOf(zone)
  const cut = !isReachable(net, zone.id, sc.broken)
  const netSlots = slots ?? (cut ? [] : SLOT_STARTS.map((start) => ({ start, end: start + SLOT_H })))
  const netHours = netSlots.length * SLOT_H
  const availNet = netHours / DAY_H
  const gap = longestGap(netSlots)
  const f = floodOf(zone, sc, p.floodExposure)
  const density = clamp01(p.counts.buildings / p.areaKm2 / 600)

  // Forages : courant, nappe, panne de pompe
  let gridLoss = 0
  for (let h = 5; h < 5 + BOREHOLE_HOURS; h++) if (sc.gridOutage[h]) gridLoss++
  const down = sc.boreholeDown.has(zone.id)
  const yieldFactor = sc.boreholeYield * (1 - 0.3 * f)
  const bhHours = down ? 0 : Math.max(0, BOREHOLE_HOURS - p.boreholePower.grid * gridLoss) * yieldFactor
  // Puits : la nappe seule
  const wellHours = DAY_H * sc.wellLevel
  // Eau stockée : la réserve couvre la coupure du robinet, pas toute la journée
  const autonomy = p.storageHours * sc.storageFactor + sc.rainwaterH
  const storedHours = DAY_H - Math.max(0, gap - autonomy)

  // Foyers qui quittent le robinet : 40 % vers un forage, 60 % vers un puits
  const nominal = p.mix
  const moved = nominal.network * (1 - availNet)
  const share = { network: nominal.network * availNet, borehole: nominal.borehole + 0.4 * moved, well: nominal.well + 0.6 * moved }

  const burst = sc.networkHit.has(zone.id)
  // Après une rupture, l'eau qui revient est suspecte : on compte au moins la moitié des raccordés comme exposés.
  const networkWeight = nominal.network * (burst ? Math.max(availNet, 0.5) : availNet)

  const q = {
    network: clamp01(0.05 + sc.quality.network + (burst ? 0.55 : 0) + 0.15 * f),
    borehole: clamp01(0.08 + sc.quality.borehole + 0.3 * f),
    well: clamp01(0.22 + 0.2 * density + sc.quality.well + 0.45 * f),
    stored: 0,
  }
  const fill = share.network + share.well || 1
  const sourceRisk = (share.network * q.network + share.well * q.well) / fill
  q.stored = clamp01(0.12 + sc.quality.stored + 0.012 * Math.max(0, gap - 12) + 0.015 * Math.max(0, sc.ctx.tempC - 32) + 0.25 * f + 0.3 * sourceRisk)

  const exposedShare = Math.min(
    1,
    networkWeight * (q.network >= RISK_AT ? 1 : 0) + share.borehole * (q.borehole >= RISK_AT ? 1 : 0) + share.well * (q.well >= RISK_AT ? 1 : 0),
  )

  const notes: Record<WaterType, string> = {
    network: cut ? 'Conduite coupée en amont : plus d’eau au robinet.' : netHours >= DAY_H ? 'Service toute la journée.' : `${netHours} h de service sur ${DAY_H} h, tours d’eau compris.`,
    borehole: down ? 'Pompe en panne.' : gridLoss > 0 ? `Pompes sans courant ${gridLoss} h sur ${BOREHOLE_HOURS} h.` : sc.boreholeYield < 1 ? 'Rendement du forage réduit.' : 'Service normal.',
    well: sc.wellLevel < 1 ? 'Nappe basse : les puits tarissent.' : sc.quality.well > 0 || f > 0 ? 'Eau souillée par la pluie ou les crues.' : 'Ni courant ni conduite, mais eau peu protégée.',
    stored: gap > 0 ? `Réserve de ${Math.round(autonomy)} h pour ${gap} h sans eau au robinet.` : 'Pas de coupure à couvrir.',
  }

  const types = {} as Record<WaterType, TypeImpact>
  const hoursOf: Record<WaterType, number> = { network: netHours, borehole: Math.round(bhHours * 10) / 10, well: Math.round(wellHours * 10) / 10, stored: Math.round(storedHours * 10) / 10 }
  for (const t of WATER_TYPES) {
    types[t] = {
      type: t,
      nominal: t === 'stored' ? 0 : nominal[t],
      share: t === 'stored' ? moved : share[t],
      hours: hoursOf[t],
      quality: q[t],
      level: levelOf(q[t]),
      note: notes[t],
    }
  }

  return { types, fallbackShare: moved, gapHours: gap, exposedShare, exposedHouseholds: Math.round(exposedShare * zone.households), qualityRisk: exposedShare >= EXPOSED_ALERT }
}

/** Zones en alerte qualité, avant répartition de l'eau : repère sanitaire indépendant du rationnement. */
export function qualityRiskZones(net: Network, sc: Scenario): Set<ZoneId> {
  return new Set(net.zones.filter((z) => zoneImpact(net, z, sc, null).qualityRisk).map((z) => z.id))
}
