import { CountUp } from './CountUp'

interface Props {
  value: number
  total?: number
  unit?: string
  label: string
}

export function StatTile({ value, total, unit, label }: Props) {
  return (
    <div className="glass px-3 py-3 transition-transform duration-300 hover:-translate-y-1 sm:px-5 sm:py-4">
      <p className="font-display text-2xl font-semibold leading-none sm:text-3xl">
        <CountUp value={value} />
        {total !== undefined && <span className="text-ink/60"> / {total}</span>}
        {unit && <span className="ml-1.5 text-base font-normal text-ink/80">{unit}</span>}
      </p>
      <p className="mt-1.5 text-xs leading-snug text-ink/70 sm:mt-2 sm:text-sm">{label}</p>
    </div>
  )
}
