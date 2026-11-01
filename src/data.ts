// Content access. V1 "backend" = static JSON in public/data, served by any static host or CDN.
// To move content to a real API later, change CONTENT_BASE only.
import { validateDevice } from './engine/validate'
import type { Device, DeviceSummary } from './engine/types'

const CONTENT_BASE = `${import.meta.env.BASE_URL}data/devices/`
const cache = new Map<string, Promise<unknown>>()

function get<T>(file: string): Promise<T> {
  if (!cache.has(file))
    cache.set(
      file,
      fetch(CONTENT_BASE + file).then((r) => {
        if (!r.ok) throw new Error(`Could not load ${file} (${r.status})`)
        return r.json()
      }),
    )
  return cache.get(file) as Promise<T>
}

export const loadIndex = () => get<DeviceSummary[]>('index.json')

export async function loadDevice(id: string): Promise<Device> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Bad device id "${id}"`)
  const d = await get<Device>(`${id}.json`)
  if (import.meta.env.DEV) validateDevice(d).forEach((e) => console.warn('[content]', e))
  return d
}
