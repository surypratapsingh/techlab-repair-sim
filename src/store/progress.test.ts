// Progress store: XP rules that must not be farmed (replays, repeats, course bonus).
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { XP } from '../game/game'
import { useProgress } from './progress'

// Minimal in-memory localStorage — zustand/persist calls getItem/setItem.
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

beforeEach(() => useProgress.getState().reset())

describe('progress store', () => {
  it('pays discover XP once per component', () => {
    const p = useProgress.getState()
    expect(p.discover('dev', 'battery')).toBe(true)
    expect(p.discover('dev', 'battery')).toBe(false)
    expect(useProgress.getState().xp).toBe(XP.discover)
  })

  it('pays first-clear bonus, then only the improvement on replays', () => {
    const p = useProgress.getState()
    expect(p.finishCase('c1', 80)).toBe(80 + XP.caseFirstClear)
    expect(p.finishCase('c1', 70)).toBe(0) // worse replay pays nothing
    expect(p.finishCase('c1', 90)).toBe(10) // improvement pays the difference
    expect(useProgress.getState().cases.c1).toBe(90)
  })

  it('unlocks an achievement only once and sets the toast', () => {
    const p = useProgress.getState()
    p.unlock('first-open')
    p.unlock('first-open')
    expect(useProgress.getState().achievements).toEqual(['first-open'])
    expect(useProgress.getState().lastUnlock).toBe('first-open')
  })

  it('grants course bonus only when crossing 5 steps', () => {
    const p = useProgress.getState()
    p.advanceCourse('k', 4)
    expect(useProgress.getState().xp).toBe(0)
    p.advanceCourse('k', 5)
    expect(useProgress.getState().xp).toBe(50)
    p.advanceCourse('k', 5) // no new step, no bonus
    expect(useProgress.getState().xp).toBe(50)
  })
})
