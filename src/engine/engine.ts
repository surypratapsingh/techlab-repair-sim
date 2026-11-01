// TechLab Device Simulation Engine. Pure functions: no React, no three.js, no I/O.
// Every action takes (device, state) and returns a new state + events, or a reason it is not allowed.
import type { Component, Device, Effect, LabEvent, LabState, Outcome, Part, RunResult, Symptom } from './types'

export const OUTCOME_RANK: Record<Outcome, number> = {
  boots: 0,
  degraded: 1,
  'thermal-shutdown': 2,
  'no-boot': 3,
  'no-power': 4,
  'short-circuit': 5,
}

export const AMBIENT_C = 25
export const LOAD_C = 36
/** Above this the simulated device protects itself and shuts down. */
export const SHUTDOWN_C = 52

export type Result = { ok: true; state: LabState; events: LabEvent[] } | { ok: false; reason: string }

const fail = (reason: string): Result => ({ ok: false, reason })

export const getComponent = (d: Device, id: string): Component | undefined => d.components.find((c) => c.id === id)

/** Original parts share their component's id; everything else lives in `spares`. */
export function getPart(d: Device, id: string): Part | undefined {
  const c = getComponent(d, id)
  return c ? { id: c.id, name: c.name, kind: c.kind, compatible: [d.id] } : d.spares.find((p) => p.id === id)
}

export const powerSource = (d: Device): Component => d.components.find((c) => c.powerSource)!

/** Summary of all fasteners and required tools for a component. */
export function componentFasteners(c: Component): { screws: number; tools: string[] } {
  if (!c.fasteners?.length) return { screws: 0, tools: [] }
  let screws = 0
  const tools = new Set<string>()
  for (const f of c.fasteners) {
    if (f.type === 'screw') screws += f.count ?? 1
    if (f.tool) tools.add(f.tool)
  }
  return { screws, tools: Array.from(tools) }
}

const names = (d: Device, ids: string[]) => ids.map((id) => getComponent(d, id)?.name ?? id).join(', ')

export function createState(d: Device, setup: Record<string, string> = {}, bench: string[] = []): LabState {
  return {
    slots: Object.fromEntries(d.components.map((c) => [c.id, setup[c.id] ?? c.id])),
    bench: [...bench],
    powerConnected: true,
    damaged: [],
    violations: 0,
  }
}

export const isDamaged = (d: Device, s: LabState, partId: string) =>
  !!getPart(d, partId)?.damaged || s.damaged.includes(partId)

export const isCompatible = (d: Device, partId: string) => !!getPart(d, partId)?.compatible.includes(d.id)

/** Installed slots that are in the way of `slotId`. */
export const blockers = (d: Device, s: LabState, slotId: string) =>
  (getComponent(d, slotId)?.requires ?? []).filter((r) => s.slots[r] != null)

/** Electrical part plugged/unplugged with the battery connected: allowed in non-strict modes, but it costs you. */
function hotPlug(d: Device, s: LabState, c: Component, part: string, verb: string, strict: boolean): Result | LabState {
  // Parts covering the battery connector can only be handled with the battery connected, so they are exempt.
  if (!c.electrical || c.powerSource || !s.powerConnected || powerSource(d).connectorAccess?.includes(c.id)) return s
  if (strict) return fail(`Disconnect the battery first. Never ${verb} a connector while the battery is connected.`)
  return {
    ...s,
    damaged: s.damaged.includes(part) ? s.damaged : [...s.damaged, part],
    violations: s.violations + 1,
  }
}

export function canRemove(d: Device, s: LabState, slotId: string, strict = false): string | null {
  const r = remove(d, s, slotId, strict)
  return r.ok ? null : r.reason
}

export function remove(d: Device, s: LabState, slotId: string, strict = false): Result {
  const c = getComponent(d, slotId)
  if (!c) return fail(`Unknown component "${slotId}".`)
  const part = s.slots[slotId]
  if (!part) return fail(`${c.name} is not installed.`)
  const blocking = blockers(d, s, slotId)
  if (blocking.length) return fail(`Remove first: ${names(d, blocking)}.`)
  if (c.powerSource && s.powerConnected) return fail('Disconnect the battery connector first.')

  const hot = hotPlug(d, s, c, part, 'unplug', strict)
  if ('ok' in hot) return hot
  const state = { ...hot, slots: { ...hot.slots, [slotId]: null }, bench: [...hot.bench, part] }
  // The battery connector lives on the part it connects to (the motherboard): removing that part severs it.
  if (powerSource(d).connectsTo.includes(slotId)) state.powerConnected = false
  const events: LabEvent[] = [{ type: 'removed', slot: slotId, part }]
  if (hot !== s)
    events.push({ type: 'violation', slot: slotId, part, message: `${c.name} was unplugged with the battery connected. The connector arced and the part is now damaged.` })
  return { ok: true, state, events }
}

/** Empty slots this part physically fits (same kind). */
export const slotsFor = (d: Device, s: LabState, partId: string) =>
  d.components.filter((c) => c.kind === getPart(d, partId)?.kind && s.slots[c.id] == null).map((c) => c.id)

