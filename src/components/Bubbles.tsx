import { motion } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { useMemo } from 'react'

/** Générateur déterministe : mêmes bulles à chaque rendu. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Bulles qui montent du fond jusqu'à la surface (haut du calque = ligne d'eau).
 * Petites, peu nombreuses, avec un reflet : comme sur une photo.
 */
export function Bubbles({ x }: { x: MotionValue<number> }) {
  const bubbles = useMemo(() => {
    const rand = mulberry32(21)
    return Array.from({ length: 26 }, (_, i) => {
      const r = rand()
      return {
        id: i,
        left: rand() * 100,
        size: 2 + r * r * 9,
        duration: 10 + rand() * 14,
        delay: -rand() * 24,
        dx: (rand() - 0.5) * 30,
      }
    })
  }, [])

  return (
    <motion.div aria-hidden className="pointer-events-none absolute -inset-x-10 z-[1] overflow-hidden" style={{ top: '23.6cqw', height: '24cqw', x }}>
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="bubble"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            ['--dx' as string]: `${b.dx}px`,
          }}
        />
      ))}
    </motion.div>
  )
}
