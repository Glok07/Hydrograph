import { motion } from 'framer-motion'
import { STATUS_COLOR } from '../data/colors'
import { MAP_VIEW, TOWER_POS, ZONE_POS } from '../data/layout'
import { CALAVI } from '../data/network'
import type { PipeId, ZoneId } from '../data/network'
import type { ZoneForecast } from '../engine/forecast'

interface Props {
  forecasts: ZoneForecast[]
  broken: ReadonlySet<PipeId>
  selected?: ZoneId
  onSelect?: (zone: ZoneId) => void
}

const posOf = (id: ZoneId | 'TOWER') => (id === 'TOWER' ? TOWER_POS : ZONE_POS[id])

export function CityMap({ forecasts, broken, selected, onSelect }: Props) {
  const by = new Map(forecasts.map((f) => [f.zone, f]))

  return (
    <svg viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`} className="h-auto w-full" role="img" aria-label="Carte schématique des six zones">
      {CALAVI.pipes.map((p) => {
        const a = posOf(p.from)
        const b = posOf(p.to)
        const cut = broken.has(p.id)
        const dry = (by.get(p.to)?.hoursOfWater ?? 0) === 0
        return (
          <g key={p.id}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0b2545" strokeOpacity={0.12} strokeWidth={6} strokeLinecap="round" />
            {cut ? (
              <>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={STATUS_COLOR.risk} strokeWidth={2} strokeDasharray="3 6" />
                <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={STATUS_COLOR.risk}>✕</text>
              </>
            ) : (
              !dry && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#1d6fe0" strokeOpacity={0.9} strokeWidth={2} strokeDasharray="2 8" strokeLinecap="round" className="flow" />
            )}
          </g>
        )
      })}

      <g transform={`translate(${TOWER_POS.x} ${TOWER_POS.y})`}>
        <path d="M-9 -12h18l-3 11h-12z" fill="#1d6fe0" />
        <rect x="-2" y="-1" width="4" height="9" fill="#1d6fe0" />
      </g>

      {CALAVI.zones.map((z) => {
        const f = by.get(z.id)
        if (!f) return null
        const { x, y, label } = ZONE_POS[z.id]
        const active = selected === z.id
        return (
          <g
            key={z.id}
            transform={`translate(${x} ${y})`}
            onClick={() => onSelect?.(z.id)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
            role={onSelect ? 'button' : undefined}
            aria-label={`${z.name} : ${f.hoursOfWater} heures d’eau`}
          >
            {f.status === 'risk' && (
              <motion.circle r={20} fill="none" stroke={STATUS_COLOR.risk} strokeWidth={2} animate={{ scale: [1, 1.9], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }} />
            )}
            {active && <circle r={25} fill="none" stroke="#0b2545" strokeWidth={2} strokeDasharray="4 4" className="spin" />}
            <motion.circle r={20} initial={false} animate={{ fill: STATUS_COLOR[f.status] }} transition={{ duration: 0.6 }} stroke="#fff" strokeOpacity={0.85} strokeWidth={1.5} whileHover={{ scale: 1.1 }} />
            <text textAnchor="middle" y={4} fontSize="11" fontWeight="700" fill="#ffffff" pointerEvents="none">{f.hoursOfWater} h</text>
            <text textAnchor="middle" y={35} fontSize="10" fill="#0b2545" fillOpacity={0.8} pointerEvents="none">{label}</text>
          </g>
        )
      })}
    </svg>
  )
}
