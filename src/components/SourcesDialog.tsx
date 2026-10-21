import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { SOURCES } from '../data/sources'
import { useHydro } from '../store/useHydro'

const BADGE = {
  Oui: 'bg-ok/15 text-[#047857]',
  Simulé: 'bg-warn/20 text-[#92400e]',
  Non: 'bg-ink/8 text-ink/60',
} as const

/** « D'où viennent les données ? » : chaque donnée simulée et sa vraie source future. */
export function SourcesDialog() {
  const open = useHydro((s) => s.sourcesOpen)
  const setOpen = useHydro((s) => s.setSourcesOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-3 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="sources-title" className="card max-h-[92svh] w-full max-w-3xl overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 md:p-8" initial={{ y: 40, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 30 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="sources-title" className="font-display text-lg font-semibold leading-tight sm:text-xl">D’où viennent les données ?</h2>
                <p className="mt-1 text-sm text-ink/65">La démo tourne sur des données simulées qui gardent la forme des vraies sources. HydroGraph fonctionne dès le premier jour avec le calendrier, les données publiques et les habitants, sans attendre d’accord avec un opérateur.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-lg hover:bg-ink/10">×</button>
            </div>

            <ul className="mt-6 divide-y divide-ink/8">
              {SOURCES.map((s, i) => (
                <motion.li key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr_7rem] sm:items-start sm:gap-4">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-ink/55">{s.when}</p>
                  </div>
                  <div className="text-sm">
                    <p><span className="text-ink/50">Dans la démo : </span>{s.demo}</p>
                    <p className="mt-0.5"><span className="text-ink/50">Vraie source : </span>{s.real}</p>
                  </div>
                  <span className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold sm:justify-self-end ${BADGE[s.inDemo]}`}>{s.inDemo === 'Oui' ? 'Réel' : s.inDemo === 'Simulé' ? 'Simulé' : 'Plus tard'}</span>
                </motion.li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink/50">Hypothèse à tester : une dizaine de réponses d’habitants par zone suffit pour savoir ce qui s’y passe.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
