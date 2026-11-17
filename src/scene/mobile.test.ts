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
    // Mobile phones: narrow viewport
    expect(isMobileDevice({ innerWidth: 375, maxTouchPoints: 0 })).toBe(true)
    expect(isMobileDevice({ innerWidth: 412, maxTouchPoints: 5 })).toBe(true)
    // Tablets: touch screen with width < 1024
    expect(isMobileDevice({ innerWidth: 768, maxTouchPoints: 5 })).toBe(true)
    expect(isMobileDevice({ innerWidth: 820, maxTouchPoints: 10 })).toBe(true)
    // Desktop without touch
    expect(isMobileDevice({ innerWidth: 1280, maxTouchPoints: 0 })).toBe(false)
    expect(isMobileDevice({ innerWidth: 1920, maxTouchPoints: 0 })).toBe(false)
    // Touch laptops / desktops (>= 1024px) retain full desktop performance tier
    expect(isMobileDevice({ innerWidth: 1024, maxTouchPoints: 10 })).toBe(false)
    expect(isMobileDevice({ innerWidth: 1280, maxTouchPoints: 10 })).toBe(false)
    expect(isMobileDevice({ innerWidth: 3840, maxTouchPoints: 10 })).toBe(false)
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
