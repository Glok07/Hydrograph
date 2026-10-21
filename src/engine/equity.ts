import { HISTORY } from '../data/history'
import type { Zone, ZoneId } from '../data/network'
import type { ZoneForecast } from './forecast'

export interface ZoneEquity {
  zone: ZoneId
  /** heures d'eau sur sept jours : six jours simulés + aujourd'hui */
  series: number[]
  avgHours: number
  avgWithout: number
}

export interface Equity {
  zones: ZoneEquity[]
  /** classement des zones les plus souvent privées d'eau, la plus oubliée d'abord */
  forgotten: ZoneEquity[]
  /** écart en heures entre la zone la mieux et la moins bien servie, en moyenne */
  gap: number
  /** 0-100 : 100 = toutes les zones reçoivent autant d'eau */
  index: number
}

export function equityOf(zones: Zone[], today: ZoneForecast[]): Equity {
  const rows = zones.map((z) => {
    const series = [...HISTORY[z.id], today.find((f) => f.zone === z.id)!.hoursOfWater]
    const avgHours = series.reduce((a, b) => a + b, 0) / series.length
    return { zone: z.id, series, avgHours, avgWithout: 24 - avgHours }
  })
  const forgotten = [...rows].sort((a, b) => a.avgHours - b.avgHours)
  const gap = forgotten[forgotten.length - 1].avgHours - forgotten[0].avgHours
  return { zones: rows, forgotten, gap, index: Math.round(100 * (1 - gap / 24)) }
}
