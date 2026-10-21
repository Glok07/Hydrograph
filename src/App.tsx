import { useMotionValue, useSpring } from 'framer-motion'
import type { PointerEvent } from 'react'
import { Bubbles } from './components/Bubbles'
import { DemoTour } from './components/DemoTour'
import { Hero } from './components/Hero'
import { Panel } from './components/Panel'
import { SourcesDialog } from './components/SourcesDialog'

export default function App() {
  const pointer = useMotionValue(0)
  const x = useSpring(pointer, { stiffness: 40, damping: 20 })

  /** Les bulles dérivent doucement à l'opposé du pointeur. */
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width - 0.5) * -24)
  }

  return (
    <div className="page min-h-screen">
      {/* --hero-h : hauteur de l'accueil, partagée par l'eau, les bulles et le recouvrement du panneau */}
      <div onPointerMove={onMove} className="frame hero-stage relative overflow-hidden pb-6 sm:pb-8">
        <div className="relative">
          <Hero />
          <Bubbles x={x} />
          <div className="relative z-[2] mx-auto max-w-[1240px] px-3 sm:px-4 md:px-8">
            <Panel />
          </div>
        </div>
        <p className="relative z-[2] mt-6 px-4 text-center text-[11px] leading-relaxed text-ink/45">
          HydroGraph · démo hackathon · données simulées · fond de carte © OpenStreetMap, CARTO
        </p>
      </div>
      <SourcesDialog />
      <DemoTour />
    </div>
  )
}
