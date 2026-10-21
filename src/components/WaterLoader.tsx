import { useEffect, useId, useRef, useState } from 'react'

const R = 46
const TOP = 4
const BOTTOM = 96
/** Le remplissage simulé ne dépasse jamais ce plafond tant que le résultat réel n'est pas là. */
const CEILING = 96

const wavePath = (surfaceY: number, t: number, amp: number) => {
  const n = 28
  let d = ''
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100
    const y = surfaceY + amp * (Math.sin((x / 100) * 6.2832 * 1.4 + t * 1.7) + 0.5 * Math.sin((x / 100) * 6.2832 * 2.6 - t * 2.3))
    d += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }
  return `${d}L100,102L0,102Z`
}

interface WaterLoaderProps {
  /** true tant que le résultat réel n'est pas arrivé : le remplissage progresse sans jamais atteindre 100 %. */
  active: boolean
  size?: number
  /** durée (ms) au bout de laquelle le remplissage simulé approche son plafond ; l'IA met souvent 10-45 s à répondre. */
  estimateMs?: number
}

/** Jauge d'eau circulaire : remplissage simulé pendant une attente (ne promet jamais 100 % avant d'y être). */
export function WaterLoader({ active, size = 120, estimateMs = 22000 }: WaterLoaderProps) {
  const uid = useId()
  const [shown, setShown] = useState(0)
  const bodyRef = useRef<SVGPathElement>(null)
  const crestRef = useRef<SVGPathElement>(null)
  const percentRef = useRef(0)
  const startRef = useRef(0)

  useEffect(() => {
    startRef.current = performance.now()
  }, [])

  useEffect(() => {
    if (active) startRef.current = performance.now()
  }, [active])

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let lastSync = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const elapsed = (now - startRef.current) / 1000
      const target = active ? CEILING * (1 - Math.exp(-elapsed / (estimateMs / 1000))) : 100
      percentRef.current += (target - percentRef.current) * (active ? 0.05 : 0.18)
      const surfaceY = BOTTOM - (percentRef.current / 100) * (BOTTOM - TOP)
      const t = still ? 0 : now / 1000
      const amp = still ? 0 : 2.3
      bodyRef.current?.setAttribute('d', wavePath(surfaceY, t, amp))
      crestRef.current?.setAttribute('d', wavePath(surfaceY - 1.4, t + 0.6, amp * 0.8))
      if (now - lastSync > 100) {
        lastSync = now
        setShown(Math.round(percentRef.current))
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [active, estimateMs])

  const clip = `wl-clip-${uid}`
  const grad = `wl-grad-${uid}`

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="50" r={R} />
        </clipPath>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fc2f5" />
          <stop offset="1" stopColor="#1d64be" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={R} fill="#eef4fb" />
      <g clipPath={`url(#${clip})`}>
        <path ref={bodyRef} fill={`url(#${grad})`} />
        <path ref={crestRef} fill="#fff" fillOpacity="0.35" />
      </g>
      <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(11,37,69,.14)" strokeWidth="1.6" />
      <text x="50" y="55" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="22" fill="#0b2545">
        {shown}%
      </text>
    </svg>
  )
}
