import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import React from 'react'
import { errorMessage, Landing, loadState, ProgressPage } from './pages'
import { useProgress } from '../store/progress'

vi.mock('../store/progress', () => {
  let mockState: any = {
    xp: 0,
    discovered: {},
    cases: {},
    achievements: [],
    outcomes: {},
    lastUnlock: null,
    courses: {},
    daily: {},
    dailyStreak: 0,
    reset: vi.fn(),
  }
  const hook: any = (selector?: (s: any) => any) => (selector ? selector(mockState) : mockState)
  hook.getState = () => mockState
  hook.setState = (patch: any) => {
    mockState = { ...mockState, ...patch }
  }
  return { useProgress: hook }
})

describe('UI content pages (pages.tsx)', () => {
  beforeEach(() => {
    useProgress.setState({
      xp: 0,
      discovered: {},
      cases: {},
      achievements: [],
      outcomes: {},
      lastUnlock: null,
      courses: {},
      daily: {},
      dailyStreak: 0,
    })
  })

  describe('Landing page', () => {
    it('renders title, tagline, call-to-actions, and mode descriptions', () => {
      const html = renderToString(React.createElement(Landing))
      expect(html).toContain('TECH<span>LAB</span>')
      expect(html).toContain('Open. Explore. Repair. Experiment.')
      expect(html).toContain('href="#/devices"')
      expect(html).toContain('href="#/repair"')
      expect(html).toContain('href="#/devices?sandbox"')
      expect(html).toContain('Explore devices')
      expect(html).toContain('Start a repair')
      expect(html).toContain('Enter the sandbox')
      expect(html).toContain('Explore</b> Take a real phone apart')
      expect(html).toContain('Repair</b> Diagnose a broken device')
      expect(html).toContain('Sandbox</b> Pull the battery')
    })
  })

  describe('Progress page', () => {
    it('renders level progress bar with accessible role, values, and percentage', () => {
      useProgress.setState({ xp: 125 }) // Level 2 (from 50 to 200 XP): span 150, current 75/150 = 50%
      const html = renderToString(React.createElement(ProgressPage))

      expect(html).toContain('Level')
      expect(html).toMatch(/125(?:<!-- -->)?\s*XP/)
      expect(html).toMatch(/75(?:<!-- -->)?\s*XP to level/)
      expect(html).toContain('role="progressbar"')
      expect(html).toContain('aria-valuemin="50"')
      expect(html).toContain('aria-valuemax="200"')
      expect(html).toContain('aria-valuenow="125"')
      expect(html).toContain('aria-valuetext="Level 2, 75 of 150 XP to next level"')
      expect(html).toContain('style="width:50%"')
    })

    it('renders achievements list with Locked and Unlocked status', () => {
      useProgress.setState({ achievements: ['first-open', 'safety-first'] })
      const html = renderToString(React.createElement(ProgressPage))

      expect(html).toContain('Achievements')
      expect(html).toContain('Cracking It Open')
      expect(html).toContain('Safety First')
      expect(html).toContain('Unlocked')
      expect(html).toContain('Locked')
    })

    it('renders course completion progress in progress page', () => {
      useProgress.setState({ courses: { 'phone-battery-safety': 5 } })
      const html = renderToString(React.createElement(ProgressPage))

      expect(html).toContain('Courses')
      expect(html).toContain('Phone battery safety')
      expect(html).toContain('Completed (5/5 steps) ✓')
    })

    it('renders Reset progress button with confirmation warning and aria-label', () => {
      const html = renderToString(React.createElement(ProgressPage))
      expect(html).toContain('Reset progress')
      expect(html).toContain('aria-label="Reset all saved progress in this browser"')
      expect(html).toContain('btn danger')
    })
  })

  describe('load errors (useLoad uses loadState)', () => {
    it('errorMessage reads Error, message objects, strings and other values', () => {
      expect(errorMessage(new Error('Standard error'))).toBe('Standard error')
      expect(errorMessage('String error message')).toBe('String error message')
      expect(errorMessage({ message: 'Object error message' })).toBe('Object error message')
      expect(errorMessage(404)).toBe('404')
      expect(errorMessage(null)).toBe('null')
    })
    it('loadState stores data on success and the message on failure', async () => {
      expect(await loadState(() => Promise.resolve(42))).toEqual({ data: 42 })
      expect(await loadState(() => Promise.reject(new Error('boom')))).toEqual({ error: 'boom' })
      expect(await loadState(() => Promise.reject('plain'))).toEqual({ error: 'plain' })
      expect(await loadState(() => Promise.reject({ message: 'obj' }))).toEqual({ error: 'obj' })
    })
  })
})
