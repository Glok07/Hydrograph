import type { Network, ZoneId } from '../data/network'
import { SLOT_H, SLOT_STARTS, conditionsFor, demandAt, isPeak } from './conditions'
import type { HydroEvent } from './events'
import { toForecast } from './forecast'
import type { Slot, ZoneForecast } from './forecast'
import { isReachable } from './graph'

/**
 * Score de priorité d'un créneau : le moins servi passe d'abord (équité),
 * la distance au château d'eau départage les ex æquo et compense la pression perdue.
 */
const W_SERVED = 1
const W_DEPTH = 0.35

/** Heure où l'on préfère placer le créneau garanti : les familles s'organisent l'après-midi. */
const PREFERRED_GUARANTEE_HOUR = 16

/**
 * Tours d'eau HydroGraph : un créneau est réservé d'avance à la zone la plus
 * éloignée encore reliée, puis chaque créneau va d'abord aux zones les
 * moins servies jusque-là.
 */
export function planRounds(net: Network, event: HydroEvent | null): ZoneForecast[] {
  const cond = conditionsFor(net, event)
  const connected = net.zones.filter((z) => isReachable(net, z.id, cond.broken))
  const slots = new Map<ZoneId, Slot[]>(net.zones.map((z) => [z.id, []]))
  const left = [...cond.capacity]

  const farthest = [...connected].sort((a, b) => b.depth - a.depth)[0]
  if (farthest) {
    const candidates = SLOT_STARTS.map((start, i) => ({ start, i }))
      .filter(({ start, i }) => !isPeak(start) && left[i] >= demandAt(farthest, start))
      .sort(
        (a, b) =>
          left[b.i] - left[a.i] ||
          Math.abs(a.start - PREFERRED_GUARANTEE_HOUR) - Math.abs(b.start - PREFERRED_GUARANTEE_HOUR),
      )
    const best = candidates[0]
    if (best) {
      left[best.i] -= demandAt(farthest, best.start)
      slots.get(farthest.id)!.push({ start: best.start, end: best.start + SLOT_H, guaranteed: true })
    }
  }

  SLOT_STARTS.forEach((start, i) => {
    const order = connected
      .filter((z) => !slots.get(z.id)!.some((s) => s.start === start))
      .map((z) => ({
        z,
        score: -W_SERVED * slots.get(z.id)!.length + W_DEPTH * z.depth,
      }))
      .sort((a, b) => b.score - a.score)

    for (const { z } of order) {
      const need = demandAt(z, start)
      if (need <= left[i]) {
        left[i] -= need
        slots.get(z.id)!.push({ start, end: start + SLOT_H })
      }
    }
  })

  return net.zones.map((z) => {
    const s = slots.get(z.id)!.sort((a, b) => a.start - b.start)
    return toForecast(z.id, s, cond.qualityRisk.has(z.id))
  })
}
