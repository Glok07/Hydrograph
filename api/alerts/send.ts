import { prisma } from '../../server/db.js'
import { json, readJson } from '../../server/http.js'
import { polish } from '../../server/rodium.js'
import { sendText } from '../../server/whatsapp.js'
import { CALAVI } from '../../src/data/network.js'
import type { ZoneId } from '../../src/data/network.js'
import { DEFAULT_EVENTS } from '../../src/engine/events.js'
import type { EventType } from '../../src/engine/events.js'
import { forecast } from '../../src/engine/forecast.js'
import { messageFor } from '../../src/engine/notify.js'
import { periodById } from '../../src/engine/periods.js'
import { planRounds } from '../../src/engine/rounds.js'

/**
 * Diffuse l'alerte du jour aux abonnés (zone optionnelle).
 * Par défaut seuls les testeurs réels reçoivent un message ; ALERTS_LIVE=true ouvre à tous les abonnés vérifiés.
 */
export async function POST(request: Request) {
  const b = await readJson<{ event?: EventType | null; events?: EventType[]; period?: string; plan?: boolean; zone?: ZoneId }>(request)
  if (!b) return json({ error: 'JSON invalide' }, 400)

  // `events` : causes cumulées ; `event` : forme d'origine, une seule cause. La première cause sert de cause principale aux messages.
  const types = b.events ?? (b.event ? [b.event] : [])
  const evs = types.map((t) => DEFAULT_EVENTS[t])
  if (evs.some((e) => !e)) return json({ error: 'Événement inconnu' }, 400)
  const ev = evs[0] ?? null
  const ctx = periodById(b.period ?? 'ordinaire')
  const plan = Boolean(b.plan)
  const forecasts = plan ? planRounds(CALAVI, evs, ctx) : forecast(CALAVI, evs, ctx)
  const live = process.env.ALERTS_LIVE === 'true'

  const event = ev ? await prisma.networkEvent.create({ data: { type: ev.type, startsAt: ev.startsAt, durationH: ev.durationH, pipe: ev.pipe } }) : null
  const subs = await prisma.subscriber.findMany({
    where: {
      consent: true,
      unsubscribedAt: null,
      channel: 'whatsapp',
      ...(b.zone ? { zone: b.zone } : {}),
      ...(live ? { verifiedAt: { not: null } } : { real: true }),
    },
  })

  const results: { name: string; status: string; error?: string }[] = []
  for (const s of subs) {
    const zone = CALAVI.zones.find((z) => z.id === s.zone)!
    const f = forecasts.find((x) => x.zone === s.zone)!
    const sub = { id: s.id, name: s.name, phone: s.phone, zone: zone.id, lang: s.lang, channel: s.channel, members: s.members, joined: s.joinedAt.toISOString(), real: s.real }
    const base = messageFor(sub, ev?.type ?? null, zone, f, plan).text
    const text = await polish(base, s.lang, s.name.split(' ')[0])
    const notif = await prisma.notification.create({ data: { subscriberId: s.id, eventId: event?.id, zone: s.zone, text } })
    const out = await sendText(s.phone, text)
    if (out.ok) {
      await prisma.notification.update({ where: { id: notif.id }, data: { status: 'sent', providerId: out.id, sentAt: new Date() } })
      results.push({ name: s.name, status: out.dryRun ? 'dry-run' : 'sent' })
    } else {
      await prisma.notification.update({ where: { id: notif.id }, data: { status: 'failed', error: out.error } })
      results.push({ name: s.name, status: 'failed', error: out.error })
    }
  }
  return json({ live, count: results.length, results })
}
