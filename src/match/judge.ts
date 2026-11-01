// Match Score Judge: compares a reference photo of a real object with a render of the 3D model
// from the same view and scores the match 0..100. Pure TS on RGBA pixel buffers (no DOM), so it
// runs in the browser render page and in vitest.
//
// Score = 100 x (0.35 silhouette + 0.30 edges + 0.20 color + 0.15 aspect), each sub-score 0..1.
// - silhouette: IoU of the two object masks after both are cropped to their bounding box.
// - edges: correlation of blurred interior edge maps (camera rings, cutouts, seams).
// - color: per-cell CIE76 colour distance after a clamped brightness match (photos vary in exposure).
// - aspect: width/height ratio of the two bounding boxes.

export interface Img {
  width: number
  height: number
  /** RGBA, 4 bytes per pixel. */
  data: Uint8ClampedArray | Uint8Array
}

export interface Region {
  name: string
  score: number
  hints: string[]
}

export interface MatchReport {
  score: number
  sub: { silhouette: number; edges: number; color: number; aspect: number }
  /** 3x3 regions of the reference image, worst first. */
  regions: Region[]
  /** Bounding-box aspect (w/h) of the reference and the render. */
  aspect: { ref: number; render: number }
}

const WEIGHTS = { silhouette: 0.35, edges: 0.3, color: 0.2, aspect: 0.15 }
const SIDE = 256 // longest side of the comparison grid
const COLOR_CELLS = 8
const REGION_NAMES = ['top-left', 'top', 'top-right', 'left', 'centre', 'right', 'bottom-left', 'bottom', 'bottom-right']

/** Object mask. Uses alpha when the image has transparency, else separates the object from the border colour. */
export function objectMask(img: Img): Uint8Array {
  const { width: w, height: h, data } = img
  const n = w * h
  const m = new Uint8Array(n)
  let clear = 0
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 128) clear++
  if (clear > n * 0.01) {
    for (let i = 0; i < n; i++) m[i] = data[i * 4 + 3] >= 128 ? 1 : 0
    return m
  }
  // Background = median colour of the border pixels.
  const border: number[][] = [[], [], []]
  const addBorder = (i: number) => [0, 1, 2].forEach((c) => border[c].push(data[i * 4 + c]))
  for (let x = 0; x < w; x++) (addBorder(x), addBorder((h - 1) * w + x))
  for (let y = 0; y < h; y++) (addBorder(y * w), addBorder(y * w + w - 1))
  const bg = border.map((v) => v.sort((a, b) => a - b)[v.length >> 1])
  const dist = new Float32Array(n)
  const hist = new Array(256).fill(0)
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(data[i * 4] - bg[0], data[i * 4 + 1] - bg[1], data[i * 4 + 2] - bg[2])
    dist[i] = d
    hist[Math.min(255, Math.floor(d / 1.74))]++ // 441.7 (max distance) / 1.74 ~ 254
  }
  // ponytail: global Otsu threshold. Busy or shadowed backgrounds need a cut-out PNG with alpha instead.
  const t = Math.max(20, otsu(hist, n) * 1.74)
  for (let i = 0; i < n; i++) m[i] = dist[i] > t ? 1 : 0
  return m
}

function otsu(hist: number[], n: number): number {
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0, wB = 0, best = 0, t = 0
  for (let i = 0; i < 256; i++) {
    wB += hist[i]
    if (!wB) continue
    const wF = n - wB
    if (!wF) break
    sumB += i * hist[i]
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2
    if (between > best) (best = between), (t = i)
  }
  return t
}

function bbox(m: Uint8Array, w: number, h: number) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (m[y * w + x]) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y))
  return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

interface Grid {
  w: number
  h: number
  /** Foreground fraction per cell, 0..1. */
  m: Float32Array
  /** Mean foreground sRGB per cell, 0..1, 3 per cell. */
  rgb: Float32Array
}

