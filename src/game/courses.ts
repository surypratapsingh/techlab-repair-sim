// Interactive hardware courses: guided step-by-step lessons using existing Explore mode actions.
import type { Device, LabState } from '../engine/types'

export interface StepContext {
  state: LabState
  selected: string | null
  device: Device
}

export interface CourseStep {
  id: string
  title: string
  instruction: string
  explanation: string
  check: (ctx: StepContext) => boolean
}

export interface Course {
  id: string
  title: string
  description: string
  category: string
  deviceId: string
  steps: CourseStep[]
}

export const PHONE_BATTERY_SAFETY_COURSE: Course = {
  id: 'phone-battery-safety',
  title: 'Phone battery safety',
  description:
    'Master the critical safety protocols for opening a modern smartphone, isolating lithium-ion power, and safely extracting battery cells.',
  category: 'Safety & Fundamentals',
  deviceId: 'galaxy-s23-ultra',
  steps: [
    {
      id: 'inspect-battery',
      title: 'Inspect the battery',
      instruction: 'Click on the battery in the 3D model or parts list to inspect its capacity, voltage, and chemistry.',
      explanation:
        'Lithium-ion cells store high energy density in volatile chemistry. Always review manufacturer safety ratings before servicing.',
      check: (ctx) => ctx.selected === 'battery',
    },
    {
      id: 'remove-back-cover',
      title: 'Remove the rear cover',
      instruction: 'Click Remove on the back cover to access the phone interior.',
      explanation:
        'Modern sealed smartphones require removing the adhesive-bonded rear glass before internal assemblies are accessible.',
      check: (ctx) => ctx.state.slots['back-cover'] === null,
    },
    {
      id: 'remove-bracket',
      title: 'Remove the wireless coil assembly',
      instruction: 'Remove the wireless charging coil assembly that shields the battery and motherboard connectors.',
      explanation:
        'Protective brackets and antennas must be unfastened before the battery connector can be reached. Never pry directly against covering brackets.',
      check: (ctx) => ctx.state.slots['coil-speaker'] === null,
    },
    {
      id: 'disconnect-power',
      title: 'Disconnect battery power',
      instruction: 'Cut electrical power using the battery disconnect switch before touching internal electronics.',
      explanation:
        'Crucial safety rule: Always isolate power before disconnecting motherboard connectors to prevent accidental short circuits and board death.',
      check: (ctx) => ctx.state.slots['coil-speaker'] === null && !ctx.state.powerConnected,
    },
    {
      id: 'extract-battery',
      title: 'Safely extract the battery cell',
      instruction: 'With power disconnected and zero safety violations, remove remaining cables and extract the battery.',
      explanation:
        'Battery successfully removed without punctures, bending, or thermal hazards! Excellent repair discipline.',
      check: (ctx) =>
        ctx.state.slots['battery'] === null && !ctx.state.powerConnected && ctx.state.violations === 0,
    },
  ],
}

export const COURSES: Course[] = [PHONE_BATTERY_SAFETY_COURSE]

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id)
}

/**
 * Evaluates whether a given step index is fulfilled.
 */
export function isStepComplete(course: Course, stepIndex: number, ctx: StepContext): boolean {
  const step = course.steps[stepIndex]
  if (!step) return false
  return step.check(ctx)
}
