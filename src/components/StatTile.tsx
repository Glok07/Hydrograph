import { CountUp } from './CountUp'

interface Props {
  value: number
  total?: number
  unit?: string
  label: string
}

export function StatTile({ value, total, unit, label }: Props) {
  return (
    <div className="glass px-5 py-4 transition-transform duration-300 hover:-translate-y-1">
      <p className="font-display text-3xl font-semibold leading-none">
        <CountUp value={value} />
        {total !== undefined && <span className="text-ink/60"> / {total}</span>}
        {unit && <span className="ml-1.5 text-base font-normal text-ink/80">{unit}</span>}
      </p>
      <p className="mt-2 text-sm text-ink/70">{label}</p>
    </div>
  )
}
