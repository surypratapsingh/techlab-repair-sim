// Content loader: rejects bad ids before any fetch, and returns the fetched index.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadDevice, loadIndex } from './data'

afterEach(() => vi.unstubAllGlobals())

describe('content loader', () => {
  it('rejects ids that are not plain slugs, without fetching', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    await expect(loadDevice('../secrets')).rejects.toThrow('Bad device id')
    await expect(loadDevice('Galaxy')).rejects.toThrow('Bad device id')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('loads the index from the data folder', async () => {
    const index = [{ id: 'thinkpad-t14' }]
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => index })))
    await expect(loadIndex()).resolves.toEqual(index)
  })
})
