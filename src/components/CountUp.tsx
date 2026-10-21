import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

/** Nombre qui défile vers sa valeur à chaque changement. */
export function CountUp({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: 'easeOut' })
    return () => controls.stop()
  }, [mv, value])

  return <motion.span>{rounded}</motion.span>
}
