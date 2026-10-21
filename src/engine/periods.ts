import type { HydroEvent } from './events'

/**
 * Contexte d'une journée : tout ce qui change la demande en eau sans être une panne.
 * Le modèle de demande (demand.ts) s'en sert pour prévoir quelles zones consomment le plus.
 */
export interface PeriodContext {
  id: string
  label: string
  /** 0 = dimanche … 6 = samedi */
  dow: number
  /** 1 à 12 */
  month: number
  schoolInSession: boolean
  marketDay: boolean
  festival: boolean
  /** température maximale de l'après-midi, en °C */
  tempC: number
}

/**
 * Températures maximales moyennes par mois, ordre de grandeur pour le sud du Bénin.
 * Vraie source future : API météo (Open-Meteo, Météo-Bénin).
 */
export const MONTH_TEMP_C = [0, 31, 32, 32.5, 32, 31, 29, 28, 28, 29, 30, 31, 31]

/** Saison sèche principale (harmattan puis chaleur) : décembre à mars. */
export const isDrySeason = (month: number) => month === 12 || month <= 3

export const isWeekend = (dow: number) => dow === 0 || dow === 6

export const PERIODS: PeriodContext[] = [
  { id: 'ordinaire', label: 'Mercredi ordinaire', dow: 3, month: 10, schoolInSession: true, marketDay: false, festival: false, tempC: MONTH_TEMP_C[10] },
  { id: 'marche', label: 'Jour de marché', dow: 3, month: 10, schoolInSession: true, marketDay: true, festival: false, tempC: MONTH_TEMP_C[10] },
  { id: 'vendredi', label: 'Vendredi (prière)', dow: 5, month: 10, schoolInSession: true, marketDay: false, festival: false, tempC: MONTH_TEMP_C[10] },
  { id: 'samedi', label: 'Samedi', dow: 6, month: 10, schoolInSession: true, marketDay: false, festival: false, tempC: MONTH_TEMP_C[10] },
  { id: 'dimanche', label: 'Dimanche (offices)', dow: 0, month: 10, schoolInSession: true, marketDay: false, festival: false, tempC: MONTH_TEMP_C[10] },
  { id: 'vacances', label: 'Vacances scolaires', dow: 3, month: 8, schoolInSession: false, marketDay: false, festival: false, tempC: MONTH_TEMP_C[8] },
  { id: 'fete', label: 'Jour de fête', dow: 4, month: 8, schoolInSession: false, marketDay: false, festival: true, tempC: MONTH_TEMP_C[8] },
  { id: 'chaleur', label: 'Pic de chaleur (saison sèche)', dow: 3, month: 3, schoolInSession: true, marketDay: false, festival: false, tempC: 36 },
]

export const REFERENCE_PERIOD = PERIODS[0]

export const periodById = (id: string): PeriodContext => PERIODS.find((p) => p.id === id) ?? REFERENCE_PERIOD

/**
 * Certaines causes ne sont pas des pannes mais des situations : elles modifient le contexte
 * de la journée (jour de marché, fête, pic de chaleur, saison sèche).
 */
export function applyEventsToContext(ctx: PeriodContext, events: HydroEvent[]): PeriodContext {
  let out = ctx
  for (const e of events) {
    if (e.type === 'market_day') out = { ...out, marketDay: true }
    else if (e.type === 'festival') out = { ...out, festival: true }
    else if (e.type === 'heat_wave') out = { ...out, tempC: Math.max(out.tempC, 36) }
    else if (e.type === 'dry_season') out = { ...out, month: isDrySeason(out.month) ? out.month : 2, tempC: Math.max(out.tempC, 33) }
  }
  return out
}
