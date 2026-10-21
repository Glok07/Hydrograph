import { useEffect, useState } from 'react'
import type { Network, Pipe, Zone } from '../data/network'
import { fetchNetwork, saveNetwork } from '../engine/networkClient'

const input = 'w-full min-w-0 rounded-lg border border-ink/15 bg-white px-2 py-1 text-xs'
const num = (v: string, fallback: number) => (v.trim() === '' || Number.isNaN(Number(v)) ? fallback : Number(v))

/**
 * Édition du réseau (château d'eau, zones, conduites) directement depuis l'écran Opérateur,
 * sans passer par Prisma Studio ou SQL. Les zones et conduites existantes se modifient, mais
 * ne se créent ni ne se suppriment pas ici : leur position sur la carte (src/data/geo.ts) est
 * une donnée séparée, qu'une nouvelle zone n'aurait nulle part où afficher.
 */
export function NetworkEditor() {
  const [net, setNet] = useState<Network | { error: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchNetwork().then(setNet)
  }, [])

  const updateTower = (patch: Partial<Network['tower']>) => setNet((n) => (n && !('error' in n) ? { ...n, tower: { ...n.tower, ...patch } } : n))
  const updateZone = (id: string, patch: Partial<Zone>) =>
    setNet((n) => (n && !('error' in n) ? { ...n, zones: n.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) } : n))
  const updatePipe = (id: string, patch: Partial<Pipe>) =>
    setNet((n) => (n && !('error' in n) ? { ...n, pipes: n.pipes.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : n))

  const save = async () => {
    if (!net || 'error' in net) return
    setSaving(true)
    const out = await saveNetwork({ tower: net.tower, zones: net.zones, pipes: net.pipes })
    setSaving(false)
    if ('error' in out) {
      setMsg(out.error)
      return
    }
    setMsg('Enregistré. La page se recharge pour mettre la carte à jour…')
    window.setTimeout(() => window.location.reload(), 1200)
  }

  if (net === null) return <p className="text-xs text-ink/55">Chargement du réseau…</p>
  if ('error' in net) return <p className="text-xs text-risk">{net.error}</p>

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/55">Château d’eau — point principal de distribution</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-[11px] text-ink/60">Nom<input className={input} value={net.tower.name} onChange={(e) => updateTower({ name: e.target.value })} /></label>
          <label className="text-[11px] text-ink/60">Capacité<input type="number" className={input} value={net.tower.capacity} onChange={(e) => updateTower({ capacity: num(e.target.value, net.tower.capacity) })} /></label>
          <label className="text-[11px] text-ink/60">Longitude<input type="number" step="0.0001" className={input} value={net.tower.lng ?? ''} onChange={(e) => updateTower({ lng: num(e.target.value, net.tower.lng ?? 0) })} /></label>
          <label className="text-[11px] text-ink/60">Latitude<input type="number" step="0.0001" className={input} value={net.tower.lat ?? ''} onChange={(e) => updateTower({ lat: num(e.target.value, net.tower.lat ?? 0) })} /></label>
        </div>
        <p className="mt-1 text-[11px] text-ink/45">Longitude/latitude : repérez les coordonnées sur une carte (clic droit sur Google Maps, par exemple) et collez-les ici.</p>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/55">Zones</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-y-1 text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wide text-ink/50">
              <tr><th className="px-1 font-medium">Zone</th><th className="px-1 font-medium">Nom</th><th className="px-1 font-medium">Foyers</th><th className="px-1 font-medium">Demande</th><th className="px-1 font-medium">Profondeur</th><th className="px-1 font-medium">Puits</th></tr>
            </thead>
            <tbody>
              {net.zones.map((z) => (
                <tr key={z.id}>
                  <td className="px-1 font-semibold text-ink/70">{z.id}</td>
                  <td className="px-1"><input className={input} value={z.name} onChange={(e) => updateZone(z.id, { name: e.target.value })} /></td>
                  <td className="px-1"><input type="number" className={input} value={z.households} onChange={(e) => updateZone(z.id, { households: num(e.target.value, z.households) })} /></td>
                  <td className="px-1"><input type="number" className={input} value={z.demand} onChange={(e) => updateZone(z.id, { demand: num(e.target.value, z.demand) })} /></td>
                  <td className="px-1"><input type="number" className={input} value={z.depth} onChange={(e) => updateZone(z.id, { depth: num(e.target.value, z.depth) })} /></td>
                  <td className="px-1 text-center"><input type="checkbox" checked={z.wells} onChange={(e) => updateZone(z.id, { wells: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-ink/55">Conduites</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[280px] border-separate border-spacing-y-1 text-xs">
            <thead className="text-left text-[10px] uppercase tracking-wide text-ink/50">
              <tr><th className="px-1 font-medium">Conduite</th><th className="px-1 font-medium">De</th><th className="px-1 font-medium">Vers</th></tr>
            </thead>
            <tbody>
              {net.pipes.map((p) => (
                <tr key={p.id}>
                  <td className="px-1 font-semibold text-ink/70">{p.id}</td>
                  <td className="px-1">
                    <select className={input} value={p.from} onChange={(e) => updatePipe(p.id, { from: e.target.value as Pipe['from'] })}>
                      <option value="TOWER">Château d’eau</option>
                      {net.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </td>
                  <td className="px-1">
                    <select className={input} value={p.to} onChange={(e) => updatePipe(p.id, { to: e.target.value as Pipe['to'] })}>
                      {net.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="pill pill-solid">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        {msg && <p className="text-xs text-ink/70">{msg}</p>}
      </div>
    </div>
  )
}
