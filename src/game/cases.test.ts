import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createState, run } from '../engine/engine'
import type { Device } from '../engine/types'

const DATA = join(__dirname, '../../public/data/devices')

describe('practice repair cases across all devices', () => {
  it('s23u-006 (Shattered Horizon) starts failing and resolves with display-frame-new', () => {
    const d: Device = JSON.parse(readFileSync(join(DATA, 'galaxy-s23-ultra.json'), 'utf8'))
    const k = d.cases.find((c) => c.id === 's23u-006')!
    expect(k).toBeDefined()
    expect(run(d, createState(d, k.setup)).outcome).not.toBe('boots')
    const fixed = run(d, createState(d, { ...k.setup, [k.culprit]: 'display-frame-new' }))
    expect(fixed.outcome).toBe('boots')
    expect(fixed.symptoms).toHaveLength(0)
  })

  it('ip12-004 (Blurred Vision) starts failing and resolves with ip12-camera-new', () => {
    const d: Device = JSON.parse(readFileSync(join(DATA, 'iphone-12.json'), 'utf8'))
    const k = d.cases.find((c) => c.id === 'ip12-004')!
    expect(k).toBeDefined()
    expect(run(d, createState(d, k.setup)).outcome).not.toBe('boots')
    const fixed = run(d, createState(d, { ...k.setup, [k.culprit]: 'ip12-camera-new' }))
    expect(fixed.outcome).toBe('boots')
    expect(fixed.symptoms).toHaveLength(0)
  })

  it('p7-003 (Unfocused Horizon) starts failing and resolves with rear-cameras-new', () => {
    const d: Device = JSON.parse(readFileSync(join(DATA, 'pixel-7.json'), 'utf8'))
    const k = d.cases.find((c) => c.id === 'p7-003')!
    expect(k).toBeDefined()
    expect(run(d, createState(d, k.setup)).outcome).not.toBe('boots')
    const fixed = run(d, createState(d, { ...k.setup, [k.culprit]: 'rear-cameras-new' }))
    expect(fixed.outcome).toBe('boots')
    expect(fixed.symptoms).toHaveLength(0)
  })

  it('t14-004 (Memory POST Lockup) starts failing and resolves with ram-16gb', () => {
    const d: Device = JSON.parse(readFileSync(join(DATA, 'thinkpad-t14.json'), 'utf8'))
    const k = d.cases.find((c) => c.id === 't14-004')!
    expect(k).toBeDefined()
    expect(run(d, createState(d, k.setup)).outcome).toBe('no-boot')
    const fixed = run(d, createState(d, { ...k.setup, [k.culprit]: 'ram-16gb' }))
    expect(fixed.outcome).toBe('boots')
    expect(fixed.symptoms).toHaveLength(0)
  })
})
