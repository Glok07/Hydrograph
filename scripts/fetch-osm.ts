/**
 * Récupère, pour chaque zone, le nombre d'équipements et d'activités cartographiés dans OpenStreetMap
 * (écoles, marchés, centres de santé, restaurants, lieux de culte, hôtels, puits…) autour de son centre.
 * Le résultat alimente le modèle de demande en eau (src/engine/demand.ts).
 *
 * Usage : npx tsx scripts/fetch-osm.ts
 * Écrit : src/data/osm-activities.ts (à committer ; relancer pour rafraîchir).
 * Module TypeScript plutôt que JSON : il s'importe pareil depuis le navigateur, le serveur et tsx.
 *
 * Limite connue : la couverture d'OpenStreetMap est inégale au Bénin. Ces comptes sont un indicateur
 * d'activité, pas un recensement.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { ZONE_GEO } from '../src/data/geo.js'

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
const UA = 'HydroGraph-hackathon-demo (github.com/Glok07/Hydrograph)'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Tags = Record<string, string | undefined>

async function overpass(query: string): Promise<{ elements: { tags?: Tags; tags_count?: unknown }[] }> {
  let lastError = ''
  for (let attempt = 0; attempt < 10; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length]
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(100_000),
      })
      if (res.ok) return await res.json()
      lastError = `HTTP ${res.status}`
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
    await sleep(8000 * (attempt + 1))
  }
  throw new Error(`Overpass indisponible : ${lastError}`)
}

const A = (r: number, lat: number, lon: number) => `(around:${r},${lat},${lon})`

const featuresQuery = (r: number, lat: number, lon: number) => `[out:json][timeout:90];
(
  nwr${A(r, lat, lon)}[amenity~"^(school|kindergarten|college|university|hospital|clinic|doctors|marketplace|restaurant|fast_food|bar|cafe|car_wash|place_of_worship|drinking_water|laundry)$"];
  nwr${A(r, lat, lon)}[tourism~"^(hotel|guest_house|hostel|motel)$"];
  nwr${A(r, lat, lon)}[man_made~"^(water_well|water_tower|water_works|pumping_station|works)$"];
  nwr${A(r, lat, lon)}[landuse~"^(industrial|farmland|farmyard|orchard|greenhouse_horticulture|allotments)$"];
  nwr${A(r, lat, lon)}[craft];
  nwr${A(r, lat, lon)}[shop~"^(car_repair|laundry|dry_cleaning)$"];
);
out tags;`

const buildingsQuery = (r: number, lat: number, lon: number) => `[out:json][timeout:90];nwr${A(r, lat, lon)}[building];out count;`

interface OsmCounts {
  school: number
  university: number
  health: number
  market: number
  food: number
  lodging: number
  carwash: number
  mosque: number
  church: number
  worshipOther: number
  agri: number
  craft: number
  /** indicateurs d'approvisionnement : informatifs, non utilisés dans le calcul de demande */
  wells: number
  taps: number
  waterWorks: number
  buildings: number
}

function classify(tags: Tags, c: OsmCounts) {
  const amenity = tags.amenity
  if (amenity && ['school', 'kindergarten', 'college'].includes(amenity)) c.school++
  else if (amenity === 'university') c.university++
  else if (amenity && ['hospital', 'clinic', 'doctors'].includes(amenity)) c.health++
  else if (amenity === 'marketplace') c.market++
  else if (amenity && ['restaurant', 'fast_food', 'bar', 'cafe'].includes(amenity)) c.food++
  else if (amenity === 'car_wash') c.carwash++
  else if (amenity === 'drinking_water') c.taps++
  else if (amenity === 'place_of_worship') {
    if (tags.religion === 'muslim') c.mosque++
    else if (tags.religion === 'christian') c.church++
    else c.worshipOther++
  } else if (amenity === 'laundry') c.craft++
  else if (tags.tourism) c.lodging++
  else if (tags.man_made === 'water_well') c.wells++
  else if (tags.man_made && ['water_tower', 'water_works', 'pumping_station'].includes(tags.man_made)) c.waterWorks++
  else if (tags.man_made === 'works') c.craft++
  else if (tags.landuse && ['farmland', 'farmyard', 'orchard', 'greenhouse_horticulture', 'allotments'].includes(tags.landuse)) c.agri++
  else if (tags.landuse === 'industrial' || tags.craft || tags.shop) c.craft++
}

const zones: Record<string, { radiusKm: number; counts: OsmCounts }> = {}

// Cache par zone : si Overpass tombe en route, relancer le script reprend là où il s'est arrêté.
const CACHE = new URL('./.osm-cache.json', import.meta.url)
if (existsSync(CACHE)) Object.assign(zones, JSON.parse(readFileSync(CACHE, 'utf8')))

for (const [id, geo] of Object.entries(ZONE_GEO)) {
  if (zones[id]) {
    console.log(`${id} : déjà en cache`)
    continue
  }
  const [lon, lat] = geo.center
  const r = Math.round(geo.radiusKm * 1000)
  console.log(`${id} : rayon ${r} m…`)
  const counts: OsmCounts = { school: 0, university: 0, health: 0, market: 0, food: 0, lodging: 0, carwash: 0, mosque: 0, church: 0, worshipOther: 0, agri: 0, craft: 0, wells: 0, taps: 0, waterWorks: 0, buildings: 0 }
  const feats = await overpass(featuresQuery(r, lat, lon))
  for (const el of feats.elements) if (el.tags) classify(el.tags, counts)
  await sleep(3000)
  const b = await overpass(buildingsQuery(r, lat, lon))
  const total = Number((b.elements[0]?.tags as Tags | undefined)?.total ?? 0)
  counts.buildings = total
  zones[id] = { radiusKm: geo.radiusKm, counts }
  writeFileSync(CACHE, JSON.stringify(zones, null, 2))
  console.log(' ', JSON.stringify(counts))
  await sleep(3000)
}

const out = {
  source: 'OpenStreetMap (Overpass API), contributeurs OpenStreetMap, licence ODbL',
  fetchedAt: new Date().toISOString().slice(0, 10),
  note: "Comptes d'objets cartographiés dans le rayon de chaque zone. Couverture inégale : indicateur d'activité, pas un recensement.",
  zones,
}
const file = `// Généré par scripts/fetch-osm.ts : ne pas modifier à la main, relancer le script.
export interface OsmCounts {
  school: number
  university: number
  health: number
  market: number
  food: number
  lodging: number
  carwash: number
  mosque: number
  church: number
  worshipOther: number
  agri: number
  craft: number
  wells: number
  taps: number
  waterWorks: number
  buildings: number
}

export const OSM_ACTIVITIES: {
  source: string
  fetchedAt: string
  note: string
  zones: Record<string, { radiusKm: number; counts: OsmCounts }>
} = ${JSON.stringify(out, null, 2)}
`
writeFileSync(new URL('../src/data/osm-activities.ts', import.meta.url), file)
console.log('Écrit : src/data/osm-activities.ts')
