import { json, readJson } from '../../server/http.js'
import { planWithAi } from '../../server/aiPlan.js'
import { DEFAULT_EVENTS } from '../../src/engine/events.js'
import type { EventType } from '../../src/engine/events.js'
import { periodById } from '../../src/engine/periods.js'

/** Propose un plan de tours d'eau calculé par l'IA, validé avant d'être renvoyé (voir server/aiPlan.ts). */
export async function POST(request: Request) {
  const b = await readJson<{ event?: EventType | null; events?: EventType[]; period?: string }>(request)
  if (b === null) return json({ error: 'JSON invalide' }, 400)
  // `events` : causes cumulées ; `event` : forme d'origine, une seule cause.
  const types = b.events ?? (b.event ? [b.event] : [])
  const evs = types.map((t) => DEFAULT_EVENTS[t])
  if (evs.some((e) => !e)) return json({ error: 'Événement inconnu' }, 400)
  return json(await planWithAi(evs, periodById(b.period ?? 'ordinaire')))
}
