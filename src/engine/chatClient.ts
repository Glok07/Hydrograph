import type { ChatAction, ChatSnapshot } from './chatContext'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatReply {
  reply: string
  action: ChatAction | null
}

/** Envoie la conversation et l'état courant de l'appli à MétéEau (voir server/chat.ts). */
export async function askChat(messages: ChatMessage[], snapshot: ChatSnapshot): Promise<ChatReply | { error: string }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, snapshot }),
      signal: AbortSignal.timeout(35000),
    })
    const body = await res.json().catch(() => ({}))
    return res.ok ? body : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'MétéEau est injoignable (en local, lancez npm run api).' }
  }
}
