import 'dotenv/config'
import { CALAVI } from '../src/data/network'
import { HISTORY } from '../src/data/history'
import { SUBSCRIBERS } from '../src/data/subscribers'
import { toE164 } from '../src/engine/notify'
import { prisma } from '../server/db'

// La position (lng/lat) n'est mise à jour qu'à la création : un ré-exécution du seed ne doit
// pas écraser un déplacement du château d'eau fait depuis la plateforme.
await prisma.towerConfig.upsert({
  where: { id: 1 },
  update: { name: CALAVI.tower.name, capacity: CALAVI.tower.capacity },
  create: { id: 1, name: CALAVI.tower.name, capacity: CALAVI.tower.capacity, lng: CALAVI.tower.lng, lat: CALAVI.tower.lat },
})
for (const z of CALAVI.zones) {
  const data = { name: z.name, households: z.households, demand: z.demand, depth: z.depth, wells: z.wells }
  await prisma.networkZone.upsert({ where: { id: z.id }, update: data, create: { id: z.id, ...data } })
}
for (const p of CALAVI.pipes) {
  await prisma.networkPipe.upsert({ where: { id: p.id }, update: { from: p.from, to: p.to }, create: { id: p.id, from: p.from, to: p.to } })
}
console.log(`Réseau en base : ${CALAVI.zones.length} zones, ${CALAVI.pipes.length} conduites.`)

// HISTORY[zone][i] : i=5 est hier, i=0 est il y a 6 jours (voir src/data/history.ts).
const today = new Date()
const utcDay = (offset: number) => new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - offset))
for (const [zone, hours] of Object.entries(HISTORY)) {
  for (const [i, h] of hours.entries()) {
    const date = utcDay(hours.length - i)
    await prisma.historyPoint.upsert({ where: { zone_date: { zone, date } }, update: { hours: h }, create: { zone, date, hours: h } })
  }
}
console.log('Historique 7 jours en base.')

for (const s of SUBSCRIBERS) {
  const data = {
    name: s.name,
    zone: s.zone,
    lang: s.lang,
    channel: s.channel,
    members: s.members,
    real: s.real,
    consent: true,
    verifiedAt: s.real ? new Date() : null,
    joinedAt: new Date(s.joined),
  }
  await prisma.subscriber.upsert({ where: { phone: toE164(s.phone) }, update: data, create: { phone: toE164(s.phone), ...data } })
}
console.log(`${SUBSCRIBERS.length} abonnés en base`)
await prisma.$disconnect()
