// Content validator: every device JSON must pass this before it ships. Run via `npm test`.
import { createState, getPart, install, powerSource, remove, run, setPower, teardownOrder } from './engine'
import type { Device, LabState } from './types'

export function validateDevice(d: Device): string[] {
  const errors: string[] = []
  const err = (m: string) => errors.push(`${d.id}: ${m}`)
  const compIds = new Set(d.components.map((c) => c.id))
  const allIds = [...d.components.map((c) => c.id), ...d.spares.map((p) => p.id)]
  allIds.filter((id, i) => allIds.indexOf(id) !== i).forEach((id) => err(`duplicate id "${id}"`))

  const powers = d.components.filter((c) => c.powerSource)
  if (powers.length !== 1) err(`needs exactly one powerSource component, found ${powers.length}`)

  for (const c of d.components) {
    for (const ref of [...c.requires, ...c.connectsTo, ...(c.connectorAccess ?? [])])
      if (!compIds.has(ref) || ref === c.id) err(`${c.id} references bad component "${ref}"`)
    if (!c.shapes.length) err(`${c.id} has no shapes`)
    if (!c.info.what || !c.info.does || !c.info.ifFails) err(`${c.id} is missing what/does/ifFails`)
    if (c.fasteners) {
      const validTypes = new Set(['screw', 'adhesive', 'clip', 'press-connector'])
      const validTools = new Set(['phillips-00', 'tri-point-y000', 'pentalobe-p2', 'spudger', 'suction-pick', 'sim-tool', 'heat-gun'])
      for (const f of c.fasteners) {
        if (!validTypes.has(f.type)) err(`${c.id} has invalid fastener type "${f.type}"`)
        if (f.count !== undefined && f.count <= 0) err(`${c.id} has non-positive fastener count`)
        if (f.tool && !validTools.has(f.tool)) err(`${c.id} has invalid fastener tool "${f.tool}"`)
      }
    }
  }
  for (const p of d.spares)
    if (!d.components.some((c) => c.kind === p.kind)) err(`spare ${p.id} kind "${p.kind}" fits no slot`)
  if (errors.length) return errors

  try {
    teardownOrder(d)
  } catch (e) {
    return [...errors, `${d.id}: ${(e as Error).message}`]
  }

  // A stock device must boot cleanly, and must survive a full teardown + reassembly.
  const stock = run(d, createState(d))
  if (stock.outcome !== 'boots' || stock.symptoms.length) err(`stock device does not boot cleanly: ${stock.symptoms.map((s) => s.text).join(' | ')}`)
  const rebuilt = teardownAndRebuild(d)
  if (typeof rebuilt === 'string') err(rebuilt)
  else if (run(d, rebuilt).outcome !== 'boots') err('device does not boot after teardown + reassembly')

  for (const k of d.cases) {
    const where = `case ${k.id}`
    for (const [slot, part] of Object.entries(k.setup)) {
      const c = d.components.find((x) => x.id === slot)
      const p = getPart(d, part)
      if (!c || !p) err(`${where} setup references unknown ${!c ? 'slot ' + slot : 'part ' + part}`)
      else if (c.kind !== p.kind) err(`${where} puts ${part} (${p.kind}) in ${slot} (${c.kind})`)
    }
    if (!compIds.has(k.culprit)) err(`${where} culprit "${k.culprit}" is not a component`)
    k.spares.filter((p) => !getPart(d, p)).forEach((p) => err(`${where} unknown spare "${p}"`))
    if (run(d, createState(d, k.setup)).outcome === 'boots') err(`${where} starts in a state that already boots`)
    const fix = k.spares.find((p) => getPart(d, p)?.kind === getPart(d, k.setup[k.culprit] ?? k.culprit)?.kind && !getPart(d, p)?.damaged && getPart(d, p)?.compatible.includes(d.id))
    if (!fix) err(`${where} has no healthy compatible spare for the culprit`)
    else {
      const fixed = run(d, createState(d, { ...k.setup, [k.culprit]: fix }))
      if (fixed.outcome !== 'boots' || fixed.symptoms.length) err(`${where} still fails after swapping in ${fix}: ${fixed.symptoms.map((s) => s.text).join(' | ')}`)
    }
  }
  return errors
}

/**
 * Strict-mode round trip, like a careful technician: remove outermost-first and disconnect the battery
 * as soon as its connector is reachable; reinstall innermost-first and reconnect the battery just before
 * covering its connector again. Returns the rebuilt state or why it got stuck.
 */
export function teardownAndRebuild(d: Device): LabState | string {
  const order = teardownOrder(d)
  const access = powerSource(d).connectorAccess ?? []
  let s = createState(d)
  const step = (r: ReturnType<typeof remove>, what: string) => {
    if (!r.ok) throw new Error(`${what}: ${r.reason}`)
    s = r.state
  }
  try {
    for (const id of order) {
      if (s.powerConnected && access.every((a) => s.slots[a] == null)) step(setPower(d, s, false), 'disconnect battery')
      step(remove(d, s, id, true), `teardown at ${id}`)
    }
    for (const id of order.slice().reverse()) {
      if (!s.powerConnected && access.includes(id)) step(setPower(d, s, true), 'reconnect battery')
      step(install(d, s, id, id, true), `reassembly at ${id}`)
    }
  } catch (e) {
    return (e as Error).message
  }
  return s.powerConnected ? s : 'battery never reconnected during reassembly'
}
