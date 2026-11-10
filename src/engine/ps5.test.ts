import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createState, remove, run, setPower } from './engine'
import type { Device } from './types'

const ps5: Device = JSON.parse(readFileSync('public/data/devices/sony-ps5.json', 'utf8'))

describe('Sony PS5 (console, engine unchanged)', () => {
  it('needs stand, panel, grille and shroud off before the fan; power-down after the panel', () => {
    let s = createState(ps5)
    expect(remove(ps5, s, 'fan', true).ok).toBe(false)
    for (const id of ['stand', 'faceplate-right']) {
      const r = remove(ps5, s, id, true)
      expect(r.ok).toBe(true)
      if (r.ok) s = r.state
    }
    expect(setPower(ps5, s, false).ok).toBe(true)
  })

  it('a disc drive from another console fits but does not read discs', () => {
    const s = createState(ps5, { 'optical-drive': 'optical-drive-donor' })
    expect(run(ps5, s).outcome).toBe('degraded')
  })
})
