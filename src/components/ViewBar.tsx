import { motion } from 'framer-motion'
import { PERIODS } from '../engine/periods'
import { useHydro } from '../store/useHydro'
import type { MapMode } from '../store/useHydro'

const MODES: { id: MapMode; label: string; hint: string }[] = [
  { id: 'service', label: 'Disponibilité', hint: 'Où l’eau coule et quand' },
  { id: 'demand', label: 'Demande prévue', hint: 'Où l’on consomme le plus, d’après les activités des habitants' },
]

/** Ce que montre la carte (le service ou la demande), et pour quelle période de la journée. */
export function ViewBar() {
  const mode = useHydro((s) => s.mapMode)
  const setMode = useHydro((s) => s.setMapMode)
  const period = useHydro((s) => s.period)
  const setPeriod = useHydro((s) => s.setPeriod)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:col-span-12">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-ink/10 bg-white p-1 shadow-sm sm:inline-flex sm:rounded-full" role="group" aria-label="Ce que montre la carte">
        {MODES.map((m) => {
          const on = m.id === mode
          return (
            <button key={m.id} onClick={() => setMode(m.id)} aria-pressed={on} title={m.hint} className={`relative rounded-full px-4 py-2 text-xs font-semibold transition-colors ${on ? 'text-white' : 'text-ink/70 hover:text-ink'}`}>
              {on && <motion.span layoutId="mode-bg" className="absolute inset-0 rounded-full bg-blue shadow-md" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative">{m.label}</span>
            </button>
          )
        })}
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-ink/70">
        Période
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-full border border-ink/15 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-ink shadow-sm">
          {PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
