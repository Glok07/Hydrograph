import type { Network, PipeId, ZoneId } from '../data/network'

/** Conduites traversées du château d'eau jusqu'à la zone, dans l'ordre. */
export function pathFromTower(net: Network, zone: ZoneId): PipeId[] {
  const path: PipeId[] = []
  let current: ZoneId | 'TOWER' = zone
  while (current !== 'TOWER') {
    const pipe = net.pipes.find((p) => p.to === current)
    if (!pipe) break
    path.unshift(pipe.id)
    current = pipe.from
  }
  return path
}

/** Toutes les zones qui dépendent de la zone donnée (elle-même exclue). */
export function downstream(net: Network, zone: ZoneId): ZoneId[] {
  const out: ZoneId[] = []
  const walk = (z: ZoneId) => {
    for (const p of net.pipes.filter((p) => p.from === z)) {
      out.push(p.to)
      walk(p.to)
    }
  }
  walk(zone)
  return out
}

export function isReachable(net: Network, zone: ZoneId, broken: ReadonlySet<PipeId>): boolean {
  return pathFromTower(net, zone).every((id) => !broken.has(id))
}
