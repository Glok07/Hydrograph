import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { RealMap } from '../components/RealMap'
import { STATUS_COLOR } from '../data/colors'
import { CountUp } from '../components/CountUp'
import { CALAVI } from '../data/network'
import { equityOf } from '../engine/equity'
import { statusFromHours } from '../engine/forecast'
import { useDerived } from '../store/useDerived'

const MAX = 18

/** Vue mairie (F7) : quels quartiers sont régulièrement oubliés. */
export function CityHallView() {
  const { shown, broken } = useDerived()
  const name = (id: string) => CALAVI.zones.find((z) => z.id === id)!.name

  // Mémorisé : la carte relance son animation à chaque nouvelle liste de zones.
  const { eq, byAvg } = useMemo(() => {
    const eq = equityOf(CALAVI.zones, shown)
    const byAvg = shown.map((f) => {
      const z = eq.zones.find((e) => e.zone === f.zone)!
      return { ...f, status: statusFromHours(z.avgHours), hoursOfWater: Math.round(z.avgHours) }
    })
    return { eq, byAvg }
  }, [shown])
  const worst = eq.forgotten[0]
  const best = eq.forgotten[eq.forgotten.length - 1]

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <section className="glass p-4 sm:p-5 lg:col-span-5">
        <p className="text-xs uppercase tracking-[0.16em] text-ink/55">Indice d’équité</p>
        <p className="mt-2 font-display text-5xl font-semibold leading-none sm:text-6xl"><CountUp value={eq.index} /><span className="text-2xl text-ink/60"> / 100</span></p>
        <p className="mt-3 text-sm text-ink/75">
          {name(worst.zone)} reçoit en moyenne <strong>{worst.avgHours.toFixed(1)} h</strong> d’eau par jour, contre <strong>{best.avgHours.toFixed(1)} h</strong> à {name(best.zone)} : <strong>{Math.round(eq.gap)} h</strong> d’écart.
        </p>
        <h3 className="mb-3 mt-6 font-display text-base font-semibold">Quartiers régulièrement oubliés</h3>
        <ul className="space-y-3">
          {eq.forgotten.map((z, i) => (
            <li key={z.zone} className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 font-display text-xs font-semibold text-ink/55">Z-{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name(z.zone)}</span>
                <span className="shrink-0 text-xs text-ink/70">{z.avgWithout.toFixed(1)} h sans eau</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (z.avgHours / MAX) * 100)}%`, backgroundColor: STATUS_COLOR[statusFromHours(z.avgHours)] }} transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }} className="h-full rounded-full" />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] text-ink/45">On mesure le service réellement reçu, pas seulement l’existence d’un ouvrage. Historique simulé · vraie source future : signalements d’habitants, données SoNEB.</p>
      </section>

      <section className="relative h-[min(62svh,460px)] min-h-[300px] overflow-hidden rounded-[22px] border border-ink/10 bg-mist lg:col-span-7 lg:h-auto lg:min-h-[460px]">
        <RealMap zones={byAvg} broken={broken} unit="h/j" />
        <p className="glass pointer-events-none absolute bottom-3 left-3 right-3 z-10 !rounded-xl px-3 py-2 text-center text-[11px] leading-snug text-ink/80 sm:right-auto sm:max-w-xs sm:text-left">Moyenne des 7 derniers jours · hauteur = heures d’eau</p>
      </section>
    </div>
  )
}
