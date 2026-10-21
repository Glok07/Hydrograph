import { motion } from 'framer-motion'
import { EVENT_LABEL } from '../engine/events'
import type { EventType } from '../engine/events'
import { useHydro } from '../store/useHydro'

const CHIPS: { id: EventType | null; label: string }[] = [
  { id: null, label: 'Journée normale' },
  { id: 'power_cut', label: EVENT_LABEL.power_cut },
  { id: 'heavy_rain', label: EVENT_LABEL.heavy_rain },
  { id: 'pipe_burst', label: EVENT_LABEL.pipe_burst },
]

/**
 * Déclencheur d'événements (F3) et interrupteur des tours d'eau HydroGraph (F4).
 * L'interrupteur n'apparaît que là où il change l'affichage : la vue opérateur montre déjà l'avant et l'après.
 */
export function EventBar({ showPlan = true }: { showPlan?: boolean }) {
  const event = useHydro((s) => s.event)
  const plan = useHydro((s) => s.plan)
  const setEvent = useHydro((s) => s.setEvent)
  const setPlan = useHydro((s) => s.setPlan)

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-ink/10 bg-white p-1 shadow-sm sm:rounded-full" role="group" aria-label="Événement simulé">
        {CHIPS.map((c) => {
          const on = c.id === event
          return (
            <button key={c.label} onClick={() => setEvent(c.id)} aria-pressed={on} className={`relative rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5 sm:py-1.5 ${on ? 'text-white' : 'text-ink/70 hover:text-ink'}`}>
              {on && <motion.span layoutId="chip-bg" className="absolute inset-0 rounded-full bg-blue shadow-md" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
              <span className="relative">{c.label}</span>
            </button>
          )
        })}
      </div>

      {showPlan && (
      <button role="switch" aria-checked={plan} onClick={() => setPlan(!plan)} className="flex items-center gap-2.5 self-start py-1 text-xs font-semibold text-ink/90">
        <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${plan ? 'justify-end bg-ok' : 'justify-start bg-ink/15'}`}>
          <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className="h-5 w-5 rounded-full bg-white shadow" />
        </span>
        Tours d’eau HydroGraph
      </button>
      )}
    </div>
  )
}
