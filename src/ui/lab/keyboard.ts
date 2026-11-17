// Keyboard shortcuts for full keyboard-driven lab and repair navigation.
import { getComponent, getPart, powerSource } from '../../engine/engine'
import { useLab } from '../../store/lab'

export interface KeyContext {
  key: string
  preventDefault?: () => void
  target?: EventTarget | null
}

export function handleLabKeyDown(e: KeyContext): boolean {
  const target = e.target as HTMLElement | null
  if (
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  ) {
    return false
  }

  const { device, state, mode, selected, select, remove, install, power, flag, runDevice } = useLab.getState()
  if (!device || !state) return false

  const outerFirst = [...device.components].sort((a, b) => b.layer - a.layer)

  if (e.key === '[' || e.key === ']') {
    e.preventDefault?.()
    const idx = selected ? outerFirst.findIndex((c) => c.id === selected) : -1
    let nextIdx = 0
    if (e.key === '[') {
      nextIdx = idx <= 0 ? outerFirst.length - 1 : idx - 1
    } else {
      nextIdx = idx < 0 || idx >= outerFirst.length - 1 ? 0 : idx + 1
    }
    select(outerFirst[nextIdx].id)
    return true
  }

  if (e.key === 'r' || e.key === 'R') {
    if (selected && state.slots[selected]) {
      e.preventDefault?.()
      remove(selected)
      return true
    }
    return false
  }

  if (e.key === 'b' || e.key === 'B') {
    const battery = powerSource(device)
    if (state.slots[battery.id]) {
      e.preventDefault?.()
      power(!state.powerConnected)
      return true
    }
    return false
  }

  if (e.key === 'm' || e.key === 'M') {
    if (mode === 'repair' && selected && state.slots[selected]) {
      e.preventDefault?.()
      flag(selected)
      return true
    }
    return false
  }

  if (e.key === 'i' || e.key === 'I') {
    if (selected && !state.slots[selected]) {
      const comp = getComponent(device, selected)
      if (comp) {
        const fit = state.bench.find((p) => getPart(device, p)?.kind === comp.kind)
        if (fit) {
          e.preventDefault?.()
          install(fit, selected)
          return true
        }
      }
    }
    return false
  }

  if (e.key === 't' || e.key === 'T') {
    e.preventDefault?.()
    runDevice()
    return true
  }

  if (e.key === 'Escape') {
    if (selected) {
      e.preventDefault?.()
      select(null)
      return true
    }
    return false
  }

  return false
}