/** Box-filter resample of the bounding-box crop into a w x h grid. Colour averages only foreground pixels. */
function resample(img: Img, mask: Uint8Array, b: { x0: number; y0: number; w: number; h: number }, w: number, h: number): Grid {
  const g: Grid = { w, h, m: new Float32Array(w * h), rgb: new Float32Array(w * h * 3) }
  for (let gy = 0; gy < h; gy++) {
    const sy0 = b.y0 + Math.floor((gy * b.h) / h), sy1 = Math.max(sy0 + 1, b.y0 + Math.floor(((gy + 1) * b.h) / h))
    for (let gx = 0; gx < w; gx++) {
      const sx0 = b.x0 + Math.floor((gx * b.w) / w), sx1 = Math.max(sx0 + 1, b.x0 + Math.floor(((gx + 1) * b.w) / w))
      let cnt = 0, fg = 0, r = 0, gg = 0, bb = 0
      for (let y = sy0; y < sy1; y++)
        for (let x = sx0; x < sx1; x++) {
          const i = y * img.width + x
          cnt++
          if (!mask[i]) continue
          fg++
          r += img.data[i * 4]
          gg += img.data[i * 4 + 1]
          bb += img.data[i * 4 + 2]
        }
      const k = gy * w + gx
      g.m[k] = fg / cnt
      if (fg) (g.rgb[k * 3] = r / fg / 255), (g.rgb[k * 3 + 1] = gg / fg / 255), (g.rgb[k * 3 + 2] = bb / fg / 255)
    }
  }
  return g
}

const lum = (g: Grid, k: number) => 0.2126 * g.rgb[k * 3] + 0.7152 * g.rgb[k * 3 + 1] + 0.0722 * g.rgb[k * 3 + 2]

/** Blurred Sobel magnitude of luminance, inside the object only (the outline is the silhouette's job). */
function edgeMap(g: Grid): Float32Array {
  const { w, h } = g
  let s = 0, c = 0
  for (let k = 0; k < w * h; k++) if (g.m[k] > 0.5) (s += lum(g, k)), c++
  const fill = c ? s / c : 0
  const L = new Float32Array(w * h)
  for (let k = 0; k < w * h; k++) L[k] = g.m[k] > 0.5 ? lum(g, k) : fill
  const at = (x: number, y: number) => L[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]
  let e = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const gx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const gy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      const inside = g.m[y * w + x] > 0.5 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => (g.m[Math.min(h - 1, Math.max(0, y + dy)) * w + Math.min(w - 1, Math.max(0, x + dx))] ?? 0) > 0.5)
      e[y * w + x] = inside ? Math.hypot(gx, gy) : 0
    }
  for (let pass = 0; pass < 2; pass++) e = blur(e, w, h)
  return e
}

function blur(a: Float32Array, w: number, h: number, r = 2) {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) (s += a[yy * w + xx]), n++
        }
      out[y * w + x] = s / n
    }
  return out
}

/** Pearson correlation over the index list, clamped to 0..1. */
function corr(a: Float32Array, b: Float32Array, idx: number[]): number {
  if (idx.length < 2) return 1
  let ma = 0, mb = 0
  for (const i of idx) (ma += a[i]), (mb += b[i])
  ma /= idx.length
  mb /= idx.length
  let ab = 0, aa = 0, bb = 0
  for (const i of idx) (ab += (a[i] - ma) * (b[i] - mb)), (aa += (a[i] - ma) ** 2), (bb += (b[i] - mb) ** 2)
  if (aa < 1e-9 && bb < 1e-9) return 1 // both flat: nothing to disagree about
  if (aa < 1e-9 || bb < 1e-9) return 0
  return Math.max(0, ab / Math.sqrt(aa * bb))
}

