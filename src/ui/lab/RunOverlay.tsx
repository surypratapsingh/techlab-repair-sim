// "Run device" readout: staged status messages, live temperature, and the final diagnosis.
import { useEffect, useState } from 'react'
import { AMBIENT_C } from '../../engine/engine'
import type { Outcome } from '../../engine/types'
import { RUN_MS, useLab } from '../../store/lab'

/** [progress 0..1 at which the line appears, text, tone] */
const SCRIPT: Record<Outcome, [number, string, string][]> = {
  boots: [[0.15, 'Booting…', 'info'], [0.6, 'Device boots. All systems normal.', 'good']],
  degraded: [[0.15, 'Booting…', 'info'], [0.6, 'Device boots, but something is wrong.', 'warn']],
  'thermal-shutdown': [[0.15, 'Booting…', 'info'], [0.35, 'Temperature increasing…', 'warn'], [0.6, 'CRITICAL TEMPERATURE', 'bad'], [0.85, 'Thermal shutdown.', 'bad']],
  'no-boot': [[0.15, 'Power detected… no boot.', 'bad']],
  'no-power': [[0.3, 'Nothing happens. No power.', 'bad']],
  'short-circuit': [[0.25, 'Short circuit!', 'bad'], [0.45, 'Smoke detected. Component failure.', 'bad']],
}

export function RunOverlay() {
  const run = useLab((s) => s.run)
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    if (!run) return
    let raf = 0
    const loop = () => {
      setNow(performance.now())
      if (performance.now() - run.t0 < RUN_MS) raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [run])
  if (!run) return null

  const t = Math.min(1, (now - run.t0) / RUN_MS)
  const { result } = run
  const rise = Math.min(1, Math.max(0, (t - 0.15) / 0.6))
  const temp = Math.round(AMBIENT_C + (result.tempC - AMBIENT_C) * rise)
  const lines = [[0, 'Powering on…', 'info'] as const, ...SCRIPT[result.outcome]].filter(([at]) => t >= at)
  const hot = temp >= 45

  return (
    <div className="run" role="status" aria-live="assertive">
      <div className="run-head">
        <b>Device test</b>
        <span className={`temp ${hot ? 'hot' : ''}`}>{temp} °C</span>
        <button className="link" aria-label="Close test results" onClick={() => useLab.setState({ run: null })}>
          ✕
        </button>
      </div>
      <ul>
        {lines.map(([, text, tone]) => (
          <li key={text} className={tone}>
            {text}
          </li>
        ))}
      </ul>
      {t >= 1 && (
        <>
          {result.symptoms.length > 0 && (
            <ul className="symptoms">
              {result.symptoms.map((s, i) => (
                <li key={i}>{s.text}</li>
              ))}
            </ul>
          )}
          <p className="muted small">Simulated outcome for learning. Real devices can fail differently.</p>
        </>
      )}
    </div>
  )
}
