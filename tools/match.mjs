#!/usr/bin/env node
// Match Score loop: makes the 3D model look like photos of the real object.
//   render  draw the model from one view (PNG). Use it to check that a photo has the same orientation.
//   judge   Match Score Judge: score the model against every reference photo (0..100), with region hints.
//   tune    iterate: change one shape value, judge again, keep the change only if the score rises.
//           The Progress Judge adapts the step size, stops at the target or on a plateau, and gives a verdict.
//   status  Progress Judge over all runs (history.jsonl): pass, improving, stalled (redesign) or regressed.
//   apply   copy the shapes of best-device.json from the last tune into public/data/devices (validated, with a backup).
//   restore put back the device JSON saved by the last apply.
// Renders use the app's own meshes and lights (src/match/RenderView.tsx) in headless Edge or Chrome.
// Photo rules and the full command chain: CLAUDE.md, section "Match loop".
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'

const ROOT = path.resolve(import.meta.dirname, '..')
const VIEWS = ['back', 'front', 'left', 'right', 'top', 'bottom']
/** Device-local axes (0 = x, 1 = y, 2 = z) that move visibly in each view. */
const VIEW_AXES = { back: [0, 1], front: [0, 1], left: [1, 2], right: [1, 2], top: [0, 2], bottom: [0, 2] }
const IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp']

const { values: o, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    part: { type: 'string' },
    parts: { type: 'string' },
    view: { type: 'string', default: 'back' },
    views: { type: 'string' },
    from: { type: 'string' },
    refs: { type: 'string' },
    out: { type: 'string' },
    iters: { type: 'string', default: '80' },
    target: { type: 'string', default: '85' },
    patience: { type: 'string', default: '25' },
    'max-delta': { type: 'string', default: '6' },
    seed: { type: 'string', default: '1' },
    'no-color': { type: 'boolean' },
  },
})
const [cmd, deviceId] = positionals
if (!cmd || !deviceId || !/^[a-z0-9-]+$/.test(deviceId)) {
  console.log(`usage: node tools/match.mjs <render|judge|tune|status|apply|restore> <device> [options]
  --part <id>        target one component (photos: match/refs/<device>/<id>-<view>.jpg)
  --parts a,b        tune only these components while judging the whole device
  --view <v>         render: ${VIEWS.join('|')} (default back)
  --views a,b        judge/tune: limit to these views (default: every photo found)
  --from <file>      start from this device JSON instead of public/data/devices/<device>.json
  --refs <dir>       photo folder inside the project (default match/refs/<device>)
  --out <file>       render: output PNG
  --iters 80 --target 85 --patience 25 --max-delta 6 --seed 1 --no-color   tune settings`)
  process.exit(1)
}

const target = o.part ?? 'device'
const devFile = path.join(ROOT, 'public/data/devices', `${deviceId}.json`)
// Runs against a custom --refs folder keep their outputs and history next to those photos.
const runDir = o.refs ? path.join(path.resolve(o.refs), 'out') : path.join(ROOT, 'match/out', deviceId)
const outDir = path.join(runDir, target)
const historyFile = path.join(runDir, 'history.jsonl')
const rel = (p) => path.relative(ROOT, p).replaceAll('\\', '/')
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length
const r2 = (v) => Math.round(v * 100) / 100

/** Reference photos for the target: view -> URL path served by the dev server. */
function findRefs() {
  const dir = o.refs ? path.resolve(o.refs) : path.join(ROOT, 'match/refs', deviceId)
  if (rel(dir).startsWith('..') || path.isAbsolute(rel(dir))) throw new Error('--refs must be inside the project (the dev server serves it)')
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : []
  const want = o.views ? o.views.split(',') : VIEWS
  const refs = {}
  for (const v of want)
    for (const ext of IMG_EXT) if (files.includes(`${target}-${v}${ext}`)) refs[v] ??= `/${rel(dir)}/${target}-${v}${ext}`
  if (!Object.keys(refs).length) {
    console.error(`No reference photos for "${target}". Add e.g. ${rel(dir)}/${target}-back.jpg (see CLAUDE.md, "Match loop").`)
    process.exit(1)
  }
  return refs
}

