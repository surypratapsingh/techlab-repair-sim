import { Component, type ReactNode, useEffect } from 'react'
import { loadDevice } from '../../data'
import LabScene from '../../scene/LabScene'
import { type Mode, useLab } from '../../store/lab'
import { useLoad } from '../pages'
import { CasePanel, CaseResult } from './CasePanel'
import { CourseGuide } from './CourseGuide'
import { Bench, Log, Toolbar } from './Controls'
import { InfoPanel } from './InfoPanel'
import { PartsPanel } from './PartsPanel'
import { RunOverlay } from './RunOverlay'

const MODES: [Mode, string][] = [
  ['explore', 'Explore'],
  ['sandbox', 'Sandbox'],
]

// ─── WebGL error boundary ─────────────────────────────────────────────────────

/** Returns false if WebGL is completely unavailable (old GPU, browser flag, etc.). */
function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

interface BoundaryState { error: boolean }

/** Catches render errors from LabScene / the R3F Canvas and shows a fallback. */
class SceneBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: false }
  static getDerivedStateFromError(): BoundaryState { return { error: true } }
  render() {
    if (this.state.error) return <SceneFallback reason="The 3D view encountered an error." />
    return this.props.children
  }
}

function SceneFallback({ reason }: { reason: string }) {
  return (
    <div className="scene-fallback" role="status" aria-live="polite">
      <p>⚠ {reason}</p>
      <p className="muted">All actions are still available in the panels on the left and right.</p>
    </div>
  )
}

/** Wraps LabScene: checks WebGL first, then catches runtime errors. */
function SafeScene({ device }: { device: import('../../engine/types').Device }) {
  if (!hasWebGL()) return <SceneFallback reason="WebGL is not available in this browser." />
  return (
    <SceneBoundary>
      <LabScene device={device} />
    </SceneBoundary>
  )
}

// ─── Lab page ─────────────────────────────────────────────────────────────────

export default function LabPage({ deviceId, mode, caseId }: { deviceId: string; mode: Mode; caseId: string | null }) {
  const { data: device, error } = useLoad(() => loadDevice(deviceId), [deviceId])
  const ready = useLab((s) => s.device === device && !!device)
  const courseId = typeof location !== 'undefined'
    ? new URLSearchParams(location.hash.split('?')[1] ?? '').get('course')
    : null
  useEffect(() => {
    if (!device) return
    if (mode === 'repair' && !device.cases.some((k) => k.id === caseId)) return
    useLab.getState().open(device, mode, caseId)
  }, [device, mode, caseId])

  if (error) return <p className="error">{error}</p>
  if (!device) return <p className="loading">Loading device…</p>
  if (mode === 'repair' && !device.cases.some((k) => k.id === caseId)) return <p className="error">Unknown repair case.</p>
  if (!ready) return null

  return (
    <main className="lab">
      <div className="lab-head">
        <h2>{device.name}</h2>
        {mode === 'repair' ? (
          <span className="tag">Repair mode</span>
        ) : (
          <div className="seg" role="tablist" aria-label="Mode">
            {MODES.map(([m, label]) => (
              <a key={m} role="tab" aria-selected={m === mode} href={`#/lab/${device.id}/${m}`}>
                {label}
              </a>
            ))}
          </div>
        )}
        {device.verification.status === 'draft' && (
          <span className="tag warn" title={device.verification.notes}>
            Draft data
          </span>
        )}
      </div>
      <aside className="left">
        {mode === 'repair' && <CasePanel />}
        {mode === 'explore' && courseId && <CourseGuide courseId={courseId} />}
        <PartsPanel />
      </aside>
      <section className="stage" aria-label="3D device view. Use the parts list for keyboard access.">
        <SafeScene device={device} />
        <Toolbar />
        <RunOverlay />
        <Log />
      </section>
      <aside className="right">
        <InfoPanel />
        <Bench />
      </aside>
      <CaseResult />
    </main>
  )
}

