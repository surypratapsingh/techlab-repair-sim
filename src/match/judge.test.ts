import { describe, expect, it } from 'vitest'
import { judge, objectMask, type Img } from './judge'

type Rect = [x: number, y: number, w: number, h: number, rgb: [number, number, number]]

/** Phone-like test image: rectangles on a white (photo) or transparent (render) background. */
function draw(rects: Rect[], transparent: boolean, W = 200, H = 300): Img {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) data.set(transparent ? [0, 0, 0, 0] : [245, 245, 245, 255], i * 4)
  for (const [x0, y0, w, h, rgb] of rects)
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) data.set([...rgb, 255], (y * W + x) * 4)
  return { width: W, height: H, data }
}

const body: Rect = [40, 30, 120, 240, [60, 70, 90]]
const camera = (dx: number): Rect => [60 + dx, 50, 30, 30, [10, 10, 12]]

describe('Match Score Judge', () => {
  it('finds the object on a plain background and from alpha', () => {
    const count = (m: Uint8Array) => m.reduce((s, v) => s + v, 0)
    expect(count(objectMask(draw([body], false)))).toBe(120 * 240)
    expect(count(objectMask(draw([body], true)))).toBe(120 * 240)
  })

  it('scores an identical render near 100', () => {
    const r = judge(draw([body, camera(0)], false), draw([body, camera(0)], true))
    expect(r.score).toBeGreaterThan(98)
  })

  it('drops as an inner feature moves further from the photo', () => {
    const ref = draw([body, camera(0)], false)
    const scores = [0, 10, 30, 60].map((dx) => judge(ref, draw([body, camera(dx)], true)).score)
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThan(scores[i - 1])
  })

  it('penalises a wrong outline and points at the region', () => {
    const ref = draw([body, camera(0)], false)
    const short = judge(ref, draw([[40, 30, 120, 180, body[4]], camera(0)], true))
    expect(short.sub.aspect).toBeLessThan(0.5)
    const notch = judge(ref, draw([[40, 30, 120, 200, body[4]], [40, 230, 100, 40, body[4]], camera(0)], true)) // bottom-right corner cut off
    expect(notch.sub.silhouette).toBeLessThan(1)
    expect(notch.regions[0].name).toMatch(/bottom/)
  })

  it('reports colour that is too dark', () => {
    const r = judge(draw([body], false), draw([[...body.slice(0, 4), [5, 5, 5]] as Rect], true))
    expect(r.sub.color).toBeLessThan(0.7)
    expect(r.regions[0].hints.join(' ')).toMatch(/darker|colour/)
  })
})
