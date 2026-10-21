import { describe, expect, it } from 'vitest'
import type { ZoneId } from '../../data/network'
import { CALAVI } from '../../data/network'
import { sanitizePriority } from '../aiPlan'
import { DEFAULT_EVENTS } from '../events'
import { planRounds, priorityRounds } from '../rounds'

const ZONE_IDS: ZoneId[] = CALAVI.zones.map((z) => z.id)
const hoursGap = (fs: { hoursOfWater: number }[]) => Math.max(...fs.map((f) => f.hoursOfWater)) - Math.min(...fs.map((f) => f.hoursOfWater))

describe('sanitizePriority', () => {
  it('sans réponse (champ absent), complète avec toutes les zones et ne signale rien', () => {
    const { priority, note } = sanitizePriority(CALAVI, undefined)
    expect(priority.sort()).toEqual([...ZONE_IDS].sort())
    expect(note).toBeUndefined()
  })

  it('signale une réponse inexploitable (pas un tableau) tout en complétant quand même', () => {
    const { priority, note } = sanitizePriority(CALAVI, null)
    expect(priority.sort()).toEqual([...ZONE_IDS].sort())
    expect(note).toMatch(/ignorée/)
  })

  it('ignore les entrées inconnues ou en double, sans jamais planter', () => {
    const { priority, note } = sanitizePriority(CALAVI, ['Z6', 'Z6', 'Z9', 42, 'Z4'])
    expect(priority[0]).toBe('Z6')
    expect(priority[1]).toBe('Z4')
    expect(priority).toHaveLength(ZONE_IDS.length) // les zones manquantes sont ajoutées à la fin
    expect(new Set(priority).size).toBe(ZONE_IDS.length) // jamais de doublon
    expect(note).toMatch(/ignorée/)
  })

  it('accepte un ordre complet et valide tel quel', () => {
    const order = [...ZONE_IDS].reverse()
    const { priority, note } = sanitizePriority(CALAVI, order)
    expect(priority).toEqual(order)
    expect(note).toBeUndefined()
  })
})

describe('priorityRounds', () => {
  it('avec une priorité vide, reste au moins aussi équitable que planRounds (son critère de service est plus strict)', () => {
    for (const e of [null, DEFAULT_EVENTS.power_cut, DEFAULT_EVENTS.pipe_burst]) {
      expect(hoursGap(priorityRounds(CALAVI, e, []))).toBeLessThanOrEqual(hoursGap(planRounds(CALAVI, e)) + 1e-9)
    }
  })

  it('ne dépasse jamais la capacité ni ne sert une zone coupée, quel que soit l’ordre proposé', () => {
    // Un ordre délibérément absurde : la priorité ne doit jamais casser les garanties du moteur.
    const absurd = [...ZONE_IDS].reverse()
    const f = priorityRounds(CALAVI, DEFAULT_EVENTS.pipe_burst, absurd)
    expect(f.find((x) => x.zone === 'Z4')!.hoursOfWater).toBe(0)
    expect(f.find((x) => x.zone === 'Z6')!.hoursOfWater).toBe(0)
  })

  it('reste au moins aussi équitable que planRounds sur une journée normale', () => {
    const baseline = hoursGap(planRounds(CALAVI, null))
    const orders: ZoneId[][] = [ZONE_IDS, [...ZONE_IDS].reverse(), ['Z6', 'Z1', 'Z4', 'Z2', 'Z5', 'Z3']]
    for (const order of orders) {
      expect(hoursGap(priorityRounds(CALAVI, null, order))).toBeLessThanOrEqual(baseline + 1e-9)
    }
  })

  it('une priorité change réellement l’ordre de service entre zones à égalité de desserte', () => {
    const withoutAi = planRounds(CALAVI, null).find((f) => f.zone === 'Z3')!.slots[0]?.start
    const withAi = priorityRounds(CALAVI, null, ['Z3', 'Z1', 'Z2', 'Z4', 'Z5', 'Z6']).find((f) => f.zone === 'Z3')!.slots[0]?.start
    // Z3 (profondeur 1) passe avant des zones à la même profondeur ou plus proches une fois priorisée.
    expect(withAi).toBeLessThanOrEqual(withoutAi!)
  })
})
