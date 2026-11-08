// glTF 2.0 loader and procedural fallback handler.
// When an optional glTF model is present on a Component, it attempts to load and render it.
// If glTF is omitted, fails network fetch, or fails to parse, it falls back to procedural shapes.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { Component } from '../engine/types'

export type RenderMode = 'gltf' | 'procedural'

/** Determines whether to render the glTF model or fall back to procedural shapes. */
export function resolveVisualMode(c: Pick<Component, 'gltf' | 'shapes'>, modelReady: boolean, loadFailed: boolean): RenderMode {
  if (!c.gltf || loadFailed || !modelReady) {
    return 'procedural'
  }
  return 'gltf'
}

/** Resolves URL for glTF asset, taking into account Vite base path and data URLs. */
export function resolveGltfUrl(pathOrUrl: string, baseUrl: string = ''): string {
  if (pathOrUrl.startsWith('data:') || pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl ? `${baseUrl}/` : ''
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl
  return `${cleanBase}${cleanPath}`
}

/** Loads and parses a glTF model using Three's GLTFLoader with error handling for fallback. */
export async function loadGltf(url: string, customLoader?: GLTFLoader): Promise<THREE.Group> {
  const loader = customLoader ?? new GLTFLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (error) => reject(error)
    )
  })
}
