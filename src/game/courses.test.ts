import { describe, expect, it } from 'vitest'
import { getCourse, isStepComplete, PHONE_BATTERY_SAFETY_COURSE, type StepContext } from './courses'
import { useProgress } from '../store/progress'
import * as engine from '../engine/engine'
import type { Device, LabState } from '../engine/types'

describe('Phone battery safety interactive course', () => {
  const dummyDevice = {
    id: 'galaxy-s23-ultra',
    name: 'Samsung Galaxy S23 Ultra',
  } as Device

  const makeContext = (overrides?: Partial<LabState>, selected: string | null = null): StepContext => ({
    device: dummyDevice,
    selected,
    state: {
      slots: {
        'back-cover': 'back-cover',
        'coil-speaker': 'coil-speaker',
        battery: 'battery',
      },
      bench: [],
      damaged: [],
      powerConnected: true,
      violations: 0,
      ...overrides,
    },
  })

  it('provides course definition with 5 guided steps', () => {
    const course = getCourse('phone-battery-safety')
    expect(course).toBeDefined()
    expect(course?.title).toBe('Phone battery safety')
    expect(course?.steps.length).toBe(5)
    expect(course?.deviceId).toBe('galaxy-s23-ultra')
  })

  describe('step completion checks', () => {
    it('step 0 (inspect-battery): completes only when battery is selected', () => {
      const ctxUnselected = makeContext({}, null)
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 0, ctxUnselected)).toBe(false)

      const ctxOtherSelected = makeContext({}, 'back-cover')
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 0, ctxOtherSelected)).toBe(false)

      const ctxBatterySelected = makeContext({}, 'battery')
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 0, ctxBatterySelected)).toBe(true)
    })

    it('step 1 (remove-back-cover): completes when back cover is removed', () => {
      const ctxStock = makeContext()
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 1, ctxStock)).toBe(false)

      const ctxRemoved = makeContext({ slots: { 'back-cover': null, 'coil-speaker': 'coil-speaker', battery: 'battery' } })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 1, ctxRemoved)).toBe(true)
    })

    it('step 2 (remove-bracket): completes when coil assembly is removed', () => {
      const ctxCoverOnly = makeContext({ slots: { 'back-cover': null, 'coil-speaker': 'coil-speaker', battery: 'battery' } })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 2, ctxCoverOnly)).toBe(false)

      const ctxCoilRemoved = makeContext({ slots: { 'back-cover': null, 'coil-speaker': null, battery: 'battery' } })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 2, ctxCoilRemoved)).toBe(true)
    })

    it('step 3 (disconnect-power): requires coil removed and power disconnected', () => {
      // Coil removed but power still connected
      const ctxPowerOn = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': null, battery: 'battery' },
        powerConnected: true,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 3, ctxPowerOn)).toBe(false)

      // Power disconnected but coil still installed (cannot reach connector)
      const ctxBlocked = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': 'coil-speaker', battery: 'battery' },
        powerConnected: false,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 3, ctxBlocked)).toBe(false)

      // Coil removed and power disconnected
      const ctxSafe = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': null, battery: 'battery' },
        powerConnected: false,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 3, ctxSafe)).toBe(true)
    })

    it('step 4 (extract-battery): requires battery removed, power disconnected, and zero violations', () => {
      // Battery still in place
      const ctxInstalled = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': null, battery: 'battery' },
        powerConnected: false,
        violations: 0,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 4, ctxInstalled)).toBe(false)

      // Battery removed, but power was left connected (hazard!)
      const ctxHotRemoval = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': null, battery: null },
        powerConnected: true,
        violations: 0,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 4, ctxHotRemoval)).toBe(false)

      // Battery removed, power off, but player committed a safety violation
      const ctxViolated = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': null, battery: null },
        powerConnected: false,
        violations: 1,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 4, ctxViolated)).toBe(false)

      // Clean, safe extraction
      const ctxClean = makeContext({
        slots: { 'back-cover': null, 'coil-speaker': null, battery: null },
        powerConnected: false,
        violations: 0,
      })
      expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 4, ctxClean)).toBe(true)
    })
  })

  it('completes simulated end-to-end course using actual device and engine actions', async () => {
    const fs = await import('node:fs')
    const raw = fs.readFileSync('public/data/devices/galaxy-s23-ultra.json', 'utf8')
    const s23u = JSON.parse(raw) as Device

    let state = engine.createState(s23u)
    let selected: string | null = null

    // Step 0: Inspect battery
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 0, { device: s23u, state, selected })).toBe(false)
    selected = 'battery'
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 0, { device: s23u, state, selected })).toBe(true)

    // Step 1: Remove back cover
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 1, { device: s23u, state, selected })).toBe(false)
    const ev1 = engine.remove(s23u, state, 'back-cover', true)
    expect(ev1.ok).toBe(true)
    if (ev1.ok) state = ev1.state
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 1, { device: s23u, state, selected })).toBe(true)

    // Step 2: Remove coil-speaker
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 2, { device: s23u, state, selected })).toBe(false)
    const ev2 = engine.remove(s23u, state, 'coil-speaker', true)
    expect(ev2.ok).toBe(true)
    if (ev2.ok) state = ev2.state
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 2, { device: s23u, state, selected })).toBe(true)

    // Step 3: Disconnect power before touching electrical connectors
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 3, { device: s23u, state, selected })).toBe(false)
    const ev3 = engine.setPower(s23u, state, false)
    expect(ev3.ok).toBe(true)
    if (ev3.ok) state = ev3.state
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 3, { device: s23u, state, selected })).toBe(true)

    // Unseat interconnect & screen cables now that power is off
    const ev4 = engine.remove(s23u, state, 'interconnect', true)
    expect(ev4.ok).toBe(true)
    if (ev4.ok) state = ev4.state
    const ev5 = engine.remove(s23u, state, 'screen-cable', true)
    expect(ev5.ok).toBe(true)
    if (ev5.ok) state = ev5.state

    // Step 4: Extract battery
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 4, { device: s23u, state, selected })).toBe(false)
    const ev6 = engine.remove(s23u, state, 'battery', true)
    expect(ev6.ok).toBe(true)
    if (ev6.ok) state = ev6.state
    expect(isStepComplete(PHONE_BATTERY_SAFETY_COURSE, 4, { device: s23u, state, selected })).toBe(true)
    expect(state.violations).toBe(0)
  })

  it('tracks course progress and awards completion bonus in progress store', () => {
    useProgress.getState().reset()
    const p = useProgress.getState()
    expect(p.courses['phone-battery-safety']).toBeUndefined()
    const initialXp = p.xp

    // Advance steps
    useProgress.getState().advanceCourse('phone-battery-safety', 1)
    expect(useProgress.getState().courses['phone-battery-safety']).toBe(1)
    expect(useProgress.getState().xp).toBe(initialXp)

    useProgress.getState().advanceCourse('phone-battery-safety', 3)
    expect(useProgress.getState().courses['phone-battery-safety']).toBe(3)

    // Completing all 5 steps awards 50 XP bonus
    useProgress.getState().advanceCourse('phone-battery-safety', 5)
    expect(useProgress.getState().courses['phone-battery-safety']).toBe(5)
    expect(useProgress.getState().xp).toBe(initialXp + 50)

    // Replay / lower step does not downgrade progress
    useProgress.getState().advanceCourse('phone-battery-safety', 2)
    expect(useProgress.getState().courses['phone-battery-safety']).toBe(5)

    // Resetting course resets course entry
    useProgress.getState().resetCourse('phone-battery-safety')
    expect(useProgress.getState().courses['phone-battery-safety']).toBeUndefined()
  })
})
