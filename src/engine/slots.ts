/** Journée de service : 9 créneaux de 2 h, de 5 h à 23 h. */
export const DAY_START = 5
export const SLOT_H = 2
export const SLOT_COUNT = 9
export const SLOT_STARTS = Array.from({ length: SLOT_COUNT }, (_, i) => DAY_START + i * SLOT_H)
/** Heures de la journée de service : 18. */
export const DAY_H = SLOT_H * SLOT_COUNT

export const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1
