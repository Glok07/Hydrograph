import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { profileOf } from '../data/profiles'
import type { Zone } from '../data/network'
import { breakdown, peakHour, totalDay, totalHour } from '../engine/demand'
import { PERIODS } from '../engine/periods'
import type { PeriodContext } from '../engine/periods'

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5)

const fmt = (v: number) => Math.round(v).toLocaleString('fr-FR')

/** Qui consomme de l'eau dans la zone, quand, et comment cela change selon la période. */
export function DemandPanel({ zone, ctx }: { zone: Zone; ctx: PeriodContext }) {
  const { parts, total, peak, curve, byPeriod } = useMemo(() => {
    const parts = breakdown(zone, ctx)
    const curve = HOURS.map((h) => totalHour(zone, h, ctx))
    return {
      parts,
      total: totalDay(zone, ctx),
      peak: peakHour(zone, ctx),
      curve,
      byPeriod: PERIODS.map((p) => ({ p, v: totalDay(zone, p) })),
    }
  }, [zone, ctx])

  const people = zone.households * profileOf(zone).hhSize
  const maxCurve = Math.max(...curve) || 1
  const maxPeriod = Math.max(...byPeriod.map((b) => b.v)) || 1
  const W = 300
  const H = 64
  const path = curve.map((v, i) => `${i ? 'L' : 'M'}${(i / (HOURS.length - 1)) * W},${H - (v / maxCurve) * (H - 8) - 4}`).join(' ')
  const peakX = ((peak - 5) / (HOURS.length - 1)) * W

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-2xl font-semibold leading-none">
          {fmt(total)} <span className="text-sm font-normal text-ink/70">m³ d’eau demandés ce jour</span>
        </p>
        <p className="mt-1 text-xs text-ink/60">
          ≈ {Math.round((total / people) * 1000)} L par habitant, toutes activités · pic à <strong>{peak} h</strong> · {ctx.label.toLowerCase()}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink/50">Qui consomme</p>
        <div className="flex h-3 overflow-hidden rounded-full bg-ink/8">
          {parts.map((a) => (
            <motion.div key={a.id} className="h-full" style={{ background: a.color }} initial={false} animate={{ width: `${a.share * 100}%` }} transition={{ duration: 0.5 }} title={`${a.label} : ${fmt(a.m3)} m³`} />
          ))}
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          {parts.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                <span className="truncate">{a.label}</span>
              </span>
              <span className="shrink-0 text-ink/60">{fmt(a.m3)} m³</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink/50">Heure par heure (5 h à 22 h)</p>
        <svg viewBox={`0 0 ${W} ${H + 14}`} className="h-auto w-full" role="img" aria-label="Demande en eau heure par heure">
          <motion.path d={path} fill="none" stroke="#1d6fe0" strokeWidth={2.2} strokeLinecap="round" initial={false} animate={{ d: path }} transition={{ duration: 0.5 }} />
          <line x1={peakX} x2={peakX} y1={0} y2={H} stroke="#f97316" strokeWidth={1.2} strokeDasharray="3 3" />
          {[5, 9, 13, 17, 22].map((h) => (
            <text key={h} x={((h - 5) / (HOURS.length - 1)) * W} y={H + 11} textAnchor={h === 5 ? 'start' : h === 22 ? 'end' : 'middle'} fontSize="8" fill="#0b2545" fillOpacity={0.45}>{h} h</text>
          ))}
        </svg>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink/50">Selon la période</p>
        <ul className="space-y-1">
          {byPeriod.map(({ p, v }) => (
            <li key={p.id} className="grid grid-cols-[7.5rem_1fr_3.2rem] items-center gap-2 text-[11px]">
              <span className={`truncate ${p.id === ctx.id ? 'font-semibold' : 'text-ink/65'}`}>{p.label}</span>
              <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full" style={{ width: `${(v / maxPeriod) * 100}%`, background: p.id === ctx.id ? '#1d6fe0' : 'rgba(11,37,69,0.25)' }} />
              </div>
              <span className="text-right text-ink/60">{fmt(v)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] leading-snug text-ink/40">
        Activités de la zone : OpenStreetMap (réel, couverture inégale). Volumes par activité et profils horaires : hypothèses de calage, à valider avec la SoNEB. Vraies sources futures : compteurs, relevés de consommation, météo.
      </p>
    </div>
  )
}
