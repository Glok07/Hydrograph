import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { CALAVI } from '../data/network'
import { LANGS, buildMessage } from '../engine/messages'
import type { Lang } from '../engine/messages'
import { useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

type Channel = 'whatsapp' | 'sms'

/** Messages aux familles (F5) : texte WhatsApp ou SMS, lecture vocale simulée. */
export function FamilyView() {
  const zoneId = useHydro((s) => s.zone)
  const setZone = useHydro((s) => s.setZone)
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)
  const { shown } = useDerived()
  const [lang, setLang] = useState<Lang>('fr')
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [speaking, setSpeaking] = useState(false)

  const zone = CALAVI.zones.find((z) => z.id === zoneId)!
  const msg = buildMessage(event, zone, shown.find((f) => f.zone === zoneId)!, plan)
  const text = `${channel === 'whatsapp' ? '💧 ' : ''}${msg.title} : ${msg.body}`

  const speak = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(`${msg.title}. ${msg.body}`)
    u.lang = 'fr-FR'
    u.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(u)
  }

  return (
    <div className="grid items-center gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/55">Zone</p>
          <div className="flex flex-wrap gap-2">
            {CALAVI.zones.map((z) => (
              <button key={z.id} onClick={() => setZone(z.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${z.id === zoneId ? 'border-ink bg-ink text-white' : 'border-ink/10 text-ink/80 hover:bg-ink/10'}`}>{z.name}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/55">Langue</p>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button key={l.id} onClick={() => setLang(l.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${l.id === lang ? 'border-ink bg-ink text-white' : 'border-ink/10 text-ink/80 hover:bg-ink/10'}`}>{l.label}</button>
            ))}
          </div>
          {lang !== 'fr' && (
            <p className="mt-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-ink">
              Traduction à faire relire par un locuteur natif avant la présentation : en attendant, le message s’affiche en français.
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/55">Canal</p>
          <div className="flex gap-2">
            {(['whatsapp', 'sms'] as const).map((c) => (
              <button key={c} onClick={() => setChannel(c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${c === channel ? 'border-ink bg-ink text-white' : 'border-ink/10 text-ink/80 hover:bg-ink/10'}`}>{c === 'sms' ? 'SMS' : 'WhatsApp'}</button>
            ))}
          </div>
        </div>
        <button onClick={speak} className="pill pill-solid">{speaking ? 'Lecture en cours…' : '▶ Écouter le message vocal'}</button>
        <p className="text-[11px] text-ink/45">Envoi simulé · vrai canal : WhatsApp Business ou SMS. Voix : synthèse du navigateur, en français.</p>
      </div>

      <div className="mx-auto w-full max-w-[290px]">
        <div className="rounded-[2.2rem] border-[7px] border-ink bg-[#efeae2] p-3 shadow-2xl">
          <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-ink/20" />
          <p className="mb-3 text-center text-[11px] uppercase tracking-[0.16em] text-ink/55">{channel === 'sms' ? 'SMS · HydroGraph' : 'WhatsApp · HydroGraph'}</p>
          <div className="min-h-64">
            <AnimatePresence mode="wait">
              <motion.div key={text} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }} className={`max-w-[92%] rounded-2xl rounded-tl-sm px-3.5 py-3 text-[13px] leading-snug ${channel === 'whatsapp' ? 'bg-[#d9fdd3]' : 'bg-white'} text-ink shadow-sm`}>
                {text}
                <span className="mt-1 block text-right text-[10px] text-ink/50">{channel === 'sms' ? `${text.length} caractères` : '06:00 ✓✓'}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
