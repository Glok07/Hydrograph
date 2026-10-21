import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useHydro } from '../store/useHydro'

type HydroPatch = Partial<Pick<ReturnType<typeof useHydro.getState>, 'view' | 'event' | 'plan' | 'zone' | 'hour' | 'playing' | 'sourcesOpen'>>

interface Step {
  title: string
  /** ce que dit le présentateur */
  text: string
  apply: HydroPatch
  /** la carte revient à la vue d'ensemble */
  overview?: boolean
}

/** Le script de démo de 5 minutes du README, joué pas à pas. */
const STEPS: Step[] = [
  { title: 'La météo de l’eau', text: 'Au Bénin, l’eau existe sur le papier, pas toujours au robinet. Voici Abomey-Calavi : six zones alimentées par un château d’eau.', apply: { view: 'carte', event: null, plan: false, hour: null, playing: false, sourcesOpen: false }, overview: true },
  { title: 'Une journée d’eau', text: 'Heure par heure, on voit quelles zones ont l’eau. Les quartiers en bout de réseau sont servis en dernier.', apply: { hour: 5, playing: true }, overview: true },
  { title: 'Hêvié, la zone oubliée', text: 'Hêvié, en bout de réseau : aucune heure d’eau aujourd’hui. La fiche donne la raison et un conseil simple.', apply: { playing: false, hour: null, zone: 'Z6' } },
  { title: 'Coupure de courant', text: 'La pompe s’arrête. La carte se recolore : les zones éloignées sont les premières touchées.', apply: { event: 'power_cut', plan: false, view: 'carte' } },
  { title: 'HydroGraph recalcule', text: 'Les tours d’eau sont recalculés : Hêvié reçoit un créneau garanti et l’écart entre les quartiers fond.', apply: { plan: true } },
  { title: 'Prévenir les familles', text: 'Chaque famille reçoit l’horaire et un conseil, par WhatsApp ou SMS, à l’écrit ou à l’oral.', apply: { view: 'familles' } },
  { title: 'La vue de la mairie', text: 'La mairie voit les quartiers régulièrement oubliés. On mesure le service réellement reçu, pas seulement l’existence des ouvrages.', apply: { view: 'mairie' } },
  { title: 'Et demain', text: 'Tout ici est simulé, mais chaque donnée a sa vraie source. Ensuite : signalements d’habitants, données publiques, puis un pilote dans une commune.', apply: { sourcesOpen: true } },
]

export function DemoTour() {
  const tour = useHydro((s) => s.tour)
  const setTour = useHydro((s) => s.setTour)

  useEffect(() => {
    if (tour === null) return
    const { zone, ...rest } = STEPS[tour].apply
    useHydro.setState(rest)
    // setZone et requestOverview passent par le store pour que la carte bouge même si la zone ne change pas.
    if (zone) useHydro.getState().setZone(zone)
    if (STEPS[tour].overview) useHydro.getState().requestOverview()
    if (!STEPS[tour].apply.sourcesOpen) document.getElementById('panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tour])

  useEffect(() => {
    if (tour === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setTour(Math.min(STEPS.length - 1, tour + 1))
      if (e.key === 'ArrowLeft') setTour(Math.max(0, tour - 1))
      if (e.key === 'Escape') setTour(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tour, setTour])

  const close = () => {
    setTour(null)
    useHydro.setState({ playing: false, sourcesOpen: false })
  }

  return (
    <AnimatePresence>
      {tour !== null && (
        <motion.div className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-3 sm:justify-end sm:px-6" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          <div className="card w-full max-w-md p-4 shadow-[0_20px_60px_rgba(20,60,120,0.25)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-1.5" aria-hidden>
                {STEPS.map((_, i) => (
                  <motion.span key={i} animate={{ width: i === tour ? 22 : 7, backgroundColor: i <= tour ? '#1d6fe0' : 'rgba(11,37,69,0.15)' }} className="h-1.5 rounded-full" />
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-ink/50">
                <span>Étape {tour + 1} / {STEPS.length}</span>
                <button onClick={close} aria-label="Quitter le mode démo" className="grid h-7 w-7 place-items-center rounded-full bg-ink/5 text-base text-ink hover:bg-ink/10">×</button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tour} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
                <h3 className="mt-3 font-display text-lg font-semibold">{STEPS[tour].title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink/75">{STEPS[tour].text}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setTour(Math.max(0, tour - 1))} disabled={tour === 0} className="text-sm font-semibold text-ink/60 hover:text-ink disabled:opacity-30">← Précédent</button>
              <span className="hidden text-[11px] text-ink/40 sm:block">← → au clavier</span>
              {tour < STEPS.length - 1 ? (
                <button onClick={() => setTour(tour + 1)} className="pill pill-solid">Suivant →</button>
              ) : (
                <button onClick={close} className="pill pill-solid">Terminer</button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
