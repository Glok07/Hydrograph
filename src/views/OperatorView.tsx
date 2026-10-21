import { motion } from 'framer-motion'
import { STATUS_COLOR } from '../data/colors'
import { SlotBar } from '../components/SlotBar'
import { CALAVI } from '../data/network'
import { EVENT_LABEL } from '../engine/events'
import type { ZoneForecast } from '../engine/forecast'
import { slotRanges } from '../engine/messages'
import { gapOf, useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

function Plan({ title, note, rows }: { title: string; note: string; rows: ZoneForecast[] }) {
  return (
    <section className="glass p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mb-4 text-xs text-ink/60">{note}</p>
      <div className="space-y-3">
        {CALAVI.zones.map((z) => {
          const f = rows.find((r) => r.zone === z.id)!
          return (
            <div key={z.id} className="grid grid-cols-[9.5rem_1fr_3rem] items-center gap-3">
              <span className="truncate text-xs text-ink/85">{z.name}</span>
              <SlotBar slots={f.slots} color={STATUS_COLOR[f.status]} labels={false} />
              <span className="text-right font-display text-sm font-semibold">{f.hoursOfWater} h</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-[9.5rem_1fr_3rem] gap-3 text-[10px] text-ink/50">
        <span /><span className="flex justify-between"><span>5 h</span><span>14 h</span><span>23 h</span></span><span />
      </div>
    </section>
  )
}

/** Vue opérateur (F6) : plan du jour, avant et après le recalcul des tours d'eau. */
export function OperatorView() {
  const event = useHydro((s) => s.event)
  const { before, after } = useDerived()

  const order = after
    .filter((f) => f.slots.length)
    .map((f) => ({ f, first: f.slots[0].start }))
    .sort((a, b) => a.first - b.first)

  return (
    <div className="grid gap-4">
      <motion.div key={event ?? 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink/80">
        <span>{event ? <strong>{EVENT_LABEL[event]}</strong> : 'Journée normale'}</span>
        <span>Écart entre zones : <strong>{gapOf(before)} h</strong> → <strong className="text-ok">{gapOf(after)} h</strong> avec HydroGraph</span>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Plan title="Sans HydroGraph" note="Le réseau sert d’abord les zones proches du château d’eau." rows={before} />
        <Plan title="Tours d’eau recalculés" note="★ = créneau garanti à la zone la plus éloignée." rows={after} />
      </div>

      <section className="glass p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Plan de distribution du jour</h3>
        <ol className="grid gap-2 sm:grid-cols-2">
          {order.map(({ f }, i) => (
            <li key={f.zone} className="flex items-center gap-3 rounded-xl bg-ink/5 px-3 py-2 text-sm">
              <span className="font-display text-xs font-semibold text-ink/55">{i + 1}</span>
              <span className="flex-1">{CALAVI.zones.find((z) => z.id === f.zone)!.name}</span>
              <span className="text-xs text-ink/70">{slotRanges(f.slots).slice(0, 2).join(' · ')}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-ink/45">Moins d’appels, plaintes géolocalisées, carte des zones fragiles. Simulé · vraie source future : données de pompage SoNEB.</p>
      </section>
    </div>
  )
}
