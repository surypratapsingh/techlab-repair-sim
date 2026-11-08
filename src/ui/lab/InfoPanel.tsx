// Selected component: the three learning questions, specs, and the actions available right now.
import { blockers, canRemove, componentFasteners, getComponent, getPart, isCompatible, isDamaged } from '../../engine/engine'
import { powerWord } from '../../engine/power'
import { useLab } from '../../store/lab'

export function InfoPanel() {
  const d = useLab((s) => s.device)!
  const state = useLab((s) => s.state)!
  const mode = useLab((s) => s.mode)
  const id = useLab((s) => s.selected)
  const repair = useLab((s) => s.repair)
  const { select, remove, install, power, flag } = useLab.getState()
  const c = id ? getComponent(d, id) : undefined

  if (!c)
    return (
      <div className="panel hint">
        <h3>Inspect</h3>
        <p>Click a part on the device, or pick one from the list. Drag to rotate, scroll to zoom, right-drag to pan.</p>
        <p className="muted">Real repairs start by opening the back cover, then disconnecting the battery before touching anything else.</p>
      </div>
    )

  const strict = mode === 'explore'
  const partId = state.slots[c.id]
  const part = partId ? getPart(d, partId) : undefined
  const reason = partId ? canRemove(d, state, c.id, strict) : null
  const reachable = blockers(d, state, c.id).length === 0
  const fits = state.bench.filter((p) => getPart(d, p)?.kind === c.kind)
  const damaged = partId && isDamaged(d, state, partId)
  const fast = componentFasteners(c)

  return (
    <div className="panel info">
      <h3>{c.name}</h3>
      <div className="tags">
        <span className="tag">{c.system}</span>
        <span className="tag">Removal: {c.difficulty}</span>
        {fast.screws > 0 && <span className="tag">{fast.screws} screws</span>}
        <span className={`tag ${c.verified ? 'good' : 'warn'}`} title={c.note}>
          {c.verified ? 'Source-checked' : 'Needs verification'}
        </span>
      </div>

      <p className="status">
        {!part ? 'Slot is empty.' : partId === c.id ? 'Original part installed.' : `Installed: ${part.name}${isCompatible(d, partId!) ? '' : ' (not made for this device)'}.`}
      </p>
      {damaged &&
        (reachable ? (
          <p className="alert bad">Condition: {part?.condition ?? 'Damaged. Scorch marks around the connector.'}</p>
        ) : mode === 'repair' ? null : (
          <p className="alert bad">This part is damaged.</p>
        ))}
      {mode === 'repair' && partId && !reachable && <p className="muted">Remove what's on top of it to inspect it closely.</p>}

      <div className="actions">
        {part && (
          <button className="btn" disabled={!!reason} onClick={() => remove(c.id)}>
            Remove
          </button>
        )}
        {c.powerSource && part && (
          <button className="btn" onClick={() => power(!state.powerConnected)}>
            {state.powerConnected ? 'Disconnect' : 'Connect'} {powerWord(d).toLowerCase()}
          </button>
        )}
        {mode === 'repair' && part && !repair?.done && (
          <button className="btn" disabled={repair?.flagged.includes(c.id)} onClick={() => flag(c.id)}>
            {repair?.flagged.includes(c.id) ? 'Marked faulty' : 'Mark as faulty'}
          </button>
        )}
        {!part &&
          fits.map((p) => {
            const sp = getPart(d, p)!
            const odd = mode !== 'repair' && (!isCompatible(d, p) ? ' (incompatible)' : sp.damaged ? ' (damaged)' : '')
            return (
              <button key={p} className="btn" onClick={() => install(p, c.id)}>
                Install {sp.name}
                {odd}
              </button>
            )
          })}
      </div>
      {reason && <p className="muted reason">{reason}</p>}
      {!part && !fits.length && <p className="muted">No matching part on the workbench.</p>}

      <dl className="learn">
        <dt>What is it?</dt>
        <dd>{c.info.what}</dd>
        <dt>What does it do?</dt>
        <dd>{c.info.does}</dd>
        <dt>What happens if it fails?</dt>
        <dd>{c.info.ifFails}</dd>
      </dl>
      {c.info.advanced && (
        <details>
          <summary>Advanced</summary>
          <p>{c.info.advanced}</p>
        </details>
      )}
      {c.specs && (
        <table className="specs">
          <tbody>
            {Object.entries(c.specs).map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {c.fastening && (
        <p className="muted">
          <b>Held by:</b> {c.fastening}
        </p>
      )}
      {c.connectsTo.length > 0 && (
        <p className="links">
          Connected to:{' '}
          {c.connectsTo.map((x) => (
            <button key={x} className="link" onClick={() => select(x)}>
              {getComponent(d, x)?.name}
            </button>
          ))}
        </p>
      )}
      {c.note && <p className="muted small">Data note: {c.note}</p>}
    </div>
  )
}
