import type { Network, PipeId, ZoneId } from '../data/network'
import type { Equity } from './equity'
import { EVENT_LABEL } from './events.js'
import type { EventType } from './events'
import type { ZoneExplanation } from './explain'
import type { ZoneForecast } from './forecast'
import { PERIODS } from './periods.js'

export interface ChatZoneSnapshot {
  id: ZoneId
  name: string
  depth: number
  wells: boolean
  status: string
  hoursOfWater: number
  qualityRisk: boolean
  /** « coupure de courant : -4 h » pour les deux causes qui pèsent le plus, s'il y en a. */
  mainCauses: string[]
}

export interface ChatSnapshot {
  view: string
  selectedZone: ZoneId
  period: string
  causes: string[]
  planApplied: boolean
  tower: { name: string; capacity: number }
  zones: ChatZoneSnapshot[]
  brokenPipes: { id: PipeId; from: string; to: string }[]
  equityIndex: number
  equityGapHours: number
}

/**
 * Résumé compact de l'état courant de l'application, envoyé au chatbot à chaque message pour
 * qu'il réponde sur la situation réellement affichée à l'écran, pas une situation générique.
 * Calculé côté client (où vit l'état de l'interface), jamais côté serveur.
 */
export function buildChatSnapshot(
  net: Network,
  view: string,
  selectedZone: ZoneId,
  period: string,
  causes: EventType[],
  planApplied: boolean,
  shown: ZoneForecast[],
  explanation: Record<ZoneId, ZoneExplanation>,
  broken: ReadonlySet<PipeId>,
  equity: Equity,
): ChatSnapshot {
  const nameOf = (id: ZoneId | 'TOWER') => (id === 'TOWER' ? net.tower.name : net.zones.find((z) => z.id === id)!.name)

  return {
    view,
    selectedZone,
    period,
    causes: causes.map((c) => EVENT_LABEL[c]),
    planApplied,
    tower: { name: net.tower.name, capacity: net.tower.capacity },
    zones: net.zones.map((z) => {
      const f = shown.find((x) => x.zone === z.id)!
      const exp = explanation[z.id]
      return {
        id: z.id,
        name: z.name,
        depth: z.depth,
        wells: z.wells,
        status: f.status,
        hoursOfWater: f.hoursOfWater,
        qualityRisk: f.qualityRisk,
        mainCauses: exp.causes.slice(0, 2).map((c) => `${c.label} : ${c.hoursLost >= 0 ? '-' : '+'}${Math.abs(c.hoursLost)} h`),
      }
    }),
    brokenPipes: [...broken].map((id) => {
      const p = net.pipes.find((x) => x.id === id)!
      return { id, from: nameOf(p.from), to: nameOf(p.to) }
    }),
    equityIndex: equity.index,
    equityGapHours: Math.round(equity.gap * 10) / 10,
  }
}

/** Réglage que le chatbot peut proposer d'appliquer à l'interface, à la place des contrôles habituels. */
export interface ChatAction {
  causes?: EventType[]
  period?: string
  zone?: ZoneId
  plan?: boolean
}

const EVENT_IDS = new Set(Object.keys(EVENT_LABEL))
const PERIOD_IDS = new Set(PERIODS.map((p) => p.id))

/**
 * Garde-fou avant d'appliquer une action proposée par le chatbot à l'état de l'application :
 * seuls des identifiants connus passent, le reste est silencieusement ignoré. Jamais de champ
 * arbitraire injecté dans le store depuis une réponse de l'IA.
 */
export function sanitizeChatAction(net: Network, raw: unknown): ChatAction | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const zoneIds = new Set(net.zones.map((z) => z.id as string))
  const out: ChatAction = {}

  if (Array.isArray(r.causes)) {
    const causes = r.causes.filter((c): c is EventType => typeof c === 'string' && EVENT_IDS.has(c))
    if (causes.length) out.causes = causes
  }
  if (typeof r.period === 'string' && PERIOD_IDS.has(r.period)) out.period = r.period
  if (typeof r.zone === 'string' && zoneIds.has(r.zone)) out.zone = r.zone as ZoneId
  if (typeof r.plan === 'boolean') out.plan = r.plan

  return Object.keys(out).length ? out : null
}
