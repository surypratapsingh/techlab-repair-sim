// Lab session: one device in one mode. Wraps the pure engine and turns its events into
// log lines, achievements and XP. The current session is saved in this browser so a reload resumes it.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { playSound } from '../audio/sound'
import * as engine from '../engine/engine'
import type { Device, LabState, RunResult } from '../engine/types'
import { type CaseScore, scoreCase } from '../game/game'
import { getLocalDateString } from '../game/daily'
import { useProgress } from './progress'

export type Mode = 'explore' | 'sandbox' | 'repair'
export type CameraCmd = 'flip' | 'reset' | 'front' | 'angle'

export const RUN_MS = 4500

interface LogEntry {
  id: number
  text: string
  tone: 'info' | 'warn' | 'bad' | 'good'
}

interface RepairSession {
  startedAt: number
  flagged: string[]
  done: (CaseScore & { xp: number }) | null
}

interface Lab {
  device: Device | null
  /** deviceId/mode/caseId of the saved session. */
  key: string
  mode: Mode
  caseId: string | null
  state: LabState | null
  selected: string | null
  exploded: boolean
  camera: { cmd: CameraCmd; n: number }
  run: { result: RunResult; t0: number } | null
  /** Short-lived spark at a slot (safety violation). */
  spark: { slot: string; t0: number } | null
  log: LogEntry[]
  repair: RepairSession | null
  open: (device: Device, mode: Mode, caseId: string | null) => void
  select: (id: string | null) => void
  remove: (slot: string) => void
  install: (part: string, slot: string) => void
  power: (connected: boolean) => void
  runDevice: () => void
  flag: (slot: string) => void
  reset: () => void
  toggleExplode: () => void
  cameraCmd: (cmd: CameraCmd) => void
}

let logId = 0

function fresh(d: Device, mode: Mode, caseId: string | null) {
  const k = d.cases.find((c) => c.id === caseId)
  if (mode === 'repair' && k) return engine.createState(d, k.setup, k.spares)
  return engine.createState(d, {}, mode === 'sandbox' ? d.spares.map((p) => p.id) : [])
}

