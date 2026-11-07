// Player progress. Lives only in this browser (localStorage). No accounts, no server.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type AchievementId, XP } from '../game/game'
import { calculateStreak, getLocalDateString } from '../game/daily'
import type { Outcome } from '../engine/types'

interface Progress {
  xp: number
  /** deviceId -> discovered component ids */
  discovered: Record<string, string[]>
  /** caseId -> best total score */
  cases: Record<string, number>
  achievements: AchievementId[]
  /** deviceId -> outcomes seen while experimenting */
  outcomes: Record<string, Outcome[]>
  /** Latest unlock, for the toast. */
  lastUnlock: AchievementId | null
  /** local date (YYYY-MM-DD) -> best daily challenge score */
  daily: Record<string, number>
  /** Current day streak */
  dailyStreak: number
  discover: (deviceId: string, componentId: string) => boolean
  unlock: (id: AchievementId) => void
  seeOutcome: (deviceId: string, o: Outcome) => void
  /** Returns XP gained. */
  finishCase: (caseId: string, total: number) => number
  /** Records a daily challenge result for a given date. */
  recordDaily: (dateStr: string, score: number) => void
  reset: () => void
}

const empty = {
  xp: 0,
  discovered: {},
  cases: {},
  achievements: [],
  outcomes: {},
  lastUnlock: null,
  daily: {},
  dailyStreak: 0,
}

export const useProgress = create<Progress>()(
  persist(
    (set, get) => ({
      ...empty,
      discover: (deviceId, id) => {
        const seen = get().discovered[deviceId] ?? []
        if (seen.includes(id)) return false
        set((s) => ({ xp: s.xp + XP.discover, discovered: { ...s.discovered, [deviceId]: [...seen, id] } }))
        return true
      },
      unlock: (id) => {
        if (get().achievements.includes(id)) return
        set((s) => ({ achievements: [...s.achievements, id], lastUnlock: id }))
      },
      seeOutcome: (deviceId, o) => {
        const seen = get().outcomes[deviceId] ?? []
        if (seen.includes(o)) return
        set((s) => ({ xp: s.xp + XP.newOutcome, outcomes: { ...s.outcomes, [deviceId]: [...seen, o] } }))
      },
      finishCase: (caseId, total) => {
        const best = get().cases[caseId]
        // First clear pays score + bonus; replays only pay the improvement, so XP can't be farmed.
        const gain = best === undefined ? total + XP.caseFirstClear : Math.max(0, total - best)
        set((s) => ({ xp: s.xp + gain, cases: { ...s.cases, [caseId]: Math.max(best ?? 0, total) } }))
        return gain
      },
      recordDaily: (dateStr, score) => {
        const prev = get().daily[dateStr]
        const best = Math.max(prev ?? 0, score)
        const newDaily = { ...get().daily, [dateStr]: best }
        const streak = calculateStreak(newDaily, dateStr)
        set({ daily: newDaily, dailyStreak: streak })
      },
      reset: () => set(empty),
    }),
    {
      name: 'techlab-progress',
      version: 2,
      partialize: ({ lastUnlock: _, ...rest }) => rest,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          const s = persistedState as Partial<Progress>
          const daily = s.daily ?? {}
          return {
            ...s,
            daily,
            dailyStreak: s.dailyStreak ?? calculateStreak(daily, getLocalDateString()),
          }
        }
        return persistedState
      },
    },
  ),
)
