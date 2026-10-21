import { describe, expect, it } from 'vitest'
import { CALAVI } from '../../data/network'
import { DEFAULT_EVENTS } from '../events'
import type { EventType } from '../events'
import { forecast } from '../forecast'
import { downstream, isReachable, pathFromTower } from '../graph'
import { planRounds } from '../rounds'

const status = (event: EventType | null) =>
  forecast(CALAVI, event ? DEFAULT_EVENTS[event] : null).map((f) => f.status)

describe('graphe', () => {
  it('trouve le chemin et les zones en aval', () => {
    expect(pathFromTower(CALAVI, 'Z6')).toEqual(['P0', 'P1', 'P3', 'P5'])
    expect(downstream(CALAVI, 'Z2')).toEqual(['Z4', 'Z6'])
  })
  it('une conduite cassée coupe les zones en aval', () => {
    expect(isReachable(CALAVI, 'Z6', new Set(['P3']))).toBe(false)
    expect(isReachable(CALAVI, 'Z5', new Set(['P3']))).toBe(true)
  })
})

describe('prévision', () => {
  it('est déterministe', () => {
    expect(forecast(CALAVI, null)).toEqual(forecast(CALAVI, null))
  })
  it('montre une inégalité de départ : la zone éloignée est la moins servie', () => {
    const base = forecast(CALAVI, null)
    const z6 = base.find((f) => f.zone === 'Z6')!
    expect(z6.status).toBe('risk')
    expect(Math.min(...base.map((f) => f.hoursOfWater))).toBe(z6.hoursOfWater)
  })
  it.each(['power_cut', 'heavy_rain', 'pipe_burst'] as const)('%s change au moins une couleur', (event) => {
    expect(status(event)).not.toEqual(status(null))
  })
  it('un tuyau cassé en P3 prive Z4 et Z6 sans toucher Z1, Z2, Z3', () => {
    const f = forecast(CALAVI, DEFAULT_EVENTS.pipe_burst)
    const hours = Object.fromEntries(f.map((x) => [x.zone, x.hoursOfWater]))
    expect(hours.Z4).toBe(0)
    expect(hours.Z6).toBe(0)
    const base = Object.fromEntries(forecast(CALAVI, null).map((x) => [x.zone, x.hoursOfWater]))
    for (const z of ['Z1', 'Z2', 'Z3']) expect(hours[z]).toBe(base[z])
  })
  it('une forte pluie met des zones à puits en risque qualité', () => {
    const f = forecast(CALAVI, DEFAULT_EVENTS.heavy_rain)
    expect(f.filter((x) => x.qualityRisk).map((x) => x.zone)).toEqual(['Z4', 'Z5', 'Z6'])
  })
})

describe('tours d’eau', () => {
  it('donnent un créneau garanti à la zone la plus éloignée après une coupure', () => {
    const z6 = planRounds(CALAVI, DEFAULT_EVENTS.power_cut).find((f) => f.zone === 'Z6')!
    expect(z6.slots.some((s) => s.guaranteed)).toBe(true)
    expect(z6.hoursOfWater).toBeGreaterThan(forecast(CALAVI, DEFAULT_EVENTS.power_cut).find((f) => f.zone === 'Z6')!.hoursOfWater)
  })
  it('réduisent l’écart entre la zone la mieux et la moins bien servie', () => {
    const gap = (fs: { hoursOfWater: number }[]) =>
      Math.max(...fs.map((f) => f.hoursOfWater)) - Math.min(...fs.map((f) => f.hoursOfWater))
    for (const e of [null, DEFAULT_EVENTS.power_cut, DEFAULT_EVENTS.heavy_rain]) {
      expect(gap(planRounds(CALAVI, e))).toBeLessThan(gap(forecast(CALAVI, e)))
    }
  })
  it('ne servent jamais une zone coupée du réseau', () => {
    const f = planRounds(CALAVI, DEFAULT_EVENTS.pipe_burst)
    expect(f.find((x) => x.zone === 'Z4')!.hoursOfWater).toBe(0)
    expect(f.find((x) => x.zone === 'Z6')!.hoursOfWater).toBe(0)
  })
})

describe('timelapse', () => {
  it('sait si une zone a l’eau à une heure donnée', async () => {
    const { servedAt } = await import('../forecast')
    const slots = [{ start: 9, end: 11 }, { start: 15, end: 17 }]
    expect(servedAt({ slots }, 10)).toBe(true)
    expect(servedAt({ slots }, 11)).toBe(false)
    expect(servedAt({ slots }, null)).toBe(true)
  })
})
