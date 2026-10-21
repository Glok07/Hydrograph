import { create } from 'zustand'
import type { ZoneId } from '../data/network'
import type { EventType } from '../engine/events'

export type View = 'carte' | 'operateur' | 'mairie' | 'familles'

export const VIEWS: { id: View; label: string }[] = [
  { id: 'carte', label: 'Carte' },
  { id: 'operateur', label: 'Opérateur' },
  { id: 'mairie', label: 'Mairie' },
  { id: 'familles', label: 'Familles' },
]

interface HydroState {
  view: View
  event: EventType | null
  /** vrai : on affiche les tours d'eau recalculés par HydroGraph */
  plan: boolean
  zone: ZoneId
  /** heure du timelapse ; null = vue de la journée entière */
  hour: number | null
  playing: boolean
  /** étape du mode démo guidé ; null = mode démo fermé */
  tour: number | null
  sourcesOpen: boolean
  /** incrémentés pour demander à la carte de viser une zone ou de revenir à la vue d'ensemble */
  focusTick: number
  overviewTick: number
  setView: (view: View) => void
  setEvent: (event: EventType | null) => void
  setPlan: (plan: boolean) => void
  setZone: (zone: ZoneId) => void
  setHour: (hour: number | null) => void
  setPlaying: (playing: boolean) => void
  setTour: (tour: number | null) => void
  setSourcesOpen: (open: boolean) => void
  requestOverview: () => void
}

/** Un lien #mairie, #operateur ou #familles ouvre directement la vue : pratique pour la démo. */
const initialView = (): View => {
  const id = typeof location === 'undefined' ? '' : location.hash.slice(1)
  return VIEWS.find((v) => v.id === id)?.id ?? 'carte'
}

export const useHydro = create<HydroState>((set) => ({
  view: initialView(),
  event: null,
  plan: false,
  zone: 'Z6',
  hour: null,
  playing: false,
  tour: null,
  sourcesOpen: false,
  focusTick: 0,
  overviewTick: 0,
  setView: (view) => set({ view }),
  setEvent: (event) => set({ event }),
  setPlan: (plan) => set({ plan }),
  setZone: (zone) => set((s) => ({ zone, focusTick: s.focusTick + 1 })),
  setHour: (hour) => set({ hour }),
  setPlaying: (playing) => set({ playing }),
  setTour: (tour) => set({ tour }),
  setSourcesOpen: (sourcesOpen) => set({ sourcesOpen }),
  requestOverview: () => set((s) => ({ overviewTick: s.overviewTick + 1 })),
}))
