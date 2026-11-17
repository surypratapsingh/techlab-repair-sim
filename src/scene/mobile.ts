/**
 * Mobile-specific performance optimizations for 3D WebGL rendering.
 * Prevents thermal throttling, battery drain, and GPU fill-rate exhaustion on mobile devices.
 * Distinguishes phones and tablets (<1024px) from touch-enabled laptops/desktops (>=1024px).
 */

export function isMobileDevice(env?: { innerWidth?: number; maxTouchPoints?: number }): boolean {
  if (env) {
    const width = env.innerWidth ?? 1024
    const touch = env.maxTouchPoints ?? 0
    return width < 768 || (touch > 0 && width < 1024)
  }
  if (typeof window === 'undefined') return false
  const width = window.innerWidth
  const touch = typeof navigator !== 'undefined' && 'maxTouchPoints' in navigator ? navigator.maxTouchPoints : 0
  return width < 768 || (touch > 0 && width < 1024)
}

/**
 * Bounds DPR on mobile to 1.5. A 3x DPR mobile screen rendering WebGL at full resolution
 * processes 9x the fragments of a 1x display, causing severe frame drops.
 */
export function getSceneDpr(isMobile: boolean): [number, number] {
  return isMobile ? [1, 1.5] : [1, 2]
}

/**
 * Reduces cylinder radial segments on mobile (e.g., lens rings, screw posts) to save vertex processing.
 */
export function getCylinderSegments(isMobile: boolean): number {
  return isMobile ? 18 : 32
}

/**
 * Scales down particle counts on mobile GPUs.
 */
export function getSparklesCount(isMobile: boolean, baseCount: number): number {
  return isMobile ? Math.max(10, Math.round(baseCount * 0.45)) : baseCount
}

/**
 * Reduces sphere segments for smoke puff geometries on mobile.
 */
export function getSphereSegments(isMobile: boolean): [number, number] {
  return isMobile ? [8, 8] : [12, 12]
}
