// Simple content pages: landing, device library, repair cases, progress.
import { useEffect, useState } from 'react'
import { loadDevice, loadIndex } from '../data'
import type { Device, DeviceSummary } from '../engine/types'
import { ACHIEVEMENTS, levelFor, xpForLevel } from '../game/game'
import { useProgress } from '../store/progress'

export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string }>({})
  useEffect(() => {
    let live = true
    fn().then(
      (data) => live && setState({ data }),
      (e: Error) => live && setState({ error: e.message }),
    )
    return () => {
      live = false
    }
  }, deps)
  return state
}

const loadAvailable = async (): Promise<Device[]> =>
  Promise.all((await loadIndex()).filter((d) => d.available).map((d) => loadDevice(d.id)))

function Status({ error }: { error?: string }) {
  return <p className={error ? 'error' : 'loading'}>{error ?? 'Loading…'}</p>
}

export function Landing() {
  return (
    <main className="landing">
      <h1>
        TECH<span>LAB</span>
      </h1>
      <p className="tagline">Open. Explore. Repair. Experiment.</p>
      <p className="lede">Discover what's inside the devices you use every day. No account, no install: your progress stays in this browser.</p>
      <div className="cta">
        <a className="btn primary" href="#/devices">
          Explore devices
        </a>
        <a className="btn" href="#/repair">
          Start a repair
        </a>
        <a className="btn" href="#/devices?sandbox">
          Enter the sandbox
        </a>
      </div>
      <ul className="modes">
        <li>
          <b>Explore</b> Take a real phone apart layer by layer and learn what every part does.
        </li>
        <li>
          <b>Repair</b> Diagnose a broken device, fix it, test it, and get scored.
        </li>
        <li>
          <b>Sandbox</b> Pull the battery, swap in the wrong parts, run it anyway, and see what happens.
        </li>
      </ul>
    </main>
  )
}

const CATEGORY: Record<DeviceSummary['category'], string> = { phone: 'Phones', laptop: 'Laptops', audio: 'Audio', console: 'Consoles', tv: 'TVs' }

export function Library({ mode }: { mode: 'explore' | 'sandbox' }) {
  const { data, error } = useLoad(loadIndex, [])
  if (!data) return <Status error={error} />
  const groups = Object.entries(CATEGORY).map(([cat, label]) => [label, data.filter((d) => d.category === cat)] as const)
  return (
    <main className="page">
      <h2>{mode === 'sandbox' ? 'Sandbox: pick a device to experiment on' : 'Device library'}</h2>
      {groups.map(([label, list]) =>
        list.length ? (
          <section key={label}>
            <h3>{label}</h3>
            <div className="cards">
              {list.map((d) => (
                <article key={d.id} className={`card ${d.available ? '' : 'soon'}`}>
                  <small>{d.brand}</small>
                  <h4>{d.name}</h4>
                  <p>{d.summary}</p>
                  {d.available ? (
                    <div className="row">
                      <a className={`btn ${mode === 'explore' ? 'primary' : ''}`} href={`#/lab/${d.id}/explore`}>
                        Explore
                      </a>
                      <a className={`btn ${mode === 'sandbox' ? 'primary' : ''}`} href={`#/lab/${d.id}/sandbox`}>
                        Sandbox
                      </a>
                    </div>
                  ) : (
                    <span className="tag">Coming soon</span>
                  )}
                </article>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </main>
  )
}

export function Cases() {
  const { data, error } = useLoad(loadAvailable, [])
  const best = useProgress((s) => s.cases)
  if (!data) return <Status error={error} />
  return (
    <main className="page">
      <h2>Repair cases</h2>
      {(['beginner', 'intermediate', 'advanced'] as const).map((level) => {
        const list = data.flatMap((d) => d.cases.filter((k) => k.level === level).map((k) => ({ d, k })))
        return list.length ? (
          <section key={level}>
            <h3 className="cap">{level}</h3>
            <div className="cards">
              {list.map(({ d, k }) => (
                <article key={k.id} className="card">
                  <small>
                    Case {k.id} · {d.name}
                  </small>
                  <h4>{k.title}</h4>
                  <p>{k.brief}</p>
                  <div className="row">
                    <a className="btn primary" href={`#/lab/${d.id}/repair/${k.id}`}>
                      {best[k.id] !== undefined ? 'Replay' : 'Start'}
                    </a>
                    {best[k.id] !== undefined && <span className="tag good">Best {best[k.id]}/100</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null
      })}
    </main>
  )
}

export function ProgressPage() {
  const p = useProgress()
  const { data } = useLoad(loadAvailable, [])
  const level = levelFor(p.xp)
  const from = xpForLevel(level)
  const to = xpForLevel(level + 1)
  return (
    <main className="page">
      <h2>Your progress</h2>
      <p className="muted">Saved only in this browser. Clearing site data erases it.</p>
      <section className="stat">
        <b>Level {level}</b>
        <div className="bar" role="progressbar" aria-valuemin={from} aria-valuemax={to} aria-valuenow={p.xp}>
          <i style={{ width: `${((p.xp - from) / (to - from)) * 100}%` }} />
        </div>
        <small>
          {p.xp} XP · {to - p.xp} XP to level {level + 1}
        </small>
      </section>
      <h3>Achievements</h3>
      <div className="cards">
        {ACHIEVEMENTS.map((a) => (
          <article key={a.id} className={`card ach ${p.achievements.includes(a.id) ? 'got' : 'soon'}`}>
            <small>{p.achievements.includes(a.id) ? 'Unlocked' : 'Locked'}</small>
            <h4>{a.title}</h4>
            <p>{a.text}</p>
          </article>
        ))}
      </div>
      <h3>Devices</h3>
      <ul className="plain">
        {data?.map((d) => (
          <li key={d.id}>
            {d.name}: {p.discovered[d.id]?.length ?? 0}/{d.components.length} components discovered ·{' '}
            {d.cases.filter((k) => p.cases[k.id] !== undefined).length}/{d.cases.length} cases solved
          </li>
        ))}
      </ul>
      <button
        className="btn danger"
        onClick={() => confirm('Erase all TechLab progress in this browser? This cannot be undone.') && p.reset()}
      >
        Reset progress
      </button>
    </main>
  )
}
