import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { crossDeviceParts, partFitsDevice } from './compat'
import type { Device, Part } from './types'

const DATA = join(__dirname, '../../public/data/devices')
const devices: Device[] = readdirSync(DATA)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(join(DATA, f), 'utf8')))
const byId = (id: string) => devices.find((d) => d.id === id)!

describe('cross-device parts', () => {
  it('a part fits only when listed as compatible and the target has its kind', () => {
    const iphone = byId('iphone-12')
    const kind = iphone.components[0].kind
    const part: Part = { id: 'x', name: 'x', kind, compatible: ['iphone-12'] }
    expect(partFitsDevice(part, iphone)).toBe(true)
    expect(partFitsDevice({ ...part, compatible: ['pixel-7'] }, iphone)).toBe(false)
    expect(partFitsDevice({ ...part, kind: 'no-such-kind' }, iphone)).toBe(false)
  })

  it('a spare listed for another device shows up as a cross-device part', () => {
    const iphone = byId('iphone-12')
    const pixel = structuredClone(byId('pixel-7'))
    const kind = iphone.components[0].kind
    pixel.spares.push({ id: 'pixel-shared', name: 'shared', kind, compatible: ['iphone-12'] })
    const found = crossDeviceParts([pixel], iphone)
    expect(found.map((f) => f.part.id)).toEqual(['pixel-shared'])
    expect(found[0].from).toBe('pixel-7')
  })

  it('current content has no cross-device fits (no source supports one yet)', () => {
    for (const d of devices) expect(crossDeviceParts(devices, d)).toEqual([])
  })
})
