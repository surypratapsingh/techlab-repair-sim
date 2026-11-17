import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createState, install, remove, run, setPower } from './engine'
import type { Device, LabState } from './types'

const d: Device = JSON.parse(readFileSync('public/data/devices/dell-xps-13-9310.json', 'utf8'))

// Seat the battery connector again and power on.
function powerOn(s: LabState): LabState {
  const r = setPower(d, s, true)
  expect(r.ok).toBe(true)
  return r.ok ? r.state : s
}

// Apply a list of [kind, id, slot?] steps; fail the test on the first refused step.
function apply(s: LabState, steps: Array<['off' | 'remove' | 'install', string, string?]>): LabState {
  for (const [op, a, b] of steps) {
    const r = op === 'off' ? setPower(d, s, false) : op === 'remove' ? remove(d, s, a) : install(d, s, a, b!)
    expect(r.ok, `${op} ${a} ${b ?? ''}`).toBe(true)
    if (r.ok) s = r.state
  }
  return s
}

describe('Dell XPS 13 9310 (laptop, content only)', () => {
  it('removal order: lower case, then battery connector, then battery; SSD needs the same first two', () => {
    let s = createState(d)
    expect(remove(d, s, 'battery-connector').ok).toBe(false)
    expect(remove(d, s, 'battery').ok).toBe(false)
    expect(remove(d, s, 'ssd').ok).toBe(false)
    s = apply(s, [['remove', 'lower-case'], ['off', ''], ['remove', 'battery-connector']])
    expect(remove(d, s, 'ssd').ok).toBe(true)
    expect(remove(d, s, 'battery').ok).toBe(true)
  })

  it('case xps-001: degraded battery runs hot; swapping in a healthy battery boots', () => {
    let s = createState(d, { battery: 'battery-degraded' }, ['battery-healthy'])
    expect(run(d, s).outcome).not.toBe('boots')
    s = apply(s, [
      ['remove', 'lower-case'],
      ['off', ''],
      ['remove', 'battery-connector'],
      ['remove', 'battery'],
      ['install', 'battery-healthy', 'battery'],
      ['install', 'battery-connector', 'battery-connector'],
    ])
    s = powerOn(s)
    s = apply(s, [['install', 'lower-case', 'lower-case']])
    expect(run(d, s).outcome).toBe('boots')
  })

  it('case xps-002: corrupt SSD stops boot; a healthy SSD boots', () => {
    let s = createState(d, { ssd: 'ssd-corrupt' }, ['ssd-fast'])
    expect(run(d, s).outcome).not.toBe('boots')
    s = apply(s, [
      ['remove', 'lower-case'],
      ['off', ''],
      ['remove', 'battery-connector'],
      ['remove', 'ssd'],
      ['install', 'ssd-fast', 'ssd'],
      ['install', 'battery-connector', 'battery-connector'],
    ])
    s = powerOn(s)
    s = apply(s, [['install', 'lower-case', 'lower-case']])
    expect(run(d, s).outcome).toBe('boots')
  })

  it('no missing part ids: every case and spare reference resolves', () => {
    const slots = new Set(d.components.map((c) => c.id))
    const parts = new Set(d.spares.map((p) => p.id))
    expect(parts.size).toBe(d.spares.length)
    for (const c of d.cases) {
      expect(slots.has(c.culprit), c.id).toBe(true)
      for (const [slot, part] of Object.entries(c.setup)) {
        expect(slots.has(slot), `${c.id} slot ${slot}`).toBe(true)
        expect(parts.has(part), `${c.id} setup part ${part}`).toBe(true)
      }
      for (const p of c.spares) expect(parts.has(p), `${c.id} spare ${p}`).toBe(true)
    }
    for (const p of d.spares) expect(p.compatible).toContain(d.id)
  })
})
