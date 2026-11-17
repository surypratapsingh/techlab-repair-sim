// Content loader: rejects bad ids before any fetch, and returns the fetched index.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDataCache, loadDevice, loadIndex } from './data'

beforeEach(() => clearDataCache())
afterEach(() => {
  clearDataCache()
  vi.unstubAllGlobals()
})

describe('content loader', () => {
  it('rejects ids that are not plain slugs, without fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(loadDevice('../secrets')).rejects.toThrow('Bad device id')
    await expect(loadDevice('Galaxy')).rejects.toThrow('Bad device id')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loads the index from the data folder and caches successful results', async () => {
    const index = [{ id: 'thinkpad-t14' }]
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => index }))
    vi.stubGlobal('fetch', fetchSpy)
    await expect(loadIndex()).resolves.toEqual(index)
    await expect(loadIndex()).resolves.toEqual(index)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('evicts rejected requests from cache allowing retry on network recovery', async () => {
    let attempts = 0
    const mockDevice = { id: 'test-device', name: 'Test Device', components: [], spares: [], cases: [] }
    const fetchSpy = vi.fn(async () => {
      attempts++
      if (attempts === 1) {
        return { ok: false, status: 503 }
      }
      return { ok: true, json: async () => mockDevice }
    })
    vi.stubGlobal('fetch', fetchSpy)

    // First attempt fails with 503 error
    await expect(loadDevice('test-device')).rejects.toThrow('Could not load test-device.json (503)')

    // Second attempt retries fetch instead of staying permanently failed
    await expect(loadDevice('test-device')).resolves.toEqual(mockDevice)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
