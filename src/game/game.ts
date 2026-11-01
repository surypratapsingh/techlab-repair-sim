// Gamification rules: levels, repair scoring, achievements. Pure, no React.

/** Level n starts at 50·(n-1)² XP: L2 = 50, L3 = 200, L4 = 450, L5 = 800 … */
export const levelFor = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1
export const xpForLevel = (level: number) => 50 * (level - 1) ** 2

export const XP = { discover: 10, newOutcome: 15, caseFirstClear: 50 }

export interface CaseAttempt {
  culprit: string
  /** Slots the player flagged as faulty, in order. */
  flagged: string[]
  /** Slots (other than the culprit) whose final part differs from the part they started with. */
  extraSwaps: number
  violations: number
  seconds: number
  targetSeconds: number
}

export interface CaseScore {
  diagnosis: number
  repair: number
  parts: number
  time: number
  total: number
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function scoreCase(a: CaseAttempt): CaseScore {
  const wrong = a.flagged.filter((f) => f !== a.culprit).length
  const diagnosis = a.flagged.includes(a.culprit) ? clamp(100 - 25 * wrong) : 40
  const repair = clamp(100 - 25 * a.violations)
  const parts = clamp(100 - 25 * a.extraSwaps)
  const over = Math.max(0, a.seconds - a.targetSeconds)
  const time = Math.max(40, clamp(100 - (60 * over) / (2 * a.targetSeconds)))
  const total = clamp(0.3 * diagnosis + 0.3 * repair + 0.2 * parts + 0.2 * time)
  return { diagnosis, repair, parts, time, total }
}

export const ACHIEVEMENTS = [
  { id: 'first-open', title: 'Cracking It Open', text: 'Remove a back cover for the first time.' },
  { id: 'safety-first', title: 'Safety First', text: 'Disconnect a battery before working inside.' },
  { id: 'know-it-all', title: 'Know-It-All', text: 'Discover every component of a device.' },
  { id: 'total-teardown', title: 'Total Teardown', text: 'Remove every component from a device.' },
  { id: 'meltdown', title: 'Meltdown', text: 'Trigger a thermal shutdown.' },
  { id: 'sparky', title: 'Sparky', text: 'Cause a short circuit in the Sandbox.' },
  { id: 'frankenphone', title: 'Frankenphone', text: 'Run a device with a part that was not made for it.' },
  { id: 'first-fix', title: 'First Fix', text: 'Complete a repair case.' },
  { id: 'perfectionist', title: 'Perfectionist', text: 'Score 95 or more on a repair case.' },
] as const

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id']