export function install(d: Device, s: LabState, partId: string, slotId: string, strict = false): Result {
  const c = getComponent(d, slotId)
  const p = getPart(d, partId)
  if (!c || !p) return fail('Unknown part or slot.')
  if (!s.bench.includes(partId)) return fail(`${p.name} is not on the workbench.`)
  if (s.slots[slotId] != null) return fail(`${c.name} slot is occupied.`)
  if (p.kind !== c.kind) return fail(`${p.name} does not fit the ${c.name} slot.`)
  const blocking = blockers(d, s, slotId)
  if (blocking.length) return fail(`Can't reach the slot. Remove first: ${names(d, blocking)}.`)

  const hot = hotPlug(d, s, c, partId, 'plug in', strict)
  if ('ok' in hot) return hot
  const state = { ...hot, slots: { ...hot.slots, [slotId]: partId }, bench: hot.bench.filter((b) => b !== partId) }
  const events: LabEvent[] = [{ type: 'installed', slot: slotId, part: partId }]
  if (hot !== s)
    events.push({ type: 'violation', slot: slotId, part: partId, message: `${p.name} was plugged in with the battery connected. The connector arced and the part is now damaged.` })
  return { ok: true, state, events }
}

export function setPower(d: Device, s: LabState, connected: boolean): Result {
  const b = powerSource(d)
  if (s.powerConnected === connected) return fail(`Battery is already ${connected ? 'connected' : 'disconnected'}.`)
  const blocking = (b.connectorAccess ?? []).filter((r) => s.slots[r] != null)
  if (blocking.length) return fail(`Can't reach the battery connector. Remove first: ${names(d, blocking)}.`)
  if (connected && !s.slots[b.id]) return fail('No battery installed.')
  const target = b.connectsTo.filter((id) => !s.slots[id])
  if (connected && target.length) return fail(`Nothing to plug the battery into. Install first: ${names(d, target)}.`)
  return { ok: true, state: { ...s, powerConnected: connected }, events: [{ type: 'power', connected }] }
}

function effectOf(d: Device, s: LabState, c: Component): Effect | null {
  const pid = s.slots[c.id]
  if (!pid) return c.onMissing
  const p = getPart(d, pid)!
  if (s.damaged.includes(pid)) return c.onDamaged ?? c.onMissing
  if (p.damaged) return p.effect ?? c.onDamaged ?? c.onMissing
  if (!p.compatible.includes(d.id))
    return p.effect ?? c.onIncompatible ?? { outcome: 'degraded', symptom: `${c.name}: part not recognised by this device.` }
  return null
}

const worst = (xs: Symptom[]): Outcome =>
  xs.reduce<Outcome>((w, x) => (OUTCOME_RANK[x.outcome] > OUTCOME_RANK[w] ? x.outcome : w), 'boots')

/** "Run device": evaluate the current state under a test load. */
export function run(d: Device, s: LabState): RunResult {
  let symptoms: Symptom[] = []
  let heat = 0
  for (const c of d.components) {
    const e = effectOf(d, s, c)
    if (!e) continue
    symptoms.push({ slot: c.id, outcome: e.outcome, text: e.symptom })
    heat += e.tempC ?? 0
  }
  const b = powerSource(d)
  if (s.slots[b.id] && !s.powerConnected)
    symptoms.push({ slot: b.id, outcome: 'no-power', text: 'Battery connector is not seated, so no power reaches the board.' })

  let outcome = worst(symptoms)
  // Without power nothing else is observable: only report what explains the dead device.
  if (OUTCOME_RANK[outcome] >= OUTCOME_RANK['no-power']) symptoms = symptoms.filter((x) => x.outcome === outcome)
  const tempC = outcome === 'no-power' ? AMBIENT_C : LOAD_C + heat
  if (tempC >= SHUTDOWN_C && OUTCOME_RANK[outcome] < OUTCOME_RANK['thermal-shutdown']) {
    outcome = 'thermal-shutdown'
    symptoms.push({ slot: null, outcome, text: `Temperature reached ${tempC} °C. The device shut itself down to protect its components.` })
  }
  symptoms.sort((a, b) => OUTCOME_RANK[b.outcome] - OUTCOME_RANK[a.outcome])
  const displayFault = symptoms.some((x) => x.slot && getComponent(d, x.slot)?.system === 'display')
  const screenOn = OUTCOME_RANK[outcome] < OUTCOME_RANK['no-boot'] && !displayFault
  return { outcome, tempC, symptoms, screenOn }
}

/** Slots in an order they can be removed in (outermost first). Throws on a dependency cycle. */
export function teardownOrder(d: Device): string[] {
  const out: string[] = []
  const state = new Map<string, 'visiting' | 'done'>()
  // A slot can be removed once everything in its `requires` list is gone, so visit requires first.
  const visit = (id: string) => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'visiting') throw new Error(`Removal cycle at "${id}"`)
    state.set(id, 'visiting')
    for (const r of getComponent(d, id)?.requires ?? []) visit(r)
    state.set(id, 'done')
    out.push(id)
  }
  d.components.forEach((c) => visit(c.id))
  return out
}
