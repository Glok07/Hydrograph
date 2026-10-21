import type { PeriodContext } from './periods'
import { isDrySeason, isWeekend } from './periods.js'

/**
 * Activités des habitants d'une zone qui consomment de l'eau. Chacune a un volume par unité,
 * une part raccordée au réseau, un profil horaire et des variations selon la période.
 *
 * Les volumes par unité sont des ordres de grandeur de calage, à valider avec la SoNEB et par
 * des relevés de compteurs. Le nombre d'unités vient d'OpenStreetMap (src/data/osm-activities.ts).
 */
export type ActivityId = 'domestic' | 'school' | 'university' | 'health' | 'market' | 'food' | 'lodging' | 'carwash' | 'mosque' | 'church' | 'agri' | 'craft'

export type ProfileId = 'domestic' | 'school' | 'commerce' | 'food' | 'lodging' | 'carwash' | 'midday' | 'morning' | 'agri' | 'craft' | 'health' | 'university'

export interface Activity {
  id: ActivityId
  label: string
  /** ce que compte « une unité » */
  unit: string
  /** m3 par unité et par jour, un jour ordinaire */
  m3PerUnitDay: number
  /** part de la consommation prise sur le réseau (les ménages dépendent du mélange de la zone) */
  networkShare: number
  profile: ProfileId
  color: string
}

export const ACTIVITIES: Record<ActivityId, Activity> = {
  domestic: { id: 'domestic', label: 'Ménages', unit: 'habitants', m3PerUnitDay: 0.03, networkShare: 0, profile: 'domestic', color: '#1d6fe0' },
  school: { id: 'school', label: 'Écoles', unit: 'établissements', m3PerUnitDay: 2.0, networkShare: 0.8, profile: 'school', color: '#7c3aed' },
  university: { id: 'university', label: 'Université', unit: 'sites', m3PerUnitDay: 45, networkShare: 0.9, profile: 'university', color: '#a855f7' },
  health: { id: 'health', label: 'Santé', unit: 'établissements', m3PerUnitDay: 9, networkShare: 0.9, profile: 'health', color: '#ef4444' },
  market: { id: 'market', label: 'Marchés', unit: 'marchés', m3PerUnitDay: 40, networkShare: 0.7, profile: 'commerce', color: '#f59e0b' },
  food: { id: 'food', label: 'Restauration', unit: 'établissements', m3PerUnitDay: 1.2, networkShare: 0.8, profile: 'food', color: '#f97316' },
  lodging: { id: 'lodging', label: 'Hôtels', unit: 'établissements', m3PerUnitDay: 3.5, networkShare: 0.9, profile: 'lodging', color: '#14b8a6' },
  carwash: { id: 'carwash', label: 'Lavage auto', unit: 'sites', m3PerUnitDay: 2.5, networkShare: 0.6, profile: 'carwash', color: '#06b6d4' },
  mosque: { id: 'mosque', label: 'Mosquées', unit: 'lieux', m3PerUnitDay: 0.7, networkShare: 0.7, profile: 'midday', color: '#10b981' },
  church: { id: 'church', label: 'Églises', unit: 'lieux', m3PerUnitDay: 0.5, networkShare: 0.7, profile: 'morning', color: '#84cc16' },
  agri: { id: 'agri', label: 'Maraîchage', unit: 'parcelles', m3PerUnitDay: 6, networkShare: 0.2, profile: 'agri', color: '#65a30d' },
  craft: { id: 'craft', label: 'Artisanat et ateliers', unit: 'sites', m3PerUnitDay: 1.8, networkShare: 0.6, profile: 'craft', color: '#64748b' },
}

export const ACTIVITY_IDS = Object.keys(ACTIVITIES) as ActivityId[]

type Band = [from: number, to: number, weight: number]

/** Construit un profil de 24 heures (somme = 1) à partir de tranches horaires pondérées. */
function profile(bands: Band[]): number[] {
  const raw = Array<number>(24).fill(0)
  for (const [from, to, w] of bands) for (let h = from; h <= to; h++) raw[h] = w
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map((v) => v / total)
}

/** Part de la consommation journalière d'une activité à chaque heure (0 h à 23 h). */
export const HOURLY: Record<ProfileId, number[]> = {
  domestic: profile([[0, 4, 0.2], [5, 6, 2.2], [7, 7, 2.6], [8, 10, 1.4], [11, 13, 1.6], [14, 16, 1.0], [17, 19, 2.0], [20, 21, 1.5], [22, 23, 0.5]]),
  school: profile([[7, 7, 1], [8, 11, 2], [12, 12, 1], [13, 15, 2]]),
  commerce: profile([[6, 9, 1], [10, 15, 2], [16, 18, 1.5]]),
  food: profile([[6, 9, 0.5], [11, 14, 2.5], [15, 17, 0.5], [18, 22, 2.5]]),
  lodging: profile([[5, 9, 2], [10, 16, 0.7], [17, 22, 2]]),
  carwash: profile([[8, 9, 1], [10, 15, 2], [16, 17, 1]]),
  midday: profile([[11, 11, 1], [12, 13, 3], [14, 14, 1]]),
  morning: profile([[6, 6, 1], [7, 10, 3], [11, 11, 1]]),
  agri: profile([[5, 8, 2.5], [9, 15, 0.3], [16, 19, 2.5]]),
  craft: profile([[7, 17, 1]]),
  health: profile([[6, 22, 1]]),
  university: profile([[8, 17, 1]]),
}

const heat = (ctx: PeriodContext) => 1 + 0.02 * Math.max(0, ctx.tempC - 30)

/** Variation de la consommation d'une activité selon la période, 1 = jour ordinaire. */
export function periodMultiplier(id: ActivityId, ctx: PeriodContext): number {
  const weekday = ctx.dow >= 1 && ctx.dow <= 5
  switch (id) {
    case 'domestic':
      return (isWeekend(ctx.dow) ? 1.1 : 1) * heat(ctx) * (ctx.festival ? 1.25 : 1)
    case 'school':
    case 'university':
      return ctx.schoolInSession ? (weekday ? 1 : ctx.dow === 6 ? 0.4 : 0.05) : 0.05
    case 'health':
      return 1
    case 'market':
      return (ctx.marketDay ? 2.5 : 1) * (ctx.dow === 0 ? 0.6 : 1)
    case 'food':
      return (isWeekend(ctx.dow) ? 1.3 : 1) * (ctx.festival ? 1.6 : 1)
    case 'lodging':
      return (isWeekend(ctx.dow) ? 1.15 : 1) * (ctx.festival ? 1.3 : 1)
    case 'carwash':
      return (ctx.dow === 6 ? 1.6 : ctx.dow === 0 ? 0.5 : 1) * (isDrySeason(ctx.month) ? 1.4 : 1)
    case 'mosque':
      return ctx.dow === 5 ? 3 : 1
    case 'church':
      return (ctx.dow === 0 ? 3 : 1) * (ctx.festival ? 1.3 : 1)
    case 'agri':
      return (isDrySeason(ctx.month) ? 3 : ctx.month === 8 ? 1.5 : 0.6) * heat(ctx)
    case 'craft':
      return weekday ? 1 : ctx.dow === 6 ? 0.5 : 0.1
  }
}
