import { prisma } from '../../server/db.js'
import { json, readJson } from '../../server/http.js'

/** Réseau simulé (château d'eau, zones, conduites), lu depuis Neon : modifiable sans redéployer. */
export async function GET() {
  const [tower, zones, pipes] = await Promise.all([
    prisma.towerConfig.findUnique({ where: { id: 1 } }),
    prisma.networkZone.findMany({ orderBy: { id: 'asc' } }),
    prisma.networkPipe.findMany({ orderBy: { id: 'asc' } }),
  ])
  if (!tower || zones.length === 0) return json({ error: 'Réseau non initialisé (lancer prisma db seed).' }, 503)

  return json({
    tower: { name: tower.name, capacity: tower.capacity, lng: tower.lng ?? undefined, lat: tower.lat ?? undefined },
    zones: zones.map((z) => ({ id: z.id, name: z.name, households: z.households, demand: z.demand, depth: z.depth, wells: z.wells })),
    pipes: pipes.map((p) => ({ id: p.id, from: p.from, to: p.to })),
  })
}

interface Body {
  tower?: { name?: unknown; capacity?: unknown; lng?: unknown; lat?: unknown }
  zones?: { id?: unknown; name?: unknown; households?: unknown; demand?: unknown; depth?: unknown; wells?: unknown }[]
  pipes?: { id?: unknown; from?: unknown; to?: unknown }[]
}

const isFiniteNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

/**
 * Met à jour le réseau depuis l'écran Opérateur : ne crée ni ne supprime de zone ou de conduite
 * (leur position sur la carte est une donnée à part, voir src/data/geo.ts ; une zone ajoutée ici
 * n'aurait nulle part où s'afficher), seulement leurs valeurs et la position du château d'eau.
 */
export async function PUT(request: Request) {
  const b = await readJson<Body>(request)
  if (!b) return json({ error: 'JSON invalide' }, 400)

  const existingZones = await prisma.networkZone.findMany({ select: { id: true } })
  const zoneIds = new Set(existingZones.map((z) => z.id))
  const existingPipes = await prisma.networkPipe.findMany({ select: { id: true } })
  const pipeIds = new Set(existingPipes.map((p) => p.id))

  if (b.tower) {
    const { name, capacity, lng, lat } = b.tower
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) return json({ error: 'Nom du château d’eau invalide' }, 400)
    if (capacity !== undefined && (!isFiniteNum(capacity) || capacity <= 0)) return json({ error: 'Capacité invalide' }, 400)
    if (lng !== undefined && lng !== null && (!isFiniteNum(lng) || lng < -180 || lng > 180)) return json({ error: 'Longitude invalide' }, 400)
    if (lat !== undefined && lat !== null && (!isFiniteNum(lat) || lat < -90 || lat > 90)) return json({ error: 'Latitude invalide' }, 400)
  }

  if (b.zones) {
    for (const z of b.zones) {
      if (typeof z.id !== 'string' || !zoneIds.has(z.id)) return json({ error: `Zone inconnue : ${String(z.id)} (création impossible depuis cet écran)` }, 400)
      if (z.name !== undefined && (typeof z.name !== 'string' || !z.name.trim())) return json({ error: `Nom invalide pour ${z.id}` }, 400)
      for (const [k, v] of [['households', z.households], ['demand', z.demand], ['depth', z.depth]] as const) {
        if (v !== undefined && (!isFiniteNum(v) || v < 0)) return json({ error: `${k} invalide pour ${z.id}` }, 400)
      }
      if (z.wells !== undefined && typeof z.wells !== 'boolean') return json({ error: `« puits » invalide pour ${z.id}` }, 400)
    }
  }

  if (b.pipes) {
    for (const p of b.pipes) {
      if (typeof p.id !== 'string' || !pipeIds.has(p.id)) return json({ error: `Conduite inconnue : ${String(p.id)} (création impossible depuis cet écran)` }, 400)
      if (p.from !== undefined && p.from !== 'TOWER' && !(typeof p.from === 'string' && zoneIds.has(p.from))) return json({ error: `Origine invalide pour ${p.id}` }, 400)
      if (p.to !== undefined && !(typeof p.to === 'string' && zoneIds.has(p.to))) return json({ error: `Destination invalide pour ${p.id}` }, 400)
      if (p.from && p.to && p.from === p.to) return json({ error: `${p.id} relie une zone à elle-même` }, 400)
    }
  }

  await prisma.$transaction([
    ...(b.tower
      ? [
          prisma.towerConfig.update({
            where: { id: 1 },
            data: {
              ...(b.tower.name !== undefined ? { name: b.tower.name as string } : {}),
              ...(b.tower.capacity !== undefined ? { capacity: b.tower.capacity as number } : {}),
              ...(b.tower.lng !== undefined ? { lng: b.tower.lng as number | null } : {}),
              ...(b.tower.lat !== undefined ? { lat: b.tower.lat as number | null } : {}),
            },
          }),
        ]
      : []),
    ...(b.zones ?? []).map((z) =>
      prisma.networkZone.update({
        where: { id: z.id as string },
        data: {
          ...(z.name !== undefined ? { name: z.name as string } : {}),
          ...(z.households !== undefined ? { households: z.households as number } : {}),
          ...(z.demand !== undefined ? { demand: z.demand as number } : {}),
          ...(z.depth !== undefined ? { depth: z.depth as number } : {}),
          ...(z.wells !== undefined ? { wells: z.wells as boolean } : {}),
        },
      }),
    ),
    ...(b.pipes ?? []).map((p) =>
      prisma.networkPipe.update({
        where: { id: p.id as string },
        data: {
          ...(p.from !== undefined ? { from: p.from as string } : {}),
          ...(p.to !== undefined ? { to: p.to as string } : {}),
        },
      }),
    ),
  ])

  return json({ ok: true })
}
