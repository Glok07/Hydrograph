import { prisma } from '../../server/db.js'
import { json } from '../../server/http.js'

/** Heures d'eau des 7 derniers jours par zone, lues depuis Neon, dans le même format que src/data/history.ts. */
export async function GET() {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 7)
  const points = await prisma.historyPoint.findMany({ where: { date: { gte: since } }, orderBy: { date: 'asc' } })

  const out: Record<string, number[]> = {}
  for (const p of points) (out[p.zone] ??= []).push(p.hours)
  return json(out)
}
