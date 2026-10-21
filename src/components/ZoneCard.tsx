import { AnimatePresence, motion } from 'framer-motion'
import { CALAVI } from '../data/network'
import { adviceFor, confidenceFor, reasonFor, slotRanges, STATUS_LABEL } from '../engine/messages'
import { useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'
import { STATUS_COLOR } from '../data/colors'
import { SlotBar } from './SlotBar'

const ICON = { ok: '●', warn: '◐', risk: '▲' } as const

/** Fiche de zone (F2) : horaires, raison, conseil, confiance. */
export function ZoneCard() {
  const zoneId = useHydro((s) => s.zone)
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)
  const { shown } = useDerived()

  const zone = CALAVI.zones.find((z) => z.id === zoneId)!
  const f = shown.find((x) => x.zone === zoneId)!
  const color = STATUS_COLOR[f.status]
  const conf = confidenceFor(event, zone)
  const ranges = slotRanges(f.slots)

  return (
    <AnimatePresence mode="wait">
      <motion.div key={`${zoneId}-${event}-${plan}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="flex h-full flex-col gap-3">
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

        <div>
          <p className="font-display text-3xl font-semibold leading-none">{f.hoursOfWater} <span className="text-base font-normal text-ink/70">h d’eau aujourd’hui</span></p>
          <p className="mt-1 text-sm text-ink/70">{ranges.length ? ranges.join(' · ') : 'Aucun créneau prévu'}</p>
        </div>

        <SlotBar slots={f.slots} color={color} />

        <p className="text-sm"><span className="text-ink/55">Pourquoi : </span>{reasonFor(event, zone, f, plan)}</p>
        <p className="rounded-xl bg-ink/5 px-3 py-2 text-sm"><span className="text-ink/55">Conseil : </span>{adviceFor(event, f)}</p>

        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-ink/10 px-2.5 py-1">{conf.label} ({Math.round(conf.value * 100)} %)</span>
          {f.qualityRisk && <span className="rounded-full bg-accent px-2.5 py-1 font-semibold text-white">Risque qualité de l’eau</span>}
          {f.slots.some((s) => s.guaranteed) && <span className="rounded-full bg-blue px-2.5 py-1 font-semibold text-white">★ Créneau garanti</span>}
        </div>
        <p className="text-[10px] text-ink/40">Simulé · vraie source future : signalements d’habitants et annonces SoNEB</p>
      </motion.div>
    </AnimatePresence>
  )
}
