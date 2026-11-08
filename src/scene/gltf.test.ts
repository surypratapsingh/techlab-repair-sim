import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Component } from '../engine/types'
import { resolveGltfUrl, resolveVisualMode } from './gltf'

// Provide minimal ProgressEvent for Node environment testing if needed
if (typeof globalThis.ProgressEvent === 'undefined') {
  class NodeProgressEvent extends Event {
    lengthComputable: boolean
    loaded: number
    total: number
    constructor(type: string, init?: { lengthComputable?: boolean; loaded?: number; total?: number }) {
      super(type)
      this.lengthComputable = init?.lengthComputable ?? false
      this.loaded = init?.loaded ?? 0
      this.total = init?.total ?? 0
    }
  }
  ;(globalThis as any).ProgressEvent = NodeProgressEvent
}

describe('glTF option and procedural fallback', () => {
  const dummyComponent: Component = {
    id: 'test-part',
    name: 'Test Part',
    kind: 'structure',
    system: 'structure',
    difficulty: 'easy',
    requires: [],
    connectsTo: [],
    layer: 0,
    shapes: [
      {
        type: 'box',
        size: [10, 10, 10],
        pos: [0, 0, 0],
        color: '#ff0000',
      },
    ],
    info: { what: 'Test', does: 'Test', ifFails: 'Test' },
    onMissing: { outcome: 'degraded', symptom: 'Missing test part' },
    verified: true,
  }

  describe('resolveVisualMode fallback resolution', () => {
    it('falls back to procedural shapes when gltf is undefined', () => {
      const mode = resolveVisualMode(dummyComponent, false, false)
      expect(mode).toBe('procedural')
    })

    it('falls back to procedural shapes when loading has not yet settled (modelReady=false)', () => {
      const withGltf: Component = { ...dummyComponent, gltf: 'models/test-cube.gltf' }
      const mode = resolveVisualMode(withGltf, false, false)
      expect(mode).toBe('procedural')
    })

    it('falls back to procedural shapes when gltf load fails (loadFailed=true)', () => {
      const withGltf: Component = { ...dummyComponent, gltf: 'models/non-existent.gltf' }
      const mode = resolveVisualMode(withGltf, false, true)
      expect(mode).toBe('procedural')
    })

    it('falls back to procedural shapes even if model was ready but loadFailed is true', () => {
      const withGltf: Component = { ...dummyComponent, gltf: 'models/corrupt.gltf' }
      const mode = resolveVisualMode(withGltf, true, true)
      expect(mode).toBe('procedural')
    })

    it('selects gltf mode only when gltf is set, model is ready, and loadFailed is false', () => {
      const withGltf: Component = { ...dummyComponent, gltf: 'models/test-cube.gltf' }
      const mode = resolveVisualMode(withGltf, true, false)
      expect(mode).toBe('gltf')
    })
  })

  describe('resolveGltfUrl', () => {
    it('preserves data: URLs without prefixing base URL', () => {
      const dataUri = 'data:application/octet-stream;base64,AAAA'
      expect(resolveGltfUrl(dataUri, 'https://cdn.example.com/')).toBe(dataUri)
    })

    it('preserves external http(s) URLs without prefixing base URL', () => {
      const httpUrl = 'https://example.com/models/part.gltf'
      expect(resolveGltfUrl(httpUrl, './')).toBe(httpUrl)
    })

    it('prepends base URL to relative asset paths', () => {
      expect(resolveGltfUrl('models/test-cube.gltf', './')).toBe('./models/test-cube.gltf')
      expect(resolveGltfUrl('/models/test-cube.gltf', 'https://example.com/sub/')).toBe('https://example.com/sub/models/test-cube.gltf')
      expect(resolveGltfUrl('models/test-cube.gltf', '')).toBe('models/test-cube.gltf')
    })
  })

  describe('handcrafted test model (public/models/test-cube.gltf)', () => {
    const modelPath = join(__dirname, '../../public/models/test-cube.gltf')

    it('exists and is valid glTF 2.0 JSON', () => {
      const raw = readFileSync(modelPath, 'utf8')
      const json = JSON.parse(raw)
      expect(json.asset).toBeDefined()
      expect(json.asset.version).toBe('2.0')
      expect(json.meshes?.length).toBeGreaterThan(0)
    })

    it('is parsed successfully by Three.js GLTFLoader into mesh geometry', async () => {
      const raw = readFileSync(modelPath, 'utf8')
      const loader = new GLTFLoader()

      const gltf = await new Promise<any>((resolve, reject) => {
        loader.parse(raw, '', resolve, reject)
      })

      expect(gltf).toBeDefined()
      expect(gltf.scene).toBeDefined()
      const mesh = gltf.scene.children[0]
      expect(mesh).toBeDefined()
      expect(mesh.name).toBe('TechLabCalibrationCube')
      expect(mesh.geometry).toBeDefined()
      expect(mesh.geometry.attributes.position.count).toBe(8)
      expect(mesh.geometry.index.count).toBe(36)
    })
  })
})
