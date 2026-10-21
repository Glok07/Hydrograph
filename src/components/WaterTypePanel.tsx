import { motion } from 'framer-motion'
import type { Zone } from '../data/network'
import type { ZoneImpact } from '../engine/impact'
import { QUALITY_LABEL, WATER_TYPES, WATER_TYPE_HINT, WATER_TYPE_LABEL } from '../engine/waterTypes'
import type { QualityLevel, WaterType } from '../engine/waterTypes'

const TYPE_COLOR: Record<WaterType, string> = { network: '#1d6fe0', borehole: '#0d9488', well: '#b45309', stored: '#7c3aed' }
const LEVEL_STYLE: Record<QualityLevel, string> = {
  good: 'bg-ok/15 text-[#047857]',
  watch: 'bg-warn/20 text-[#92400e]',
  risk: 'bg-risk/15 text-[#b91c1c]',
}

const pct = (v: number) => `${Math.round(v * 100)} %`

/** Impact de la journée sur chacun des quatre types d'eau : ce qui coule, ce qui est sûr, vers quoi les foyers se rabattent. */
export function WaterTypePanel({ zone, impact }: { zone: Zone; impact: ZoneImpact }) {
  return (
    <div className="space-y-3">
      {WATER_TYPES.map((t, i) => {
        const x = impact.types[t]
        const stored = t === 'stored'
        return (
          <motion.div key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-ink/10 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 text-sm font-semibold" title={WATER_TYPE_HINT[t]}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: TYPE_COLOR[t] }} />
                <span className="truncate">{WATER_TYPE_LABEL[t]}</span>
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[x.level]}`} title="Risque sanitaire de ce type d’eau aujourd’hui">
                {QUALITY_LABEL[x.level]}
              </span>
            </div>

            {!stored && (
              <div className="mt-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-ink/8">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-ink/15" style={{ width: pct(x.nominal) }} />
                  <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: TYPE_COLOR[t] }} initial={false} animate={{ width: pct(x.share) }} transition={{ duration: 0.6 }} />
                </div>
                <p className="mt-1 flex justify-between text-[11px] text-ink/60">
                  <span>
                    {pct(x.share)} des foyers
                    {Math.abs(x.share - x.nominal) >= 0.02 && <span className={x.share > x.nominal ? 'font-semibold text-accent' : 'font-semibold text-risk'}> ({x.share > x.nominal ? '+' : ''}{Math.round((x.share - x.nominal) * 100)} pts)</span>}
                  </span>
                  <span>{x.hours} h d’accès</span>
                </p>
              </div>
            )}
            {stored && <p className="mt-1.5 text-[11px] text-ink/60">{x.hours} h de réserve disponible sur la journée · {pct(x.share)} des foyers sur leur réserve</p>}
            <p className="mt-1.5 text-[11px] leading-snug text-ink/70">{x.note}</p>
          </motion.div>
        )
      })}

      <div className="rounded-xl bg-ink/5 p-3 text-xs leading-snug">
        {impact.fallbackShare >= 0.02 && (
          <p>
            <strong>{pct(impact.fallbackShare)}</strong> des foyers de {zone.name} quittent le robinet faute d’eau et se rabattent sur les forages et les puits.
          </p>
        )}
        <p className={impact.fallbackShare >= 0.02 ? 'mt-1' : ''}>
          {impact.exposedHouseholds > 0 ? (
            <>
              <strong>{impact.exposedHouseholds.toLocaleString('fr-FR')} foyers</strong> ({pct(impact.exposedShare)}) dépendent aujourd’hui d’une eau à risque.
            </>
          ) : (
            'Aucun foyer ne dépend d’une eau à risque aujourd’hui.'
          )}
        </p>
      </div>
      <p className="text-[10px] leading-snug text-ink/40">Simulé · vraies sources futures : enquêtes ménages (mélange des sources), analyses de qualité de l’eau, niveaux de nappe, journal de maintenance des forages.</p>
    </div>
  )
}
