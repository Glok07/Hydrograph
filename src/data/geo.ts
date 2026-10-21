import { CALAVI } from './network'
import type { PipeId, ZoneId } from './network'

export type LngLat = [number, number]

/**
 * Centres des localités d'Abomey-Calavi d'après OpenStreetMap (Nominatim, octobre 2026).
 * Les contours des zones de desserte sont dessinés pour la démo : ce ne sont pas les limites officielles.
 */
export const TOWER: LngLat = [2.3445, 6.4572]

export const ZONE_GEO: Record<ZoneId, { center: LngLat; radiusKm: number; seed: number }> = {
  Z1: { center: [2.3542, 6.4539], radiusKm: 1.5, seed: 0.4 },
  Z2: { center: [2.3049, 6.4651], radiusKm: 1.4, seed: 1.7 },
  Z3: { center: [2.3432, 6.3854], radiusKm: 1.8, seed: 2.9 },
  Z4: { center: [2.2671, 6.4524], radiusKm: 1.15, seed: 4.1 },
  Z5: { center: [2.2721, 6.3875], radiusKm: 1.5, seed: 5.3 },
  Z6: { center: [2.2406, 6.4499], radiusKm: 1.15, seed: 0.9 },
}

/** Ancrage des étiquettes : Ouèdo et Hêvié sont voisines, leurs étiquettes partent de chaque côté. */
export const CHIP_ANCHOR: Partial<Record<ZoneId, 'bottom-left' | 'bottom-right'>> = { Z4: 'bottom-left', Z6: 'bottom-right' }

const KM_LAT = 1 / 110.57
const kmLng = (lat: number) => 1 / (111.32 * Math.cos((lat * Math.PI) / 180))

/** Contour organique autour d'un centre : un cercle déformé par quelques harmoniques. */
export function blob(center: LngLat, radiusKm: number, seed: number, n = 72): LngLat[] {
  const pts: LngLat[] = []
  for (let i = 0; i <= n; i++) {
    const t = (2 * Math.PI * i) / n
    const r = radiusKm * (1 + 0.13 * Math.sin(3 * t + seed) + 0.07 * Math.sin(5 * t + 2 * seed) + 0.04 * Math.sin(7 * t + 3 * seed))
    pts.push([center[0] + r * Math.cos(t) * kmLng(center[1]), center[1] + r * Math.sin(t) * KM_LAT])
  }
  return pts
}

/** Courbe douce entre deux points (Bézier quadratique échantillonnée). */
export function curve(a: LngLat, b: LngLat, bend = 0.18, n = 32): LngLat[] {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const cx = mx - (b[1] - a[1]) * bend
  const cy = my + (b[0] - a[0]) * bend
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    return [u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]] as LngLat
  })
}

const nodeOf = (id: ZoneId | 'TOWER'): LngLat => (id === 'TOWER' ? TOWER : ZONE_GEO[id].center)

export const PIPE_GEO: Record<PipeId, LngLat[]> = Object.fromEntries(
  CALAVI.pipes.map((p) => [p.id, curve(nodeOf(p.from), nodeOf(p.to))]),
) as Record<PipeId, LngLat[]>

export const pipeMidpoint = (id: PipeId): LngLat => {
  const line = PIPE_GEO[id]
  return line[Math.floor(line.length / 2)]
}

export const ZONE_SHAPES: Record<ZoneId, LngLat[]> = Object.fromEntries(
  CALAVI.zones.map((z) => [z.id, blob(ZONE_GEO[z.id].center, ZONE_GEO[z.id].radiusKm, ZONE_GEO[z.id].seed)]),
) as Record<ZoneId, LngLat[]>

/** Emprise qui contient toutes les zones. */
export const BOUNDS: [LngLat, LngLat] = (() => {
  const all = Object.values(ZONE_SHAPES).flat()
  const lng = all.map((p) => p[0])
  const lat = all.map((p) => p[1])
  return [
    [Math.min(...lng), Math.min(...lat)],
    [Math.max(...lng), Math.max(...lat)],
  ]
})()
