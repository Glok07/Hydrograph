import { createHash, randomInt } from 'node:crypto'
import { prisma } from '../../server/db.js'
import { json, readJson } from '../../server/http.js'
import { sendText } from '../../server/whatsapp.js'
import { toE164 } from '../../src/engine/notify.js'

const ZONES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6']
const LANGS = ['fr', 'fon', 'goun', 'yoruba'] as const

/** Numéro béninois : 10 chiffres commençant par 01 (ou 8 chiffres de l'ancien format). */
function normalize(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('229')) d = d.slice(3)
  if (d.length === 8) d = `01${d}`
  return /^01\d{8}$/.test(d) ? toE164(d) : null
}

/** Inscription : enregistre l'abonné (non vérifié) puis envoie un code à 6 chiffres sur WhatsApp. */
export async function POST(request: Request) {
  const b = await readJson<{ name?: string; phone?: string; zone?: string; lang?: string; consent?: boolean }>(request)
  if (!b) return json({ error: 'JSON invalide' }, 400)
  const name = b.name?.trim().slice(0, 80)
  const phone = b.phone ? normalize(b.phone) : null
  if (!name) return json({ error: 'Nom requis' }, 400)
  if (!phone) return json({ error: 'Numéro béninois invalide (ex. 01 46 91 00 55)' }, 400)
  if (!b.zone || !ZONES.includes(b.zone)) return json({ error: 'Zone invalide' }, 400)
  if (b.consent !== true) return json({ error: 'Le consentement est obligatoire' }, 400)
  const lang = LANGS.find((l) => l === b.lang) ?? 'fr'

  const recent = await prisma.verificationCode.findFirst({ where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } } })
  if (recent) return json({ error: 'Un code vient d’être envoyé, patientez une minute.' }, 429)

  await prisma.subscriber.upsert({
    where: { phone },
    update: { name, zone: b.zone, lang, consent: true, unsubscribedAt: null },
    create: { phone, name, zone: b.zone, lang, consent: true },
  })

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const codeHash = createHash('sha256').update(`${phone}:${code}`).digest('hex')
  await prisma.verificationCode.create({ data: { phone, codeHash, expiresAt: new Date(Date.now() + 10 * 60_000) } })
  const sent = await sendText(phone, `💧 HydroGraph : votre code de vérification est ${code}. Il expire dans 10 minutes.`)
  if (!sent.ok) return json({ error: `Envoi du code impossible : ${sent.error}` }, 502)
  // En dry-run hors production, on renvoie le code pour pouvoir tester sans WhatsApp.
  return json({ ok: true, ...(sent.dryRun && process.env.VERCEL_ENV !== 'production' ? { devCode: code } : {}) })
}
