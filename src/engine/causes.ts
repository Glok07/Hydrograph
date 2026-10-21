import type { Network, PipeId, ZoneId } from '../data/network'
import { applyEventsToContext } from './periods.js'
import type { PeriodContext } from './periods'
import type { EventType, HydroEvent } from './events'
import { downstream } from './graph.js'
import { SLOT_H, SLOT_STARTS, overlaps } from './slots.js'
import type { WaterType } from './waterTypes'

export type CauseGroup = 'energie' | 'reseau' | 'meteo' | 'ressource' | 'demande'

export const GROUP_LABEL: Record<CauseGroup, string> = {
  energie: 'Énergie et pompes',
  reseau: 'Réseau',
  meteo: 'Météo',
  ressource: 'Ressource',
  demande: 'Demande',
}

export interface CauseDef {
  id: EventType
  group: CauseGroup
  /** une phrase : ce que provoque la cause */
  hint: string
  /** types d'eau touchés */
  affects: WaterType[]
  /** la cause fait aussi grimper la demande */
  raisesDemand?: boolean
  /** vraie source future de la donnée (la démo la simule) */
  source: string
}

export const CAUSES: CauseDef[] = [
  { id: 'power_cut', group: 'energie', hint: 'Les pompes du réseau et des forages s’arrêtent.', affects: ['network', 'borehole'], source: 'Annonces de coupures SBEE, remontées des fontainiers' },
  { id: 'voltage_drop', group: 'energie', hint: 'Tension hors de la plage 370-420 V : les pompes tournent au ralenti, surtout en fin de réseau.', affects: ['network', 'borehole'], source: 'Mesures de tension SBEE et SoNEB' },
  { id: 'pump_failure', group: 'energie', hint: 'La station donne moitié moins ; les forages touchés ne donnent plus rien.', affects: ['network', 'borehole'], source: 'Journal de maintenance SoNEB, signalements des gérants d’AEV' },
  { id: 'maintenance', group: 'reseau', hint: 'Débit réduit pendant des travaux planifiés par l’opérateur.', affects: ['network'], source: 'Planning de travaux SoNEB' },
  { id: 'pipe_burst', group: 'reseau', hint: 'Les zones en aval sont coupées ; l’eau qui revient est suspecte.', affects: ['network'], source: 'Signalements d’habitants, capteurs de pression' },
  { id: 'leak', group: 'reseau', hint: 'Fuites diffuses : moins de débit et de pression en bout de réseau.', affects: ['network'], source: 'Bilan débits entrée/sortie, capteurs de pression' },
  { id: 'heavy_rain', group: 'meteo', hint: 'Les puits et l’eau stockée se salissent ; la pluie recueillie allonge la réserve.', affects: ['well', 'borehole', 'stored'], source: 'API météo (Open-Meteo, Météo-Bénin)' },
  { id: 'flood', group: 'meteo', hint: 'Les crues contaminent les puits, les forages et le réseau dans les zones basses.', affects: ['network', 'borehole', 'well', 'stored'], source: 'Cartographie des zones inondables, alertes de crue' },
  { id: 'dry_season', group: 'ressource', hint: 'La nappe baisse : puits qui tarissent, forages moins productifs, réseau moins alimenté.', affects: ['network', 'borehole', 'well'], raisesDemand: true, source: 'Calendrier, niveaux de nappe des forages' },
  { id: 'heat_wave', group: 'ressource', hint: 'On boit et on arrose plus ; l’eau stockée se dégrade plus vite.', affects: ['stored'], raisesDemand: true, source: 'API météo' },
  { id: 'market_day', group: 'demande', hint: 'Pic de consommation dans les zones à marché.', affects: [], raisesDemand: true, source: 'Calendrier des marchés' },
  { id: 'festival', group: 'demande', hint: 'Cuisine, boissons et réceptions : la demande des ménages et de la restauration monte.', affects: [], raisesDemand: true, source: 'Calendrier officiel des jours fériés' },
]

export const CAUSE_BY_ID = Object.fromEntries(CAUSES.map((c) => [c.id, c])) as Record<EventType, CauseDef>

/**
 * Situation d'une journée une fois toutes les causes appliquées. Le moteur de distribution
 * (forecast.ts, rounds.ts) lit la capacité et les conduites ; le calcul d'impact par type d'eau
 * (impact.ts) lit le reste.
 */
