import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('App accessibility landmarks and aria-live announcements', () => {
  const appPath = join(__dirname, 'App.tsx')
  const appSource = readFileSync(appPath, 'utf8')

  it('declares aria-live="polite" and role="status" on UnlockToast for screen reader announcements', () => {
    expect(appSource).toContain('className="unlock"')
    expect(appSource).toContain('role="status"')
    expect(appSource).toContain('aria-live="polite"')
  })

  it('declares accessible aria-pressed and aria-label on SoundToggle button', () => {
    expect(appSource).toContain('aria-pressed={enabled}')
    expect(appSource).toContain("aria-label={enabled ? 'Mute sound effects' : 'Enable sound effects (opt-in)'}")
  })

  it('declares aria-label on logo link and aria-current on active nav link', () => {
    expect(appSource).toContain('aria-label="TechLab home"')
    expect(appSource).toContain("aria-current={path === href.slice(1) ? 'page' : undefined}")
  })
})
