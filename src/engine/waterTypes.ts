/**
 * Les quatre « types d'eau » qu'une famille utilise. Chaque cause (coupure, pluie, sécheresse…)
 * les touche différemment : c'est ce qui permet de voir pourquoi une zone manque d'eau
 * ou d'eau sûre, et vers quoi les foyers se rabattent.
 */
export type WaterType = 'network' | 'borehole' | 'well' | 'stored'

export const WATER_TYPES: WaterType[] = ['network', 'borehole', 'well', 'stored']

export const WATER_TYPE_LABEL: Record<WaterType, string> = {
  network: 'Robinet (réseau SoNEB)',
  borehole: 'Forage / borne fontaine',
  well: 'Puits',
  stored: 'Eau stockée à domicile',
}

export const WATER_TYPE_SHORT: Record<WaterType, string> = {
  network: 'Robinet',
  borehole: 'Forage',
  well: 'Puits',
  stored: 'Stockée',
}

/** Ce qui rend chaque type vulnérable : affiché dans l'aide de la fiche de zone. */
export const WATER_TYPE_HINT: Record<WaterType, string> = {
  network: 'Dépend de la pompe, du courant, de la pression et des conduites.',
  borehole: 'Dépend du courant (ou du soleil), du niveau de la nappe et de la pompe.',
  well: 'Pas de courant ni de conduite, mais la nappe baisse en saison sèche et se pollue avec la pluie.',
  stored: 'Réserve des familles : elle tient quelques heures, puis se dégrade (chaleur, durée).',
}

export type QualityLevel = 'good' | 'watch' | 'risk'

export const QUALITY_LABEL: Record<QualityLevel, string> = {
  good: 'Sûre',
  watch: 'À surveiller',
  risk: 'À risque',
}

/** Seuils du score de risque sanitaire (0 = sûre, 1 = très contaminée). */
export const WATCH_AT = 0.3
export const RISK_AT = 0.55

export const levelOf = (q: number): QualityLevel => (q >= RISK_AT ? 'risk' : q >= WATCH_AT ? 'watch' : 'good')
