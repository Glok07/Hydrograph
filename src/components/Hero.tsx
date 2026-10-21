import { motion } from 'framer-motion'
import { VIEWS, useHydro } from '../store/useHydro'
import type { View } from '../store/useHydro'
import { WaterScene } from './WaterScene'

export function Hero() {
  const view = useHydro((s) => s.view)
  const setView = useHydro((s) => s.setView)
  const setTour = useHydro((s) => s.setTour)

  const go = (id: View) => {
    setView(id)
    document.getElementById('panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <header className="relative w-full text-white" style={{ height: 'var(--hero-h)' }}>
      <WaterScene />
      {/* L'eau se fond dans la page claire */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-b from-transparent to-[#f6f9fd]" />

      <nav className="fade-up absolute inset-x-0 top-0 z-[3] flex items-center justify-between gap-3 px-4 py-4 text-ink sm:px-6 sm:py-5 md:px-10">
        <span className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold tracking-wide sm:text-xl">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M12 2.5S5 10.2 5 14.6a7 7 0 0 0 14 0C19 10.2 12 2.5 12 2.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.5 15.5h7M10 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          HydroGraph
        </span>
        <ul className="hidden gap-8 text-[13px] font-medium md:flex">
          {VIEWS.map((v) => (
            <li key={v.id}>
              <button onClick={() => go(v.id)} className={`relative pb-1 transition-opacity hover:opacity-100 ${view === v.id ? 'opacity-100' : 'opacity-65'}`}>
                {v.label}
                {view === v.id && <motion.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded bg-ink" />}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={() => setTour(0)} className="pill pill-solid shrink-0 px-3! py-2! text-xs sm:px-5! sm:text-[0.78rem]">
          <span className="sm:hidden">▶ Démo</span>
          <span className="hidden sm:inline">▶ Lancer la démo</span>
        </button>
      </nav>

      <div className="fade-up absolute inset-x-4 bottom-8 z-[3] flex justify-center sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[75%] sm:-translate-x-1/2" style={{ animationDelay: '0.5s' }}>
        <button onClick={() => go('carte')} className="pill pill-lg w-full max-w-xs justify-center sm:w-auto">
          Voir la carte du jour <span aria-hidden>↓</span>
        </button>
      </div>
    </header>
  )
}
