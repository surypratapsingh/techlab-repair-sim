import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isSoundEnabled, playSound, setSoundEnabled, subscribeSound, toggleSound } from './sound'

const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v
  },
  removeItem: (k: string) => {
    delete store[k]
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k])
  },
})

describe('sound synthesizer', () => {
  beforeEach(() => {
    localStorage.clear()
    setSoundEnabled(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    // Re-stub localStorage for next tests
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
    })
  })

  it('defaults to muted (opt-in)', () => {
    expect(isSoundEnabled()).toBe(false)
  })

  it('toggles sound and updates subscribers', () => {
    let notified = false
    const unsub = subscribeSound((val) => {
      notified = val
    })

    const newState = toggleSound()
    expect(newState).toBe(true)
    expect(isSoundEnabled()).toBe(true)
    expect(notified).toBe(true)

    toggleSound()
    expect(isSoundEnabled()).toBe(false)
    expect(notified).toBe(false)

    unsub()
  })

  it('persists sound state in localStorage', () => {
    setSoundEnabled(true)
    expect(localStorage.getItem('techlab-sound')).toBe('true')

    setSoundEnabled(false)
    expect(localStorage.getItem('techlab-sound')).toBe('false')
  })

  it('handles playSound safely when muted', () => {
    setSoundEnabled(false)
    // Should not throw
    expect(() => {
      playSound('click')
      playSound('screw')
      playSound('boot')
    }).not.toThrow()
  })

  it('handles playSound safely when AudioContext is unavailable', () => {
    setSoundEnabled(true)
    vi.stubGlobal('window', {})

    expect(() => {
      playSound('click')
      playSound('boot')
    }).not.toThrow()
  })

  it('calls AudioContext nodes when sound is enabled', () => {
    setSoundEnabled(true)

    const mockStart = vi.fn()
    const mockStop = vi.fn()
    const mockConnect = vi.fn()
    const mockSetValue = vi.fn()
    const mockRamp = vi.fn()

    const mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: mockSetValue,
        exponentialRampToValueAtTime: mockRamp,
      },
      connect: mockConnect,
      start: mockStart,
      stop: mockStop,
    }

    const mockGain = {
      gain: {
        setValueAtTime: mockSetValue,
        exponentialRampToValueAtTime: mockRamp,
        linearRampToValueAtTime: mockRamp,
      },
      connect: mockConnect,
    }

    class MockAudioContext {
      currentTime = 10
      destination = {}
      state = 'running'
      sampleRate = 44100
      createOscillator() {
        return mockOscillator
      }
      createGain() {
        return mockGain
      }
      createBuffer() {
        return {
          getChannelData: () => new Float32Array(100),
        }
      }
      createBufferSource() {
        return {
          buffer: null,
          connect: mockConnect,
          start: mockStart,
          stop: mockStop,
        }
      }
      createBiquadFilter() {
        return {
          type: 'bandpass',
          frequency: { setValueAtTime: mockSetValue },
          Q: { setValueAtTime: mockSetValue },
          connect: mockConnect,
        }
      }
    }

    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
    })

    playSound('click')
    expect(mockStart).toHaveBeenCalled()
    expect(mockStop).toHaveBeenCalled()

    playSound('screw')
    playSound('install')
    playSound('remove')
    playSound('boot')
    playSound('short-circuit')
    playSound('thermal-shutdown')
    playSound('achievement')
  })
})