function toLab([r, g, b]: number[]): number[] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/** Scores how well `render` matches `ref`. Both are full images; each is cropped to its object. */
export function judge(ref: Img, render: Img): MatchReport & { overlay: Img } {
  const mRef = objectMask(ref), mRen = objectMask(render)
  const bRef = bbox(mRef, ref.width, ref.height), bRen = bbox(mRen, render.width, render.height)
  if (!bRef || !bRen) {
    const empty = { width: 1, height: 1, data: new Uint8ClampedArray(4) }
    const why = !bRef ? 'no object found in the reference photo' : 'render is empty'
    return { score: 0, sub: { silhouette: 0, edges: 0, color: 0, aspect: 0 }, regions: [{ name: 'all', score: 0, hints: [why] }], aspect: { ref: 0, render: 0 }, overlay: empty }
  }
  const aRef = bRef.w / bRef.h, aRen = bRen.w / bRen.h
  const w = aRef >= 1 ? SIDE : Math.max(8, Math.round(SIDE * aRef))
  const h = aRef >= 1 ? Math.max(8, Math.round(SIDE / aRef)) : SIDE
  const A = resample(ref, mRef, bRef, w, h), B = resample(render, mRen, bRen, w, h)
  const n = w * h

  // Silhouette IoU, plus per-region tallies for hints.
  const R = 3
  const reg = Array.from({ length: R * R }, () => ({ both: 0, refOnly: 0, renOnly: 0, eRef: 0, eRen: 0, colors: [] as number[], dL: 0, cells: 0 }))
  const regionOf = (x: number, y: number) => Math.min(R - 1, Math.floor((y * R) / h)) * R + Math.min(R - 1, Math.floor((x * R) / w))
  let inter = 0, union = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x, a = A.m[k] > 0.5, b = B.m[k] > 0.5, r = reg[regionOf(x, y)]
      if (a && b) inter++, r.both++
      else if (a) r.refOnly++
      else if (b) r.renOnly++
      if (a || b) union++
    }
  const silhouette = union ? inter / union : 0

  const eA = edgeMap(A), eB = edgeMap(B)
  const both: number[] = []
  for (let k = 0; k < n; k++) if (A.m[k] > 0.5 || B.m[k] > 0.5) both.push(k)
  const edges = corr(eA, eB, both)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) (reg[regionOf(x, y)].eRef += eA[y * w + x]), (reg[regionOf(x, y)].eRen += eB[y * w + x])

  // Colour per cell after matching mean brightness (gain clamped so a wrong colour still shows).
  let lA = 0, lB = 0, cA = 0, cB = 0
  for (let k = 0; k < n; k++) {
    if (A.m[k] > 0.5) (lA += lum(A, k)), cA++
    if (B.m[k] > 0.5) (lB += lum(B, k)), cB++
  }
  const gain = cA && cB && lB > 1e-4 ? Math.min(1.5, Math.max(0.67, lA / cA / (lB / cB))) : 1
  const cells: number[] = []
  for (let cy = 0; cy < COLOR_CELLS; cy++)
    for (let cx = 0; cx < COLOR_CELLS; cx++) {
      const sa = [0, 0, 0], sb = [0, 0, 0]
      let na = 0, nb = 0
      for (let y = Math.floor((cy * h) / COLOR_CELLS); y < Math.floor(((cy + 1) * h) / COLOR_CELLS); y++)
        for (let x = Math.floor((cx * w) / COLOR_CELLS); x < Math.floor(((cx + 1) * w) / COLOR_CELLS); x++) {
          const k = y * w + x
          if (A.m[k] > 0.5) (na++, [0, 1, 2].forEach((c) => (sa[c] += A.rgb[k * 3 + c])))
          if (B.m[k] > 0.5) (nb++, [0, 1, 2].forEach((c) => (sb[c] += Math.min(1, B.rgb[k * 3 + c] * gain))))
        }
      const area = (w / COLOR_CELLS) * (h / COLOR_CELLS)
      if (na < area * 0.3 || nb < area * 0.3) continue
      const la = toLab(sa.map((v) => v / na)), lb = toLab(sb.map((v) => v / nb))
      const dE = Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2])
      const s = Math.max(0, 1 - dE / 40)
      cells.push(s)
      const r = reg[regionOf(((cx + 0.5) * w) / COLOR_CELLS, ((cy + 0.5) * h) / COLOR_CELLS)]
      r.colors.push(s)
      r.dL += lb[0] - la[0]
      r.cells++
    }
  const color = cells.length ? cells.reduce((s, v) => s + v, 0) / cells.length : 0
  const aspect = Math.max(0, 1 - 3 * Math.abs(Math.log(aRef / aRen)))

  const sub = { silhouette, edges, color, aspect }
  const score = 100 * (WEIGHTS.silhouette * silhouette + WEIGHTS.edges * edges + WEIGHTS.color * color + WEIGHTS.aspect * aspect)

  const regions: Region[] = reg.map((r, i) => {
    const u = r.both + r.refOnly + r.renOnly
    const iou = u ? r.both / u : 1
    const col = r.colors.length ? r.colors.reduce((s, v) => s + v, 0) / r.colors.length : 1
    const hints: string[] = []
    if (r.refOnly > u * 0.08) hints.push('missing material: the photo has the object here, the model does not')
    if (r.renOnly > u * 0.08) hints.push('extra material: the model sticks out where the photo is empty')
    const eMax = Math.max(r.eRef, r.eRen)
    if (eMax > 1e-6 && r.eRef > r.eRen * 1.6) hints.push('missing detail: the photo shows edges (lens, seam, cutout) the model lacks')
    if (eMax > 1e-6 && r.eRen > r.eRef * 1.6) hints.push('extra detail: the model has edges the photo does not')
    if (r.cells && col < 0.7) hints.push(r.dL / r.cells < -8 ? 'model is darker than the photo' : r.dL / r.cells > 8 ? 'model is lighter than the photo' : 'colour differs from the photo')
    return { name: REGION_NAMES[i], score: Math.round(100 * (0.6 * iou + 0.4 * col)), hints }
  })
  regions.sort((a, b) => a.score - b.score)

  return {
    score: Math.round(score * 100) / 100,
    sub: Object.fromEntries(Object.entries(sub).map(([k, v]) => [k, Math.round(v * 1000) / 1000])) as MatchReport['sub'],
    regions,
    aspect: { ref: Math.round(aRef * 1000) / 1000, render: Math.round(aRen * 1000) / 1000 },
    overlay: overlay(A, B, gain),
  }
}

