// Daily repair challenge helpers: deterministic case picking and day streak math.
import type { Device, RepairCase } from '../engine/types'

export function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) | 0
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35) | 0
  h ^= h >>> 16
  return Math.abs(h)
}

/** Formats a Date into local YYYY-MM-DD. */
export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parses YYYY-MM-DD into a UTC date for safe day-arithmetic. */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Formats a UTC Date into YYYY-MM-DD. */
export function formatDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns the previous calendar day in YYYY-MM-DD format. */
export function previousDay(dateStr: string): string {
  const d = parseDate(dateStr)
  d.setUTCDate(d.getUTCDate() - 1)
  return formatDate(d)
}

/**
 * Calculates the current active consecutive day streak.
 * If referenceDate (default today) was completed, counts consecutive days backwards.
 * If referenceDate is not yet completed, checks if yesterday was completed and counts backwards from there.
 * Breaks on any missed day.
 */
export function calculateStreak(
  completedDates: string[] | Record<string, number>,
  referenceDate?: string,
): number {
  const dateSet = new Set(Array.isArray(completedDates) ? completedDates : Object.keys(completedDates))
  const today = referenceDate ?? getLocalDateString()
  let curr = today
  let streak = 0
  if (dateSet.has(curr)) {
    while (dateSet.has(curr)) {
      streak++
      curr = previousDay(curr)
    }
  } else {
    let prev = previousDay(curr)
    while (dateSet.has(prev)) {
      streak++
      prev = previousDay(prev)
    }
  }
  return streak
}

export interface CaseEntry {
  d: Device
  k: RepairCase
}

/** Deterministically picks one case given a date string and available cases. */
export function pickDailyCase<T>(cases: T[], dateStr: string = getLocalDateString()): T | null {
  if (!cases.length) return null
  const idx = hashString(dateStr) % cases.length
  return cases[idx]
}
