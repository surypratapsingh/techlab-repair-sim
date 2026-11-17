// Cross-device parts: which loose parts fit which device. Pure, no React, no DOM.
import type { Device, Part } from './types'

/** A part fits a device when the device lists it as compatible AND has a slot of the part's kind. */
export function partFitsDevice(part: Part, target: Device): boolean {
  return part.compatible.includes(target.id) && target.components.some((c) => c.kind === part.kind)
}

/** Spares from other devices that fit `target`. Each entry names the device the part ships with. */
export function crossDeviceParts(devices: Device[], target: Device): Array<{ part: Part; from: string }> {
  return devices
    .filter((d) => d.id !== target.id)
    .flatMap((d) => d.spares.filter((p) => partFitsDevice(p, target)).map((part) => ({ part, from: d.id })))
}
