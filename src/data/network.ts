export type ZoneId = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6'
export type PipeId = 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5'

export interface Zone {
  id: ZoneId
  name: string
  households: number
  /** demande par créneau de 2 h, hors pointe (unités de débit simulées) */
  demand: number
  /** nombre de sauts de conduite depuis le château d'eau */
  depth: number
  /** zone alimentée en partie par des puits : sensible aux fortes pluies */
  wells: boolean
}

export interface Pipe {
  id: PipeId
  from: ZoneId | 'TOWER'
  to: ZoneId
}

export interface Network {
  tower: { name: string; capacity: number }
  zones: Zone[]
  pipes: Pipe[]
}

/**
 * Réseau simulé sur Abomey-Calavi. Les localités et leurs positions sont réelles
 * (OpenStreetMap) ; le tracé des conduites et tous les chiffres sont des hypothèses
 * de démonstration. Deux branches : ouest (Togba, Ouèdo, Hêvié) et sud (Godomey, Cococodji).
 */
export const CALAVI: Network = {
  tower: { name: "Château d'eau (simulé)", capacity: 72 },
  zones: [
    { id: 'Z1', name: 'Abomey-Calavi centre', households: 4200, demand: 14, depth: 0, wells: false },
    { id: 'Z2', name: 'Togba', households: 3100, demand: 12, depth: 1, wells: false },
    { id: 'Z3', name: 'Godomey', households: 2800, demand: 10, depth: 1, wells: false },
    { id: 'Z4', name: 'Ouèdo', households: 3500, demand: 12, depth: 2, wells: true },
    { id: 'Z5', name: 'Cococodji', households: 2600, demand: 10, depth: 2, wells: true },
    { id: 'Z6', name: 'Hêvié', households: 3900, demand: 12, depth: 3, wells: true },
  ],
  pipes: [
    { id: 'P0', from: 'TOWER', to: 'Z1' },
    { id: 'P1', from: 'Z1', to: 'Z2' },
    { id: 'P2', from: 'Z1', to: 'Z3' },
    { id: 'P3', from: 'Z2', to: 'Z4' },
    { id: 'P4', from: 'Z3', to: 'Z5' },
    { id: 'P5', from: 'Z4', to: 'Z6' },
  ],
}
