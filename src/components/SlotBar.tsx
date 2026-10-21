import { motion } from 'framer-motion'
import { SLOT_STARTS } from '../engine/conditions'
import type { Slot } from '../engine/forecast'

interface Props {
  slots: Slot[]
  color: string
  labels?: boolean
}

/** Frise de la journée (5 h-23 h) : un bloc par créneau de 2 h, étoile si garanti. */
export function SlotBar({ slots, color, labels = true }: Props) {
  return (
    <div>
      <div className="flex gap-1">
        {SLOT_STARTS.map((start, i) => {
          const slot = slots.find((s) => s.start === start)
          return (
            <motion.div
              key={start}
              initial={false}
              animate={{ backgroundColor: slot ? color : 'rgba(11,37,69,0.07)', scaleY: slot ? 1 : 0.6 }}
              transition={{ duration: 0.45, delay: i * 0.03 }}
              className="relative flex h-7 flex-1 items-center justify-center rounded-md text-[10px] font-bold text-white"
              title={`${start} h-${start + 2} h${slot ? '' : ' : pas d’eau'}`}
            >
              {slot?.guaranteed && '★'}
            </motion.div>
          )
        })}
      </div>
      {labels && (
        <div className="mt-1 flex justify-between text-[10px] text-ink/55">
          <span>5 h</span>
          <span>14 h</span>
          <span>23 h</span>
        </div>
      )}
    </div>
  )
}
