import type { Network, ZoneId } from '../data/network'

export interface PrioritySanitizeResult {
  /** Toutes les zones du réseau, dans l'ordre de priorité retenu : jamais vide, jamais invalide. */
  priority: ZoneId[]
  /** Information non bloquante : ce qui a été ignoré dans la réponse brute de l'IA, le cas échéant. */
  note?: string
}

/**
 * Nettoie la liste de zones renvoyée par l'IA en un ordre de priorité exploitable par
 * priorityRounds. Contrairement à une allocation de créneaux, un ordre de zones ne peut pas
 * violer la capacité du château d'eau ni servir une zone coupée : il n'y a donc rien à
 * rejeter, seulement à assainir. Les entrées inconnues ou en double sont ignorées, et les
 * zones manquantes sont ajoutées à la fin dans l'ordre du réseau.
 */
export function sanitizePriority(net: Network, raw: unknown): PrioritySanitizeResult {
  const known = new Set(net.zones.map((z) => z.id))
  const seen = new Set<ZoneId>()
  const priority: ZoneId[] = []
  let dropped = 0

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string' && known.has(item as ZoneId) && !seen.has(item as ZoneId)) {
        seen.add(item as ZoneId)
        priority.push(item as ZoneId)
      } else {
        dropped++
      }
    }
  } else if (raw !== undefined) {
    dropped++
  }

  for (const z of net.zones) if (!seen.has(z.id)) priority.push(z.id)

  return { priority, note: dropped ? `${dropped} entrée(s) ignorée(s) dans la réponse IA.` : undefined }
}
