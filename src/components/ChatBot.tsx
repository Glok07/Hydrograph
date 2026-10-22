import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { CALAVI } from '../data/network'
import type { ChatMessage } from '../engine/chatClient'
import { askChat } from '../engine/chatClient'
import { buildChatSnapshot } from '../engine/chatContext'
import { equityOf } from '../engine/equity'
import { useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

const GREETING: ChatMessage = {
  role: 'assistant',
  content: 'Bonjour 💧 Je suis MétéEau. Demandez-moi la situation de l’eau, ce qui se passerait si une conduite casse, ou tout ce que vous voulez savoir sur HydroGraph.',
}

const SUGGESTIONS = ['Quelle est la situation aujourd’hui ?', 'Et si la conduite vers Ouèdo casse ?', 'Pourquoi Hêvié manque d’eau ?']

/** Chatbot conversationnel MétéEau : répond en se basant sur l'état réellement affiché à l'écran. */
export function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const view = useHydro((s) => s.view)
  const zone = useHydro((s) => s.zone)
  const period = useHydro((s) => s.period)
  const causes = useHydro((s) => s.causes)
  const plan = useHydro((s) => s.plan)
  const setZone = useHydro((s) => s.setZone)
  const setPeriod = useHydro((s) => s.setPeriod)
  const setCauses = useHydro((s) => s.setCauses)
  const setPlan = useHydro((s) => s.setPlan)
  const setView = useHydro((s) => s.setView)
  const { shown, explanation, broken } = useDerived()
  const equity = equityOf(CALAVI.zones, shown)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content } as ChatMessage]
    setMessages(next)
    setInput('')
    setError('')
    setBusy(true)
    const snapshot = buildChatSnapshot(CALAVI, view, zone, period, causes, plan, shown, explanation, broken, equity)
    const out = await askChat(next, snapshot)
    setBusy(false)
    if ('error' in out) {
      setError(out.error)
      return
    }
    setMessages((cur) => [...cur, { role: 'assistant', content: out.reply }])
    if (out.action) {
      if (out.action.causes) setCauses(out.action.causes)
      if (out.action.period) setPeriod(out.action.period)
      if (out.action.zone) setZone(out.action.zone)
      if (out.action.plan !== undefined) setPlan(out.action.plan)
      if (view !== 'carte') setView('carte')
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue text-white shadow-[0_10px_30px_rgba(29,111,224,0.4)] sm:bottom-6 sm:right-6"
        aria-label={open ? 'Fermer MétéEau' : 'Ouvrir MétéEau, l’assistant conversationnel'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <span className="text-2xl" aria-hidden>💧</span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="glass fixed inset-x-3 bottom-[4.75rem] top-16 z-30 flex !rounded-2xl flex-col overflow-hidden sm:inset-x-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[min(70vh,560px)] sm:w-[380px]"
          >
            <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-3">
              <span className="text-xl" aria-hidden>💧</span>
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold">MétéEau</p>
                <p className="truncate text-[11px] text-ink/55">L’assistant conversationnel de HydroGraph</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div key={i} className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug ${m.role === 'user' ? 'ml-auto rounded-br-sm bg-blue text-white' : 'rounded-bl-sm bg-ink/5 text-ink'}`}>
                  {m.content}
                </div>
              ))}
              {busy && (
                <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-ink/5 px-3.5 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" />
                </div>
              )}
              {error && <p className="text-xs text-risk">{error}</p>}
            </div>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-ink/10 px-2.5 py-1 text-[11px] text-ink/70 hover:bg-ink/5">{s}</button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="flex items-center gap-2 border-t border-ink/10 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question…"
                className="min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-3.5 py-2 text-sm outline-none focus:border-blue"
              />
              <button type="submit" disabled={busy || !input.trim()} className="pill pill-solid !px-4 !py-2">Envoyer</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
