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
    <div className="page min-h-screen px-3 py-4 md:px-8 md:py-8">
      <div onPointerMove={onMove} className="frame relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] border-[5px] border-white pb-8 shadow-[0_30px_80px_rgba(20,60,120,0.18)]">
        <Hero />
        <Bubbles x={x} />
        <Panel />
        <p className="relative z-[2] mt-6 px-8 text-center text-[11px] text-ink/45">
          HydroGraph · démo hackathon · données simulées · fond de carte © OpenStreetMap, CARTO
        </p>
      </div>
      <SourcesDialog />
      <DemoTour />
    </div>
  )
}
