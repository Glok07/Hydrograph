import { createHash } from 'node:crypto'
import { prisma } from '../../server/db.js'
import { json, readJson } from '../../server/http.js'
import { sendText } from '../../server/whatsapp.js'
import { toE164 } from '../../src/engine/notify.js'

/** Vérifie le code reçu sur WhatsApp : 5 essais maximum, valable 10 minutes. */
export async function POST(request: Request) {
  const b = await readJson<{ phone?: string; code?: string }>(request)
  if (!b?.phone || !b.code) return json({ error: 'phone et code requis' }, 400)
  let digits = b.phone.replace(/\D/g, '')
  if (digits.length === 8) digits = `01${digits}`
  const phone = toE164(digits)

  const row = await prisma.verificationCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } })
  if (!row || row.expiresAt < new Date() || row.attempts >= 5) return json({ error: 'Code expiré, demandez-en un nouveau.' }, 400)
  const hash = createHash('sha256').update(`${phone}:${b.code.trim()}`).digest('hex')
  if (row.codeHash !== hash) {
    await prisma.verificationCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } })
    return json({ error: 'Code incorrect' }, 400)
  }
  await prisma.verificationCode.deleteMany({ where: { phone } })
  const sub = await prisma.subscriber.update({ where: { phone }, data: { verifiedAt: new Date() } })
  await sendText(phone, `💧 Bienvenue ${sub.name.split(' ')[0]} ! Vous recevrez les alertes eau de votre zone. Répondez STOP pour vous désabonner.`)
  return json({ ok: true })
}
