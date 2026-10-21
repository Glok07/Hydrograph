import type { EventType } from './events'
import type { ZoneForecast } from './forecast'

export interface AiPlanResponse {
  source: 'ai' | 'fallback'
  reason?: string
  explanation?: string
  forecasts: ZoneForecast[]
}

/** Demande au serveur une proposition de tours d'eau par l'IA (voir server/aiPlan.ts et api/plan/ai.ts). */
export async function requestAiPlan(event: EventType | null): Promise<AiPlanResponse | { error: string }> {
  try {
    const res = await fetch('/api/plan/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
    })
    const body = await res.json().catch(() => ({}))
    return res.ok ? body : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'Serveur injoignable (en local, lancez npm run api).' }
  }
}
