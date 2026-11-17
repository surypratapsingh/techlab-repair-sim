import { describe, expect, it } from 'vitest'
import { run } from './engine'
import type { Device } from './types'
import { teardownAndRebuild, validateDevice } from './validate'

function createValidDevice(): Device {
  const info = { what: 'What it is', does: 'What it does', ifFails: 'What happens if it fails' }
  const shapes = [{ type: 'box' as const, size: [10, 10, 10] as [number, number, number], pos: [0, 0, 0] as [number, number, number], color: '#333' }]
  return {
    id: 'test-device',
    name: 'Test Device',
    brand: 'TestBrand',
    category: 'phone',
    released: 2026,
    summary: 'A valid test device',
    dimensionsMm: [100, 50, 10],
    specs: {},
    verification: {
      status: 'verified',
      sources: [{ id: 'src-1', title: 'Official Guide', url: 'https://example.com' }],
      notes: 'Fully verified',
    },
    components: [
      {
        id: 'back-cover',
        name: 'Back Cover',
        kind: 'cover',
        system: 'structure',
        difficulty: 'easy',
        layer: 3,
        requires: [],
        connectsTo: [],
        shapes,
        info,
        verified: true,
        sources: ['src-1'],
        onMissing: { outcome: 'degraded', symptom: 'Device open to elements' },
      },
      {
        id: 'battery',
        name: 'Battery',
        kind: 'battery',
        system: 'power',
        difficulty: 'medium',
        layer: 2,
        powerSource: true,
        electrical: true,
        requires: ['back-cover'],
        connectsTo: ['motherboard'],
        connectorAccess: ['back-cover'],
        shapes,
        info,
        verified: true,
        sources: ['src-1'],
        onMissing: { outcome: 'no-power', symptom: 'No power source' },
      },
      {
        id: 'motherboard',
        name: 'Motherboard',
        kind: 'board',
        system: 'compute',
        difficulty: 'hard',
        layer: 1,
        electrical: true,
        requires: ['back-cover', 'battery'],
        connectsTo: [],
        shapes,
        info,
        verified: true,
        sources: ['src-1'],
        onMissing: { outcome: 'no-power', symptom: 'Mainboard missing' },
      },
    ],
    spares: [
      {
        id: 'battery-replacement',
        name: 'Replacement Battery',
        kind: 'battery',
        compatible: ['test-device'],
        damaged: false,
      },
      {
        id: 'battery-damaged',
        name: 'Damaged Battery',
        kind: 'battery',
        compatible: ['test-device'],
        damaged: true,
        effect: { outcome: 'thermal-shutdown', symptom: 'Battery overheating', tempC: 25 },
      },
      {
        id: 'motherboard-damaged',
        name: 'Damaged Motherboard',
        kind: 'board',
        compatible: ['test-device'],
        damaged: true,
        effect: { outcome: 'short-circuit', symptom: 'Fried motherboard' },
      },
    ],
    cases: [
      {
        id: 'test-001',
        title: 'Dead Battery',
        level: 'beginner',
        brief: 'Device fails to boot due to a damaged battery.',
        symptoms: ['Battery overheating'],
        setup: { battery: 'battery-damaged' },
        culprit: 'battery',
        spares: ['battery-replacement'],
        targetSeconds: 120,
        explanation: 'Replace the damaged battery with a healthy one.',
      },
    ],
  }
}

