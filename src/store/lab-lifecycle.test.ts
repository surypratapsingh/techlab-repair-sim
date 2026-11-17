import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../engine/types'
import { useLab, RUN_MS } from './lab'
import { useProgress } from './progress'

// In-memory localStorage stub so zustand persist does not fail
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => {
    delete store[k]
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k])
  },
  length: 0,
  key: () => null,
})

const DATA = join(__dirname, '../../public/data/devices')
const s23u: Device = JSON.parse(readFileSync(join(DATA, 'galaxy-s23-ultra.json'), 'utf8'))
const ip12: Device = JSON.parse(readFileSync(join(DATA, 'iphone-12.json'), 'utf8'))

function resetStores() {
  useLab.setState({
    device: null,
    key: '',
    mode: 'explore',
    caseId: null,
    state: null,
    selected: null,
    exploded: false,
    camera: { cmd: 'reset', n: 0 },
    run: null,
    spark: null,
    log: [],
    repair: null,
  })
  useProgress.setState({
    xp: 0,
    discovered: {},
    cases: {},
    achievements: [],
    outcomes: {},
    lastUnlock: null,
    courses: {},
    daily: {},
    dailyStreak: 0,
  })
}

const lab = () => useLab.getState()
const progress = () => useProgress.getState()

describe('useLab - lifecycle, camera, and achievements', () => {
  beforeEach(() => {
    resetStores()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('handles camera commands and toggleExplode state transitions', () => {
    lab().open(s23u, 'explore', null)
    expect(lab().exploded).toBe(false)
    expect(lab().camera.cmd).toBe('reset')
    const initialN = lab().camera.n

    lab().toggleExplode()
    expect(lab().exploded).toBe(true)
    expect(lab().camera.cmd).toBe('angle')
    expect(lab().camera.n).toBe(initialN + 1)

    lab().toggleExplode()
    expect(lab().exploded).toBe(false)
    expect(lab().camera.cmd).toBe('reset')
    expect(lab().camera.n).toBe(initialN + 2)

    lab().cameraCmd('flip')
    expect(lab().camera.cmd).toBe('flip')
    expect(lab().camera.n).toBe(initialN + 3)
  })

  it('unlocks first-open and safety-first achievements during explore flow', () => {
    lab().open(s23u, 'explore', null)

    // Removing back-cover (structural part with requires: []) unlocks 'first-open'
    lab().remove('back-cover')
    expect(progress().achievements).toContain('first-open')

    // Removing coil-speaker grants connectorAccess to battery
    lab().remove('coil-speaker')

    // Disconnecting the battery safely with 0 violations unlocks 'safety-first'
    lab().power(false)
    expect(lab().state!.powerConnected).toBe(false)
    expect(progress().achievements).toContain('safety-first')
  })

  it('unlocks know-it-all when selecting all components on a device', () => {
    lab().open(s23u, 'explore', null)
    expect(progress().achievements).not.toContain('know-it-all')

    for (const c of s23u.components) {
      lab().select(c.id)
    }

    expect(progress().achievements).toContain('know-it-all')
    expect(progress().discovered[s23u.id].length).toBe(s23u.components.length)
  })

  it('unlocks sparky achievement on short-circuit in sandbox mode', () => {
    lab().open(s23u, 'sandbox', null)

    // In sandbox, safely remove back-cover and coil-speaker, disconnect battery
    lab().remove('back-cover')
    lab().remove('coil-speaker')
    lab().power(false)
    lab().remove('interconnect')
    lab().remove('screen-cable')
    lab().remove('battery')

    // Install punctured battery (which causes short-circuit)
    lab().install('battery-punctured', 'battery')
    lab().install('screen-cable', 'screen-cable')
    lab().install('interconnect', 'interconnect')
    lab().power(true)
    lab().install('coil-speaker', 'coil-speaker')
    lab().install('back-cover', 'back-cover')

    lab().runDevice()
    expect(lab().run?.result.outcome).toBe('short-circuit')
    expect(progress().achievements).toContain('sparky')
  })

  it('unlocks frankenphone when running device with an incompatible part installed', () => {
    lab().open(s23u, 'sandbox', null)

    // In sandbox mode, install an incompatible part (battery-uncertified has compatible: [])
    lab().remove('back-cover')
    lab().remove('coil-speaker')
    lab().power(false)
    lab().remove('interconnect')
    lab().remove('screen-cable')
    lab().remove('battery')

    lab().install('battery-uncertified', 'battery')
    lab().install('screen-cable', 'screen-cable')
    lab().install('interconnect', 'interconnect')
    lab().power(true)
    lab().install('coil-speaker', 'coil-speaker')
    lab().install('back-cover', 'back-cover')

    lab().runDevice()
    expect(progress().achievements).toContain('frankenphone')
  })

  it('flags faulty parts in repair mode with deduplication', () => {
    lab().open(s23u, 'repair', 's23u-001')
    expect(lab().repair).not.toBeNull()
    expect(lab().repair!.flagged).toEqual([])

    lab().flag('battery')
    expect(lab().repair!.flagged).toEqual(['battery'])

    // Duplicate flag should be ignored
    lab().flag('battery')
    expect(lab().repair!.flagged).toEqual(['battery'])

    // Flagging another part
    lab().flag('main-camera')
    expect(lab().repair!.flagged).toEqual(['battery', 'main-camera'])
  })

  it('resumes session when reopening same key and resets when opening different key', () => {
    lab().open(s23u, 'explore', null)
    lab().remove('back-cover')
    expect(lab().state!.slots['back-cover']).toBeNull()

    // Reopen same device and mode -> resumes
    lab().open(s23u, 'explore', null)
    expect(lab().state!.slots['back-cover']).toBeNull()
    expect(lab().log.some((l) => l.text.includes('Resumed your last session'))).toBe(true)

    // Open different mode -> starts fresh
    lab().open(s23u, 'sandbox', null)
    expect(lab().state!.slots['back-cover']).toBe('back-cover')

    // Open different device -> starts fresh
    lab().open(ip12, 'explore', null)
    expect(lab().device?.id).toBe('iphone-12')
  })

  it('resets device back to starting state upon reset()', () => {
    lab().open(s23u, 'repair', 's23u-001')
    lab().remove('back-cover')
    lab().flag('battery')
    expect(lab().state!.slots['back-cover']).toBeNull()
    expect(lab().repair!.flagged).toEqual(['battery'])

    lab().reset()
    expect(lab().state!.slots['back-cover']).toBe('back-cover')
    expect(lab().repair!.flagged).toEqual([])
    expect(lab().run).toBeNull()
    expect(lab().spark).toBeNull()
  })

  it('records daily score when location hash includes daily=1 on successful repair', () => {
    vi.stubGlobal('location', { hash: '#/lab/galaxy-s23-ultra/repair/s23u-001?daily=1' })
    lab().open(s23u, 'repair', 's23u-001')

    // Fix s23u-001: battery degraded -> replace with battery-new
    lab().flag('battery')
    lab().remove('back-cover')
    lab().remove('coil-speaker')
    lab().power(false)
    lab().remove('interconnect')
    lab().remove('screen-cable')
    lab().remove('battery')

    lab().install('battery-new', 'battery')
    lab().install('screen-cable', 'screen-cable')
    lab().install('interconnect', 'interconnect')
    lab().power(true)
    lab().install('coil-speaker', 'coil-speaker')
    lab().install('back-cover', 'back-cover')

    lab().runDevice()
    expect(lab().run?.result.outcome).toBe('boots')

    // Fast forward fake timer for RUN_MS
    vi.advanceTimersByTime(RUN_MS + 50)

    expect(lab().repair?.done).not.toBeNull()
    expect(progress().dailyStreak).toBeGreaterThanOrEqual(1)
  })
})
