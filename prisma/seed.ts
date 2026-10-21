import 'dotenv/config'
import { SUBSCRIBERS } from '../src/data/subscribers'
import { toE164 } from '../src/engine/notify'
import { prisma } from '../server/db'

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
