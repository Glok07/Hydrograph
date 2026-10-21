import { describe, expect, it } from 'vitest'
import { CALAVI } from '../../data/network'
import { DEFAULT_EVENTS } from '../events'
import { equityOf } from '../equity'
import { forecast } from '../forecast'
import { buildMessage, slotRanges } from '../messages'
import { planRounds } from '../rounds'

describe('équité', () => {
  it('désigne Hêvié, en bout de réseau, comme la zone la plus oubliée', () => {
    const eq = equityOf(CALAVI.zones, forecast(CALAVI, null))
    expect(eq.forgotten[0].zone).toBe('Z6')
    expect(eq.gap).toBeGreaterThan(10)
  })
  it('l’indice monte quand les tours d’eau partagent mieux', () => {
    const before = equityOf(CALAVI.zones, forecast(CALAVI, null)).index
    const after = equityOf(CALAVI.zones, planRounds(CALAVI, null)).index
    expect(after).toBeGreaterThan(before)
  })
})

describe('messages', () => {
  it('fusionne les créneaux consécutifs', () => {
    expect(slotRanges([{ start: 5, end: 7 }, { start: 7, end: 9 }, { start: 15, end: 17 }])).toEqual(['5 h-9 h', '15 h-17 h'])
  })
  it('annonce l’absence d’eau et un conseil quand la zone est coupée', () => {
    const z6 = CALAVI.zones[5]
    const f = forecast(CALAVI, DEFAULT_EVENTS.pipe_burst)[5]
    expect(f.hoursOfWater).toBe(0)
    expect(buildMessage('pipe_burst', z6, f, false).body).toContain('Pas d’eau prévue')
  })
  it('annonce les créneaux quand il y a de l’eau', () => {
    const z6 = CALAVI.zones[5]
    const f = forecast(CALAVI, null)[5]
    expect(f.hoursOfWater).toBeGreaterThan(0)
    expect(buildMessage(null, z6, f, false).body).toContain('L’eau viendra')
  })
})
