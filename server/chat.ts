import { sanitizeChatAction } from '../src/engine/chatContext.js'
import type { ChatAction } from '../src/engine/chatContext.js'
import { CALAVI } from '../src/data/network.js'
import { CAUSES } from '../src/engine/causes.js'
import { PERIODS } from '../src/engine/periods.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResult {
  reply: string
  action: ChatAction | null
}

const CAUSES_LIST = CAUSES.map((c) => `- ${c.id} (${c.group}) : ${c.hint}`).join('\n')
const PIPES_LIST = CALAVI.pipes.map((p) => `${p.id} : ${p.from === 'TOWER' ? CALAVI.tower.name : p.from} → ${CALAVI.zones.find((z) => z.id === p.to)!.name}`).join(', ')
const PERIODS_LIST = PERIODS.map((p) => `${p.id} (${p.label})`).join(', ')
const ZONES_LIST = CALAVI.zones.map((z) => `${z.id} ${z.name} (profondeur ${z.depth}${z.wells ? ', puits' : ''})`).join(', ')

/**
 * Connaissance statique du projet, condensée depuis le README : ce que le chatbot sait par
 * cœur, indépendamment de la situation affichée au moment de la question (voir snapshot).
 */
const PROJECT_KNOWLEDGE = `
HydroGraph, « la météo de l'eau », est une démo pour Abomey-Calavi (Bénin) : chaque jour, pour chaque zone, elle dit si l'eau viendra, à quand, et si le partage entre quartiers est juste. Toutes les données sont simulées pour la démo ; chaque donnée a une vraie source future documentée (API météo, signalements d'habitants, données SoNEB/SBEE, OpenStreetMap, capteurs).

Quatre écrans : Carte (grand public, carte 3D, fiche de zone, timelapse), Opérateur (plan du jour, avant/après tours d'eau, modification du réseau), Mairie (indice d'équité, quartiers oubliés), Familles (messages WhatsApp/SMS envoyés aux abonnés).

Réseau simulé : un château d'eau et six zones reliées par six conduites. ${ZONES_LIST}. Conduites : ${PIPES_LIST}. Hêvié (Z6) est la zone la plus éloignée, historiquement la plus oubliée.

Douze causes cumulables le même jour, chacune avec son effet :
${CAUSES_LIST}

Contexte de la journée (période) : ${PERIODS_LIST}.

Répartition : la journée va de 5 h à 23 h en créneaux de 2 h. Sans HydroGraph, le réseau sert les zones dans l'ordre, des plus proches du château d'eau aux plus éloignées, et s'arrête au premier manque de débit. Les tours d'eau HydroGraph réservent d'abord un créneau à la zone la plus éloignée encore reliée, puis servent en priorité les zones les moins servies jusque-là : l'écart entre quartiers se réduit.

Statuts : ok (≥14 h d'eau, vert), warn (6-13 h, orange), risk (<6 h, rouge). Une zone en alerte qualité (trop de foyers exposés à une eau à risque) est déclassée d'un cran.

Quatre types d'eau par foyer : robinet (réseau), forage/borne fontaine, puits, eau stockée à domicile. Quand le robinet manque, les foyers se rabattent (40 % vers un forage, 60 % vers un puits) ; c'est souvent la combinaison de deux causes (coupure + pluie, par exemple) qui expose vraiment les familles, pas une seule cause isolée.

Indice d'équité (vue Mairie) : 0 à 100, 100 = toutes les zones reçoivent autant d'eau ; calculé sur les 7 derniers jours.
`.trim()

const SYSTEM_PROMPT = `Tu es MétéEau, l'assistante conversationnelle de HydroGraph. Tu aides les opérateurs, les agents de la mairie et les familles à comprendre la situation de l'eau à Abomey-Calavi, en répondant directement à leurs questions en français, sans qu'ils aient besoin de régler des paramètres eux-mêmes.

${PROJECT_KNOWLEDGE}

On te donne à chaque message un « ÉTAT ACTUEL » en JSON : la situation réellement affichée à l'écran en ce moment (zone choisie, causes actives, période, heures d'eau par zone, conduites cassées, indice d'équité…). Base tes réponses sur CET état, pas sur un exemple générique. N'invente jamais un chiffre qui n'y figure pas et que tes connaissances du projet ne donnent pas non plus : dis que tu ne sais pas plutôt que d'inventer.

Si la personne décrit une situation qu'elle veut voir plutôt que de régler les boutons elle-même (« et si la conduite cassait », « montre-moi un jour de marché », « regarde Hêvié »), tu peux proposer de changer l'affichage via le champ "action". L'action « pipe_burst » casse toujours la conduite par défaut du réseau (Togba → Ouèdo) : si on te parle d'une autre conduite précise, explique l'effet avec tes connaissances du réseau mais dis que la simulation visuelle ne peut casser que celle-là pour l'instant.

Réponds UNIQUEMENT par un JSON de la forme {"reply": "ta réponse en français, concise, sans jargon inutile", "action": null} — ou avec "action" rempli seulement si on te demande explicitement de changer ce qui est affiché : {"causes": ["power_cut"], "period": "marche", "zone": "Z6", "plan": true}, chaque champ optionnel et à omettre si non concerné.`

/**
 * Appelle Rodium pour MétéEau : conversation + état courant de l'appli dans le system prompt.
 * En cas d'échec, une réponse de repli reste utile plutôt qu'une erreur technique opaque.
 */
export async function askChatbot(messages: ChatMessage[], snapshot: unknown): Promise<ChatResult> {
  const { RODIUM_API_KEY, RODIUM_API_URL, RODIUM_MODEL } = process.env
  const fallback: ChatResult = { reply: 'MétéEau est momentanément indisponible. Les écrans Carte, Opérateur, Mairie et Familles restent utilisables normalement pendant ce temps.', action: null }
  if (!RODIUM_API_KEY || RODIUM_API_KEY.includes('REMPLACER') || !RODIUM_API_URL) return fallback

  try {
    const res = await fetch(`${RODIUM_API_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RODIUM_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: RODIUM_MODEL,
        // Ce fournisseur rejette le paramètre temperature, et consomme une partie de max_tokens
        // en raisonnement interne invisible : une marge large évite une réponse tronquée.
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: `ÉTAT ACTUEL (JSON) :\n${JSON.stringify(snapshot)}` },
          ...messages.slice(-12),
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) return fallback
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return fallback

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return { reply: content.slice(0, 1200), action: null }
    }
    const obj = parsed as { reply?: unknown; action?: unknown }
    const reply = typeof obj.reply === 'string' && obj.reply.trim() ? obj.reply.trim() : fallback.reply
    return { reply, action: sanitizeChatAction(CALAVI, obj.action) }
  } catch {
    return fallback
  }
}
