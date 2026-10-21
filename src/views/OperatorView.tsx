import { motion } from 'framer-motion'
import { useState } from 'react'
import { STATUS_COLOR } from '../data/colors'
import { SlotBar } from '../components/SlotBar'
import { CALAVI } from '../data/network'
import { NetworkEditor } from '../components/NetworkEditor'
import { WaterLoader } from '../components/WaterLoader'
import type { AiPlanResponse } from '../engine/aiClient'
import { requestAiPlan } from '../engine/aiClient'
import { EVENT_LABEL } from '../engine/events'
import type { ZoneForecast } from '../engine/forecast'
import { slotRanges } from '../engine/messages'
import { gapOf, useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

function Plan({ title, note, rows }: { title: string; note: string; rows: ZoneForecast[] }) {
  return (
    <section className="glass p-4 sm:p-5">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mb-4 text-xs text-ink/60">{note}</p>
      <div className="space-y-3">
        {CALAVI.zones.map((z) => {
          const f = rows.find((r) => r.zone === z.id)!
          return (
            <div key={z.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[9.5rem_minmax(0,1fr)_3rem]">
              <span className="truncate text-xs text-ink/85">{z.name}</span>
              <span className="text-right font-display text-sm font-semibold sm:col-start-3">{f.hoursOfWater} h</span>
              <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <SlotBar slots={f.slots} color={STATUS_COLOR[f.status]} labels={false} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 text-[10px] text-ink/50">
        <div className="flex justify-between sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)_3rem] sm:gap-3">
          <span className="hidden sm:block" />
          <span className="flex w-full justify-between"><span>5 h</span><span>14 h</span><span>23 h</span></span>
          <span className="hidden sm:block" />
        </div>
      </div>
    </section>
  )
}

/** Vue opérateur (F6) : plan du jour, avant et après le recalcul des tours d'eau. */
export function OperatorView() {
  const event = useHydro((s) => s.event)
  const causes = useHydro((s) => s.causes)
  const period = useHydro((s) => s.period)
  const { before, after } = useDerived()
  const [ai, setAi] = useState<AiPlanResponse | { error: string } | null>(null)
  // 'done' tient la jauge à 100 % un court instant avant de laisser place au résultat.
  const [aiPhase, setAiPhase] = useState<'idle' | 'loading' | 'done'>('idle')

  const askAi = async () => {
    setAiPhase('loading')
    setAi(await requestAiPlan(event, { events: causes, period }))
    setAiPhase('done')
    setTimeout(() => setAiPhase('idle'), 650)
  }

  const order = after
    .filter((f) => f.slots.length)
    .map((f) => ({ f, first: f.slots[0].start }))
    .sort((a, b) => a.first - b.first)

  return (
    <div className="grid gap-4">
      <motion.div key={causes.join('+') || 'none'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink/80">
        <span>{causes.length ? <strong>{causes.map((c) => EVENT_LABEL[c]).join(' + ')}</strong> : 'Journée normale'}</span>
        <span>Écart entre zones : <strong>{gapOf(before)} h</strong> → <strong className="text-ok">{gapOf(after)} h</strong> avec HydroGraph</span>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Plan title="Sans HydroGraph" note="Le réseau sert d’abord les zones proches du château d’eau." rows={before} />
        <Plan title="Tours d’eau recalculés" note="★ = créneau garanti à la zone la plus éloignée." rows={after} />
      </div>

      <section className="glass p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold">Plan proposé par l’IA (Rodium)</h3>
          <button onClick={askAi} disabled={aiPhase !== 'idle'} className="pill pill-solid w-full justify-center sm:w-auto">{aiPhase === 'loading' ? 'Calcul…' : 'Demander un plan à l’IA'}</button>
        </div>

        {aiPhase !== 'idle' ? (
          <div className="flex flex-col items-center gap-3 py-4" aria-live="polite">
            <WaterLoader active={aiPhase === 'loading'} />
            <p className="text-xs text-ink/60">{aiPhase === 'loading' ? 'L’IA calcule une proposition de tours d’eau… ça peut prendre jusqu’à une minute.' : 'Plan reçu, vérification du résultat.'}</p>
          </div>
        ) : (
          <>
            {!ai && (
              <p className="text-xs text-ink/55">
                L’IA classe les zones de la plus urgente à la moins urgente (zones oubliées récemment, à puits en risque, les plus éloignées). Le calcul des créneaux reste fait par l’algorithme déterministe ci-dessus, qui garantit toujours la capacité du château d’eau et respecte les conduites cassées : l’IA ne fait que réordonner les ex æquo, jamais dépasser une limite.
              </p>
            )}
            {ai && 'error' in ai && <p className="text-xs text-risk">{ai.error}</p>}
            {ai && !('error' in ai) && ai.source === 'fallback' && (
              <p className="text-xs text-ink/70">IA indisponible, le plan HydroGraph déterministe est conservé. Raison : {ai.reason}</p>
            )}
            {ai && !('error' in ai) && ai.source === 'ai' && (
              <>
                <p className="mb-1 text-xs font-medium text-ok">Priorités appliquées par l’IA, créneaux calculés par le moteur déterministe.</p>
                {ai.explanation && <p className="mb-3 text-xs italic text-ink/65">« {ai.explanation} »</p>}
                {ai.reason && <p className="mb-3 text-[11px] text-ink/45">{ai.reason}</p>}
                <Plan title="Plan avec priorités IA" note="Créneaux et capacité calculés par le même moteur que le plan HydroGraph." rows={ai.forecasts} />
              </>
            )}
          </>
        )}
      </section>

      <section className="glass p-4 sm:p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Plan de distribution du jour</h3>
        <ol className="grid gap-2 sm:grid-cols-2">
          {order.map(({ f }, i) => (
            <li key={f.zone} className="flex flex-col gap-0.5 rounded-xl bg-ink/5 px-3 py-2 text-sm min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <span className="font-display text-xs font-semibold text-ink/55">{i + 1}</span>
                <span className="min-w-0 truncate">{CALAVI.zones.find((z) => z.id === f.zone)!.name}</span>
              </span>
              <span className="pl-6 text-xs text-ink/70 min-[420px]:shrink-0 min-[420px]:pl-0">{slotRanges(f.slots).slice(0, 2).join(' · ')}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-ink/45">Moins d’appels, plaintes géolocalisées, carte des zones fragiles. Simulé · vraie source future : données de pompage SoNEB.</p>
      </section>

      <details className="glass p-4 sm:p-5">
        <summary className="cursor-pointer font-display text-base font-semibold">Modifier le réseau (château d’eau, zones, conduites)</summary>
        <div className="mt-4"><NetworkEditor /></div>
      </details>
    </div>
  )
}
