import { describe, expect, it } from 'vitest'
import { CALAVI } from '../../data/network'
import { profileOf } from '../../data/profiles'
import { CAUSES, CAUSE_BY_ID } from '../causes'
import { conditionsFor } from '../conditions'
import { breakdown, dayVolumes, demandIndex, peakHour, totalDay } from '../demand'
import { DEFAULT_EVENTS, EVENT_LABEL } from '../events'
import type { EventType, HydroEvent } from '../events'
import { explain } from '../explain'
import { forecast } from '../forecast'
import { PERIODS, REFERENCE_PERIOD, periodById } from '../periods'
import { planRounds } from '../rounds'
import { WATER_TYPES } from '../waterTypes'

const ev = (...types: EventType[]): HydroEvent[] => types.map((t) => DEFAULT_EVENTS[t])
const zone = (id: string) => CALAVI.zones.find((z) => z.id === id)!
const hours = (fs: ReturnType<typeof forecast>, id: string) => fs.find((f) => f.zone === id)!.hoursOfWater
const impact = (fs: ReturnType<typeof forecast>, id: string) => fs.find((f) => f.zone === id)!.impact!

describe('catalogue des causes', () => {
  it('chaque cause a un libellé, un événement par défaut et une source', () => {
    for (const c of CAUSES) {
      expect(EVENT_LABEL[c.id]).toBeTruthy()
      expect(DEFAULT_EVENTS[c.id].type).toBe(c.id)
      expect(CAUSE_BY_ID[c.id].source).toBeTruthy()
    }
    expect(CAUSES.length).toBeGreaterThanOrEqual(12)
  })
  it('un événement seul et une liste donnent le même résultat', () => {
    expect(forecast(CALAVI, DEFAULT_EVENTS.power_cut)).toEqual(forecast(CALAVI, [DEFAULT_EVENTS.power_cut]))
  })
})

describe('modèle de demande', () => {
  it('la demande de référence vaut 1 en moyenne sur les créneaux creux d’un jour ordinaire', () => {
    for (const z of CALAVI.zones) {
      const mean = [9, 11, 13, 15, 21].reduce((s, h) => s + demandIndex(z, h, 2, REFERENCE_PERIOD), 0) / 5
      expect(mean).toBeCloseTo(1, 5)
    }
  })
  it('les écoles ne consomment presque pas en vacances ni le dimanche', () => {
    const z = zone('Z1')
    const ordinary = dayVolumes(z, periodById('ordinaire')).school
    expect(ordinary).toBeGreaterThan(0)
    expect(dayVolumes(z, periodById('vacances')).school).toBeLessThan(ordinary * 0.1)
    expect(dayVolumes(z, periodById('dimanche')).school).toBeLessThan(ordinary * 0.1)
  })
  it('les mosquées consomment plus le vendredi, les églises le dimanche', () => {
    const z = zone('Z1')
    expect(dayVolumes(z, periodById('vendredi')).mosque).toBeGreaterThan(dayVolumes(z, periodById('ordinaire')).mosque * 2)
    expect(dayVolumes(z, periodById('dimanche')).church).toBeGreaterThan(dayVolumes(z, periodById('ordinaire')).church * 2)
  })
  it('un jour de marché fait monter la demande des zones qui ont un marché, pas des autres', () => {
    for (const z of CALAVI.zones) {
      const more = totalDay(z, periodById('marche')) > totalDay(z, REFERENCE_PERIOD)
      expect(more).toBe(profileOf(z).counts.market > 0)
    }
  })
  it('la chaleur fait monter la demande de toutes les zones', () => {
    for (const z of CALAVI.zones) expect(totalDay(z, periodById('chaleur'))).toBeGreaterThan(totalDay(z, REFERENCE_PERIOD))
  })
  it('le pic de demande tombe le matin ou le soir', () => {
    for (const z of CALAVI.zones) expect([5, 6, 7, 17, 18, 19]).toContain(peakHour(z, REFERENCE_PERIOD))
  })
  it('les parts par activité font 100 %', () => {
    for (const z of CALAVI.zones) expect(breakdown(z, REFERENCE_PERIOD).reduce((s, a) => s + a.share, 0)).toBeCloseTo(1, 5)
  })
  it('la demande suit les activités : le centre, avec université et hôtels, pèse plus que Togba', () => {
    expect(totalDay(zone('Z1'), REFERENCE_PERIOD)).toBeGreaterThan(totalDay(zone('Z2'), REFERENCE_PERIOD))
  })
  it('toutes les périodes sont utilisables par le moteur', () => {
    for (const p of PERIODS) for (const f of forecast(CALAVI, [], p)) expect(f.hoursOfWater).toBeGreaterThanOrEqual(0)
  })
  it('chaque zone a un profil : mélange des sources à 100 %', () => {
    for (const z of CALAVI.zones) {
      const m = profileOf(z).mix
      expect(m.network + m.borehole + m.well).toBeCloseTo(1, 5)
    }
  })
})

