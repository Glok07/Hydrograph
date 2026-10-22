import { askChatbot } from '../../server/chat.js'
import type { ChatMessage } from '../../server/chat.js'
import { json, readJson } from '../../server/http.js'

/** MétéEau : chatbot conversationnel grounded sur l'état courant de l'application (voir server/chat.ts). */
export async function POST(request: Request) {
  const b = await readJson<{ messages?: unknown; snapshot?: unknown }>(request)
  if (!b) return json({ error: 'JSON invalide' }, 400)
  if (!Array.isArray(b.messages)) return json({ error: 'messages requis' }, 400)

  const isMessage = (m: unknown): m is ChatMessage =>
    typeof m === 'object' && m !== null && ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') && typeof (m as ChatMessage).content === 'string'
  const messages = b.messages.filter(isMessage)
  if (messages.length === 0) return json({ error: 'Aucun message exploitable' }, 400)

  return json(await askChatbot(messages, b.snapshot ?? {}))
}
