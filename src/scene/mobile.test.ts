import { describe, expect, it } from 'vitest'
import {
  getCylinderSegments,
  getSceneDpr,
  getSparklesCount,
  getSphereSegments,
  isMobileDevice,
} from './mobile'

describe('mobile performance utilities', () => {
  it('identifies mobile environments by viewport width or touch points', () => {
    expect(isMobileDevice({ innerWidth: 375, maxTouchPoints: 0 })).toBe(true)
    expect(isMobileDevice({ innerWidth: 500, maxTouchPoints: 5 })).toBe(true)
    expect(isMobileDevice({ innerWidth: 1280, maxTouchPoints: 0 })).toBe(false)
  })

  it('clamps DPR to 1.5 on mobile to avoid 3x fillrate exhaustion', () => {
    expect(getSceneDpr(true)).toEqual([1, 1.5])
    expect(getSceneDpr(false)).toEqual([1, 2])
  })

  it('reduces cylinder radial segments on mobile', () => {
    expect(getCylinderSegments(true)).toBe(18)
    expect(getCylinderSegments(false)).toBe(32)
  })

  it('scales down sparkles count on mobile', () => {
    expect(getSparklesCount(true, 60)).toBe(27)
    expect(getSparklesCount(true, 40)).toBe(18)
    expect(getSparklesCount(false, 60)).toBe(60)
  })

  it('reduces smoke puff sphere segments on mobile', () => {
    expect(getSphereSegments(true)).toEqual([8, 8])
    expect(getSphereSegments(false)).toEqual([12, 12])
  })
})
