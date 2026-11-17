import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../../engine/types'
import { useLab } from '../../store/lab'
import { useProgress } from '../../store/progress'
import { handleLabKeyDown } from './keyboard'

// Minimal in-memory localStorage stub
;(function stubStorage() {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    length: 0,
    key: () => null,
  })
})()

const DATA = join(__dirname, '../../../public/data/devices')
const s23u: Device = JSON.parse(readFileSync(join(DATA, 'galaxy-s23-ultra.json'), 'utf8'))

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
  useProgress.setState({ xp: 0, discovered: {}, cases: {}, achievements: [], outcomes: {}, lastUnlock: null })
}

describe('handleLabKeyDown', () => {
  beforeEach(() => {
    resetStores()
  })

  it('cycles components with [ and ] keys', () => {
    useLab.getState().open(s23u, 'explore', null)
    const outerFirst = [...s23u.components].sort((a, b) => b.layer - a.layer)

    // No selection initially, press ']' to select first outer component
    let prevented = false
    const res1 = handleLabKeyDown({ key: ']', preventDefault: () => { prevented = true } })
    expect(res1).toBe(true)
    expect(prevented).toBe(true)
    expect(useLab.getState().selected).toBe(outerFirst[0].id)

    // Press ']' again to select second component
    handleLabKeyDown({ key: ']' })
    expect(useLab.getState().selected).toBe(outerFirst[1].id)

    // Press '[' to cycle back
    handleLabKeyDown({ key: '[' })
    expect(useLab.getState().selected).toBe(outerFirst[0].id)

    // Press '[' at 0 wraps around to the last component
    handleLabKeyDown({ key: '[' })
    expect(useLab.getState().selected).toBe(outerFirst[outerFirst.length - 1].id)
  })

  it('handles R to remove selected component and Escape to deselect', () => {
    useLab.getState().open(s23u, 'explore', null)
    useLab.getState().select('back-cover')

    const res = handleLabKeyDown({ key: 'r' })
    expect(res).toBe(true)
    expect(useLab.getState().state?.slots['back-cover']).toBeNull()

    // Escape deselects
    expect(useLab.getState().selected).toBe('back-cover')
    const escRes = handleLabKeyDown({ key: 'Escape' })
    expect(escRes).toBe(true)
    expect(useLab.getState().selected).toBeNull()
  })

  it('handles B to toggle battery connection when battery connector is accessible', () => {
    useLab.getState().open(s23u, 'explore', null)
    // Remove parts blocking battery connector
    useLab.getState().remove('back-cover')
    useLab.getState().remove('coil-speaker')
    expect(useLab.getState().state?.powerConnected).toBe(true)

    const res = handleLabKeyDown({ key: 'b' })
    expect(res).toBe(true)
    expect(useLab.getState().state?.powerConnected).toBe(false)

    handleLabKeyDown({ key: 'b' })
    expect(useLab.getState().state?.powerConnected).toBe(true)
  })

  it('handles M to mark faulty in repair mode', () => {
    useLab.getState().open(s23u, 'repair', 's23u-001')
    useLab.getState().select('battery')

    const res = handleLabKeyDown({ key: 'm' })
    expect(res).toBe(true)
    expect(useLab.getState().repair?.flagged).toContain('battery')
  })

  it('handles I to install spare part into empty slot', () => {
    useLab.getState().open(s23u, 'repair', 's23u-001')
    // Remove back-cover and coil-speaker and disconnect power to reach battery
    useLab.getState().remove('back-cover')
    useLab.getState().remove('coil-speaker')
    useLab.getState().power(false)
    useLab.getState().remove('interconnect')
    useLab.getState().remove('screen-cable')
    useLab.getState().remove('battery')

    expect(useLab.getState().state?.slots['battery']).toBeNull()
    useLab.getState().select('battery')

    const res = handleLabKeyDown({ key: 'i' })
    expect(res).toBe(true)
    expect(useLab.getState().state?.slots['battery']).toBe('battery-new')
  })

  it('handles T to run diagnostic test', () => {
    useLab.getState().open(s23u, 'explore', null)
    expect(useLab.getState().run).toBeNull()

    const res = handleLabKeyDown({ key: 't' })
    expect(res).toBe(true)
    expect(useLab.getState().run).not.toBeNull()
  })

  it('ignores shortcuts when typing in input or textarea elements', () => {
    useLab.getState().open(s23u, 'explore', null)
    const mockInput = { tagName: 'INPUT' } as unknown as HTMLElement

    const res = handleLabKeyDown({ key: 't', target: mockInput })
    expect(res).toBe(false)
    expect(useLab.getState().run).toBeNull()
  })

  it('returns false for unknown keys or when conditions not met', () => {
    useLab.getState().open(s23u, 'explore', null)
    const res = handleLabKeyDown({ key: 'z' })
    expect(res).toBe(false)
  })

  it('handles uppercase keys (R, B, M, I, T)', () => {
    useLab.getState().open(s23u, 'repair', 's23u-001')
    useLab.getState().select('back-cover')

    // Uppercase R
    expect(handleLabKeyDown({ key: 'R' })).toBe(true)
    expect(useLab.getState().state?.slots['back-cover']).toBeNull()

    // Uppercase B (after removing blocking part)
    useLab.getState().remove('coil-speaker')
    expect(handleLabKeyDown({ key: 'B' })).toBe(true)
    expect(useLab.getState().state?.powerConnected).toBe(false)

    // Uppercase M
    useLab.getState().select('battery')
    expect(handleLabKeyDown({ key: 'M' })).toBe(true)
    expect(useLab.getState().repair?.flagged).toContain('battery')

    // Uppercase I
    useLab.getState().remove('interconnect')
    useLab.getState().remove('screen-cable')
    useLab.getState().remove('battery')
    expect(useLab.getState().state?.slots['battery']).toBeNull()
    useLab.getState().select('battery')
    expect(handleLabKeyDown({ key: 'I' })).toBe(true)
    expect(useLab.getState().state?.slots['battery']).toBe('battery-new')

    // Uppercase T
    expect(handleLabKeyDown({ key: 'T' })).toBe(true)
    expect(useLab.getState().run).not.toBeNull()
  })

  it('guards against invalid operations when slot or part preconditions are not met', () => {
    useLab.getState().open(s23u, 'explore', null)

    // Escape when nothing selected returns false
    expect(useLab.getState().selected).toBeNull()
    expect(handleLabKeyDown({ key: 'Escape' })).toBe(false)

    // R when selected slot is already empty returns false
    useLab.getState().select('back-cover')
    useLab.getState().remove('back-cover')
    expect(useLab.getState().state?.slots['back-cover']).toBeNull()
    expect(handleLabKeyDown({ key: 'r' })).toBe(false)

    // I when slot is already filled returns false
    useLab.getState().select('screen')
    expect(useLab.getState().state?.slots['screen']).not.toBeNull()
    expect(handleLabKeyDown({ key: 'i' })).toBe(false)

    // I when no matching spare is available on bench returns false
    useLab.setState({ state: { ...useLab.getState().state!, bench: [] } })
    useLab.getState().select('back-cover')
    expect(handleLabKeyDown({ key: 'i' })).toBe(false)

    // B when battery component is completely removed returns false
    useLab.getState().remove('coil-speaker')
    useLab.getState().power(false)
    useLab.getState().remove('interconnect')
    useLab.getState().remove('screen-cable')
    useLab.getState().remove('battery')
    expect(useLab.getState().state?.slots['battery']).toBeNull()
    expect(handleLabKeyDown({ key: 'b' })).toBe(false)

    // M in explore mode returns false
    useLab.getState().select('motherboard')
    expect(handleLabKeyDown({ key: 'm' })).toBe(false)
  })
})
