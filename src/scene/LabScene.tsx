// 3D view of the lab. Renders whatever the engine state says; never changes state except selection.
// Geometry comes from each component's `shapes` (procedural, mm units). A glTF model can replace it later.
import { CameraControls, Sparkles, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { AMBIENT_C, getPart } from '../engine/engine'
import type { Component, Device, Shape, Vec3 } from '../engine/types'
import { RUN_MS, useLab } from '../store/lab'

const MM = 0.05 // scene units per millimetre
const EXPLODE_MM = 9
const EXIT_MM = 70

/** True when the user has requested reduced motion in their OS settings. */
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 0..1 progress of the current "Run device" animation, or null. */
function runProgress() {
  const run = useLab.getState().run
  return run ? Math.min(1, (performance.now() - run.t0) / RUN_MS) : null
}

/** Heat glow 0..1 from the animated temperature. */
function heatNow() {
  const run = useLab.getState().run
  const t = runProgress()
  if (!run || t === null) return 0
  const temp = AMBIENT_C + (run.result.tempC - AMBIENT_C) * Math.min(1, Math.max(0, (t - 0.15) / 0.6))
  return Math.min(1, Math.max(0, (temp - 40) / 25))
}

function screenGlow() {
  const run = useLab.getState().run
  const t = runProgress()
  if (!run || t === null || !run.result.screenOn || t < 0.15) return 0
  if (run.result.outcome === 'thermal-shutdown' && t > 0.85) return 0
  return Math.min(1, (t - 0.15) * 4)
}

function TexturedMaterial({ url, color, rough, metal, opac }: { url: string; color: string; rough: number; metal: number; opac: number }) {
  const map = useTexture(import.meta.env.BASE_URL + url)
  return <meshStandardMaterial map={map} color={color} roughness={rough} metalness={metal} opacity={opac} transparent={opac < 1} />
}

export function ShapeMesh({ s, color, screen }: { s: Shape; color: string; screen?: boolean }) {
  const metal = s.metalness ?? 0.25
  const rough = s.roughness ?? 0.55
  const opac = s.opacity ?? 1.0
  return (
    <group position={s.pos} rotation={s.rot ?? [0, 0, 0]}>
      {/* Cylinder axis defaults to +z (lenses face out of the back); three's cylinder axis is y. */}
      <mesh rotation={s.type === 'cylinder' ? [Math.PI / 2, 0, 0] : [0, 0, 0]} userData={{ screen, opacity: opac }}>
        {s.type === 'box' ? <boxGeometry args={s.size} /> : <cylinderGeometry args={[s.size[0], s.size[0], s.size[1], 32]} />}
        {s.textureUrl ? (
          <TexturedMaterial url={s.textureUrl} color={color} rough={rough} metal={metal} opac={opac} />
        ) : (
          <meshStandardMaterial color={color} roughness={rough} metalness={metal} opacity={opac} transparent={opac < 1} />
        )}
      </mesh>
    </group>
  )
}

function Slot({ d, c }: { d: Device; c: Component }) {
  const group = useRef<THREE.Group>(null!)
  const partId = useLab((s) => s.state?.slots[c.id] ?? null)
  const scorched = useLab((s) => !!partId && !!s.state?.damaged.includes(partId))
  const selected = useLab((s) => s.selected === c.id)
  const exploded = useLab((s) => s.exploded)
  const select = useLab((s) => s.select)
  const [hover, setHover] = useState(false)
  const part = partId ? getPart(d, partId) : null
  const tint = scorched ? '#3b2a22' : part?.color

  const [home, away] = useMemo(() => {
    const h = new THREE.Vector3(0, 0, exploded ? c.layer * EXPLODE_MM : 0)
    const e = c.exit ?? [0, 0, 1]
    return [h, h.clone().add(new THREE.Vector3(...e).multiplyScalar(EXIT_MM))]
  }, [exploded, c])
  const first = useRef(true)
  const glow = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const g = group.current
    const ghost = !partId && selected // show where an empty slot is
    const target = partId || ghost ? home : away
    if (first.current) g.position.copy(target)
    first.current = false
    const lerpFactor = reducedMotion() ? 1 : 1 - Math.exp(-7 * dt)
    g.position.lerp(target, lerpFactor)
    const fade = partId ? 1 : ghost ? 0.2 : Math.max(0, 1 - g.position.distanceTo(home) / EXIT_MM) ** 2
    g.visible = fade > 0.01
    const heat = heatNow()
    g.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      const m = o.material as THREE.MeshStandardMaterial
      // Fade multiplies the shape's own opacity (glass stays see-through); opaque parts become transparent only while fading.
      const opacity = fade * (o.userData.opacity ?? 1)
      if (m.transparent !== opacity < 1) (m.transparent = opacity < 1), (m.needsUpdate = true)
      m.opacity = opacity
      m.wireframe = ghost
      m.depthWrite = fade > 0.9
      if (o.userData.screen && screenGlow() > 0) {
        m.emissive.set('#3d7bff')
        m.emissiveIntensity = screenGlow() * 1.4
      } else if (selected || hover) {
        m.emissive.set(selected ? '#2fb4ff' : '#ffffff')
        m.emissiveIntensity = selected ? 0.3 : 0.12
      } else {
        m.emissive.copy(glow.setRGB(1, 0.18, 0.05))
        m.emissiveIntensity = heat * 0.9
      }
    })
  })

  return (
    <group
      ref={group}
      onClick={(e) => {
        if (!partId) return // let the click fall through to whatever is behind
        e.stopPropagation()
        select(c.id)
      }}
      onPointerOver={(e) => {
        if (!partId) return
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      {c.shapes.map((s, i) => (
        <ShapeMesh key={i} s={s} color={i === 0 && tint ? tint : s.color} screen={s.screen} />
      ))}
    </group>
  )
}

/** World position (scene units, before the rig's scale) of a slot's first shape. */
function slotPos(d: Device, slot: string | null | undefined, exploded: boolean): Vec3 {
  const c = d.components.find((x) => x.id === slot)
  if (!c) return [0, 0, 0]
  const [x, y, z] = c.shapes[0].pos
  return [x, y, z + (exploded ? c.layer * EXPLODE_MM : 0) + 6]
}

function Smoke({ at }: { at: Vec3 }) {
  const puffs = useRef<THREE.Group>(null!)
  const seeds = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ dx: Math.sin(i * 2.4) * 8, dy: Math.cos(i * 1.7) * 8, phase: i / 12 })), [])
  useFrame(() => {
    const t = performance.now() / 1000
    puffs.current.children.forEach((m, i) => {
      const s = seeds[i]
      const k = (t * 0.35 + s.phase) % 1
      m.position.set(at[0] + s.dx * (1 + k), at[1] + s.dy, at[2] + k * 60)
      m.scale.setScalar(4 + k * 14)
      ;((m as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.35 * (1 - k)
    })
  })
  return (
    <group ref={puffs}>
      {seeds.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial color="#6b6f75" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Effects({ d }: { d: Device }) {
  const run = useLab((s) => s.run)
  const spark = useLab((s) => s.spark)
  const exploded = useLab((s) => s.exploded)
  const [, tick] = useState(0)
  // Re-render a few times per second while an effect is time-gated.
  useEffect(() => {
    if (!run && !spark) return
    const id = setInterval(() => tick((n) => n + 1), 150)
    return () => clearInterval(id)
  }, [run, spark])

  const t = runProgress()
  const short = run?.result.outcome === 'short-circuit'
  const culprit = run?.result.symptoms.find((s) => s.slot)?.slot
  const sparkOn = spark && performance.now() - spark.t0 < 1400
  const noMotion = reducedMotion()
  return (
    <>
      {!noMotion && short && t !== null && t > 0.25 && t < 0.7 && (
        <Sparkles position={slotPos(d, culprit, exploded)} count={60} scale={30} size={14} speed={3} color="#ffb340" />
      )}
      {!noMotion && short && t !== null && t > 0.4 && <Smoke at={slotPos(d, culprit, exploded)} />}
      {!noMotion && sparkOn && <Sparkles position={slotPos(d, spark.slot, exploded)} count={40} scale={18} size={12} speed={4} color="#9fd8ff" />}
    </>
  )
}

/** Shakes the device while it overheats or shorts. Skipped when prefers-reduced-motion is set. */
function Rig({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null!)
  useFrame(() => {
    const run = useLab.getState().run
    const t = runProgress()
    const bad = run && (run.result.outcome === 'short-circuit' || run.result.outcome === 'thermal-shutdown')
    const amp = !reducedMotion() && bad && t !== null && t > 0.35 && t < 0.85 ? 0.04 : 0
    g.current.position.set((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp, 0)
  })
  return (
    <group ref={g} scale={MM}>
      {children}
    </group>
  )
}

const VIEWS: Record<string, [number, number, number, number, number, number]> = {
  reset: [3, -2, 17, 0, 0, 0],
  front: [0, 0, -17, 0, 0, 0],
  angle: [15, 3, 7, 0, 0, 2],
}

function CameraRig() {
  const ref = useRef<CameraControls>(null)
  const cam = useLab((s) => s.camera)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const animate = !reducedMotion()
    if (cam.cmd === 'flip') c.rotate(Math.PI, 0, animate)
    else c.setLookAt(...VIEWS[cam.cmd], animate)
  }, [cam])
  return <CameraControls ref={ref} makeDefault minDistance={4} maxDistance={32} />
}

/** Lab lighting. Shared with the match render page so renders look like the lab. */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 10]} intensity={1.8} />
      <directionalLight position={[-5, -3, -10]} intensity={0.9} />
      <hemisphereLight args={['#bcd7ff', '#1a1208', 0.4]} />
    </>
  )
}

export default function LabScene({ device }: { device: Device }) {
  const select = useLab((s) => s.select)
  return (
    <Canvas camera={{ position: VIEWS.reset.slice(0, 3) as Vec3, fov: 40 }} dpr={[1, 2]} gl={{ alpha: true }} onPointerMissed={() => select(null)}>
      <Lights />
      <Rig>
        {device.components.map((c) => (
          <Slot key={c.id} d={device} c={c} />
        ))}
        <Effects d={device} />
      </Rig>
      <CameraRig />
    </Canvas>
  )
}
