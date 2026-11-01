/**
 * Lab store tests (T-005).
 *
 * These run in Node via vitest — no browser, no DOM, no WebGL.
 * We stub localStorage so zustand/persist does not throw, and use
 * vitest fake timers for the setTimeout that shows the score card.
 *
 * Because ESM module caches are shared within the file we import the stores
 * once and reset zustand state between tests via setState.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../engine/types'
import { useLab, RUN_MS } from './lab'
import { useProgress } from './progress'

// ─── Stubs ────────────────────────────────────────────────────────────────────

// Minimal in-memory localStorage — zustand/persist calls setItem/getItem.
;(function stubStorage() {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    length: 0,
    key: () => null,
  })
})()

// ─── Fixture ──────────────────────────────────────────────────────────────────

const DATA = join(__dirname, '../../public/data/devices')
const s23u: Device = JSON.parse(readFileSync(join(DATA, 'galaxy-s23-ultra.json'), 'utf8'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reset both stores to their blank initial state before each test. */
function resetStores() {
  // Reset lab store to initial blank state.
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
  // Reset progress store to empty.
  useProgress.setState({ xp: 0, discovered: {}, cases: {}, achievements: [], outcomes: {}, lastUnlock: null })
}

// Shorthand to read current lab state.
const lab = () => useLab.getState()

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLab – explore mode', () => {
  beforeEach(() => { resetStores(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('blocks hot-unplug of an electrical part', () => {
    lab().open(s23u, 'explore', null)

    // Remove back cover (not electrical, no battery check).
    lab().remove('back-cover')
    expect(lab().state!.slots['back-cover']).toBeNull()

    // Remove coil-speaker (electrical but in connectorAccess → exempt, safe while connected).
    lab().remove('coil-speaker')
    expect(lab().state!.slots['coil-speaker']).toBeNull()

    // Attempt to remove interconnect (electrical, NOT in connectorAccess).
    // In explore (strict = true) this should fail with a warning.
    const slotsBefore = { ...lab().state!.slots }
    lab().remove('interconnect')
    expect(lab().state!.slots).toEqual(slotsBefore) // slot unchanged
    expect(lab().state!.violations).toBe(0)          // no violation recorded
    expect(lab().log.some((l) => l.tone === 'warn')).toBe(true)
  })
})

describe('useLab – sandbox mode', () => {
  beforeEach(() => { resetStores(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('hot-unplug in sandbox counts a violation instead of blocking', () => {
    lab().open(s23u, 'sandbox', null)

    // Remove back cover, then coil-speaker (connectorAccess → still powered, no violation).
    lab().remove('back-cover')
    lab().remove('coil-speaker')
    expect(lab().state!.violations).toBe(0)

    // Remove interconnect with battery still connected — sandbox allows it but damages.
    lab().remove('interconnect')
    expect(lab().state!.violations).toBe(1)
    expect(lab().state!.damaged).toContain('interconnect')
    // A spark should have been fired at the violated slot.
    expect(lab().spark?.slot).toBe('interconnect')
    // A 'bad' log entry for the violation.
    expect(lab().log.some((l) => l.tone === 'bad')).toBe(true)
  })
})

describe('useLab – repair mode (s23u-001)', () => {
  beforeEach(() => { resetStores(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  /**
   * Full battery replacement with no violations and only the correct spare.
   * Expected result: score 100/100 visible after RUN_MS.
   */
  it('perfect repair scores 100 after RUN_MS', () => {
    lab().open(s23u, 'repair', 's23u-001')

    // ── Diagnosis: flag the culprit ────────────────────────────────────────
    lab().flag('battery')

    // ── Teardown (safe order, no violations) ──────────────────────────────
    lab().remove('back-cover')      // not electrical
    lab().remove('coil-speaker')    // electrical but in connectorAccess → exempt
    lab().power(false)              // disconnect battery
    lab().remove('interconnect')    // electrical, battery now disconnected ✓
    lab().remove('screen-cable')    // electrical, battery now disconnected ✓
    lab().remove('battery')         // powerSource, disconnected ✓

    expect(lab().state!.violations).toBe(0)
    expect(lab().state!.slots['battery']).toBeNull()

    // ── Install the new battery ────────────────────────────────────────────
    lab().install('battery-new', 'battery')
    expect(lab().state!.slots['battery']).toBe('battery-new')

    // ── Rebuild ────────────────────────────────────────────────────────────
    lab().install('screen-cable', 'screen-cable')
    lab().install('interconnect', 'interconnect')
    lab().power(true)               // reconnect battery
    lab().install('coil-speaker', 'coil-speaker')
    lab().install('back-cover', 'back-cover')

    expect(lab().state!.violations).toBe(0)

    // ── Run the device ─────────────────────────────────────────────────────
    lab().runDevice()
    expect(lab().run?.result.outcome).toBe('boots')
    expect(lab().run?.result.symptoms).toHaveLength(0)

    // Score card appears only after the boot animation (RUN_MS).
    expect(lab().repair?.done).toBeNull()
    vi.advanceTimersByTime(RUN_MS + 1)

    const done = lab().repair?.done
    expect(done).not.toBeNull()
    expect(done!.total).toBe(100)

    // ── Progress store reflects the completion ─────────────────────────────
    const prog = useProgress.getState()
    expect(prog.cases['s23u-001']).toBe(100)
    expect(prog.achievements).toContain('first-fix')
    expect(prog.achievements).toContain('perfectionist')
  })

  it('reset during the run cancels the score card', () => {
    lab().open(s23u, 'repair', 's23u-001')

    // Perform a perfect repair to get a clean boot.
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

    // Advance time by 1ms so the reset() creates a new repair session with
    // a different Date.now() timestamp than the one captured in the setTimeout
    // closure. (Fake timers freeze Date.now(), so without this both sessions
    // share the same startedAt and the guard lets the score card through.)
    vi.advanceTimersByTime(1)

    // Reset BEFORE the boot animation finishes.
    lab().reset()
    expect(lab().run).toBeNull()

    // Advance past the rest of the timeout — score card must NOT appear.
    vi.advanceTimersByTime(RUN_MS + 1)
    expect(lab().repair?.done).toBeNull()
  })
})
