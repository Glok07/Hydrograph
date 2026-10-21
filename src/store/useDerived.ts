import { useMemo } from 'react'
import { CALAVI } from '../data/network'
import { conditionsFor } from '../engine/conditions'
import { DEFAULT_EVENTS } from '../engine/events'
import { explain } from '../engine/explain'
import { forecast } from '../engine/forecast'
import { periodById } from '../engine/periods'
import { planRounds } from '../engine/rounds'
import { useHydro } from './useHydro'

/** Tout ce que les vues affichent, calculé à partir des causes, de la période et du mode choisis. */
export function useDerived() {
  const causes = useHydro((s) => s.causes)
  const plan = useHydro((s) => s.plan)
  const period = useHydro((s) => s.period)

  return useMemo(() => {
    const events = causes.map((c) => DEFAULT_EVENTS[c])
    const ctx = periodById(period)
    const before = forecast(CALAVI, events, ctx)
    const after = planRounds(CALAVI, events, ctx)
    // Le constat de référence : même période, sans incident
    const baseline = forecast(CALAVI, [], ctx)
    const shown = plan ? after : before
    const touched = shown.filter((f, i) => f.status !== baseline[i].status).length
    const cond = conditionsFor(CALAVI, events, ctx)
    return { events, ctx: cond.ctx, before, after, baseline, shown, touched, broken: cond.broken, explanation: explain(CALAVI, events, ctx) }
  }, [causes, plan, period])
}

export const gapOf = (fs: { hoursOfWater: number }[]) =>
  Math.max(...fs.map((f) => f.hoursOfWater)) - Math.min(...fs.map((f) => f.hoursOfWater))
