import { AnimatePresence, motion } from 'framer-motion'
import { CarteView } from '../views/CarteView'
import { CityHallView } from '../views/CityHallView'
import { FamilyView } from '../views/FamilyView'
import { OperatorView } from '../views/OperatorView'
import { VIEWS, useHydro } from '../store/useHydro'
import type { View } from '../store/useHydro'
import { EventBar } from './EventBar'

const BODY: Record<View, () => React.JSX.Element> = {
  carte: CarteView,
  operateur: OperatorView,
  mairie: CityHallView,
  familles: FamilyView,
}

const TITLE: Record<View, string> = {
  carte: 'Aujourd’hui à Abomey-Calavi',
  operateur: 'Plan du jour pour l’opérateur',
  mairie: 'Équité entre quartiers',
  familles: 'Messages aux familles',
}

export function Panel() {
  const view = useHydro((s) => s.view)
  const setView = useHydro((s) => s.setView)
  const setSourcesOpen = useHydro((s) => s.setSourcesOpen)
  const Body = BODY[view]

  return (
    <motion.section id="panel" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }} className="glass panel-overlap relative z-[2] scroll-mt-4 p-4 sm:p-5 md:p-7">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold sm:text-xl">{TITLE[view]}</h2>
          <p className="mt-1 text-sm text-ink/70">Chaque zone, chaque jour : l’eau viendra-t-elle, et quand ?</p>
          <button onClick={() => setSourcesOpen(true)} className="mt-2 text-xs font-semibold text-blue md:hidden">D’où viennent les données ?</button>
        </div>
        <button onClick={() => setSourcesOpen(true)} className="pill pill-light md-only hidden md:inline-flex">ⓘ D’où viennent les données ?</button>
        <div className="grid w-full grid-cols-4 gap-1 rounded-2xl border border-ink/10 bg-ink/5 p-1 md:hidden">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} className={`rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight ${v.id === view ? 'bg-ink text-white' : 'text-ink/80'}`}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="mb-5"><EventBar showPlan={view !== 'operateur'} /></div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28 }}>
          <Body />
        </motion.div>
      </AnimatePresence>
    </motion.section>
  )
}
