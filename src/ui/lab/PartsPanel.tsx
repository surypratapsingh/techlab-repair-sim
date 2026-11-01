// Component list: the keyboard-accessible way to select parts, plus slot status at a glance.
import { isCompatible, isDamaged, powerSource } from '../../engine/engine'
import { useLab } from '../../store/lab'
import { useProgress } from '../../store/progress'

export function PartsPanel() {
  const d = useLab((s) => s.device)!
  const state = useLab((s) => s.state)!
  const mode = useLab((s) => s.mode)
  const selected = useLab((s) => s.selected)
  const select = useLab((s) => s.select)
  const power = useLab((s) => s.power)
  const setup = useLab((s) => d.cases.find((k) => k.id === s.caseId)?.setup) ?? {}
  const found = useProgress((s) => s.discovered[d.id]) ?? []
  const battery = powerSource(d)
  const outerFirst = [...d.components].sort((a, b) => b.layer - a.layer)

  return (
    <div className="panel">
      <div className="power">
        <span className={`dot ${state.powerConnected ? 'on' : ''}`} aria-hidden="true" />
        <span aria-live="polite">Battery {state.powerConnected ? 'connected' : 'disconnected'}</span>
        {state.slots[battery.id] && (
          <button className="btn sm" onClick={() => power(!state.powerConnected)}>
            {state.powerConnected ? 'Disconnect' : 'Connect'}
          </button>
        )}
      </div>
      <h3>
        Components <small>{found.length}/{d.components.length} discovered</small>
      </h3>
      <ul className="parts" aria-label="Component list">
        {outerFirst.map((c) => {
          const p = state.slots[c.id]
          // In Repair mode, damage is something you find by inspecting, not something the list gives away,
          // so compare against the part the case started with rather than the factory part.
          const start = setup[c.id] ?? c.id
          const status = !p ? 'empty' : mode !== 'repair' && isDamaged(d, state, p) ? 'bad' : !isCompatible(d, p) ? 'foreign' : p !== start ? 'swapped' : 'ok'
          const known = found.includes(c.id)
          return (
            <li key={c.id}>
              <button aria-pressed={selected === c.id} onClick={() => select(c.id)} className={`part ${status}`}>
                <span className="dot" aria-hidden="true" />
                <span>{known ? c.name : 'Unknown part'}</span>
                <small>{status === 'ok' ? '' : status}</small>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
