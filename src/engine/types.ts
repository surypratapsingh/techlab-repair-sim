// TechLab content schema + simulation state.
// This file IS the device-data contract: public/data/devices/<id>.json must match `Device`.
// Units: millimetres, device-local. Origin = device centre. Viewed from the BACK:
// +x = viewer's right, +y = top of device, +z = out of the back (towards the viewer).

export type Vec3 = [number, number, number]

/** What the device does when you press "Run device". Ordered best -> worst (see OUTCOME_RANK). */
export type Outcome = 'boots' | 'degraded' | 'thermal-shutdown' | 'no-boot' | 'no-power' | 'short-circuit'

export interface Effect {
  outcome: Outcome
  /** User-facing explanation, e.g. "No sound from the loudspeaker". */
  symptom: string
  /** Temperature added under test load, in °C. */
  tempC?: number
}

export interface Shape {
  type: 'box' | 'cylinder'
  /** box: [w, h, d]. cylinder: [radius, length, unused] — axis is +z unless rotated. */
  size: Vec3
  pos: Vec3
  /** Euler radians. */
  rot?: Vec3
  color: string
  metalness?: number
  roughness?: number
  opacity?: number
  textureUrl?: string
  /** Lights up when the device boots with a working display. */
  screen?: boolean
}

export interface Source {
  id?: string
  title: string
  url: string
}

export interface FastenerSpec {
  type: 'screw' | 'adhesive' | 'clip' | 'press-connector'
  count?: number
  tool?: 'phillips-00' | 'tri-point-y000' | 'pentalobe-p2' | 'spudger' | 'suction-pick' | 'sim-tool' | 'heat-gun'
  notes?: string
}

/** A slot in the device + the original part that ships in it (part id = component id). */
export interface Component {
  id: string
  name: string
  /** Physical part family. A part only fits a slot of the same kind. */
  kind: string
  system: 'power' | 'compute' | 'display' | 'imaging' | 'audio' | 'charging' | 'connectivity' | 'thermal' | 'structure' | 'input'
  difficulty: 'easy' | 'medium' | 'hard'
  /** Slots that must be removed before this one can be removed or installed (they sit on top / in the way). */
  requires: string[]
  /**
   * Shown as "Connected to". On the powerSource it also has a rule: these are the slots the battery
   * plugs into, so removing one cuts power and the battery cannot be connected while one is missing.
   */
  connectsTo: string[]
  /** Has a press connector to the board: unplugging/plugging it while the battery is connected is a safety violation. */
  electrical?: boolean
  /** The battery. Exactly one per device. */
  powerSource?: boolean
  /** powerSource only: slots that must be removed to reach the battery connector. */
  connectorAccess?: string[]
  info: { what: string; does: string; ifFails: string; advanced?: string }
  specs?: Record<string, string>
  /** How the part is removed / attached in the real device, e.g. "Five 3.5 mm Phillips screws, light adhesive". */
  fastening?: string
  /** Structured fasteners & tool requirements. */
  fasteners?: FastenerSpec[]
  /** Exploded-view layer, 0 = front-most (display). */
  layer: number
  /** Direction the part leaves the device when removed. Default [0,0,1] (out of the back). */
  exit?: Vec3
  shapes: Shape[]
  onMissing: Effect
  /** Defaults to onMissing. */
  onDamaged?: Effect
  /** When a same-kind part that is not compatible with this device is installed. */
  onIncompatible?: Effect
  /** Verification status of THIS component's data. */
  verified: boolean
  /** Source IDs (from device.verification.sources) supporting this component's facts. */
  sources?: string[]
  sourceId?: string
  /** Where the data came from / what still needs checking. */
  note?: string
}

/** A loose physical part (spares, replacements, parts from other devices). */
export interface Part {
  id: string
  name: string
  kind: string
  /** Device ids this part is compatible with. */
  compatible: string[]
  damaged?: boolean
  /** Shown on inspection, e.g. "Battery is visibly swollen". */
  condition?: string
  /** Overrides the slot's onDamaged/onIncompatible effect when this part is installed. */
  effect?: Effect
  /** Visual override. */
  color?: string
  note?: string
}

export interface RepairCase {
  id: string
  title: string
  level: 'beginner' | 'intermediate' | 'advanced'
  brief: string
  symptoms: string[]
  /** slot -> part id installed at the start (the fault). */
  setup: Record<string, string>
  /** The slot that holds the faulty part. */
  culprit: string
  /** Part ids placed on the workbench. */
  spares: string[]
  targetSeconds: number
  /** Shown after completion. */
  explanation: string
}

export interface Device {
  id: string
  name: string
  brand: string
  category: 'phone' | 'laptop' | 'audio' | 'console' | 'tv'
  released: number
  summary: string
  dimensionsMm: Vec3
  specs: Record<string, string>
  verification: { status: 'draft' | 'verified'; sources: Source[]; notes: string }
  components: Component[]
  /** Extra parts available in Sandbox / referenced by repair cases. */
  spares: Part[]
  cases: RepairCase[]
}

/** Entry in public/data/devices/index.json */
export interface DeviceSummary {
  id: string
  name: string
  brand: string
  category: Device['category']
  available: boolean
  summary: string
}

// ---------- runtime state (owned by the engine, persisted by the browser) ----------

export interface LabState {
  /** slot id -> installed part id, or null when empty. */
  slots: Record<string, string | null>
  /** Loose parts on the workbench. */
  bench: string[]
  /** Battery press connector seated. */
  powerConnected: boolean
  /** Parts damaged during this session (in addition to parts that ship damaged). */
  damaged: string[]
  /** Safety violations committed this session. */
  violations: number
}

export type LabEvent =
  | { type: 'removed' | 'installed'; slot: string; part: string }
  | { type: 'power'; connected: boolean }
  | { type: 'violation'; slot: string; part: string; message: string }

export interface Symptom {
  slot: string | null
  outcome: Outcome
  text: string
}

export interface RunResult {
  outcome: Outcome
  tempC: number
  symptoms: Symptom[]
  /** True when the device powers up AND no display-system part fails. */
  screenOn: boolean
}
