import type { Network } from '../data/network'

export async function fetchNetwork(): Promise<Network | { error: string }> {
  try {
    const res = await fetch('/api/network')
    const body = await res.json().catch(() => ({}))
    return res.ok ? body : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'Serveur injoignable (en local, lancez npm run api).' }
  }
}

export interface NetworkPatch {
  tower?: Partial<Network['tower']>
  zones?: (Partial<Network['zones'][number]> & { id: string })[]
  pipes?: (Partial<Network['pipes'][number]> & { id: string })[]
}

/** N'envoie que ce qui a changé : les champs absents du patch restent inchangés côté serveur. */
export async function saveNetwork(patch: NetworkPatch): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await fetch('/api/network', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const body = await res.json().catch(() => ({}))
    return res.ok ? { ok: true } : { error: body.error ?? `HTTP ${res.status}` }
  } catch {
    return { error: 'Serveur injoignable (en local, lancez npm run api).' }
  }
}
