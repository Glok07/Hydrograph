import { AnimatePresence, motion } from 'framer-motion'
import { CAUSES, GROUP_LABEL } from '../engine/causes'
import type { CauseGroup } from '../engine/causes'
import { EVENT_LABEL } from '../engine/events'
import { WATER_TYPE_SHORT } from '../engine/waterTypes'
import { useHydro } from '../store/useHydro'

const GROUPS: CauseGroup[] = ['energie', 'reseau', 'meteo', 'ressource', 'demande']

/** Bouton qui ouvre le tiroir ; affiche le nombre de causes simulées. */
export function IncidentButton() {
  const open = useHydro((s) => s.simOpen)
  const setOpen = useHydro((s) => s.setSimOpen)
  const count = useHydro((s) => s.causes.length)
  return (
    <button onClick={() => setOpen(!open)} aria-expanded={open} className={`pill ${open || count > 0 ? 'pill-solid' : 'pill-light'}`}>
      ⚡ Simuler des incidents
      {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-blue">{count}</span>}
    </button>
  )
}

/**
 * Outil de démonstration : en vrai, les causes sont détectées (calendrier, météo, annonces, signalements).
 * Ici on les provoque à la main, une ou plusieurs à la fois, pour montrer comment elles se cumulent.
 */
export function IncidentDrawer() {
  const open = useHydro((s) => s.simOpen)
  const causes = useHydro((s) => s.causes)
  const toggle = useHydro((s) => s.toggleCause)
  const clear = useHydro((s) => s.clearCauses)

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="overflow-hidden">
          <div className="mb-5 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-sm font-semibold">Simuler des incidents</p>
                <p className="text-xs text-ink/60">Outil de démonstration. En réel, ces causes sont détectées automatiquement ; plusieurs peuvent se cumuler.</p>
              </div>
              {causes.length > 0 && (
                <button onClick={clear} className="text-xs font-semibold text-blue hover:underline">
                  Tout effacer
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GROUPS.map((g) => (
                <div key={g}>
                  <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink/50">{GROUP_LABEL[g]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CAUSES.filter((c) => c.group === g).map((c) => {
                      const on = causes.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggle(c.id)}
                          aria-pressed={on}
                          title={`${c.hint}${c.affects.length ? ` Touche : ${c.affects.map((t) => WATER_TYPE_SHORT[t]).join(', ')}.` : ''}`}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${on ? 'border-blue bg-blue text-white' : 'border-ink/15 text-ink/75 hover:border-ink/40'}`}
                        >
                          {EVENT_LABEL[c.id]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
