import { motion } from 'framer-motion'

interface Line {
  label: string
  values: number[]
  color: string
}

const W = 300
const H = 130
const PAD = { l: 24, r: 10, t: 10, b: 22 }
const MAX = 20
const TICKS = ['-6', '-5', '-4', '-3', '-2', '-1', 'Auj.']

const px = (i: number, n: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
const py = (v: number) => PAD.t + (1 - v / MAX) * (H - PAD.t - PAD.b)

function smooth(values: number[]) {
  const pts = values.map((v, i) => [px(i, values.length), py(v)] as const)
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`
  }
  return d
}

export function WeekChart({ lines }: { lines: Line[] }) {
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Heures d’eau sur sept jours">
        {[0, 6, 12, 18].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(v)} y2={py(v)} stroke="#0b2545" strokeOpacity={0.08} />
            <text x={PAD.l - 6} y={py(v) + 3} textAnchor="end" fontSize="8" fill="#0b2545" fillOpacity={0.45}>{v}</text>
          </g>
        ))}
        {TICKS.map((t, i) => (
          <text key={t} x={px(i, TICKS.length)} y={H - 6} textAnchor="middle" fontSize="8" fill="#0b2545" fillOpacity={0.45}>{t}</text>
        ))}
        {lines.map((l) => {
          const d = smooth(l.values)
          const last = l.values[l.values.length - 1]
          return (
            <g key={l.label}>
              <motion.path initial={{ pathLength: 0, d }} animate={{ pathLength: 1, d }} transition={{ pathLength: { duration: 1.4, ease: 'easeOut' }, d: { duration: 0.7 } }} fill="none" stroke={l.color} strokeWidth={2.4} strokeLinecap="round" />
              <motion.circle r={4} fill={l.color} initial={false} animate={{ cx: px(l.values.length - 1, l.values.length), cy: py(last) }} transition={{ duration: 0.7 }} />
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[11px] text-ink/70">
        {lines.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  )
}
