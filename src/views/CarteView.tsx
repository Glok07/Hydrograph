import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { RealMap } from '../components/RealMap'
import { StatTile } from '../components/StatTile'
import { TimeBar } from '../components/TimeBar'
import { WeekChart } from '../components/WeekChart'
import { ZoneCard } from '../components/ZoneCard'
import { LINE_COLORS, STATUS_COLOR } from '../data/colors'
import { HISTORY } from '../data/history'
import { CALAVI } from '../data/network'
import { EVENT_LABEL } from '../engine/events'
import { slotRanges } from '../engine/messages'
import { gapOf, useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

const CARD_W = 360
const nameOf = (id: string) => CALAVI.zones.find((z) => z.id === id)!.name

interface Toast {
  id: number
  tone: 'alert' | 'good'
  title: string
  text: string
}

/** Notifications : ce qui vient de se passer, en une phrase. */
function useToasts() {
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)
  const { shown, before, after, touched } = useDerived()
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const prev = useRef({ event, plan })

  useEffect(() => {
    const was = prev.current
    prev.current = { event, plan }
    let t: Omit<Toast, 'id'> | null = null
    if (event && event !== was.event) {
      t = { tone: 'alert', title: EVENT_LABEL[event], text: `${touched} zone${touched > 1 ? 's changent' : ' change'} de couleur. Les quartiers en bout de réseau sont les premiers touchés.` }
    } else if (plan && !was.plan) {
      const far = after.find((f) => f.slots.some((s) => s.guaranteed))
      const slot = far?.slots.find((s) => s.guaranteed)
      t = {
        tone: 'good',
        title: 'Tours d’eau recalculés',
        text: `${far ? `${nameOf(far.zone)} reçoit un créneau garanti ${slotRanges([slot!])[0]}. ` : ''}Écart entre zones : ${gapOf(before)} h → ${gapOf(after)} h.`,
      }
    }
    if (!t) return
    const id = ++seq.current
    setToasts((list) => [...list.slice(-1), { ...t, id }])
    const timer = window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), 7000)
    return () => window.clearTimeout(timer)
  }, [event, plan, shown, before, after, touched])

  return toasts
}

export function CarteView() {
  const { shown, broken } = useDerived()
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)
  const setPlan = useHydro((s) => s.setPlan)
  const zone = useHydro((s) => s.zone)
  const setZone = useHydro((s) => s.setZone)
  const hour = useHydro((s) => s.hour)
  const focusTick = useHydro((s) => s.focusTick)
  const overviewTick = useHydro((s) => s.overviewTick)
  const toasts = useToasts()
  const [computing, setComputing] = useState(false)

  const recompute = () => {
    setComputing(true)
    window.setTimeout(() => {
      setPlan(true)
      setComputing(false)
    }, 1400)
  }

  const well = shown.filter((f) => f.status === 'ok').length
  const risk = shown.filter((f) => f.status === 'risk').length
  const avg = Math.round(shown.reduce((s, f) => s + f.hoursOfWater, 0) / shown.length)
  const watch = [...shown].sort((a, b) => a.hoursOfWater - b.hoursOfWater).slice(0, 3)
  const today = (id: 'Z1' | 'Z6') => shown.find((f) => f.zone === id)!.hoursOfWater

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-4 lg:col-span-12 lg:grid-cols-4">
        <StatTile value={well} total={shown.length} label="zones bien servies" />
        <StatTile value={avg} unit="h" label="d’eau en moyenne par jour" />
        <StatTile value={risk} label={risk > 1 ? 'zones à risque de manque' : 'zone à risque de manque'} />
        <StatTile value={gapOf(shown)} unit="h" label="d’écart entre quartiers" />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/70 lg:col-span-12">
        {(['ok', 'warn', 'risk'] as const).map((st) => (
          <span key={st} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[st] }} />{{ ok: 'Eau toute la journée', warn: 'Eau par créneaux', risk: 'Risque de manque' }[st]}</span>
        ))}
        <span className="text-ink/50">Hauteur des zones = heures d’eau · positions réelles, chiffres simulés</span>
      </div>

      <section className="relative h-[620px] overflow-hidden rounded-[22px] border border-ink/10 bg-mist shadow-[0_12px_40px_rgba(20,60,120,0.12)] lg:col-span-12">
        <RealMap zones={shown} broken={broken} selected={zone} onSelect={setZone} event={event} activeHour={hour} focusKey={focusTick} overviewKey={overviewTick} padRight={CARD_W + 24} zoomBoost={0.65} />

        <aside className="glass absolute bottom-4 right-4 top-4 z-10 hidden overflow-y-auto !rounded-2xl p-5 lg:block" style={{ width: CARD_W }}>
          <ZoneCard />
        </aside>

        <div className="absolute left-4 top-4 z-20 flex w-[min(22rem,calc(100%-2rem))] flex-col gap-2">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: -20, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ type: 'spring', stiffness: 320, damping: 28 }} className="glass !rounded-2xl px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.tone === 'good' ? STATUS_COLOR.ok : STATUS_COLOR.risk }} />
                  {t.title}
                </p>
                <p className="mt-0.5 text-xs text-ink/80">{t.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {event && !plan && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-[7.5rem] left-1/2 z-20 -translate-x-1/2 lg:left-[calc(50%-190px)]">
              <button onClick={recompute} disabled={computing} className="cta-glow flex items-center gap-3 rounded-full bg-blue px-6 py-3 text-sm font-bold text-white shadow-xl">
                {computing ? <><span className="spinner" /> HydroGraph recalcule les tours d’eau…</> : <>Recalculer les tours d’eau <span aria-hidden>→</span></>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-4 left-4 right-4 z-20 lg:right-[calc(360px+2rem)]"><TimeBar /></div>
        {computing && <div className="scan pointer-events-none absolute inset-0 z-10" aria-hidden />}
      </section>

      <section className="glass p-5 lg:hidden"><ZoneCard /></section>

      <section className="glass p-5 lg:col-span-7">
        <h3 className="mb-3 font-display text-base font-semibold">Heures d’eau sur 7 jours</h3>
        <WeekChart lines={[
          { label: nameOf('Z1'), values: [...HISTORY.Z1, today('Z1')], color: LINE_COLORS.centre },
          { label: nameOf('Z6'), values: [...HISTORY.Z6, today('Z6')], color: LINE_COLORS.far },
        ]} />
      </section>

      <section className="glass p-5 lg:col-span-5">
        <h3 className="mb-3 font-display text-base font-semibold">Zones à surveiller</h3>
        <ul className="space-y-2">
          {watch.map((f, i) => (
            <motion.li layout key={f.zone} transition={{ type: 'spring', stiffness: 350, damping: 30 }} onClick={() => setZone(f.zone)} className="flex cursor-pointer items-center gap-3 rounded-xl bg-ink/5 px-3 py-2 hover:bg-ink/10">
              <span className="font-display text-xs font-semibold text-ink/60">Z-{i + 1}</span>
              <span className="flex-1 text-sm">{nameOf(f.zone)}<span className="block text-[11px] text-ink/55">{f.hoursOfWater} h d’eau aujourd’hui</span></span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[f.status] }} />
            </motion.li>
          ))}
        </ul>
        {plan && <p className="mt-3 text-[11px] text-ok">Tours d’eau HydroGraph actifs.</p>}
      </section>
    </div>
  )
}
