import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createState, componentFasteners, install, remove, run, setPower } from './engine'
import type { Device } from './types'
import { validateDevice } from './validate'

const DATA = join(__dirname, '../../public/data/devices')
const devices: Device[] = readdirSync(DATA)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(join(DATA, f), 'utf8')))

describe('content', () => {
  it('has at least one device', () => expect(devices.length).toBeGreaterThan(0))
  for (const d of devices) it(`${d.id} passes validation`, () => expect(validateDevice(d)).toEqual([]))
  it('validator catches broken content', () => {
    const d: Device = structuredClone(devices[0])
    d.components[0].requires = [d.components.at(-1)!.id] // outermost part now needs the innermost one removed: cycle
    expect(validateDevice(d).join()).toMatch(/cycle/)
    const e: Device = structuredClone(devices[0])
    e.cases.push({ ...e.cases[0], id: 'bad', setup: {} })
    expect(validateDevice(e).join()).toMatch(/already boots/)
  })
})

// Tiny fixture so engine rules are tested independently of real content.
const info = { what: 'w', does: 'd', ifFails: 'f' }
const shapes = [{ type: 'box' as const, size: [1, 1, 1] as [number, number, number], pos: [0, 0, 0] as [number, number, number], color: '#fff' }]
const base = { system: 'structure' as const, difficulty: 'easy' as const, connectsTo: [], layer: 0, shapes, info, verified: true }
const toy: Device = {
  id: 'toy', name: 'Toy', brand: 'T', category: 'phone', released: 2026, summary: '', dimensionsMm: [1, 1, 1], specs: {},
  verification: { status: 'draft', sources: [], notes: '' },
  components: [
    { ...base, id: 'cover', name: 'Cover', kind: 'cover', requires: [], onMissing: { outcome: 'degraded', symptom: 'open' } },
    { ...base, id: 'board', name: 'Board', kind: 'board', requires: ['cover'], electrical: true, onMissing: { outcome: 'no-power', symptom: 'no board' }, onDamaged: { outcome: 'short-circuit', symptom: 'short' } },
    { ...base, id: 'cam', name: 'Cam', kind: 'cam', requires: ['cover'], electrical: true, onMissing: { outcome: 'degraded', symptom: 'no cam' } },
    { ...base, id: 'bat', name: 'Bat', kind: 'bat', requires: ['cover'], connectsTo: ['board'], powerSource: true, electrical: true, connectorAccess: ['cover'], onMissing: { outcome: 'no-power', symptom: 'no bat' } },
  ],
  spares: [
    { id: 'hot-bat', name: 'Hot', kind: 'bat', compatible: [], damaged: false },
    { id: 'fire-bat', name: 'Fire', kind: 'bat', compatible: ['toy'], damaged: true, effect: { outcome: 'thermal-shutdown', symptom: 'fire', tempC: 30 } },
  ],
  cases: [],
}

const ok = (r: ReturnType<typeof remove>) => {
  if (!r.ok) throw new Error(r.reason)
  return r
}

describe('engine', () => {
  it('stock toy boots', () => expect(run(toy, createState(toy)).outcome).toBe('boots'))

  it('enforces removal order', () => {
    const r = remove(toy, createState(toy), 'cam')
    expect(r.ok).toBe(false)
  })

  it('strict mode blocks hot-unplugging; sandbox damages the part instead', () => {
    const open = ok(remove(toy, createState(toy), 'cover')).state
    expect(remove(toy, open, 'cam', true).ok).toBe(false)
    const r = ok(remove(toy, open, 'cam', false))
    expect(r.state.damaged).toContain('cam')
    expect(r.state.violations).toBe(1)
    expect(r.events.some((e) => e.type === 'violation')).toBe(true)
  })

  it('safe sequence: disconnect, swap, reconnect', () => {
    let s = ok(remove(toy, createState(toy), 'cover')).state
    expect(remove(toy, s, 'bat').ok).toBe(false) // must disconnect first
    s = ok(setPower(toy, s, false)).state
    s = ok(remove(toy, s, 'cam', true)).state
    s = ok(install(toy, s, 'cam', 'cam', true)).state
    expect(s.violations).toBe(0)
    expect(run(toy, s).symptoms.map((x) => x.text)).toContain('Battery connector is not seated, so no power reaches the board.')
    s = ok(setPower(toy, s, true)).state
    expect(run(toy, s).outcome).toBe('degraded') // cover still off
  })

  it('removing the board severs the battery and blocks reconnecting', () => {
    let s = ok(remove(toy, createState(toy), 'cover')).state
    s = ok(setPower(toy, s, false)).state
    s = ok(remove(toy, s, 'board', true)).state
    expect(setPower(toy, s, true).ok).toBe(false)
    expect(run(toy, s).outcome).toBe('no-power')
  })

  it('rejects parts of the wrong kind', () => {
    let s = ok(remove(toy, createState(toy, {}, ['hot-bat']), 'cover')).state
    s = ok(setPower(toy, s, false)).state
    s = ok(remove(toy, s, 'cam', true)).state
    expect(install(toy, s, 'hot-bat', 'cam').ok).toBe(false)
  })

  it('incompatible and damaged parts produce failures; heat triggers shutdown', () => {
    const fire = run(toy, createState(toy, { bat: 'fire-bat' }))
    expect(fire.outcome).toBe('thermal-shutdown')
    expect(fire.tempC).toBeGreaterThan(52)
    expect(run(toy, createState(toy, { bat: 'hot-bat' })).symptoms[0].text).toMatch(/not recognised/)
  })

  it('hot-unplugged board shorts on next run', () => {
    let s = ok(remove(toy, createState(toy), 'cover')).state
    s = ok(remove(toy, s, 'board')).state // violation, also severs power
    s = ok(install(toy, s, 'board', 'board')).state
    s = ok(setPower(toy, s, true)).state
    expect(run(toy, s).outcome).toBe('short-circuit')
  })

  it('summarises structured fasteners and checks validator rules', () => {
    const component = {
      ...toy.components[0],
      fasteners: [
        { type: 'screw' as const, count: 5, tool: 'phillips-00' as const },
        { type: 'adhesive' as const, tool: 'heat-gun' as const },
      ],
    }
    const summary = componentFasteners(component)
    expect(summary.screws).toBe(5)
    expect(summary.tools).toEqual(['phillips-00', 'heat-gun'])

    const badDevice: Device = structuredClone(toy)
    badDevice.components[0].fasteners = [{ type: 'bad-type' as any, count: -1 }]
    expect(validateDevice(badDevice).join()).toMatch(/invalid fastener type/)
  })
})
