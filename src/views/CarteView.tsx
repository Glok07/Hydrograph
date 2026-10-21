import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { RealMap } from '../components/RealMap'
import type { DemandView } from '../components/RealMap'
import { StatTile } from '../components/StatTile'
import { TimeBar } from '../components/TimeBar'
import { ViewBar } from '../components/ViewBar'
import { WeekChart } from '../components/WeekChart'
import { ZoneCard } from '../components/ZoneCard'
import { LINE_COLORS, STATUS_COLOR } from '../data/colors'
import { HISTORY } from '../data/history'
import { CALAVI } from '../data/network'
import type { ZoneId } from '../data/network'
import { peakHour, totalDay, totalHour } from '../engine/demand'
import type { EventType } from '../engine/events'
import { EVENT_LABEL } from '../engine/events'
import { slotRanges } from '../engine/messages'
import { REFERENCE_PERIOD } from '../engine/periods'
import { gapOf, useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

const CARD_W = 360
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5)
const nameOf = (id: string) => CALAVI.zones.find((z) => z.id === id)!.name
const fmt = (v: number) => Math.round(v).toLocaleString('fr-FR')

interface Toast {
  id: number
  tone: 'alert' | 'good'
  title: string
  text: string
}

/** Notifications : ce qui vient de se passer, en une phrase. */
function useToasts() {
  const causes = useHydro((s) => s.causes)
  const plan = useHydro((s) => s.plan)
  const { before, after, touched } = useDerived()
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const prev = useRef<{ causes: EventType[]; plan: boolean }>({ causes, plan })

  useEffect(() => {
    const was = prev.current
    prev.current = { causes, plan }
    const added = causes.filter((c) => !was.causes.includes(c))
    let t: Omit<Toast, 'id'> | null = null
    if (added.length > 0) {
      const names = added.map((c) => EVENT_LABEL[c]).join(' + ')
      const cumul = causes.length > added.length ? ` Cumulé avec ${causes.length - added.length} autre${causes.length - added.length > 1 ? 's' : ''} cause${causes.length - added.length > 1 ? 's' : ''}.` : ''
      t = { tone: 'alert', title: names, text: `${touched} zone${touched > 1 ? 's changent' : ' change'} de couleur.${cumul} Cliquez une zone pour voir les causes.` }
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
  }, [causes, plan, before, after, touched])

  return toasts
}

export function CarteView() {
  const { shown, broken, ctx } = useDerived()
  const causes = useHydro((s) => s.causes)
  const plan = useHydro((s) => s.plan)
  const setPlan = useHydro((s) => s.setPlan)
  const mode = useHydro((s) => s.mapMode)
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

  // Demande prévue : par zone, par jour et par heure, pour la période choisie.
  const demandData = useMemo(() => {
    const days = CALAVI.zones.map((z) => totalDay(z, ctx))
    const hourly = CALAVI.zones.map((z) => HOURS.map((h) => totalHour(z, h, ctx)))
    const cityHour = HOURS.map((_, i) => hourly.reduce((s, row) => s + row[i], 0))
    const total = days.reduce((a, b) => a + b, 0)
    const reference = CALAVI.zones.reduce((s, z) => s + totalDay(z, REFERENCE_PERIOD), 0)
    return {
      days,
      hourly,
      total,
      vsOrdinary: reference > 0 ? (total / reference - 1) * 100 : 0,
      maxDay: Math.max(...days) || 1,
      maxHour: Math.max(...hourly.flat()) || 1,
      cityPeak: HOURS[cityHour.indexOf(Math.max(...cityHour))],
      top: CALAVI.zones.map((z, i) => ({ id: z.id, name: z.name, m3: days[i], peak: peakHour(z, ctx) })).sort((a, b) => b.m3 - a.m3),
    }
  }, [ctx])

  const demand = useMemo(() => {
    const out: Partial<Record<ZoneId, DemandView>> = {}
    CALAVI.zones.forEach((z, i) => {
      if (hour === null) out[z.id] = { intensity: demandData.days[i] / demandData.maxDay, label: `${fmt(demandData.days[i])} m³` }
      else {
        const v = demandData.hourly[i][Math.min(HOURS.length - 1, Math.max(0, hour - 5))]
        out[z.id] = { intensity: v / demandData.maxHour, label: `${fmt(v)} m³/h` }
      }
    })
    return out
  }, [demandData, hour])

  const showDemand = mode === 'demand'

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-12 lg:grid-cols-4">
        {showDemand ? (
          <>
            <StatTile value={Math.round(demandData.total)} unit="m³" label={`d’eau demandés ce jour (${ctx.label.toLowerCase()})`} />
            <StatTile text={demandData.top[0].name} label={`consomme le plus (${fmt(demandData.top[0].m3)} m³, pic à ${demandData.top[0].peak} h)`} />
            <StatTile value={demandData.cityPeak} unit="h" label="pic de demande de la ville" />
            <StatTile value={Math.round(demandData.vsOrdinary)} unit="%" label="par rapport à un mercredi ordinaire" />
          </>
        ) : (
          <>
            <StatTile value={well} total={shown.length} label="zones bien servies" />
            <StatTile value={avg} unit="h" label="d’eau en moyenne par jour" />
            <StatTile value={risk} label={risk > 1 ? 'zones à risque de manque' : 'zone à risque de manque'} />
            <StatTile value={gapOf(shown)} unit="h" label="d’écart entre quartiers" />
          </>
        )}
      </div>

      <ViewBar />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink/70 lg:col-span-12">
        {showDemand ? (
          <>
            <span className="flex items-center gap-2">
              Peu de demande
              <span className="h-2.5 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, rgb(190,216,248), rgb(16,78,180))' }} />
              Beaucoup
            </span>
            <span className="text-ink/50">Couleur et hauteur = eau demandée par les habitants et leurs activités · activités : OpenStreetMap, volumes simulés</span>
          </>
        ) : (
          <>
            {(['ok', 'warn', 'risk'] as const).map((st) => (
              <span key={st} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_COLOR[st] }} />{{ ok: 'Eau toute la journée', warn: 'Eau par créneaux', risk: 'Risque de manque' }[st]}</span>
            ))}
            <span className="text-ink/50">Hauteur des zones = heures d’eau · positions réelles, chiffres simulés</span>
          </>
        )}
      </div>

      <section className="relative h-[min(68svh,520px)] min-h-[340px] overflow-hidden rounded-[22px] border border-ink/10 bg-mist shadow-[0_12px_40px_rgba(20,60,120,0.12)] lg:col-span-12 lg:h-[620px]">
        <RealMap zones={shown} broken={broken} selected={zone} onSelect={setZone} causes={causes} mode={mode} demand={demand} activeHour={hour} focusKey={focusTick} overviewKey={overviewTick} padRight={CARD_W + 24} padLeft={90} zoomBoost={0.65} />

        <aside className="glass absolute bottom-4 right-4 top-4 z-10 hidden overflow-y-auto !rounded-2xl !bg-white/95 p-5 lg:block" style={{ width: CARD_W }}>
          <ZoneCard />
        </aside>

        <div className="absolute left-3 right-3 top-14 z-20 flex flex-col gap-2 sm:left-4 sm:right-auto sm:top-4 sm:w-[min(22rem,calc(100%-2rem))]">
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

        <AnimatePresence mode="wait">
          {causes.length > 0 && !showDemand && (
            <motion.div key={plan ? 'on' : 'off'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute inset-x-3 bottom-3 z-20 flex justify-center lg:inset-x-auto lg:bottom-[7.5rem] lg:left-[calc(50%-190px)] lg:-translate-x-1/2">
              {plan ? (
                <span className="glass flex items-center gap-3 !rounded-full px-5 py-2.5 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full bg-ok" /> Tours d’eau HydroGraph actifs
                  <button onClick={() => setPlan(false)} className="text-xs font-semibold text-blue hover:underline">Voir sans</button>
                </span>
              ) : (
                <button onClick={recompute} disabled={computing} className="cta-glow flex w-full max-w-md items-center justify-center gap-2 whitespace-normal rounded-full bg-blue px-4 py-3 text-center text-sm font-bold leading-snug text-white shadow-xl sm:w-auto sm:gap-3 sm:px-6">
                  {computing ? <><span className="spinner" /> HydroGraph recalcule les tours d’eau…</> : <>Recalculer les tours d’eau <span aria-hidden>→</span></>}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute bottom-4 left-4 right-4 z-20 hidden lg:right-[calc(360px+2rem)] lg:block"><TimeBar /></div>
        {computing && <div className="scan pointer-events-none absolute inset-0 z-10" aria-hidden />}
      </section>

      <div className="lg:hidden"><TimeBar /></div>

      <section className="glass p-4 sm:p-5 lg:hidden"><ZoneCard /></section>

      {showDemand ? (
        <section className="glass p-4 sm:p-5 lg:col-span-12">
          <h3 className="mb-3 font-display text-base font-semibold">Zones qui consomment le plus · {ctx.label.toLowerCase()}</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {demandData.top.map((z, i) => (
              <motion.li layout key={z.id} transition={{ type: 'spring', stiffness: 350, damping: 30 }} onClick={() => setZone(z.id)} className="flex cursor-pointer items-center gap-3 rounded-xl bg-ink/5 px-3 py-2 hover:bg-ink/10">
                <span className="font-display text-xs font-semibold text-ink/60">{i + 1}</span>
                <span className="flex-1 text-sm">{z.name}<span className="block text-[11px] text-ink/55">{fmt(z.m3)} m³ · pic à {z.peak} h</span></span>
              </motion.li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-ink/50">Cliquez une zone, puis l’onglet « Demande » de sa fiche : qui consomme, heure par heure, et selon la période.</p>
        </section>
      ) : (
        <>
          <section className="glass p-4 sm:p-5 lg:col-span-7">
            <h3 className="mb-3 font-display text-base font-semibold">Heures d’eau sur 7 jours</h3>
            <WeekChart lines={[
              { label: nameOf('Z1'), values: [...HISTORY.Z1, today('Z1')], color: LINE_COLORS.centre },
              { label: nameOf('Z6'), values: [...HISTORY.Z6, today('Z6')], color: LINE_COLORS.far },
            ]} />
          </section>

          <section className="glass p-4 sm:p-5 lg:col-span-5">
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
        </>
      )}
    </div>
  )
}