export interface Scenario {
  events: HydroEvent[]
  ctx: PeriodContext
  /** capacité du château d'eau à chaque créneau */
  capacity: number[]
  broken: Set<PipeId>
  /** pression perdue en plus, par saut de conduite */
  pressureLoss: number
  /** heures (0 à 23) sans courant sur le réseau électrique */
  gridOutage: boolean[]
  /** rendement des forages, 0 à 1 */
  boreholeYield: number
  boreholeDown: Set<ZoneId>
  /** niveau d'eau dans les puits, 0 à 1 */
  wellLevel: number
  rain: boolean
  /** une inondation est en cours ; floodZones la limite à certaines zones */
  flood: boolean
  floodZones: Set<ZoneId> | null
  /** hausses de risque sanitaire par type d'eau (0 à 1, s'ajoutent à la base de chaque type) */
  quality: Record<WaterType, number>
  /** zones où l'eau du réseau est suspecte (conduite cassée en amont) */
  networkHit: Set<ZoneId>
  storageFactor: number
  /** heures d'autonomie gagnées en recueillant la pluie */
  rainwaterH: number
}

type Apply = (s: Scenario, e: HydroEvent, net: Network) => void

function capacityWindow(s: Scenario, e: HydroEvent, factor: number) {
  SLOT_STARTS.forEach((start, i) => {
    if (overlaps(start, start + SLOT_H, e.startsAt, e.startsAt + e.durationH)) s.capacity[i] *= factor
  })
}

const APPLY: Record<EventType, Apply> = {
  power_cut: (s, e) => {
    capacityWindow(s, e, 0.25)
    for (let h = 0; h < 24; h++) if (h >= e.startsAt && h < e.startsAt + e.durationH) s.gridOutage[h] = true
    s.quality.network += 0.08
  },
  voltage_drop: (s, e) => {
    capacityWindow(s, e, 0.65)
    s.boreholeYield *= 0.85
    s.quality.network += 0.03
  },
  pump_failure: (s, e, net) => {
    capacityWindow(s, e, 0.5)
    for (const z of e.zones ?? net.zones.map((z) => z.id)) s.boreholeDown.add(z)
  },
  maintenance: (s, e) => capacityWindow(s, e, 0.7),
  pipe_burst: (s, e, net) => {
    if (!e.pipe) return
    s.broken.add(e.pipe)
    const cut = net.pipes.find((p) => p.id === e.pipe)
    if (cut) for (const z of [cut.to, ...downstream(net, cut.to)]) s.networkHit.add(z)
  },
  leak: (s) => {
    s.capacity = s.capacity.map((c) => c * 0.85)
    s.pressureLoss += 0.05
    s.quality.network += 0.04
  },
  heavy_rain: (s) => {
    s.rain = true
    s.quality.well += 0.35
    s.quality.borehole += 0.08
    s.quality.network += 0.04
    s.quality.stored += 0.15
    s.rainwaterH += 4
  },
  flood: (s, e) => {
    s.flood = true
    if (e.zones) s.floodZones = new Set([...(s.floodZones ?? []), ...e.zones])
  },
  dry_season: (s) => {
    s.wellLevel *= 0.55
    s.boreholeYield *= 0.8
    s.capacity = s.capacity.map((c) => c * 0.9)
    s.quality.well += 0.1
  },
  heat_wave: (s) => {
    s.storageFactor *= 0.8
    s.quality.stored += 0.12
  },
  // Ces deux causes ne changent que le contexte de la journée (voir applyEventsToContext).
  market_day: () => {},
  festival: () => {},
}

export function buildScenario(net: Network, events: HydroEvent[], baseCtx: PeriodContext): Scenario {
  const s: Scenario = {
    events,
    ctx: applyEventsToContext(baseCtx, events),
    capacity: SLOT_STARTS.map(() => net.tower.capacity),
    broken: new Set(),
    pressureLoss: 0,
    gridOutage: Array<boolean>(24).fill(false),
    boreholeYield: 1,
    boreholeDown: new Set(),
    wellLevel: 1,
    rain: false,
    flood: false,
    floodZones: null,
    quality: { network: 0, borehole: 0, well: 0, stored: 0 },
    networkHit: new Set(),
    storageFactor: 1,
    rainwaterH: 0,
  }
  for (const e of events) APPLY[e.type](s, e, net)
  return s
}
