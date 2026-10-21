import { describe, expect, it } from 'vitest'
import { fromWhatsApp, toE164, toWhatsApp } from '../notify'

describe('formats de numéro béninois', () => {
  it('met le numéro saisi sous forme canonique', () => {
    expect(toE164('0146000922')).toBe('2290146000922')
    expect(toE164('01 46 00 09 22')).toBe('2290146000922')
    expect(toE164('2290146000922')).toBe('2290146000922')
  })

  it("retire le préfixe « 01 » pour l'adresse WhatsApp", () => {
    expect(toWhatsApp('0146000922')).toBe('22946000922')
    expect(toWhatsApp('0140180178')).toBe('22940180178')
  })

  it('laisse intact un numéro déjà court ou étranger', () => {
    expect(toWhatsApp('22940180178')).toBe('22940180178')
    expect(toWhatsApp('33612345678')).toBe('22933612345678')
  })

  it('rétablit la forme canonique des numéros reçus de Meta', () => {
    expect(fromWhatsApp('22940180178')).toBe('2290140180178')
    expect(fromWhatsApp('2290140180178')).toBe('2290140180178')
  })
})
