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
      <section className="glass p-5 lg:col-span-5">
        <p className="text-xs uppercase tracking-[0.16em] text-ink/55">Indice d’équité</p>
        <p className="mt-2 font-display text-6xl font-semibold leading-none"><CountUp value={eq.index} /><span className="text-2xl text-ink/60"> / 100</span></p>
        <p className="mt-3 text-sm text-ink/75">
          {name(worst.zone)} reçoit en moyenne <strong>{worst.avgHours.toFixed(1)} h</strong> d’eau par jour, contre <strong>{best.avgHours.toFixed(1)} h</strong> à {name(best.zone)} : <strong>{Math.round(eq.gap)} h</strong> d’écart.
        </p>
        <h3 className="mb-3 mt-6 font-display text-base font-semibold">Quartiers régulièrement oubliés</h3>
        <ul className="space-y-3">
          {eq.forgotten.map((z, i) => (
            <li key={z.zone} className="grid grid-cols-[2rem_7rem_1fr_6.5rem] items-center gap-3 text-sm">
              <span className="font-display text-xs font-semibold text-ink/55">Z-{i + 1}</span>
              <span className="truncate">{name(z.zone)}</span>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (z.avgHours / MAX) * 100)}%`, backgroundColor: STATUS_COLOR[statusFromHours(z.avgHours)] }} transition={{ duration: 0.9, delay: i * 0.07, ease: 'easeOut' }} className="h-full rounded-full" />
              </div>
              <span className="text-right text-xs text-ink/70">{z.avgWithout.toFixed(1)} h sans eau</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] text-ink/45">On mesure le service réellement reçu, pas seulement l’existence d’un ouvrage. Historique simulé · vraie source future : signalements d’habitants, données SoNEB.</p>
      </section>

      <section className="relative min-h-[460px] overflow-hidden rounded-[22px] border border-ink/10 bg-mist lg:col-span-7">
        <RealMap zones={byAvg} broken={broken} unit="h/j" />
        <p className="glass pointer-events-none absolute bottom-4 left-4 z-10 !rounded-xl px-3 py-2 text-[11px] text-ink/80">Moyenne des 7 derniers jours · hauteur = heures d’eau</p>
      </section>
    </div>
  )
}
