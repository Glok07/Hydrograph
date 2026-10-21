import type { Network, ZoneId } from './data/network'
import { CALAVI } from './data/network'
import { HISTORY } from './data/history'

function isNetwork(x: unknown): x is Network {
  if (typeof x !== 'object' || x === null) return false
  const n = x as Partial<Network>
  return (
    typeof n.tower === 'object' &&
    n.tower !== null &&
    typeof n.tower.capacity === 'number' &&
    Array.isArray(n.zones) &&
    n.zones.length > 0 &&
    n.zones.every((z) => typeof z.id === 'string' && typeof z.name === 'string' && typeof z.demand === 'number' && typeof z.depth === 'number') &&
    Array.isArray(n.pipes)
  )
}

/**
 * Remplace en place les données réseau et historique codées en dur (CALAVI, HISTORY) par
 * celles de Neon, avant le premier rendu : elles deviennent modifiables sans redéploiement.
 * Appelée une seule fois, avant createRoot(...).render(...) dans main.tsx — aucun composant
 * n'a besoin de savoir d'où viennent les données, ils lisent CALAVI/HISTORY comme avant.
 * Tolérance totale aux erreurs et délai court : sans serveur API (npm run dev seul) ou hors
 * ligne, l'application démarre normalement avec les données embarquées dans le code.
 */
export async function hydrateFromDb(): Promise<void> {
  try {
    const [netRes, histRes] = await Promise.all([
      fetch('/api/network', { signal: AbortSignal.timeout(2500) }),
      fetch('/api/history', { signal: AbortSignal.timeout(2500) }),
    ])
    if (netRes.ok) {
      const net: unknown = await netRes.json()
      if (isNetwork(net)) {
        CALAVI.tower = net.tower
        CALAVI.zones = net.zones
        CALAVI.pipes = net.pipes
      }
    }
    if (histRes.ok) {
      const hist = (await histRes.json()) as Record<string, unknown>
      for (const [zone, hours] of Object.entries(hist)) {
        if (Array.isArray(hours) && hours.length > 0 && hours.every((h) => typeof h === 'number')) {
          HISTORY[zone as ZoneId] = hours
        }
      }
    }
  } catch {
    // Pas de serveur API ou hors ligne : on garde les données embarquées dans le code.
  }
}
