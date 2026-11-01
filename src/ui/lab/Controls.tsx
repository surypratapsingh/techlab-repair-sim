import { playSound } from '../../audio/sound'
import { getPart, isCompatible, slotsFor } from '../../engine/engine'
import { useLab } from '../../store/lab'

export function Toolbar() {
  const exploded = useLab((s) => s.exploded)
  const done = useLab((s) => !!s.repair?.done)
  const { toggleExplode, cameraCmd, runDevice, reset } = useLab.getState()
  return (
    <div className="toolbar" role="toolbar" aria-label="Lab controls">
      <button
        className="btn"
        aria-pressed={exploded}
        onClick={() => {
          playSound('click')
          toggleExplode()
        }}
      >
        {exploded ? 'Collapse' : 'Explode'}
      </button>
      <button
        className="btn"
        onClick={() => {
          playSound('click')
          cameraCmd('flip')
        }}
      >
        Flip
      </button>
      <button
        className="btn"
        onClick={() => {
          playSound('click')
          cameraCmd('reset')
        }}
      >
        Reset view
      </button>
      <button className="btn primary" disabled={done} onClick={runDevice}>
        Run device
      </button>
      <button
        className="btn"
        onClick={() => {
          playSound('click')
          if (confirm('Reset this device to its starting state?')) reset()
        }}
      >
        Reset device
      </button>
    </div>
  )
}

export function Bench() {
  const d = useLab((s) => s.device)!
  const state = useLab((s) => s.state)!
  const mode = useLab((s) => s.mode)
  const select = useLab((s) => s.select)
  return (
    <div className="panel">
      <h3>
        Workbench <small>{state.bench.length} parts</small>
      </h3>
      {!state.bench.length && <p className="muted">Removed parts land here.</p>}
      <ul className="chips">
        {state.bench.map((id) => {
          const p = getPart(d, id)!
          const slot = slotsFor(d, state, id)[0]
          const odd = mode !== 'repair' && (!isCompatible(d, id) || p.damaged)
          return (
            <li key={id}>
              <button
                className={`chip ${odd ? 'odd' : ''}`}
                title={slot ? 'Select the empty slot this part fits' : 'No empty slot for this part'}
                disabled={!slot}
                onClick={() => slot && select(slot)}
              >
                {p.name}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Log() {
  const log = useLab((s) => s.log)
  return (
    <ol className="log" aria-live="polite">
      {log.slice(-4).map((e) => (
        <li key={e.id} className={e.tone}>
          {e.text}
        </li>
      ))}
    </ol>
  )
}
