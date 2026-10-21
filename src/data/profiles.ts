import type { Zone, ZoneId } from './network'
import { OSM_ACTIVITIES } from './osm-activities.js'
import type { OsmCounts } from './osm-activities'

/** Part des foyers d'une zone qui dépendent de chaque source pour l'eau de boisson et de cuisine. Somme = 1. */
export interface WaterMix {
  network: number
  borehole: number
  well: number
}

export interface ZoneProfile {
  /** personnes par foyer */
  hhSize: number
  mix: WaterMix
  /** comment sont alimentés les forages de la zone : réseau électrique, solaire, pompe à main. Somme = 1. */
  boreholePower: { grid: number; solar: number; manual: number }
  /** autonomie de la réserve d'un foyer, en heures de consommation */
  storageHours: number
  /** exposition de la zone aux inondations, 0 à 1 */
  floodExposure: number
  /** équipements et activités de la zone */
  counts: OsmCounts
  /** d'où viennent les comptes : relevés OpenStreetMap, ou estimation d'après le nombre de foyers */
  countsSource: 'osm' | 'estimé'
  areaKm2: number
}

/**
 * Hypothèses SIMULÉES, zone par zone : mélange des sources d'eau, exposition aux crues.
 * Vraies sources futures : enquêtes ménages nationales (mélange des sources), cartographie
 * des zones inondables, relevés de l'opérateur (alimentation des forages).
 */
const SIMULATED: Record<string, { mix: WaterMix; floodExposure: number }> = {
  Z1: { mix: { network: 0.78, borehole: 0.07, well: 0.15 }, floodExposure: 0.2 },
  Z2: { mix: { network: 0.65, borehole: 0.1, well: 0.25 }, floodExposure: 0.3 },
  Z3: { mix: { network: 0.62, borehole: 0.1, well: 0.28 }, floodExposure: 0.7 },
  Z4: { mix: { network: 0.35, borehole: 0.15, well: 0.5 }, floodExposure: 0.4 },
  Z5: { mix: { network: 0.38, borehole: 0.12, well: 0.5 }, floodExposure: 0.6 },
  Z6: { mix: { network: 0.25, borehole: 0.15, well: 0.6 }, floodExposure: 0.3 },
}

const GENERIC = { mix: { network: 0.5, borehole: 0.15, well: 0.35 }, floodExposure: 0.4 }

/** Zone ajoutée depuis la base et absente des relevés : équipements estimés d'après le nombre de foyers. */
function estimatedCounts(households: number): OsmCounts {
  const k = households / 3000
  const r = (v: number) => Math.max(0, Math.round(v * k))
  return { school: r(8), university: 0, health: r(2), market: r(1), food: r(5), lodging: r(1), carwash: r(1), mosque: r(1), church: r(2), worshipOther: 0, agri: r(2), craft: r(4), wells: r(2), taps: 0, waterWorks: 0, buildings: r(1500) }
}

export function profileOf(zone: Zone): ZoneProfile {
  const osm = OSM_ACTIVITIES.zones[zone.id]
  const sim = SIMULATED[zone.id] ?? GENERIC
  const radius = osm?.radiusKm ?? 1.5
  return {
    hhSize: 5,
    mix: sim.mix,
    boreholePower: { grid: 0.6, solar: 0.3, manual: 0.1 },
    storageHours: 10,
    floodExposure: sim.floodExposure,
    counts: osm?.counts ?? estimatedCounts(zone.households),
    countsSource: osm ? 'osm' : 'estimé',
    areaKm2: Math.PI * radius * radius,
  }
}

export const PROFILE_ZONE_IDS = Object.keys(SIMULATED) as ZoneId[]
