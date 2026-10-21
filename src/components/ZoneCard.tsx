import { AnimatePresence, motion } from 'framer-motion'
import { CALAVI } from '../data/network'
import { adviceFor, confidenceFor, reasonFor, slotRanges, STATUS_LABEL } from '../engine/messages'
import { useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'
import type { ZoneTab } from '../store/useHydro'
import { STATUS_COLOR } from '../data/colors'
import { DemandPanel } from './DemandPanel'
import { SlotBar } from './SlotBar'
import { WaterTypePanel } from './WaterTypePanel'

const ICON = { ok: '●', warn: '◐', risk: '▲' } as const

const TABS: { id: ZoneTab; label: string }[] = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'water', label: 'Types d’eau' },
  { id: 'demand', label: 'Demande' },
]

/** Fiche de zone (F2) : horaires, causes, conseil ; impact par type d'eau ; demande selon les activités. */
export function ZoneCard() {
  const zoneId = useHydro((s) => s.zone)
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)
  const { shown, explanation, ctx } = useDerived()
  const tab = useHydro((s) => s.zoneTab)
  const setTab = useHydro((s) => s.setZoneTab)

  const zone = CALAVI.zones.find((z) => z.id === zoneId)!
  const f = shown.find((x) => x.zone === zoneId)!
  const why = explanation[zoneId]
  const color = STATUS_COLOR[f.status]
  const conf = confidenceFor(event, zone)
  const ranges = slotRanges(f.slots)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-ink/55">Fiche de zone</p>
          <h3 className="font-display text-xl font-semibold">{zone.name}</h3>
          <p className="text-xs text-ink/55">{zone.households.toLocaleString('fr-FR')} foyers (simulé)</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-ink" style={{ background: `${color}22` }}>
          <span aria-hidden style={{ color }}>{ICON[f.status]}</span>
          {STATUS_LABEL[f.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink/5 p-1" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`relative rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${tab === t.id ? 'text-ink' : 'text-ink/55 hover:text-ink'}`}>
            {tab === t.id && <motion.span layoutId="zone-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={`${zoneId}-${tab}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }} className="flex flex-1 flex-col gap-3">
          {tab === 'today' && (
            <>
              <div>
                <p className="font-display text-3xl font-semibold leading-none">{f.hoursOfWater} <span className="text-base font-normal text-ink/70">h d’eau au robinet</span></p>
                <p className="mt-1 text-sm text-ink/70">{ranges.length ? ranges.join(' · ') : 'Aucun créneau prévu'}</p>
              </div>
              <SlotBar slots={f.slots} color={color} />

              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink/50">Pourquoi</p>
                {why.causes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {why.causes.map((c) => (
                      <li key={c.cause} className="rounded-xl bg-ink/5 px-3 py-2 text-xs" title={c.hint}>
                        <p className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold">{c.label}</span>
                          <span className={`shrink-0 font-semibold ${c.hoursLost > 0 ? 'text-risk' : c.hoursLost < 0 ? 'text-ok' : 'text-accent'}`}>
                            {c.hoursLost > 0 ? `−${c.hoursLost} h` : c.hoursLost < 0 ? `+${-c.hoursLost} h` : c.exposedDelta > 0 ? `+${Math.round(c.exposedDelta * 100)} pts de foyers exposés` : ''}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-ink/60">{c.hint}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-snug">{reasonFor(event, zone, f, plan)}</p>
                )}
              </div>

              <p className="rounded-xl bg-ink/5 px-3 py-2 text-sm"><span className="text-ink/55">Conseil : </span>{adviceFor(event, f)}</p>

              <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-ink/10 px-2.5 py-1">{conf.label} ({Math.round(conf.value * 100)} %)</span>
                {f.qualityRisk && <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-white">Risque qualité de l’eau</span>}
                {f.slots.some((s) => s.guaranteed) && <span className="rounded-full bg-blue px-2.5 py-1 font-semibold text-white">★ Créneau garanti</span>}
              </div>
              <p className="text-[10px] text-ink/40">Simulé · vraie source future : signalements d’habitants et annonces SoNEB</p>
            </>
          )}

          {tab === 'water' && f.impact && <WaterTypePanel zone={zone} impact={f.impact} />}
          {tab === 'demand' && <DemandPanel zone={zone} ctx={ctx} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