export const useLab = create<Lab>()(
  persist(
    (set, get) => {
      const say = (text: string, tone: LogEntry['tone'] = 'info') =>
        set((s) => ({ log: [...s.log.slice(-30), { id: ++logId, text, tone }] }))
      const progress = () => useProgress.getState()

      /** Apply an engine result: update state or explain why not. */
      const apply = (r: engine.Result) => {
        const { device: d } = get()
        if (!d) return
        if (!r.ok) return say(r.reason, 'warn')
        set({ state: r.state, run: null })
        for (const e of r.events) {
          const c = 'slot' in e ? engine.getComponent(d, e.slot) : undefined
          if (e.type === 'removed') {
            say(`Removed ${c?.name}.`)
            playSound(c?.fasteners?.length ? 'screw' : 'remove')
            if (c?.system === 'structure' && !c.requires.length) progress().unlock('first-open')
          }
          if (e.type === 'installed') {
            say(`Installed ${engine.getPart(d, e.part)?.name} in the ${c?.name} slot.`)
            playSound('install')
          }
          if (e.type === 'power') {
            say(e.connected ? 'Battery connected.' : 'Battery disconnected. Safe to work inside.', e.connected ? 'info' : 'good')
            playSound('click')
            if (!e.connected && r.state.violations === 0) progress().unlock('safety-first')
          }
          if (e.type === 'violation') {
            say(e.message, 'bad')
            playSound('short-circuit')
            set({ spark: { slot: e.slot, t0: performance.now() } })
          }
        }
        if (Object.values(r.state.slots).every((p) => p == null)) progress().unlock('total-teardown')
      }

      return {
        device: null,
        key: '',
        mode: 'explore',
        caseId: null,
        state: null,
        selected: null,
        exploded: false,
        camera: { cmd: 'reset', n: 0 },
        run: null,
        spark: null,
        log: [],
        repair: null,

        open: (device, mode, caseId) => {
          const key = `${device.id}/${mode}/${caseId ?? ''}`
          const resume = get().key === key && get().state
          set({
            device,
            key,
            mode,
            caseId,
            state: resume ? get().state : fresh(device, mode, caseId),
            repair: resume && get().repair ? get().repair : mode === 'repair' ? { startedAt: Date.now(), flagged: [], done: null } : null,
            selected: null,
            run: null,
            spark: null,
            log: [],
          })
          say(resume ? 'Resumed your last session on this device.' : `Welcome to the ${device.name}. Click any part to identify it.`)
        },

        select: (id) => {
          const { device: d } = get()
          if (id) playSound('click')
          set({ selected: id })
          if (!d || !id || !progress().discover(d.id, id)) return
          const c = engine.getComponent(d, id)
          say(`Discovered: ${c?.name} (+10 XP)`, 'good')
          if (progress().discovered[d.id]?.length === d.components.length) progress().unlock('know-it-all')
        },

        remove: (slot) => {
          const { device: d, state, mode } = get()
          if (d && state) apply(engine.remove(d, state, slot, mode === 'explore'))
        },

        install: (part, slot) => {
          const { device: d, state, mode } = get()
          if (d && state) apply(engine.install(d, state, part, slot, mode === 'explore'))
        },

        power: (connected) => {
          const { device: d, state } = get()
          if (d && state) apply(engine.setPower(d, state, connected))
        },

        runDevice: () => {
          const { device: d, state, mode, repair, caseId } = get()
          if (!d || !state || repair?.done) return
          const result = engine.run(d, state)
          set({ run: { result, t0: performance.now() }, camera: { cmd: 'front', n: get().camera.n + 1 } })
          if (result.outcome === 'boots') playSound('boot')
          else if (result.outcome === 'short-circuit') playSound('short-circuit')
          else if (result.outcome === 'thermal-shutdown') playSound('thermal-shutdown')
          else playSound('warning')
          progress().seeOutcome(d.id, result.outcome)
          if (result.outcome === 'thermal-shutdown') progress().unlock('meltdown')
          if (result.outcome === 'short-circuit' && mode === 'sandbox') progress().unlock('sparky')
          const installed = Object.values(state.slots).filter((p): p is string => !!p)
          if (installed.some((p) => !engine.isCompatible(d, p))) progress().unlock('frankenphone')

          const k = d.cases.find((c) => c.id === caseId)
          if (mode !== 'repair' || !k || !repair) return
          if (result.outcome !== 'boots' || result.symptoms.length) return say('Test failed. Keep investigating.', 'warn')
          const extraSwaps = d.components.filter((c) => c.id !== k.culprit && state.slots[c.id] !== (k.setup[c.id] ?? c.id)).length
          const score = scoreCase({
            culprit: k.culprit,
            flagged: repair.flagged,
            extraSwaps,
            violations: state.violations,
            seconds: (Date.now() - repair.startedAt) / 1000,
            targetSeconds: k.targetSeconds,
          })
          const xp = progress().finishCase(k.id, score.total)
          progress().unlock('first-fix')
          if (score.total >= 95) progress().unlock('perfectionist')
          if (typeof location !== 'undefined' && location.hash.includes('daily=1')) {
            progress().recordDaily(getLocalDateString(), score.total)
          }
          // Let the boot animation play before the score card appears.
          // Skip if the player reset or left the case in the meantime, or a card is already up (a second Run during
          // the animation scores again for 0 XP and must not replace the first card).
          setTimeout(() => get().repair?.startedAt === repair.startedAt && !get().repair?.done && set({ repair: { ...get().repair!, done: { ...score, xp } } }), RUN_MS)
        },

        flag: (slot) => {
          const { repair, device: d } = get()
          if (!repair || repair.done || repair.flagged.includes(slot)) return
          set({ repair: { ...repair, flagged: [...repair.flagged, slot] } })
          say(`Marked ${d && engine.getComponent(d, slot)?.name} as the faulty part.`)
        },

        reset: () => {
          const { device: d, mode, caseId } = get()
          if (!d) return
          set({
            state: fresh(d, mode, caseId),
            run: null,
            spark: null,
            selected: null,
            repair: mode === 'repair' ? { startedAt: Date.now(), flagged: [], done: null } : null,
          })
          say('Device reset.')
        },

        toggleExplode: () => set((s) => ({ exploded: !s.exploded, camera: { cmd: s.exploded ? 'reset' : 'angle', n: s.camera.n + 1 } })),
        cameraCmd: (cmd) => set((s) => ({ camera: { cmd, n: s.camera.n + 1 } })),
      }
    },
    {
      name: 'techlab-lab',
      version: 1,
      partialize: (s) => ({ key: s.key, mode: s.mode, caseId: s.caseId, state: s.state, repair: s.repair, exploded: s.exploded }),
    },
  ),
)
