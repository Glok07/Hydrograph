import type { ZoneId } from './network'

/**
 * Heures d'eau des six derniers jours (simulées). Le septième point, « aujourd'hui »,
 * vient du moteur. Vraie source future : signalements d'habitants et données SoNEB.
 */
export const HISTORY: Record<ZoneId, number[]> = {
  Z1: [18, 18, 16, 18, 18, 17],
  Z2: [18, 16, 18, 16, 18, 18],
  Z3: [16, 18, 16, 18, 16, 16],
  Z4: [10, 12, 8, 10, 10, 12],
  Z5: [10, 8, 10, 12, 8, 10],
  Z6: [2, 0, 4, 0, 2, 0],
}