// ---------- headless browser session ----------

function findBrowser() {
  const candidates = [
    process.env.TECHLAB_BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ]
  const exe = candidates.find((p) => p && fs.existsSync(p))
  if (!exe) throw new Error('No Edge or Chrome found. Set TECHLAB_BROWSER to the browser executable.')
  return exe
}

/** Minimal Chrome DevTools Protocol client over Node's built-in WebSocket. */
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((ok, fail) => ((ws.onopen = ok), (ws.onerror = fail)))
  const pending = new Map()
  let id = 0
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    pending.get(m.id)?.(m)
    pending.delete(m.id)
  }
  // Fail every waiting call if the browser goes away, instead of hanging forever.
  ws.onclose = () => {
    for (const settle of pending.values()) settle({ error: { message: 'browser connection closed' } })
    pending.clear()
  }
  const send = (method, params = {}) =>
    new Promise((ok, fail) => {
      pending.set(++id, (m) => (m.error ? fail(new Error(m.error.message)) : ok(m.result)))
      ws.send(JSON.stringify({ id, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
    return r.result.value
  }
  return { send, evaluate, close: () => ws.close() }
}

/** Starts a private Vite dev server and a headless browser on the render page. */
async function openSession() {
  const { createServer } = await import('vite')
  const vite = await createServer({ root: ROOT, logLevel: 'error', clearScreen: false, server: { port: 0, host: '127.0.0.1', hmr: false } })
  await vite.listen()
  const base = vite.resolvedUrls.local[0]
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'techlab-match-'))
  // Software WebGL (SwiftShader) so scores do not depend on the GPU.
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=900,900', 'about:blank']
  const proc = spawn(findBrowser(), args, { stdio: 'ignore' })
  const close = async () => {
    const exited = new Promise((r) => proc.once('exit', r))
    await page?.send('Browser.close').catch(() => {})
    page?.close()
    await Promise.race([exited, sleep(3000)])
    // proc.kill() on Windows leaves Edge's helper processes running; kill the whole tree.
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' })
    else proc.kill()
    await vite.close()
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    } catch {
      // Browser helper processes can hold the temp profile a little longer on Windows; the OS cleans temp.
    }
  }
  let page
  try {
    const portFile = path.join(profile, 'DevToolsActivePort')
    let rawPort = ''
    for (let i = 0; i <= 150; i++) {
      if (fs.existsSync(portFile)) {
        try {
          const content = fs.readFileSync(portFile, 'utf8')
          if (content.includes('\n')) {
            rawPort = content
            break
          }
        } catch {
          // File may be locked by the browser on Windows while writing; retry.
        }
      }
      if (i === 150) throw new Error('browser did not start')
      await sleep(100)
    }
    const port = rawPort.split('\n')[0].trim()
    let targets
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`)
        if (res.ok) {
          targets = await res.json()
          if (targets.some((t) => t.type === 'page')) break
        }
      } catch {
        // Wait for devtools HTTP server to be ready
      }
      await sleep(100)
    }
    if (!targets) throw new Error('devtools HTTP server did not respond')
    page = await connect(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
    await page.send('Page.navigate', { url: `${base}#/render/${deviceId}` })
    for (let i = 0; !(await page.evaluate('!!window.techlabMatch?.ready').catch(() => false)); i++) {
      if (i > 300) throw new Error('render page did not load (is WebGL available in the headless browser?)')
      await sleep(100)
    }
  } catch (e) {
    await close()
    throw e
  }
  const run = async (req) => {
    let timer
    try {
      return await Promise.race([
        page.evaluate(`window.techlabMatch.run(${JSON.stringify(req)})`),
        new Promise((_, fail) => (timer = setTimeout(() => fail(new Error('render timed out after 60 s')), 60000))),
      ])
    } finally {
      clearTimeout(timer) // a pending timer keeps Node alive for 60 s after the last render
    }
  }
  return { run, close }
}

