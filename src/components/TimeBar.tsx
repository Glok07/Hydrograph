import { useEffect } from 'react'
import { DAY_START, SLOT_COUNT, SLOT_H } from '../engine/conditions'
import { servedAt } from '../engine/forecast'
import { useDerived } from '../store/useDerived'
import { useHydro } from '../store/useHydro'

const FIRST = DAY_START
const LAST = DAY_START + SLOT_COUNT * SLOT_H - 1
const STEP_MS = 650

/** Timelapse de la journée : quelles zones ont l'eau, heure par heure. */
export function TimeBar() {
  const hour = useHydro((s) => s.hour)
  const playing = useHydro((s) => s.playing)
  const setHour = useHydro((s) => s.setHour)
  const setPlaying = useHydro((s) => s.setPlaying)
  const { shown } = useDerived()

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => {
      const h = useHydro.getState().hour
      if (h === null || h >= LAST) {
        if (h !== null && h >= LAST) {
          setPlaying(false)
          return
        }
        setHour(FIRST)
      } else setHour(h + 1)
    }, STEP_MS)
    return () => window.clearInterval(t)
  }, [playing, setHour, setPlaying])

  const play = () => {
    if (playing) return setPlaying(false)
    if (hour === null || hour >= LAST) setHour(FIRST)
    setPlaying(true)
  }

  const wet = hour === null ? null : shown.filter((f) => servedAt(f, hour)).length
  const pct = hour === null ? 0 : ((hour - FIRST) / (LAST - FIRST)) * 100

  return (
    <div className="glass flex items-center gap-4 !rounded-2xl px-4 py-3">
      <button onClick={play} aria-label={playing ? 'Pause' : 'Lire la journée'} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white shadow-md transition-transform hover:scale-105">
        {playing ? (
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className="font-display text-sm font-semibold">
            {hour === null ? 'Toute la journée' : `${hour} h`}
            <span className="ml-2 font-sans text-xs font-normal text-ink/60">
              {wet === null ? 'Lancez la journée pour voir l’eau circuler' : `${wet} zone${wet > 1 ? 's' : ''} sur ${shown.length} ont l’eau`}
            </span>
          </p>
          {hour !== null && (
            <button onClick={() => { setPlaying(false); setHour(null) }} className="text-xs font-semibold text-blue hover:underline">
              Journée entière
            </button>
          )}
        </div>
        <input
          type="range"
          min={FIRST}
          max={LAST}
          step={1}
          value={hour ?? FIRST}
          onChange={(e) => { setPlaying(false); setHour(Number(e.target.value)) }}
          className="hour-range"
          style={{ ['--p' as string]: `${pct}%` }}
          aria-label="Heure de la journée"
        />
        <div className="mt-1 flex justify-between text-[10px] text-ink/45">
          <span>5 h</span><span>9 h</span><span>13 h</span><span>17 h</span><span>22 h</span>
        </div>
      </div>
    </div>
  )
}
