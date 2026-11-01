import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { isSoundEnabled, playSound, subscribeSound, toggleSound } from '../audio/sound'
import { ACHIEVEMENTS, levelFor } from '../game/game'
import type { Mode } from '../store/lab'
import { useProgress } from '../store/progress'
import { Cases, Landing, Library, ProgressPage } from './pages'

const LabPage = lazy(() => import('./lab/LabPage'))
const RenderView = import.meta.env.DEV ? lazy(() => import('../match/RenderView')) : null

const subscribe = (cb: () => void) => (window.addEventListener('hashchange', cb), () => window.removeEventListener('hashchange', cb))
const useHash = () => useSyncExternalStore(subscribe, () => location.hash)

export const go = (path: string) => (location.hash = path)

export function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled)
  useEffect(() => subscribeSound(setEnabled), [])
  return (
    <button
      type="button"
      className="sound-btn"
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute sound effects' : 'Enable sound effects (opt-in)'}
      title={enabled ? 'Sound effects: On (click to mute)' : 'Sound effects: Off (click to enable)'}
      onClick={toggleSound}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  )
}

function TopBar({ path }: { path: string }) {
  const xp = useProgress((s) => s.xp)
  const level = levelFor(xp)
  const nav: [string, string][] = [
    ['#/devices', 'Explore'],
    ['#/repair', 'Repair'],
    ['#/devices?sandbox', 'Sandbox'],
    ['#/progress', 'Progress'],
  ]
  return (
    <header className="topbar">
      <a href="#/" className="logo" aria-label="TechLab home">
        TECH<span>LAB</span>
      </a>
      <nav>
        {nav.map(([href, label]) => (
          <a key={href} href={href} aria-current={path === href.slice(1) ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <SoundToggle />
      <a href="#/progress" className="level" title={`${xp} XP`}>
        Lv {level} <small>{xp} XP</small>
      </a>
    </header>
  )
}

function UnlockToast() {
  const id = useProgress((s) => s.lastUnlock)
  useEffect(() => {
    if (!id) return
    playSound('achievement')
    const t = setTimeout(() => useProgress.setState({ lastUnlock: null }), 3500)
    return () => clearTimeout(t)
  }, [id])
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  return a ? (
    <div className="unlock" role="status">
      Achievement unlocked: <b>{a.title}</b>
    </div>
  ) : null
}

export default function App() {
  const path = useHash().slice(1) || '/'
  const [, route, ...rest] = path.split('?')[0].split('/')
  let page
  if (route === 'lab' && rest[0] && ['explore', 'sandbox', 'repair'].includes(rest[1]))
    page = <LabPage key={path} deviceId={rest[0]} mode={rest[1] as Mode} caseId={rest[2] ?? null} />
  else if (RenderView && route === 'render' && rest[0]) page = <RenderView deviceId={rest[0]} />
  else if (route === 'devices') page = <Library mode={path.includes('?sandbox') ? 'sandbox' : 'explore'} />
  else if (route === 'repair') page = <Cases />
  else if (route === 'progress') page = <ProgressPage />
  else page = <Landing />
  return (
    <>
      <TopBar path={path} />
      <Suspense fallback={<p className="loading">Loading lab…</p>}>{page}</Suspense>
      <UnlockToast />
    </>
  )
}
