import { Map as MLMap, Marker, setWorkerUrl } from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { STATUS_COLOR } from '../data/colors'
import { CHIP_ANCHOR, ZONE_GEO, ZONE_SHAPES, bounds, pipeGeo, pipeMidpoint, towerPos } from '../data/geo'
import { CALAVI } from '../data/network'
import type { PipeId, ZoneId } from '../data/network'
import type { EventType } from '../engine/events'
import { servedAt } from '../engine/forecast'
import type { ZoneForecast } from '../engine/forecast'
import { CityMap } from './CityMap'

// MapLibre 6 charge son worker à part : on fournit l'URL que Vite émet au build.
setWorkerUrl(workerUrl)

const STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
/** Hauteur du relief : chaque heure d'eau élève la zone de 38 m. */
const M_PER_HOUR = 38
const BASE_H = 40
const TILT = 52
const BEARING = -16

/** Séquence de pointillés qui donne l'illusion que l'eau avance dans les conduites. */
const DASH = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
]

type RGB = [number, number, number]
/** Couleur d'une zone à sec pendant le timelapse. */
const DRY: RGB = [184, 198, 214]
const hexToRgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const css = ([r, g, b]: RGB) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`

interface Props {
  zones: ZoneForecast[]
  broken: ReadonlySet<PipeId>
  selected?: ZoneId
  onSelect?: (zone: ZoneId) => void
  event?: EventType | null
  /** largeurs réservées à des panneaux flottants (grand écran) */
  padRight?: number
  padLeft?: number
  /** rapprochement de la vue d'ensemble, pour compenser l'inclinaison */
  zoomBoost?: number
  /** heure affichée (timelapse) : seules les zones servies à cette heure restent en couleur */
  activeHour?: number | null
  /** change de valeur pour viser la zone choisie, même si c'est la même */
  focusKey?: number
  /** change de valeur pour revenir à la vue d'ensemble */
  overviewKey?: number
  unit?: string
}

function webglOk() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

/** Repeint le fond de carte clair : eau bleu ciel, routes blanches, textes bleu marine. */
function recolor(map: MLMap) {
  const set = (id: string, prop: Parameters<MLMap['setPaintProperty']>[1], value: string) => {
    try {
      map.setPaintProperty(id, prop, value)
    } catch {
      /* propriété absente sur ce calque */
    }
  }
  for (const l of map.getStyle().layers) {
    if (l.type === 'background') set(l.id, 'background-color', '#f2f6fa')
    else if (l.type === 'fill' && l.id.startsWith('water')) set(l.id, 'fill-color', '#b5d8f6')
    else if (l.type === 'line' && l.id.startsWith('waterway')) set(l.id, 'line-color', '#98c6ef')
    else if (l.type === 'fill' && /landcover|park|landuse/.test(l.id)) set(l.id, 'fill-color', 'rgba(170,205,185,0.25)')
    else if (l.type === 'fill' && l.id.startsWith('building')) set(l.id, 'fill-color', 'rgba(11,37,69,0.06)')
    else if (l.type === 'line' && /road|tunnel|bridge/.test(l.id)) set(l.id, 'line-color', l.id.includes('case') ? '#dbe4ee' : '#ffffff')
    else if (l.type === 'symbol') {
      set(l.id, 'text-color', '#4b6584')
      set(l.id, 'text-halo-color', '#ffffff')
    }
  }
}

export function RealMap({ zones, broken, selected, onSelect, event = null, padRight = 0, padLeft = 0, zoomBoost = 0.2, activeHour = null, focusKey = 0, overviewKey = 0, unit = 'h' }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const chips = useRef(new Map<ZoneId, HTMLDivElement>())
  const towerEl = useRef<HTMLDivElement | null>(null)
  const cur = useRef(new Map<ZoneId, { c: RGB; h: number }>())
  const onSelectRef = useRef(onSelect)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(() => !webglOk())
  const wide = useWide()
  const right = wide ? padRight : 0
  const rightRef = useRef(right)
  const leftRef = useRef(wide ? padLeft : 0)
  const boostRef = useRef(zoomBoost)

  useEffect(() => {
    onSelectRef.current = onSelect
    rightRef.current = right
    leftRef.current = wide ? padLeft : 0
  })

  const overview = (duration = 1600) => {
    const map = mapRef.current
    if (!map) return
    const narrow = window.innerWidth < 1024
    const cam = map.cameraForBounds(bounds(), { padding: { top: narrow ? 72 : 40, bottom: narrow ? 36 : 40, left: (narrow ? 64 : 40) + leftRef.current, right: (narrow ? 64 : 40) + rightRef.current } })
    // L'inclinaison montre plus de terrain vers l'horizon : on se rapproche un peu.
    const boost = narrow ? Math.min(boostRef.current, 0.05) : boostRef.current
    if (cam) map.flyTo({ ...cam, zoom: (cam.zoom ?? 11) + boost, pitch: TILT, bearing: BEARING, duration, essential: true })
  }

  // Création de la carte, une seule fois.
  useEffect(() => {
    if (!box.current || failed) return
    let map: MLMap
    try {
      const touch = window.matchMedia('(pointer: coarse)').matches
      map = new MLMap({
        container: box.current,
        style: STYLE,
        center: [2.31, 6.45],
        zoom: 9.6,
        pitch: 0,
        bearing: 0,
        attributionControl: { compact: true },
        maxPitch: 70,
        cooperativeGestures: touch,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl + molette pour zoomer',
          'CooperativeGesturesHandler.MacHelpText': '⌘ + molette pour zoomer',
          'CooperativeGesturesHandler.MobileHelpText': 'Deux doigts pour déplacer la carte',
        },
      })
    } catch (e) {
      console.warn('RealMap : carte indisponible', e)
      const t = window.setTimeout(() => setFailed(true))
      return () => window.clearTimeout(t)
    }
    mapRef.current = map
    const chipEls = chips.current
    // Fond de carte injoignable (hors connexion) : on bascule sur le schéma du réseau.
    map.on('error', (e) => {
      console.warn('RealMap :', e.error?.message ?? e)
      if (!map.isStyleLoaded()) setFailed(true)
    })
    let dashTimer = 0

    map.on('load', () => {
      recolor(map)
      map.addSource('zones', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addSource('pipes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'zone-glow', type: 'line', source: 'zones', paint: { 'line-color': ['get', 'color'], 'line-width': 14, 'line-blur': 12, 'line-opacity': 0.35 } })
      map.addLayer({ id: 'zone-extrude', type: 'fill-extrusion', source: 'zones', paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.8 } })
      map.addLayer({ id: 'zone-outline', type: 'line', source: 'zones', paint: { 'line-color': ['case', ['get', 'selected'], '#0b2545', ['get', 'color']], 'line-width': ['case', ['get', 'selected'], 3, 1.5] } })
      map.addLayer({ id: 'pipe-base', type: 'line', source: 'pipes', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0b2545', 'line-opacity': 0.14, 'line-width': 6 } })
      map.addLayer({ id: 'pipe-flow', type: 'line', source: 'pipes', filter: ['==', ['get', 'state'], 'flow'], layout: { 'line-join': 'round' }, paint: { 'line-color': '#1d6fe0', 'line-width': 3, 'line-dasharray': DASH[0] } })
      map.addLayer({ id: 'pipe-broken', type: 'line', source: 'pipes', filter: ['==', ['get', 'state'], 'broken'], paint: { 'line-color': STATUS_COLOR.risk, 'line-width': 3.5, 'line-dasharray': [1, 1.5] } })

      map.on('click', 'zone-extrude', (e) => {
        const id = e.features?.[0]?.properties?.id as ZoneId | undefined
        if (id) onSelectRef.current?.(id)
      })
      map.on('mouseenter', 'zone-extrude', () => (map.getCanvas().style.cursor = onSelectRef.current ? 'pointer' : ''))
      map.on('mouseleave', 'zone-extrude', () => (map.getCanvas().style.cursor = ''))

      const tower = document.createElement('div')
      tower.className = 'tower-marker'
      tower.title = CALAVI.tower.name
      tower.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 3h12l-2 7H8z M10 10h4v11h-4z" fill="currentColor"/></svg><span class="tower-label">${CALAVI.tower.name}</span>`
      towerEl.current = tower
      new Marker({ element: tower }).setLngLat(towerPos()).addTo(map)

      for (const z of CALAVI.zones) {
        const el = document.createElement('div')
        el.className = 'zone-chip'
        el.addEventListener('click', () => onSelectRef.current?.(z.id))
        chips.current.set(z.id, el)
        new Marker({ element: el, anchor: CHIP_ANCHOR[z.id] ?? 'bottom', offset: [0, -6] }).setLngLat(ZONE_GEO[z.id].center).addTo(map)
      }

      let step = 0
      dashTimer = window.setInterval(() => {
        step = (step + 1) % DASH.length
        if (map.getLayer('pipe-flow')) map.setPaintProperty('pipe-flow', 'line-dasharray', DASH[step])
      }, 70)

      setReady(true)
      overview(3600)
    })

    return () => {
      window.clearInterval(dashTimer)
      map.remove()
      mapRef.current = null
      chipEls.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed])

  // Couleurs et relief : transition douce vers le nouvel état.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const target = new Map(
      zones.map((f) => [f.zone, servedAt(f, activeHour) ? { c: hexToRgb(STATUS_COLOR[f.status]), h: BASE_H + f.hoursOfWater * M_PER_HOUR } : { c: DRY, h: 12 }]),
    )
    const from = new Map(CALAVI.zones.map((z) => [z.id, cur.current.get(z.id) ?? { c: target.get(z.id)!.c, h: 0 }]))
    const t0 = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const k = Math.min(1, (now - t0) / 900)
      const e = 1 - Math.pow(1 - k, 3)
      for (const z of CALAVI.zones) {
        const a = from.get(z.id)!
        const b = target.get(z.id)!
        cur.current.set(z.id, { c: a.c.map((v, i) => v + (b.c[i] - v) * e) as RGB, h: a.h + (b.h - a.h) * e })
      }
      ;(map.getSource('zones') as GeoJSONSource | undefined)?.setData({
        type: 'FeatureCollection',
        features: CALAVI.zones.map((z) => ({
          type: 'Feature',
          properties: { id: z.id, color: css(cur.current.get(z.id)!.c), height: cur.current.get(z.id)!.h, selected: z.id === selected },
          geometry: { type: 'Polygon', coordinates: [ZONE_SHAPES[z.id]] },
        })),
      })
      if (k < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    for (const f of zones) {
      const el = chips.current.get(f.zone)
      if (!el) continue
      const name = CALAVI.zones.find((z) => z.id === f.zone)!.name
      // classList et non className : MapLibre pose ses propres classes de positionnement sur l'élément.
      el.classList.remove('ok', 'warn', 'risk')
      el.classList.add(f.status)
      el.classList.toggle('selected', f.zone === selected)
      el.classList.toggle('clickable', !!onSelect)
      const wet = servedAt(f, activeHour)
      el.classList.toggle('dry', !wet)
      const label = activeHour === null ? `${f.hoursOfWater} ${unit}` : wet ? 'l’eau coule' : 'à sec'
      el.innerHTML = `<span class="dot" style="background:${wet ? STATUS_COLOR[f.status] : css(DRY)}"></span><span class="name">${name}</span><span class="hours">${label}</span>`
    }
    return () => cancelAnimationFrame(raf)
  }, [zones, selected, ready, unit, onSelect, activeHour])

  // Conduites : eau qui circule, conduite sèche ou cassée.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const wet = new Map(zones.map((f) => [f.zone, f.hoursOfWater > 0 && servedAt(f, activeHour)]))
    const geo = pipeGeo()
    ;(map.getSource('pipes') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: CALAVI.pipes.map((p) => ({
        type: 'Feature',
        properties: { state: broken.has(p.id) ? 'broken' : wet.get(p.to) ? 'flow' : 'dry' },
        geometry: { type: 'LineString', coordinates: geo[p.id] },
      })),
    })
  }, [zones, broken, ready, activeHour])

  // La caméra suit la zone choisie.
  const firstSelect = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !selected) return
    if (firstSelect.current) {
      firstSelect.current = false
      return
    }
    map.easeTo({ center: ZONE_GEO[selected].center, zoom: 12.3, pitch: 58, bearing: map.getBearing() - 10, duration: 1500, padding: { top: 0, bottom: 0, left: 0, right: rightRef.current } })
  }, [selected, focusKey, ready])

  useEffect(() => {
    if (ready && overviewKey) overview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewKey, ready])

  // Effets visuels des événements.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    towerEl.current?.classList.toggle('off', event === 'power_cut')
    const cleanups: (() => void)[] = []
    if (event === 'power_cut') {
      wrap.current?.classList.add('flicker')
      const t = window.setTimeout(() => wrap.current?.classList.remove('flicker'), 1600)
      cleanups.push(() => window.clearTimeout(t))
      map.flyTo({ center: towerPos(), zoom: 12, pitch: 55, duration: 1400, padding: { top: 0, bottom: 0, left: 0, right: rightRef.current } })
    }
    if (event === 'pipe_burst') {
      const [pipe] = [...broken]
      if (pipe) {
        const el = document.createElement('div')
        el.className = 'burst'
        const marker = new Marker({ element: el }).setLngLat(pipeMidpoint(pipe)).addTo(map)
        cleanups.push(() => marker.remove())
        map.flyTo({ center: pipeMidpoint(pipe), zoom: 12.2, pitch: 58, duration: 1600, padding: { top: 0, bottom: 0, left: 0, right: rightRef.current } })
      }
    }
    if (event === 'heavy_rain') overview(1600)
    return () => cleanups.forEach((c) => c())
  }, [event, broken, ready])

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-md">
          <CityMap forecasts={zones} broken={broken} selected={selected} onSelect={onSelect} />
          <p className="mt-2 text-center text-[11px] text-white/50">Carte hors ligne : fond de carte indisponible, schéma du réseau affiché.</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrap} className="relative h-full w-full">
      <div ref={box} style={{ position: "absolute", inset: 0 }} />
      {event === 'heavy_rain' && <div className="rain" aria-hidden />}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="pill pill-light">Chargement de la carte d’Abomey-Calavi…</span>
        </div>
      )}
      {ready && (
        <button onClick={() => overview()} className="pill pill-light absolute top-4 z-10 !text-[11px]" style={{ right: 16 + right }}>
          Vue d’ensemble
        </button>
      )}
    </div>
  )
}