// ---------- scoring ----------

/** Match Score of a device design over all reference views (mean of the per-view scores). */
async function scoreDesign(s, device, refs, images = false) {
  const views = {}
  for (const [view, ref] of Object.entries(refs)) views[view] = await s.run({ device, part: o.part, view, ref, images })
  return { score: r2(mean(Object.values(views).map((v) => v.report.score))), views }
}

function saveSnapshot(result) {
  fs.mkdirSync(outDir, { recursive: true })
  for (const [view, r] of Object.entries(result.views)) {
    for (const k of ['render', 'overlay'])
      if (r[k]) fs.writeFileSync(path.join(outDir, `${view}-${k}.png`), Buffer.from(r[k].split(',')[1], 'base64'))
    fs.writeFileSync(path.join(outDir, `${view}-report.json`), JSON.stringify(r.report, null, 2) + '\n')
  }
}

function printReport(result) {
  for (const [view, { report: r }] of Object.entries(result.views)) {
    const sub = Object.entries(r.sub).map(([k, v]) => `${k} ${v}`).join('  ')
    console.log(`  ${view.padEnd(6)} ${String(r.score).padStart(6)}   ${sub}   aspect photo ${r.aspect.ref} / model ${r.aspect.render}`)
    for (const g of r.regions.slice(0, 3).filter((g) => g.hints.length)) console.log(`         ${g.name} ${g.score}: ${g.hints.join('; ')}`)
  }
  console.log(`  images: ${rel(outDir)}/<view>-overlay.png (photo | model | difference: red = photo only, cyan = model only, yellow = brightness differs)`)
}

function logHistory(entry) {
  fs.mkdirSync(path.dirname(historyFile), { recursive: true })
  fs.appendFileSync(historyFile, JSON.stringify({ time: new Date().toISOString(), target, ...entry }) + '\n')
}

// ---------- Progress Judge ----------

/** Verdict for one tune run. */
function runVerdict({ start, end, goal, stop }) {
  if (end >= goal) return { verdict: 'pass', text: `target ${goal} reached` }
  if (stop === 'plateau') return { verdict: 'redesign', text: `plateau at ${end} below target ${goal}: tuning sizes and positions cannot close the gap. Redesign the shapes (CLAUDE.md, "Match loop", step 5).` }
  return { verdict: 'continue', text: `still improving (${start} -> ${end}); run tune again with --from ${rel(path.join(outDir, 'best-device.json'))}` }
}

/** Verdict over the history of judge/tune runs for this target. */
function trendVerdict(runs, goal) {
  if (!runs.length) return 'no runs yet: run judge first'
  const last = runs.at(-1).score
  const top = runs.reduce((a, b) => (b.score > a.score ? b : a))
  const best = top.score
  if (last >= goal) return `PASS: ${last} >= target ${goal}`
  if (last < best - 1)
    return top.cmd === 'tune'
      ? `REGRESSED: last ${last} is below the best ${best} from a tune run. Run apply to keep that design, or undo your last shape edit.`
      : `REGRESSED: last ${last} is below the best ${best}. Undo your last shape edit (or run restore after an apply).`
  const recent = runs.slice(-3)
  if (recent.length === 3 && recent[2].score - recent[0].score < 0.5) return `STALLED: under 0.5 gain over the last 3 runs. Redesign the shapes, then judge.`
  return `IMPROVING: keep iterating (best ${best}, target ${goal}).`
}

// ---------- tune ----------

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const gauss = (rnd) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())

