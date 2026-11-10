import { expect, it } from 'vitest'
import { powerWord } from './power'

it('calls the power source a power supply on mains devices only', () => {
  expect(powerWord({ category: 'console' })).toBe('Power supply')
  expect(powerWord({ category: 'tv' })).toBe('Power supply')
  expect(powerWord({ category: 'phone' })).toBe('Battery')
})
