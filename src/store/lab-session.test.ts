/** Lab store: session resume, discovery XP and the faulty-part flag. Node only, like lab.test.ts. */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Device } from '../engine/types'
import { useLab } from './lab'
import { useProgress } from './progress'

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

const s23u: Device = JSON.parse(readFileSync(join(__dirname, '../../public/data/devices/galaxy-s23-ultra.json'), 'utf8'))
const lab = () => useLab.getState()

beforeEach(() => {
  useLab.setState({ device: null, key: '', state: null, repair: null, log: [] })
  useProgress.setState({ xp: 0, discovered: {}, cases: {}, achievements: [], outcomes: {}, lastUnlock: null })
})

describe('useLab session', () => {
  it('reopening the same device and mode resumes; another mode starts fresh', () => {
    lab().open(s23u, 'sandbox', null)
    lab().remove('back-cover')
    lab().open(s23u, 'sandbox', null)
    expect(lab().state!.slots['back-cover']).toBeNull()
    lab().open(s23u, 'explore', null)
    expect(lab().state!.slots['back-cover']).toBe('back-cover')
  })

  it('selecting a part awards discovery XP once', () => {
    lab().open(s23u, 'explore', null)
    lab().select('battery')
    const xp = useProgress.getState().xp
    expect(xp).toBeGreaterThan(0)
    lab().select(null)
    lab().select('battery')
    expect(useProgress.getState().xp).toBe(xp)
  })

  it('marking a part faulty twice records it once', () => {
    lab().open(s23u, 'repair', 's23u-001')
    lab().flag('battery')
    lab().flag('battery')
    expect(lab().repair!.flagged).toEqual(['battery'])
  })
})