describe('impact par type d’eau', () => {
  it('la pluie pollue les puits, pas le robinet, et ne change pas les heures d’eau', () => {
    const f = forecast(CALAVI, ev('heavy_rain'))
    const t = impact(f, 'Z6').types
    expect(t.well.level).toBe('risk')
    expect(t.network.level).toBe('good')
    expect(hours(f, 'Z6')).toBe(hours(forecast(CALAVI, []), 'Z6'))
  })
  it('la coupure de courant retire des heures au robinet et aux forages, pas aux puits', () => {
    const base = forecast(CALAVI, [])
    const cut = forecast(CALAVI, ev('power_cut'))
    expect(impact(cut, 'Z2').types.borehole.hours).toBeLessThan(impact(base, 'Z2').types.borehole.hours)
    expect(hours(cut, 'Z2')).toBeLessThan(hours(base, 'Z2'))
    expect(impact(cut, 'Z2').types.well.hours).toBe(impact(base, 'Z2').types.well.hours)
  })
  it('la saison sèche assèche les puits', () => {
    const dry = forecast(CALAVI, ev('dry_season'))
    expect(impact(dry, 'Z4').types.well.hours).toBeLessThan(impact(forecast(CALAVI, []), 'Z4').types.well.hours)
  })
  it('une conduite cassée rend l’eau du robinet suspecte en aval seulement', () => {
    const f = forecast(CALAVI, ev('pipe_burst'))
    expect(impact(f, 'Z4').types.network.level).toBe('risk')
    expect(impact(f, 'Z6').types.network.level).toBe('risk')
    expect(impact(f, 'Z1').types.network.level).toBe('good')
  })
  it('sans eau au robinet, les foyers se rabattent sur les forages et les puits', () => {
    const z = impact(forecast(CALAVI, ev('pipe_burst')), 'Z4')
    expect(z.fallbackShare).toBeCloseTo(profileOf(zone('Z4')).mix.network, 5)
    expect(z.types.well.share).toBeGreaterThan(z.types.well.nominal)
  })
  it('une panne de forage ne touche que les zones désignées', () => {
    const f = forecast(CALAVI, ev('pump_failure'))
    expect(impact(f, 'Z5').types.borehole.hours).toBe(0)
    expect(impact(f, 'Z1').types.borehole.hours).toBeGreaterThan(0)
  })
  it('la chaleur dégrade l’eau stockée', () => {
    const base = impact(forecast(CALAVI, []), 'Z1').types.stored.quality
    expect(impact(forecast(CALAVI, ev('heat_wave')), 'Z1').types.stored.quality).toBeGreaterThan(base)
  })
  it('l’inondation touche les zones basses plus que les autres', () => {
    const f = forecast(CALAVI, ev('flood'))
    expect(impact(f, 'Z3').types.well.quality).toBeGreaterThan(impact(f, 'Z1').types.well.quality)
  })
  it('les quatre types d’eau sont toujours renseignés', () => {
    for (const f of forecast(CALAVI, ev('power_cut', 'heavy_rain'))) for (const t of WATER_TYPES) expect(f.impact!.types[t]).toBeDefined()
  })
})

describe('causes cumulées', () => {
  it('coupure et pluie ensemble alertent des zones que la pluie seule n’alerte pas', () => {
    const rain = forecast(CALAVI, ev('heavy_rain'))
    const both = forecast(CALAVI, ev('power_cut', 'heavy_rain'))
    const worse = CALAVI.zones.filter((z) => !rain.find((f) => f.zone === z.id)!.qualityRisk && both.find((f) => f.zone === z.id)!.qualityRisk)
    expect(worse.length).toBeGreaterThan(0)
  })
  it('ajouter une cause n’améliore jamais les heures d’eau d’une zone', () => {
    const one = forecast(CALAVI, ev('power_cut'))
    const two = forecast(CALAVI, ev('power_cut', 'leak'))
    for (const z of CALAVI.zones) expect(hours(two, z.id)).toBeLessThanOrEqual(hours(one, z.id))
  })
  it('les tours d’eau tiennent avec plusieurs causes : créneau garanti à la zone la plus éloignée', () => {
    const plan = planRounds(CALAVI, ev('power_cut', 'leak'))
    expect(plan.find((f) => f.zone === 'Z6')!.slots.some((s) => s.guaranteed)).toBe(true)
  })
  it('les conduites cassées sont exposées par les conditions', () => {
    expect([...conditionsFor(CALAVI, ev('pipe_burst', 'power_cut')).broken]).toEqual(['P3'])
  })
})

describe('attribution des causes', () => {
  it('la pluie explique des foyers exposés, pas des heures', () => {
    const c = explain(CALAVI, ev('heavy_rain'), REFERENCE_PERIOD).Z6.causes.find((x) => x.cause === 'heavy_rain')!
    expect(c.hoursLost).toBe(0)
    expect(c.exposedDelta).toBeGreaterThan(0.3)
  })
  it('la coupure explique des heures perdues', () => {
    const c = explain(CALAVI, ev('power_cut'), REFERENCE_PERIOD).Z2.causes.find((x) => x.cause === 'power_cut')!
    expect(c.hoursLost).toBeGreaterThan(0)
  })
  it('la période apparaît comme une cause quand ce n’est pas un jour ordinaire', () => {
    expect(explain(CALAVI, [], periodById('chaleur')).Z5.causes.some((c) => c.cause === 'period')).toBe(true)
    expect(explain(CALAVI, [], REFERENCE_PERIOD).Z5.causes).toEqual([])
  })
  it('les heures globales sont celles du constat', () => {
    const f = forecast(CALAVI, ev('power_cut', 'leak'))
    const e = explain(CALAVI, ev('power_cut', 'leak'), REFERENCE_PERIOD)
    for (const z of CALAVI.zones) expect(e[z.id].hours).toBe(hours(f, z.id))
  })
  it('est déterministe', () => {
    expect(explain(CALAVI, ev('power_cut'), REFERENCE_PERIOD)).toEqual(explain(CALAVI, ev('power_cut'), REFERENCE_PERIOD))
  })
})
