import type { ZoneId } from './network'

/** Disposition schématique de la carte (repère 300 x 318), pas une carte géographique. */
export const MAP_VIEW = { w: 300, h: 318 }
export const TOWER_POS = { x: 150, y: 24 }

export const ZONE_POS: Record<ZoneId, { x: number; y: number; label: string }> = {
  Z1: { x: 150, y: 80, label: 'Calavi centre' },
  Z2: { x: 80, y: 144, label: 'Togba' },
  Z3: { x: 220, y: 144, label: 'Godomey' },
  Z4: { x: 70, y: 210, label: 'Ouèdo' },
  Z5: { x: 230, y: 210, label: 'Cococodji' },
  Z6: { x: 70, y: 276, label: 'Hêvié' },
}
