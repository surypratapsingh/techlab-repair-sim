// Repair mode: the customer's complaint, the clock, and the score card when the device boots clean.
import { useEffect, useRef, useState } from 'react'
import { getComponent } from '../../engine/engine'
import { useLab } from '../../store/lab'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function useCase() {
  const d = useLab((s) => s.device)!
  const caseId = useLab((s) => s.caseId)
  return { d, k: d.cases.find((c) => c.id === caseId) }
}

export function CasePanel() {
  const { d, k } = useCase()
  const repair = useLab((s) => s.repair)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (repair?.done) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [repair?.done])
  if (!k || !repair) return null
  const elapsed = Math.max(0, (now - repair.startedAt) / 1000)

  return (
    <div className="panel case">
      <small className="muted">
        Case {k.id} · <span className="cap">{k.level}</span>
      </small>
      <h3>{k.title}</h3>
      <p>{k.brief}</p>
      <h4>Reported symptoms</h4>
      <ul>
        {k.symptoms.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <h4>Objective</h4>
      <p className="muted">Find the faulty part, mark it, replace it, and run the device until it boots clean. Disconnect the battery before working inside.</p>
      <p className={`timer ${elapsed > k.targetSeconds ? 'over' : ''}`}>
        {mmss(elapsed)} <small>/ target {mmss(k.targetSeconds)}</small>
      </p>
      {repair.flagged.length > 0 && (
        <p className="muted">Marked faulty: {repair.flagged.map((f) => getComponent(d, f)?.name).join(', ')}</p>
      )}
    </div>
  )
}

export function CaseResult() {
  const { k } = useCase()
  const done = useLab((s) => s.repair?.done)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap: when the modal opens, move focus into it and keep Tab/Shift+Tab inside.
  useEffect(() => {
    if (!done || !dialogRef.current) return
    const el = dialogRef.current

    // Move focus to the first focusable element (the Replay button has autoFocus,
    // but we also handle cases where autoFocus is absent).
    const first = el.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        useLab.getState().reset()
        return
      }
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
      ).filter((n) => !n.hasAttribute('disabled'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [done])

  if (!k || !done) return null
  const rows: [string, number][] = [
    ['Diagnosis', done.diagnosis],
    ['Safe repair', done.repair],
    ['Correct parts', done.parts],
    ['Time', done.time],
  ]
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="case-done" ref={dialogRef}>
      <div className="panel">
        <h3 id="case-done">Repaired: {k.title}</h3>
        <p className="score">
          {done.total}
          <small>/100</small>
        </p>
        <table className="specs">
          <tbody>
            {rows.map(([label, n]) => (
              <tr key={label}>
                <th>{label}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="good">{done.xp ? `+${done.xp} XP` : 'No new XP. Beat your best score to earn more.'}</p>
        <h4>What was wrong</h4>
        <p>{k.explanation}</p>
        <div className="row">
          <button className="btn" onClick={() => useLab.getState().reset()} autoFocus>
            Replay
          </button>
          <a className="btn primary" href="#/repair">
            Back to cases
          </a>
        </div>
      </div>
    </div>
  )
}

