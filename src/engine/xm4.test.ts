import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createState, install, remove, run, setPower } from './engine'
import type { Device } from './types'

const xm4: Device = JSON.parse(readFileSync('public/data/devices/sony-wh-1000xm4.json', 'utf8'))

describe('Sony WH-1000XM4 (audio, engine unchanged)', () => {
  it('follows the iFixit battery order: pad, liner, cover, then battery connector', () => {
    let s = createState(xm4)
    expect(remove(xm4, s, 'battery', true).ok).toBe(false)
    for (const id of ['ear-pad', 'foam-liner', 'cup-cover']) {
      const r = remove(xm4, s, id, true)
      expect(r.ok).toBe(true)
      if (r.ok) s = r.state
    }
    const off = setPower(xm4, s, false)
    expect(off.ok).toBe(true)
  })

  it('the left ear pad does not fit the right cup', () => {
    let s = createState(xm4, {}, ['ear-pad-left'])
    const gone = remove(xm4, s, 'ear-pad', true)
    if (gone.ok) s = gone.state
    const fit = install(xm4, s, 'ear-pad-left', 'ear-pad', true)
    expect(fit.ok && run(xm4, fit.state).outcome).toBe('degraded')
  })
})
