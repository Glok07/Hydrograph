import type { Network, PipeId, Zone, ZoneId } from '../data/network'
import { buildScenario } from './causes.js'
import type { Scenario } from './causes'
import { demandIndex } from './demand.js'
import { toEvents } from './events.js'
import type { HydroEvent } from './events'
import { qualityRiskZones } from './impact.js'
import { REFERENCE_PERIOD } from './periods.js'
import type { PeriodContext } from './periods'
import { SLOT_H, overlaps } from './slots.js'

export { DAY_START, SLOT_COUNT, SLOT_H, SLOT_STARTS } from './slots.js'

/** Heures de pointe des ménages : 6 h-8 h et 18 h-20 h (la demande réelle, elle, vient de demand.ts). */
const PEAKS: [number, number][] = [[6, 8], [18, 20]]
/** Pression perdue en bout de réseau : la demande effective grimpe avec la distance. */
const PRESSURE_PENALTY = 0.1

export const isPeak = (start: number) => PEAKS.some(([a, b]) => overlaps(start, start + SLOT_H, a, b))

export interface Conditions {
  /** capacité du château d'eau pour chaque créneau */
  capacity: number[]
  /** conduites hors service */
  broken: Set<PipeId>
  /** zones dont l'eau est à risque sanitaire, indépendamment du rationnement */
  qualityRisk: Set<ZoneId>
  /** contexte de la journée une fois les causes de situation appliquées (marché, fête, chaleur…) */
  ctx: PeriodContext
  scenario: Scenario
}

/** Un événement seul (comme avant), une liste de causes cumulées, ou rien. */
export function conditionsFor(net: Network, event: HydroEvent | HydroEvent[] | null, ctx: PeriodContext = REFERENCE_PERIOD): Conditions {
  const scenario = buildScenario(net, toEvents(event), ctx)
  return { capacity: scenario.capacity, broken: scenario.broken, qualityRisk: qualityRiskZones(net, scenario), ctx: scenario.ctx, scenario }
}

/**
 * Demande de la zone au réseau pendant un créneau. `zone.demand` est le niveau de référence
 * (creux de journée) ; le modèle d'activités (demand.ts) donne la forme selon l'heure et la période.
 */
export function demandAt(zone: Zone, slotStart: number, cond?: Conditions): number {
  const ctx = cond?.ctx ?? REFERENCE_PERIOD
  const loss = cond?.scenario.pressureLoss ?? 0
  return zone.demand * demandIndex(zone, slotStart, SLOT_H, ctx) * (1 + (PRESSURE_PENALTY + loss) * zone.depth)
}