describe('validateDevice', () => {
  it('passes a fully valid device and teardownAndRebuild works', () => {
    const d = createValidDevice()
    expect(validateDevice(d)).toEqual([])
    const rebuilt = teardownAndRebuild(d)
    expect(typeof rebuilt).not.toBe('string')
    if (typeof rebuilt !== 'string') {
      expect(run(d, rebuilt).outcome).toBe('boots')
    }
  })

  it('rejects duplicate IDs', () => {
    const d = createValidDevice()
    d.components.push({ ...d.components[0] })
    expect(validateDevice(d).join()).toMatch(/duplicate id "back-cover"/)
  })

  it('enforces exactly one powerSource component', () => {
    const noPower = createValidDevice()
    delete noPower.components[1].powerSource
    expect(validateDevice(noPower).join()).toMatch(/needs exactly one powerSource component, found 0/)

    const multiPower = createValidDevice()
    multiPower.components[0].powerSource = true
    expect(validateDevice(multiPower).join()).toMatch(/needs exactly one powerSource component, found 2/)
  })

  it('detects invalid component references and self-references', () => {
    const d = createValidDevice()
    d.components[0].requires = ['non-existent']
    d.components[1].connectsTo = ['battery'] // self reference
    d.components[1].connectorAccess = ['unknown-access']
    const errors = validateDevice(d).join()
    expect(errors).toMatch(/back-cover references bad component "non-existent"/)
    expect(errors).toMatch(/battery references bad component "battery"/)
    expect(errors).toMatch(/battery references bad component "unknown-access"/)
  })

  it('requires shapes and info for every component', () => {
    const d = createValidDevice()
    d.components[0].shapes = []
    d.components[1].info = { what: '', does: 'does', ifFails: 'fails' }
    const errors = validateDevice(d).join()
    expect(errors).toMatch(/back-cover has no shapes/)
    expect(errors).toMatch(/battery is missing what\/does\/ifFails/)
  })

  it('validates sources and verified status citations', () => {
    const d = createValidDevice()
    d.components[0].sources = ['unknown-src']
    expect(validateDevice(d).join()).toMatch(/back-cover cites unknown source "unknown-src"/)

    const d2 = createValidDevice()
    d2.components[0].sources = []
    expect(validateDevice(d2).join()).toMatch(/back-cover is verified: true but cites no source id/)
  })

  it('validates gltf model paths', () => {
    const d = createValidDevice()
    d.components[0].gltf = '   '
    expect(validateDevice(d).join()).toMatch(/has invalid gltf model path/)

    d.components[0].gltf = 'models/back-cover.gltf'
    expect(validateDevice(d)).toEqual([])
  })

  it('validates fastener types, counts, and tools', () => {
    const d = createValidDevice()
    d.components[0].fasteners = [
      { type: 'bad-type' as any, count: 2, tool: 'phillips-00' },
      { type: 'screw', count: 0, tool: 'phillips-00' },
      { type: 'screw', count: 2, tool: 'bad-tool' as any },
    ]
    const errors = validateDevice(d).join()
    expect(errors).toMatch(/has invalid fastener type "bad-type"/)
    expect(errors).toMatch(/has non-positive fastener count/)
    expect(errors).toMatch(/has invalid fastener tool "bad-tool"/)
  })

  it('rejects spare parts that fit no component slot', () => {
    const d = createValidDevice()
    d.spares.push({
      id: 'odd-spare',
      name: 'Odd Spare',
      kind: 'unknown-kind' as any,
      compatible: [d.id],
      damaged: false,
    })
    expect(validateDevice(d).join()).toMatch(/spare odd-spare kind "unknown-kind" fits no slot/)
  })

  it('rejects teardown dependency cycles', () => {
    const d = createValidDevice()
    d.components[0].requires = ['motherboard']
    expect(validateDevice(d).join()).toMatch(/cycle/)
  })

  it('catches teardown and rebuild failure during validation', () => {
    const d = createValidDevice()
    delete d.components[1].connectorAccess
    expect(validateDevice(d).join()).toMatch(/battery never reconnected during reassembly/)
  })

  it('validates repair case setup slot and part references', () => {
    const d = createValidDevice()
    d.cases[0].setup = { 'non-existent-slot': 'battery-damaged' }
    expect(validateDevice(d).join()).toMatch(/setup references unknown slot non-existent-slot/)

    const d2 = createValidDevice()
    d2.cases[0].setup = { battery: 'non-existent-part' }
    expect(validateDevice(d2).join()).toMatch(/setup references unknown part non-existent-part/)

    const d3 = createValidDevice()
    d3.cases[0].setup = { 'back-cover': 'battery-damaged' }
    expect(validateDevice(d3).join()).toMatch(/puts battery-damaged \(battery\) in back-cover \(cover\)/)
  })

  it('validates repair case culprit and spares', () => {
    const d = createValidDevice()
    d.cases[0].culprit = 'non-existent-comp'
    expect(validateDevice(d).join()).toMatch(/culprit "non-existent-comp" is not a component/)

    const d2 = createValidDevice()
    d2.cases[0].spares = ['non-existent-spare']
    expect(validateDevice(d2).join()).toMatch(/unknown spare "non-existent-spare"/)
  })

  it('rejects repair cases that already boot in setup', () => {
    const d = createValidDevice()
    d.cases[0].setup = {} // Clean setup boots
    expect(validateDevice(d).join()).toMatch(/starts in a state that already boots/)
  })

  it('rejects repair cases with no healthy compatible spare or where swap does not fix', () => {
    const d = createValidDevice()
    d.cases[0].spares = ['battery-damaged'] // only damaged spare
    expect(validateDevice(d).join()).toMatch(/has no healthy compatible spare for the culprit/)

    const d2 = createValidDevice()
    // Setup breaks both battery and motherboard, but case culprit and spare only addresses battery
    d2.cases[0].setup = {
      battery: 'battery-damaged',
      motherboard: 'motherboard-damaged',
    }
    d2.cases[0].culprit = 'battery'
    d2.cases[0].spares = ['battery-replacement']
    expect(validateDevice(d2).join()).toMatch(/still fails after swapping in battery-replacement/)
  })
})

describe('teardownAndRebuild', () => {
  it('returns error string when step removal fails', () => {
    const d = createValidDevice()
    delete d.components[1].connectorAccess
    const result = teardownAndRebuild(d)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/battery never reconnected during reassembly/)
  })
})