/** Side-by-side image: reference | render | difference (red = photo only, cyan = model only, yellow = brightness differs, dark grey = match). */
function overlay(A: Grid, B: Grid, gain: number): Img {
  const { w, h } = A
  const W = w * 3 + 8
  const data = new Uint8ClampedArray(W * h * 4)
  const put = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * W + x) * 4
    ;(data[i] = r), (data[i + 1] = g), (data[i + 2] = b), (data[i + 3] = 255)
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) put(x, y, 24, 28, 34)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x
      for (const [g, ox] of [[A, 0], [B, w + 4]] as const)
        if (g.m[k] > 0.5) put(ox + x, y, g.rgb[k * 3] * 255, g.rgb[k * 3 + 1] * 255, g.rgb[k * 3 + 2] * 255)
      const a = A.m[k] > 0.5, b = B.m[k] > 0.5
      const d = Math.min(1, Math.abs(lum(A, k) - lum(B, k) * gain) * 3)
      if (a && b) put(2 * w + 8 + x, y, 70 + 185 * d, 70 + 165 * d, 70 - 40 * d)
      else if (a) put(2 * w + 8 + x, y, 235, 60, 60)
      else if (b) put(2 * w + 8 + x, y, 40, 210, 230)
    }
  return { width: W, height: h, data }
}
