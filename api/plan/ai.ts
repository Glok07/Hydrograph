import { json, readJson } from '../../server/http.js'
import { planWithAi } from '../../server/aiPlan.js'
import { DEFAULT_EVENTS } from '../../src/engine/events.js'
import type { EventType } from '../../src/engine/events.js'

/** Propose un plan de tours d'eau calculé par l'IA, validé avant d'être renvoyé (voir server/aiPlan.ts). */
export async function POST(request: Request) {
  const b = await readJson<{ event?: EventType | null }>(request)
  if (b === null) return json({ error: 'JSON invalide' }, 400)
  const ev = b.event ? DEFAULT_EVENTS[b.event] : null
  if (b.event && !ev) return json({ error: 'Événement inconnu' }, 400)
  return json(await planWithAi(ev))
}
