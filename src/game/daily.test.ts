import { describe, expect, it } from 'vitest'
import { calculateStreak, formatDate, pickDailyCase } from './daily'
import { useProgress } from '../store/progress'

describe('daily challenge', () => {
  const dummyCases = [
    { id: 'c1', title: 'Case 1' },
    { id: 'c2', title: 'Case 2' },
    { id: 'c3', title: 'Case 3' },
    { id: 'c4', title: 'Case 4' },
    { id: 'c5', title: 'Case 5' },
    { id: 'c6', title: 'Case 6' },
    { id: 'c7', title: 'Case 7' },
    { id: 'c8', title: 'Case 8' },
    { id: 'c9', title: 'Case 9' },
    { id: 'c10', title: 'Case 10' },
  ]

  it('same date gives the same case (deterministic selection)', () => {
    const picked1 = pickDailyCase(dummyCases, '2026-11-07')
    const picked2 = pickDailyCase(dummyCases, '2026-11-07')
    const picked3 = pickDailyCase(dummyCases, '2026-11-07')
    expect(picked1).toEqual(picked2)
    expect(picked2).toEqual(picked3)
    expect(picked1).not.toBeNull()

    // Different dates yield predictable results
    const otherDatePicked = pickDailyCase(dummyCases, '2026-11-08')
    expect(pickDailyCase(dummyCases, '2026-11-08')).toEqual(otherDatePicked)
  })

  it('returns null on empty cases array', () => {
    expect(pickDailyCase([], '2026-11-07')).toBeNull()
  })

  it('60 consecutive dates spread over all cases', () => {
    const pickedCaseIds = new Set<string>()
    const start = new Date(Date.UTC(2026, 0, 1)) // 2026-01-01
    for (let i = 0; i < 60; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000)
      const dateStr = formatDate(d)
      const picked = pickDailyCase(dummyCases, dateStr)
      expect(picked).not.toBeNull()
      pickedCaseIds.add(picked!.id)
    }

    // Every one of the 10 cases should be selected at least once across 60 consecutive days
    expect(pickedCaseIds.size).toBe(dummyCases.length)
    for (const c of dummyCases) {
      expect(pickedCaseIds.has(c.id)).toBe(true)
    }
  })

  describe('streak math', () => {
    it('calculates streak across month end', () => {
      // October has 31 days. Testing Oct 30, Oct 31, Nov 01
      const completed = {
        '2026-10-30': 85,
        '2026-10-31': 90,
        '2026-11-01': 100,
      }
      expect(calculateStreak(completed, '2026-11-01')).toBe(3)

      // Yesterday finished, today not yet finished keeps active streak of 3
      expect(calculateStreak(completed, '2026-11-02')).toBe(3)

      // Leap year February end: Feb 28, Feb 29, Mar 01 (2024 is leap year)
      const leapYearCompleted = ['2024-02-28', '2024-02-29', '2024-03-01']
      expect(calculateStreak(leapYearCompleted, '2024-03-01')).toBe(3)

      // Year boundary: Dec 31 -> Jan 01
      const yearBoundaryCompleted = ['2025-12-30', '2025-12-31', '2026-01-01']
      expect(calculateStreak(yearBoundaryCompleted, '2026-01-01')).toBe(3)
    })

    it('calculates streak when a day is missed', () => {
      // Completed Nov 1, Nov 2; missed Nov 3; completed Nov 4
      const completedWithGap = ['2026-11-01', '2026-11-02', '2026-11-04']
      // On Nov 4, streak is 1 because Nov 3 was missed
      expect(calculateStreak(completedWithGap, '2026-11-04')).toBe(1)

      // On Nov 5 (yesterday Nov 4 completed, today not yet played), streak is 1
      expect(calculateStreak(completedWithGap, '2026-11-05')).toBe(1)

      // On Nov 6 (neither today Nov 6 nor yesterday Nov 5 played), streak resets to 0
      expect(calculateStreak(completedWithGap, '2026-11-06')).toBe(0)

      // Empty history has 0 streak
      expect(calculateStreak({}, '2026-11-07')).toBe(0)
    })
  })

  it('updates progress store with daily scores and streak', () => {
    useProgress.getState().reset()

    // Day 1
    useProgress.getState().recordDaily('2026-11-01', 80)
    expect(useProgress.getState().daily['2026-11-01']).toBe(80)
    expect(useProgress.getState().dailyStreak).toBe(1)

    // Better score on Day 1 updates best score
    useProgress.getState().recordDaily('2026-11-01', 95)
    expect(useProgress.getState().daily['2026-11-01']).toBe(95)
    expect(useProgress.getState().dailyStreak).toBe(1)

    // Worse score does not overwrite
    useProgress.getState().recordDaily('2026-11-01', 70)
    expect(useProgress.getState().daily['2026-11-01']).toBe(95)

    // Day 2
    useProgress.getState().recordDaily('2026-11-02', 88)
    expect(useProgress.getState().dailyStreak).toBe(2)

    // Reset clears daily
    useProgress.getState().reset()
    expect(useProgress.getState().dailyStreak).toBe(0)
    expect(Object.keys(useProgress.getState().daily).length).toBe(0)
  })
})
