import { expect, it } from 'vitest'
import { levelFor, scoreCase, xpForLevel } from './game'

it('levels', () => {
  expect([0, 49, 50, 199, 200, 450].map(levelFor)).toEqual([1, 1, 2, 2, 3, 4])
  expect(levelFor(xpForLevel(7))).toBe(7)
})

it('scores a clean repair 100', () => {
  expect(scoreCase({ culprit: 'b', flagged: ['b'], extraSwaps: 0, violations: 0, seconds: 100, targetSeconds: 240 }).total).toBe(100)
})

it('penalises guesswork, swaps, violations and slowness', () => {
  const s = scoreCase({ culprit: 'b', flagged: ['a', 'b'], extraSwaps: 1, violations: 1, seconds: 720, targetSeconds: 240 })
  expect(s).toEqual({ diagnosis: 75, repair: 75, parts: 75, time: 40, total: 68 })
  expect(scoreCase({ culprit: 'b', flagged: [], extraSwaps: 0, violations: 9, seconds: 0, targetSeconds: 1 }).repair).toBe(0)
})
