import type { Network, Zone, ZoneId } from '../data/network'
import { SLOT_H, SLOT_STARTS, conditionsFor, demandAt, isPeak } from './conditions.js'
import type { HydroEvent } from './events'
import { finalize, toForecast } from './forecast.js'
import type { Slot, ZoneForecast } from './forecast'
import { isReachable } from './graph.js'
import { REFERENCE_PERIOD } from './periods.js'
import type { PeriodContext } from './periods'

/**
 * Score de priorité d'un créneau : le moins servi passe d'abord (équité),
 * la distance au château d'eau départage les ex æquo et compense la pression perdue.
 */
const W_SERVED = 1
const W_DEPTH = 0.35

/** Heure où l'on préfère placer le créneau garanti : les familles s'organisent l'après-midi. */
const PREFERRED_GUARANTEE_HOUR = 16

/**
 * Cœur commun des tours d'eau : un créneau est réservé d'avance à la zone la plus éloignée
 * encore reliée, puis chaque créneau va aux zones dans l'ordre que donne scoreOf (score le
 * plus haut servi en premier). planRounds et priorityRounds ne diffèrent que par ce score.
 */
function rounds(net: Network, event: HydroEvent | HydroEvent[] | null, ctx: PeriodContext, scoreOf: (z: Zone, served: number) => number): ZoneForecast[] {
  const cond = conditionsFor(net, event, ctx)
  const connected = net.zones.filter((z) => isReachable(net, z.id, cond.broken))
  const slots = new Map<ZoneId, Slot[]>(net.zones.map((z) => [z.id, []]))
  const left = [...cond.capacity]

  const farthest = [...connected].sort((a, b) => b.depth - a.depth)[0]
  if (farthest) {
    const candidates = SLOT_STARTS.map((start, i) => ({ start, i }))
      .filter(({ start, i }) => !isPeak(start) && left[i] >= demandAt(farthest, start, cond))
      .sort(
        (a, b) =>
          left[b.i] - left[a.i] ||
          Math.abs(a.start - PREFERRED_GUARANTEE_HOUR) - Math.abs(b.start - PREFERRED_GUARANTEE_HOUR),
      )
    const best = candidates[0]
    if (best) {
      left[best.i] -= demandAt(farthest, best.start, cond)
      slots.get(farthest.id)!.push({ start: best.start, end: best.start + SLOT_H, guaranteed: true })
    }
  }

  SLOT_STARTS.forEach((start, i) => {
    const order = connected
      .filter((z) => !slots.get(z.id)!.some((s) => s.start === start))
      .map((z) => ({ z, score: scoreOf(z, slots.get(z.id)!.length) }))
      .sort((a, b) => b.score - a.score)

    for (const { z } of order) {
      const need = demandAt(z, start, cond)
      if (need <= left[i]) {
        left[i] -= need
        slots.get(z.id)!.push({ start, end: start + SLOT_H })
      }
    }
  })

  return finalize(
    net,
    cond,
    net.zones.map((z) => toForecast(z.id, slots.get(z.id)!.sort((a, b) => a.start - b.start), false)),
  )
}

/**
 * Tours d'eau HydroGraph : chaque créneau va d'abord aux zones les moins
 * servies jusque-là, la distance au château d'eau départageant les ex æquo.
 */
export function planRounds(net: Network, event: HydroEvent | HydroEvent[] | null, ctx: PeriodContext = REFERENCE_PERIOD): ZoneForecast[] {
  return rounds(net, event, ctx, (z, served) => -W_SERVED * served + W_DEPTH * z.depth)
}

/**
 * Mêmes tours d'eau, mais l'ordre de priorité donné par l'IA (priority, de la zone la plus
 * urgente à la moins urgente) départage les zones à égalité de créneaux déjà reçus, à la
 * place de la seule distance. Le nombre de créneaux déjà servis reste l'unique critère
 * dominant (poids très supérieur à la priorité et à la distance) : une zone moins servie
 * passe toujours avant une zone plus servie, quel que soit l'ordre proposé par l'IA — une
 * priorité farfelue ne peut donc jamais aggraver l'écart d'équité, seulement redistribuer
 * entre zones déjà à égalité. Ce critère est strictement dominant, contrairement à celui de
 * planRounds où la distance peut très rarement l'emporter sur un seul créneau d'écart : avec
 * priority: [], le résultat est donc au moins aussi équitable que planRounds, sans lui être
 * forcément identique créneau par créneau.
 */
export function priorityRounds(net: Network, event: HydroEvent | HydroEvent[] | null, priority: ZoneId[], ctx: PeriodContext = REFERENCE_PERIOD): ZoneForecast[] {
  const rank = new Map(priority.map((id, i) => [id, i]))
  const last = net.zones.length
  return rounds(net, event, ctx, (z, served) => -1000 * served - (rank.get(z.id) ?? last) + 0.01 * z.depth)
}
