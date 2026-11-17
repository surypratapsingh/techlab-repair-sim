import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, levelFor, scoreCase, xpForLevel, XP } from './game'

describe('gamification rules and scoring (game.ts)', () => {
  describe('level and XP calculations', () => {
    it('computes level for zero, boundaries, and negative XP values', () => {
      expect([0, 49, 50, 199, 200, 450].map(levelFor)).toEqual([1, 1, 2, 2, 3, 4])
      expect(levelFor(-10)).toBe(1)
      expect(levelFor(-100)).toBe(1)
      expect(levelFor(xpForLevel(7))).toBe(7)
      expect(levelFor(xpForLevel(10))).toBe(10)
    })

    it('computes starting XP requirements for levels', () => {
      expect(xpForLevel(1)).toBe(0)
      expect(xpForLevel(2)).toBe(50)
      expect(xpForLevel(3)).toBe(200)
      expect(xpForLevel(4)).toBe(450)
      expect(xpForLevel(5)).toBe(800)
    })

    it('exposes defined XP constants for actions', () => {
      expect(XP.discover).toBe(10)
      expect(XP.newOutcome).toBe(15)
      expect(XP.caseFirstClear).toBe(50)
    })
  })

  describe('case scoring rules (scoreCase)', () => {
    it('scores a clean repair 100', () => {
      const score = scoreCase({
        culprit: 'b',
        flagged: ['b'],
        extraSwaps: 0,
        violations: 0,
        seconds: 100,
        targetSeconds: 240,
      })
      expect(score.total).toBe(100)
      expect(score.diagnosis).toBe(100)
      expect(score.repair).toBe(100)
      expect(score.parts).toBe(100)
      expect(score.time).toBe(100)
    })

    it('penalises guesswork, swaps, violations and slowness', () => {
      const s = scoreCase({
        culprit: 'b',
        flagged: ['a', 'b'],
        extraSwaps: 1,
        violations: 1,
        seconds: 720,
        targetSeconds: 240,
      })
      expect(s).toEqual({ diagnosis: 75, repair: 75, parts: 75, time: 40, total: 68 })
      expect(scoreCase({ culprit: 'b', flagged: [], extraSwaps: 0, violations: 9, seconds: 0, targetSeconds: 1 }).repair).toBe(0)
    })

    it('safely handles zero or negative targetSeconds without division by zero or NaN', () => {
      const sZero = scoreCase({
        culprit: 'b',
        flagged: ['b'],
        extraSwaps: 0,
        violations: 0,
        seconds: 30,
        targetSeconds: 0,
      })
      expect(Number.isNaN(sZero.total)).toBe(false)
      expect(Number.isNaN(sZero.time)).toBe(false)
      expect(sZero.total).toBeGreaterThanOrEqual(0)
      expect(sZero.total).toBeLessThanOrEqual(100)

      const sNeg = scoreCase({
        culprit: 'b',
        flagged: ['b'],
        extraSwaps: 0,
        violations: 0,
        seconds: 30,
        targetSeconds: -50,
      })
      expect(Number.isNaN(sNeg.total)).toBe(false)
      expect(Number.isNaN(sNeg.time)).toBe(false)
    })

    it('awards exactly 40 for diagnosis when culprit is not flagged, regardless of other flags', () => {
      const s1 = scoreCase({
        culprit: 'battery',
        flagged: ['screen'],
        extraSwaps: 0,
        violations: 0,
        seconds: 60,
        targetSeconds: 120,
      })
      expect(s1.diagnosis).toBe(40)

      const sEmpty = scoreCase({
        culprit: 'battery',
        flagged: [],
        extraSwaps: 0,
        violations: 0,
        seconds: 60,
        targetSeconds: 120,
      })
      expect(sEmpty.diagnosis).toBe(40)
    })

    it('clamps diagnosis, repair, and parts floors at 0 with excess penalties', () => {
      const sExcess = scoreCase({
        culprit: 'b',
        flagged: ['a', 'c', 'd', 'e', 'f', 'b'], // 5 wrong flags -> 100 - 125 = -25 -> clamped 0
        extraSwaps: 6, // 100 - 150 = -50 -> clamped 0
        violations: 5, // 100 - 125 = -25 -> clamped 0
        seconds: 9999,
        targetSeconds: 100,
      })
      expect(sExcess.diagnosis).toBe(0)
      expect(sExcess.repair).toBe(0)
      expect(sExcess.parts).toBe(0)
      expect(sExcess.time).toBe(40) // minimum floor
      expect(sExcess.total).toBe(8) // 0.2 * 40 = 8
    })
  })

  describe('achievements catalog', () => {
    it('defines 9 unique achievements with titles and descriptions', () => {
      expect(ACHIEVEMENTS.length).toBe(9)
      const ids = ACHIEVEMENTS.map((a) => a.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(9)

      for (const a of ACHIEVEMENTS) {
        expect(a.id).toBeTruthy()
        expect(a.title.length).toBeGreaterThan(0)
        expect(a.text.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('scoreCase time guard (game.ts)', () => {
  const base = { flagged: ['c'], culprit: 'c', violations: 0, extraSwaps: 0 }
  it('a zero target counts as 1 second: finishing in 1 s is full time score', () => {
    expect(scoreCase({ ...base, seconds: 1, targetSeconds: 0 }).time).toBe(100)
  })
  it('a negative target counts as 1 second: 5 s on it loses time, not gains it', () => {
    expect(scoreCase({ ...base, seconds: 5, targetSeconds: -10 }).time).toBe(40)
  })
})
