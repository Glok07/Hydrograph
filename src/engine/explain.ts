import type { Network, ZoneId } from '../data/network'
import { CAUSE_BY_ID } from './causes.js'
import { EVENT_LABEL } from './events.js'
import type { EventType, HydroEvent } from './events'
import { forecast } from './forecast.js'
import { REFERENCE_PERIOD } from './periods.js'
import type { PeriodContext } from './periods'

/** Ce qu'une cause (ou la période) change dans une zone, par rapport à la même journée sans elle. */
export interface CauseShare {
  cause: EventType | 'period'
  label: string
  hint: string
  /** heures d'eau au robinet perdues (négatif : gagnées) */
  hoursLost: number
  /** points de foyers exposés à une eau à risque en plus (0.2 = 20 points) */
  exposedDelta: number
}

export interface ZoneExplanation {
  /** heures d'eau un jour ordinaire sans incident */
  baselineHours: number
  hours: number
  hoursLost: number
  causes: CauseShare[]
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * Attribue à chaque cause sa part de l'écart : on rejoue la journée en retirant la cause,
 * et on mesure ce qu'elle changeait. Les parts ne s'additionnent pas toujours exactement
 * (deux causes qui se cumulent peuvent s'amplifier), c'est pourquoi `hoursLost` global est donné à part.
 */
export function explain(net: Network, events: HydroEvent[], ctx: PeriodContext = REFERENCE_PERIOD): Record<ZoneId, ZoneExplanation> {
  const ordinary = forecast(net, [], REFERENCE_PERIOD)
  const noCause = forecast(net, [], ctx)
  const all = forecast(net, events, ctx)
  const without = events.map((e) => ({ e, f: forecast(net, events.filter((x) => x !== e), ctx) }))
  const exposedOf = (f: ReturnType<typeof forecast>[number]) => f.impact?.exposedShare ?? 0

  const out = {} as Record<ZoneId, ZoneExplanation>
  net.zones.forEach((z, i) => {
    const causes: CauseShare[] = []
    if (ctx.id !== REFERENCE_PERIOD.id) {
      const lost = ordinary[i].hoursOfWater - noCause[i].hoursOfWater
      if (lost !== 0) causes.push({ cause: 'period', label: ctx.label, hint: 'Contexte de la journée : activités des habitants, école, marché, chaleur.', hoursLost: round1(lost), exposedDelta: 0 })
    }
    for (const { e, f } of without) {
      const lost = f[i].hoursOfWater - all[i].hoursOfWater
      const exposed = exposedOf(all[i]) - exposedOf(f[i])
      if (Math.abs(lost) >= 0.01 || Math.abs(exposed) >= 0.01) {
        causes.push({ cause: e.type, label: EVENT_LABEL[e.type], hint: CAUSE_BY_ID[e.type].hint, hoursLost: round1(lost), exposedDelta: Math.round(exposed * 100) / 100 })
      }
    }
    causes.sort((a, b) => b.hoursLost - a.hoursLost || b.exposedDelta - a.exposedDelta)
    out[z.id] = { baselineHours: ordinary[i].hoursOfWater, hours: all[i].hoursOfWater, hoursLost: ordinary[i].hoursOfWater - all[i].hoursOfWater, causes }
  })
  return out
}
