import { useMemo } from 'react'
import { CALAVI } from '../data/network'
import { conditionsFor } from '../engine/conditions'
import { DEFAULT_EVENTS } from '../engine/events'
import { forecast } from '../engine/forecast'
import { planRounds } from '../engine/rounds'
import { useHydro } from './useHydro'

/** Tout ce que les vues affichent, calculé à partir de l'événement et du mode choisis. */
export function useDerived() {
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)

  return useMemo(() => {
    const ev = event ? DEFAULT_EVENTS[event] : null
    const before = forecast(CALAVI, ev)
    const after = planRounds(CALAVI, ev)
    const baseline = forecast(CALAVI, null)
    const shown = plan ? after : before
    const touched = shown.filter((f, i) => f.status !== baseline[i].status).length
    return { ev, before, after, baseline, shown, touched, broken: conditionsFor(CALAVI, ev).broken }
  }, [event, plan])
}

export const gapOf = (fs: { hoursOfWater: number }[]) =>
  Math.max(...fs.map((f) => f.hoursOfWater)) - Math.min(...fs.map((f) => f.hoursOfWater))
