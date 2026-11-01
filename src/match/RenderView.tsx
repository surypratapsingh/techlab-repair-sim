// DEV-only render page for the Match Score loop (driven by tools/match.mjs). Route: #/render/<device>[?part=<id>&view=<view>]
// Draws the device, or one component, with the lab's own meshes and lights through an orthographic
// camera from a named view. Exposes window.techlabMatch so the CLI can render and judge against photos.
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import * as THREE from 'three'
import { loadDevice } from '../data'
import type { Device, Vec3 } from '../engine/types'
import { Lights, ShapeMesh } from '../scene/LabScene'
import { judge, type Img, type MatchReport } from './judge'

/** Camera direction (object -> camera) and up vector in device-local axes. Left/right = edges as seen with the screen facing you. */
export const VIEWS: Record<string, [Vec3, Vec3]> = {
  back: [[0, 0, 1], [0, 1, 0]],
  front: [[0, 0, -1], [0, 1, 0]],
  left: [[1, 0, 0], [0, 1, 0]],
  right: [[-1, 0, 0], [0, 1, 0]],
  top: [[0, 1, 0], [0, 0, 1]],
  bottom: [[0, -1, 0], [0, 0, 1]],
}
const SIZE = 768 // render size in pixels
const MAX_REF = 1024 // reference photos are downscaled to this longest side

export interface MatchRequest {
  device: Device
  /** Render only this component. */
  part?: string
  view?: string
  /** URL of the reference photo, e.g. /match/refs/<device>/device-back.jpg. Without it the result has no report. */
  ref?: string
  /** Also return the render (and overlay) as PNG data URLs. */
  images?: boolean
}
export interface MatchResult {
  report?: MatchReport
  render?: string
  overlay?: string
}
interface Job {
  req: MatchRequest
  done: (r: MatchResult) => void
  fail: (e: unknown) => void
}

declare global {
  interface Window {
    techlabMatch?: { ready: true; run: (req: MatchRequest) => Promise<MatchResult> }
  }
}

function canvas2d(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d', { willReadFrequently: true })!] as const
}

const refs = new Map<string, Promise<Img>>()
function loadRef(url: string): Promise<Img> {
  if (!refs.has(url))
    refs.set(
      url,
      (async () => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`reference ${url}: HTTP ${res.status}`)
        const bmp = await createImageBitmap(await res.blob()) // applies EXIF rotation
        const k = Math.min(1, MAX_REF / Math.max(bmp.width, bmp.height))
        const [c, ctx] = canvas2d(Math.round(bmp.width * k), Math.round(bmp.height * k))
        ctx.drawImage(bmp, 0, 0, c.width, c.height)
        return ctx.getImageData(0, 0, c.width, c.height)
      })(),
    )
  return refs.get(url)!
}

function toPng(img: Img) {
  const [c, ctx] = canvas2d(img.width, img.height)
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return c.toDataURL('image/png')
}

async function capture(gl: THREE.WebGLRenderer, scene: THREE.Scene, req: MatchRequest): Promise<MatchResult> {
  const view = VIEWS[req.view ?? 'back']
  if (!view) throw new Error(`unknown view "${req.view}", use one of ${Object.keys(VIEWS).join(', ')}`)
  const box = new THREE.Box3().setFromObject(scene)
  if (box.isEmpty()) throw new Error(`nothing to render${req.part ? ` (no component "${req.part}")` : ''}`)
  const centre = box.getCenter(new THREE.Vector3())
  const r = (box.getSize(new THREE.Vector3()).length() / 2) * 1.05
  const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, r * 4)
  cam.up.set(...view[1])
  cam.position.copy(centre).addScaledVector(new THREE.Vector3(...view[0]), r * 2)
  cam.lookAt(centre)
  cam.updateProjectionMatrix()
  gl.render(scene, cam)
  const [c, ctx] = canvas2d(gl.domElement.width, gl.domElement.height)
  ctx.drawImage(gl.domElement, 0, 0)
  const out: MatchResult = {}
  if (req.ref) {
    const { overlay, ...report } = judge(await loadRef(req.ref), ctx.getImageData(0, 0, c.width, c.height))
    out.report = report
    if (req.images) out.overlay = toPng(overlay)
  }
  if (req.images) out.render = c.toDataURL('image/png')
  return out
}

function Shot({ job }: { job: Job }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    capture(gl, scene, job.req).then(job.done, job.fail)
  }, [job, gl, scene])
  return null
}

function Model({ device, part }: { device: Device; part?: string }) {
  return device.components
    .filter((c) => !part || c.id === part)
    .flatMap((c) => c.shapes.map((s, i) => <ShapeMesh key={`${c.id}-${i}`} s={s} color={s.color} screen={s.screen} />))
}

export default function RenderView({ deviceId }: { deviceId: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ready) return
    window.techlabMatch = { ready: true, run: (req) => new Promise((done, fail) => setJob({ req, done, fail })) }
    // Show the published device straight away so a person can look at #/render/<device> too.
    const q = new URLSearchParams(location.hash.split('?')[1])
    loadDevice(deviceId).then((device) =>
      setJob((j) => j ?? { req: { device, part: q.get('part') ?? undefined, view: q.get('view') ?? 'back' }, done: () => {}, fail: console.error }),
    )
    return () => void delete window.techlabMatch
  }, [ready, deviceId])

  return (
    <main style={{ padding: 16 }}>
      <p className="muted">Match render (dev only): {deviceId}{job ? ` · ${job.req.part ?? 'device'} · ${job.req.view ?? 'back'}` : ''}</p>
      <div style={{ width: SIZE, height: SIZE, maxWidth: '100%', background: '#0000' }}>
        <Canvas frameloop="never" dpr={1} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }} onCreated={() => setReady(true)}>
          <Lights />
          {job && (
            <Suspense fallback={null}>
              <Model device={job.req.device} part={job.req.part} />
              <Shot job={job} />
            </Suspense>
          )}
        </Canvas>
      </div>
    </main>
  )
}
