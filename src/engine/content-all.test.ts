// Content test over ALL device JSON files: case parts exist, removal order is acyclic, facts carry source ids.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { teardownOrder } from './engine'
import type { Device } from './types'

const DATA = join(__dirname, '../../public/data/devices')
const devices: Device[] = readdirSync(DATA)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(join(DATA, f), 'utf8')))

describe.each(devices.map((d) => [d.id, d] as const))('content: %s', (_id, d) => {
  it('every part id used by a case exists (spare list, or the factory part of the slot)', () => {
    const spares = new Set(d.spares.map((p) => p.id))
    const slots = new Set(d.components.map((c) => c.id))
    for (const c of d.cases) {
      expect(slots.has(c.culprit), `${c.id} culprit`).toBe(true)
      for (const [slot, part] of Object.entries(c.setup)) {
        expect(slots.has(slot), `${c.id} setup slot ${slot}`).toBe(true)
        expect(spares.has(part), `${c.id} setup part ${part}`).toBe(true)
      }
      for (const part of c.spares) expect(spares.has(part), `${c.id} spare ${part}`).toBe(true)
    }
  })

  it('removal order is acyclic and lists every component once', () => {
    const order = teardownOrder(d)
    expect(order.length).toBe(d.components.length)
    expect(new Set(order).size).toBe(order.length)
  })

  it('every source has an id, and every verified component cites ids that exist', () => {
    const ids = new Set(d.verification.sources.map((s) => s.id))
    for (const s of d.verification.sources) expect(s.id, `source ${s.title}`).toBeTruthy()
    for (const c of d.components) {
      if (!c.verified) continue
      const cited = [...(c.sources ?? []), ...(c.sourceId ? [c.sourceId] : [])]
      expect(cited.length, `${c.id} verified but cites nothing`).toBeGreaterThan(0)
      for (const s of cited) expect(ids.has(s), `${c.id} cites ${s}`).toBe(true)
    }
  })
})
