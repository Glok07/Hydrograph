import { describe, expect, it } from 'vitest'
import { CALAVI } from '../../data/network'
import { sanitizeChatAction } from '../chatContext'

describe('sanitizeChatAction', () => {
  it('rejette ce qui n’est pas exploitable', () => {
    expect(sanitizeChatAction(CALAVI, null)).toBeNull()
    expect(sanitizeChatAction(CALAVI, 'power_cut')).toBeNull()
    expect(sanitizeChatAction(CALAVI, {})).toBeNull()
  })

  it('ignore les identifiants inconnus, sans jamais planter', () => {
    const out = sanitizeChatAction(CALAVI, { causes: ['power_cut', 'invention', 42], period: 'inexistant', zone: 'Z9' })
    expect(out).toEqual({ causes: ['power_cut'] })
  })

  it('accepte un réglage valide complet', () => {
    const out = sanitizeChatAction(CALAVI, { causes: ['pipe_burst', 'heavy_rain'], period: 'marche', zone: 'Z6', plan: true })
    expect(out).toEqual({ causes: ['pipe_burst', 'heavy_rain'], period: 'marche', zone: 'Z6', plan: true })
  })

  it('un objet sans aucun champ reconnu renvoie null plutôt qu’un objet vide', () => {
    expect(sanitizeChatAction(CALAVI, { bidule: 'truc' })).toBeNull()
  })
})