function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
function hslToHex([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12
    return Math.round(255 * (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Every value the tuner may change: position and size on axes the photos can see, and colour. */
function tunables(device, comps, views) {
  const axes = [...new Set(views.flatMap((v) => VIEW_AXES[v]))]
  const out = []
  for (const c of device.components) {
    if (!comps.has(c.id)) continue
    c.shapes.forEach((s, si) => {
      for (const a of axes) out.push({ c: c.id, si, f: 'pos', a })
      if (s.type === 'box') for (const a of axes) out.push({ c: c.id, si, f: 'size', a })
      else out.push({ c: c.id, si, f: 'size', a: 0 }, ...(axes.includes(2) ? [{ c: c.id, si, f: 'size', a: 1 }] : []))
      if (!o['no-color'] && isHex(s.color)) out.push({ c: c.id, si, f: 'color' })
    })
  }
  return out
}

const shapeAt = (d, p) => d.components.find((c) => c.id === p.c).shapes[p.si]
const keyOf = (p) => `${p.c}#${p.si} ${p.f}${p.f === 'color' ? '' : '.' + 'xyz'[p.a]}`

const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c ?? '')

/**
 * The shape whose values bound the tuner: the published one, so chained `--from` runs cannot drift past
 * maxDelta from the researched design. A shape a redesign added or moved further than maxDelta uses the start design.
 */
function anchorOf(published, start, p, maxDelta) {
  const s = shapeAt(start, p), a = published.components.find((c) => c.id === p.c)?.shapes[p.si]
  const near = a?.type === s.type && isHex(a.color) === isHex(s.color) && ['pos', 'size'].every((f) => a[f].every((v, k) => Math.abs(v - s[f][k]) <= maxDelta + 1e-9))
  return near ? a : s
}

/** Copy of `device` with one value changed by a random step. Positions and sizes stay within maxDelta mm of the anchor shape `s0`. */
function mutate(device, p, s0, sigma, rnd, maxDelta) {
  const d = structuredClone(device)
  const s = shapeAt(d, p)
  let from, to
  if (p.f === 'color') {
    const hsl = hexToHsl(s.color), l0 = hexToHsl(s0.color)[2]
    const ch = rnd() < 0.6 ? 2 : rnd() < 0.5 ? 1 : 0 // mostly lightness: photos vary most there
    hsl[ch] = ch === 0 ? (hsl[0] + gauss(rnd) * sigma * 0.01 + 1) % 1 : hsl[ch] + gauss(rnd) * sigma * 0.02
    hsl[1] = Math.min(1, Math.max(0, hsl[1]))
    hsl[2] = Math.min(1, Math.max(0, l0 - 0.25, Math.min(l0 + 0.25, hsl[2])))
    ;[from, to] = [s.color, (s.color = hslToHex(hsl))]
  } else {
    const o0 = s0[p.f][p.a]
    const v = Math.round((s[p.f][p.a] + gauss(rnd) * sigma) * 10) / 10
    to = Math.min(o0 + maxDelta, Math.max(o0 - maxDelta, p.f === 'size' ? 0.2 : -Infinity, v))
    from = s[p.f][p.a]
    s[p.f][p.a] = Math.round(to * 10) / 10
  }
  return { device: d, from, to: p.f === 'color' ? to : s[p.f][p.a], same: from === (p.f === 'color' ? to : s[p.f][p.a]) }
}

async function tune(s, refs) {
  const published = readJson(devFile)
  const start = o.from ? readJson(o.from) : published
  const comps = new Set(o.part ? [o.part] : o.parts ? o.parts.split(',') : start.components.map((c) => c.id))
  for (const id of comps) if (!start.components.some((c) => c.id === id)) throw new Error(`no component "${id}" in ${deviceId}`)
  let pool = tunables(start, comps, Object.keys(refs))
  const iters = +o.iters, goal = +o.target, patience = +o.patience, maxDelta = +o['max-delta']
  const rnd = rng(+o.seed)
  let cur = start, best = await scoreDesign(s, cur, refs)
  const first = best.score
  let sigma = 2, accepted = 0, gainBase = best.score, lastGain = 0, stop = 'iterations', i = 0
  const changes = new Map(), dead = new Map()
  console.log(`Match Score start ${first}  (${pool.length} tunable values, target ${goal})`)
  while (i < iters && pool.length) {
    i++
    const p = pool[Math.floor(rnd() * pool.length)]
    const m = mutate(cur, p, anchorOf(published, start, p, maxDelta), sigma, rnd, maxDelta)
    if (!m.same) {
      const r = await scoreDesign(s, m.device, refs)
      if (r.score > best.score + 0.05) {
        console.log(`  #${String(i).padStart(3)}  ${r.score.toFixed(2)} (+${(r.score - best.score).toFixed(2)})  ${keyOf(p)} ${m.from} -> ${m.to}`)
        cur = m.device
        best = r
        accepted++
        changes.set(keyOf(p), { from: changes.get(keyOf(p))?.from ?? m.from, to: m.to })
      } else if (r.score === best.score) {
        // Two exact ties = the value is hidden from every photo. Stop spending iterations on it.
        dead.set(keyOf(p), (dead.get(keyOf(p)) ?? 0) + 1)
        if (dead.get(keyOf(p)) >= 2) pool = pool.filter((q) => q !== p)
      }
    }
    if (i % 10 === 0) {
      sigma = Math.min(maxDelta, Math.max(0.1, accepted / 10 > 0.2 ? sigma * 1.5 : sigma * 0.82)) // 1/5 success rule
      accepted = 0
    }
    if (best.score >= gainBase + 0.5) (gainBase = best.score), (lastGain = i)
    if (best.score >= goal) {
      stop = 'target'
      break
    }
    if (i - lastGain >= patience) {
      stop = 'plateau'
      break
    }
  }
  const final = await scoreDesign(s, cur, refs, true)
  saveSnapshot(final)
  const v = runVerdict({ start: first, end: final.score, goal, stop })
  fs.writeFileSync(path.join(outDir, 'best-device.json'), JSON.stringify(cur, null, 2) + '\n')
  const summary = { start: first, end: final.score, iterations: i, stop, verdict: v.verdict, changes: Object.fromEntries(changes) }
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n')
  logHistory({ cmd: 'tune', from: o.from ? rel(path.resolve(o.from)) : rel(devFile), score: final.score, start: first, verdict: v.verdict })
  console.log(`\nMatch Score ${first} -> ${final.score} (${final.score >= first ? '+' : ''}${r2(final.score - first)}) in ${i} iterations, ${changes.size} values changed`)
  printReport(final)
  console.log(`Progress Judge: ${v.verdict.toUpperCase()} - ${v.text}`)
  console.log(`Best design: ${rel(path.join(outDir, 'best-device.json'))}. Nothing in public/ changed; run "apply" to keep it.`)
}

// ---------- apply / restore ----------

/** One-line JSON in the style of the hand-formatted device files: { "a": 1, "b": [1, 2] }. */
const inline = (v) =>
  Array.isArray(v) ? `[${v.map(inline).join(', ')}]`
  : v && typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${inline(x)}`).join(', ')} }`
  : JSON.stringify(v)

/** Writes `next` over the device file, keeping its formatting so the diff shows only the changed shapes. */
function writeDevice(prev, next) {
  const text = fs.readFileSync(devFile, 'utf8')
  let out
  if (text.trim() === JSON.stringify(prev, null, 2)) out = JSON.stringify(next, null, 2) + (text.endsWith('\n') ? '\n' : '')
  else {
    out = text
    for (const c of next.components) {
      const pc = prev.components.find((x) => x.id === c.id)
      if (!pc || pc.shapes.length !== c.shapes.length) throw new Error(`component ${c.id} changed structure; edit ${rel(devFile)} by hand`)
      c.shapes.forEach((sh, i) => {
        const was = inline(pc.shapes[i]), now = inline(sh)
        if (was === now) return
        const at = out.indexOf(was, out.indexOf(`"id": "${c.id}"`))
        if (at < 0) throw new Error(`cannot find shape ${c.id}#${i} in ${rel(devFile)}; copy it from best-device.json by hand`)
        out = out.slice(0, at) + now + out.slice(at + was.length)
      })
    }
  }
  if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(next)) throw new Error('formatted output does not match the design; nothing written')
  fs.writeFileSync(devFile, out)
}

async function apply() {
  const bestFile = path.join(outDir, 'best-device.json')
  if (!fs.existsSync(bestFile)) throw new Error(`no ${rel(bestFile)}: run tune first`)
  const best = readJson(bestFile), prev = readJson(devFile)
  if (best.id !== prev.id) throw new Error(`${rel(bestFile)} is for "${best.id}", not "${prev.id}"`)
  // Take only the shapes from the tune, so edits made to the device file since then (specs, cases, sources) stay.
  const next = structuredClone(prev)
  for (const c of next.components) c.shapes = best.components.find((b) => b.id === c.id)?.shapes ?? c.shapes
  const { createServer } = await import('vite')
  const vite = await createServer({ root: ROOT, logLevel: 'error', server: { middlewareMode: true, hmr: false } })
  const { validateDevice } = await vite.ssrLoadModule('/src/engine/validate.ts')
  const errors = validateDevice(next)
  await vite.close()
  if (errors.length) throw new Error(`the tuned shapes fail the validator, nothing written:\n  ${errors.join('\n  ')}`)
  const backup = path.join(ROOT, 'match/out', deviceId, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(devFile, backup)
  writeDevice(prev, next)
  console.log(`Applied ${rel(bestFile)} to ${rel(devFile)}. Backup: ${rel(backup)}.\nNext: npm test, then look at #/lab/${deviceId}/explore.`)
}

function restore() {
  const dir = path.join(ROOT, 'match/out', deviceId)
  const backups = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^backup-.*\.json$/.test(f)).sort() : []
  if (!backups.length) throw new Error('no backup to restore')
  fs.copyFileSync(path.join(dir, backups.at(-1)), devFile)
  console.log(`Restored ${rel(devFile)} from ${backups.at(-1)}.`)
}

// ---------- main ----------

async function main() {
  if (cmd === 'status') {
    const runs = fs.existsSync(historyFile) ? fs.readFileSync(historyFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.target === target) : []
    for (const r of runs.slice(-10)) console.log(`  ${r.time.slice(0, 19)}  ${r.cmd.padEnd(5)}  ${String(r.score).padStart(6)}  ${r.verdict ?? ''}  ${r.from ?? ''}`)
    console.log(`Progress Judge (${target}): ${trendVerdict(runs, +o.target)}`)
    return
  }
  if (cmd === 'apply') return apply()
  if (cmd === 'restore') return restore()
  if (!['render', 'judge', 'tune'].includes(cmd)) throw new Error(`unknown command "${cmd}"`)

  const refs = cmd === 'render' ? null : findRefs()
  const s = await openSession()
  try {
    if (cmd === 'render') {
      const device = o.from ? readJson(o.from) : readJson(devFile)
      const r = await s.run({ device, part: o.part, view: o.view, images: true })
      const file = o.out ? path.resolve(o.out) : path.join(outDir, `${o.view}-render.png`)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, Buffer.from(r.render.split(',')[1], 'base64'))
      console.log(`Rendered ${target} (${o.view}) to ${rel(file)}`)
    } else if (cmd === 'judge') {
      const device = o.from ? readJson(o.from) : readJson(devFile)
      const result = await scoreDesign(s, device, refs, true)
      saveSnapshot(result)
      const runs = fs.existsSync(historyFile) ? fs.readFileSync(historyFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.target === target) : []
      logHistory({ cmd: 'judge', from: o.from ? rel(path.resolve(o.from)) : rel(devFile), score: result.score })
      console.log(`Match Score (${target}): ${result.score}`)
      printReport(result)
      console.log(`Progress Judge: ${trendVerdict([...runs, { score: result.score }], +o.target)}`)
    } else await tune(s, refs)
  } finally {
    await s.close()
  }
}

main().catch((e) => {
  console.error(`match: ${e.message}`)
  process.exit(1)
})
