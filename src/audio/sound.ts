// Web Audio API procedural sound synthesizer.
// Pure synthesis: 0 assets, zero bandwidth, instant playback, opt-in by default.

const STORAGE_KEY = 'techlab-sound'

let audioCtx: AudioContext | null = null
const listeners = new Set<(enabled: boolean) => void>()

function getInitialSoundState(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

let soundEnabled = getInitialSoundState()

export function isSoundEnabled(): boolean {
  return soundEnabled
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
    // Ignore storage quota/security errors
  }
  listeners.forEach((fn) => fn(soundEnabled))
}

export function toggleSound(): boolean {
  setSoundEnabled(!soundEnabled)
  if (soundEnabled) {
    // Play a brief confirmation click when unmuting
    playSound('click')
  }
  return soundEnabled
}

export function subscribeSound(callback: (enabled: boolean) => void): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    audioCtx = new AudioCtx()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

export type SoundType =
  | 'click'
  | 'screw'
  | 'install'
  | 'remove'
  | 'boot'
  | 'short-circuit'
  | 'thermal-shutdown'
  | 'warning'
  | 'achievement'

export function playSound(type: SoundType): void {
  if (!soundEnabled) return

  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const t = ctx.currentTime
    switch (type) {
      case 'click': {
        // High-frequency subtle mechanical click
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(1400, t)
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.04)
        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.04)
        break
      }

      case 'screw': {
        // Metallic screwdriver ratchet click sequence
        for (let i = 0; i < 3; i++) {
          const ti = t + i * 0.035
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(2200 + i * 300, ti)
          osc.frequency.exponentialRampToValueAtTime(600, ti + 0.025)
          gain.gain.setValueAtTime(0.15, ti)
          gain.gain.exponentialRampToValueAtTime(0.001, ti + 0.025)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(ti)
          osc.stop(ti + 0.025)
        }
        break
      }

      case 'install': {
        // Firm tactile component snap
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(650, t)
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.08)
        gain.gain.setValueAtTime(0.28, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.08)
        break
      }

      case 'remove': {
        // Soft mechanical slide/lift
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(280, t)
        osc.frequency.exponentialRampToValueAtTime(540, t + 0.09)
        gain.gain.setValueAtTime(0.16, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.09)
        break
      }

      case 'boot': {
        // Pleasant ascending major chord chime: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
        const notes = [523.25, 659.25, 783.99, 1046.5]
        notes.forEach((freq, idx) => {
          const start = t + idx * 0.08
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(0.001, start)
          gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(start)
          osc.stop(start + 0.45)
        })
        break
      }

      case 'short-circuit': {
        // Electrical crackle and buzzing distortion
        const bufferSize = ctx.sampleRate * 0.22
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1))
        }
        const noise = ctx.createBufferSource()
        noise.buffer = buffer

        const filter = ctx.createBiquadFilter()
        filter.type = 'bandpass'
        filter.frequency.setValueAtTime(800, t)
        filter.Q.setValueAtTime(2.5, t)

        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(110, t)

        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.28, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22)

        noise.connect(filter)
        filter.connect(gain)
        osc.connect(gain)
        gain.connect(ctx.destination)

        noise.start(t)
        osc.start(t)
        noise.stop(t + 0.22)
        osc.stop(t + 0.22)
        break
      }

      case 'thermal-shutdown': {
        // Descending dual alarm tones
        const freqs = [880, 440]
        freqs.forEach((freq, idx) => {
          const start = t + idx * 0.14
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(0.16, start)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(start)
          osc.stop(start + 0.13)
        })
        break
      }

      case 'warning': {
        // Soft alert tone
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(440, t)
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.18)
        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.18)
        break
      }

      case 'achievement': {
        // Bright arpeggio fanfare
        const notes = [587.33, 739.99, 880.0, 1174.66] // D5, F#5, A5, D6
        notes.forEach((freq, idx) => {
          const start = t + idx * 0.07
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(freq, start)
          gain.gain.setValueAtTime(0.18, start)
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start(start)
          osc.stop(start + 0.35)
        })
        break
      }
    }
  } catch {
    // Fail silently if audio synthesis is blocked
  }
}
