import { sanitizePriority } from '../src/engine/aiPlan.js'
import { CALAVI } from '../src/data/network.js'
import { HISTORY } from '../src/data/history.js'
import { conditionsFor } from '../src/engine/conditions.js'
import type { HydroEvent } from '../src/engine/events.js'
import type { ZoneForecast } from '../src/engine/forecast.js'
import { isReachable } from '../src/engine/graph.js'
import { priorityRounds } from '../src/engine/rounds.js'

export interface AiPlanResult {
  source: 'ai' | 'fallback'
  reason?: string
  /** phrase courte de l'IA expliquant son choix, affichée à l'opérateur */
  explanation?: string
  forecasts: ZoneForecast[]
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

const fallback = (event: HydroEvent | null, reason?: string): AiPlanResult => ({
  source: 'fallback',
  reason,
  forecasts: priorityRounds(CALAVI, event, []),
})

/**
 * Demande à Rodium un simple ordre de priorité entre zones (et non un calcul de créneaux :
 * voir aiPlan.test.ts et la note dans src/engine/rounds.ts sur ce choix), puis l'exécute avec
 * priorityRounds, qui garantit par construction la capacité du château d'eau et les conduites
 * cassées — exactement comme planRounds. Seul un échec de l'appel (réseau, JSON, réponse vide)
 * retombe sur le plan déterministe neutre ; une réponse exploitable, même partielle, est
 * toujours utilisée telle quelle après assainissement (sanitizePriority).
 */
export async function planWithAi(event: HydroEvent | null): Promise<AiPlanResult> {
  const { RODIUM_API_KEY, RODIUM_API_URL, RODIUM_MODEL } = process.env
  if (!RODIUM_API_KEY || RODIUM_API_KEY.includes('REMPLACER') || !RODIUM_API_URL) {
    return fallback(event, 'Clé Rodium absente ou non configurée.')
  }

  const cond = conditionsFor(CALAVI, event)
  const reachable = CALAVI.zones.filter((z) => isReachable(CALAVI, z.id, cond.broken))
  const payload = {
    zonesReliees: reachable.map((z) => ({
      zone: z.id,
      nom: z.name,
      profondeur: z.depth,
      puits: z.wells,
      risqueQualiteAujourdhui: cond.qualityRisk.has(z.id),
      moyenneHeuresEau7DerniersJours: Math.round(avg(HISTORY[z.id]) * 10) / 10,
    })),
    evenement: event?.type ?? null,
  }

  try {
    const res = await fetch(`${RODIUM_API_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RODIUM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: RODIUM_MODEL,
        // Ce fournisseur rejette le paramètre temperature (toute valeur) : ne pas le passer.
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Tu aides à répartir l’eau d’un château d’eau à Abomey-Calavi (Bénin). ' +
              'On te donne les zones encore reliées au réseau aujourd’hui, avec leur distance au château d’eau ' +
              '(profondeur, 0 = le plus proche), si elles dépendent de puits, un risque sanitaire éventuel et leur ' +
              'moyenne d’heures d’eau des 7 derniers jours. Classe-les de la plus urgente à servir à la moins urgente ' +
              '(zones oubliées récemment, zones à puits en risque sanitaire, zones les plus éloignées en priorité). ' +
              'Le calcul exact des créneaux et de la capacité est fait ailleurs, par du code classique : ' +
              'ne propose qu’un ORDRE, jamais d’horaires ni de chiffres. ' +
              'Réponds uniquement par un JSON {"priority":["Z6","Z4",...],"pourquoi":"une phrase en français, 20 mots maximum"}, ' +
              'avec dans "priority" exactement les identifiants de zonesReliees, chacun une seule fois.',
          },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return fallback(event, `Rodium HTTP ${res.status}`)
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return fallback(event, 'Réponse Rodium vide.')

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return fallback(event, 'Réponse Rodium non JSON.')
    }
    const obj = parsed as { priority?: unknown; pourquoi?: unknown }
    const { priority, note } = sanitizePriority(CALAVI, obj.priority)
    return {
      source: 'ai',
      reason: note,
      explanation: typeof obj.pourquoi === 'string' ? obj.pourquoi.slice(0, 240) : undefined,
      forecasts: priorityRounds(CALAVI, event, priority),
    }
  } catch {
    return fallback(event, 'Rodium injoignable ou délai dépassé (30 s).')
  }
}
