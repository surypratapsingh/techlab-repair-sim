# TechLab — guide for agents and contributors

Browser-based 3D lab: open real devices, learn the parts, repair broken devices, experiment. Static site, no backend, progress in localStorage.

**Before any work:** read `plan.md`, `progress.md` (top entry), `decisions.md`, then pick or claim a task in `todo.md`.

## Commands
```
npm install
npm run dev        # http://localhost:5173
npm test           # engine + game tests, and validates every device JSON
npm run typecheck
npm run build      # typecheck + static build into dist/
npm run match -- judge <device>   # Match Score loop, see "Match loop" below
```
Definition of done for any change: `npm test` and `npm run typecheck` pass. UI changes: also check the page in a browser.

## Map
| Path | What | Rules |
|---|---|---|
| `public/data/devices/*.json` | Device content: components, spare parts, repair cases, sources | Data only. Never invent facts. Unsure = `verified: false` + `note`. |
| `public/data/devices/index.json` | Library list; `available: false` shows "Coming soon" | |
| `src/engine/types.ts` | **Schema contract** for device JSON and lab state | Changing it needs a `decisions.md` entry and validator update. |
| `src/engine/engine.ts` | Rules: removal order, battery safety, install, power, run outcome | Pure TS. No React, no DOM, no device-specific ids. |
| `src/engine/validate.ts` | Content checker used by tests and in dev | Every new rule gets a check here. |
| `src/game/game.ts` | Levels, XP, case scoring, achievement list | Pure TS. |
| `src/store/lab.ts` | One lab session (device + mode + case). Wraps the engine, writes the log, awards XP | Persisted as `techlab-lab`. |
| `src/store/progress.ts` | XP, discoveries, best scores, achievements | Persisted as `techlab-progress`. Bump `version` and add `migrate` if the shape changes. |
| `src/scene/LabScene.tsx` | 3D view built from component `shapes` | Reads the store; never changes lab state except `select`. |
| `src/ui/App.tsx` | Top bar, hash routes, achievement toast | Routes: `#/`, `#/devices`, `#/devices?sandbox`, `#/repair`, `#/progress`, `#/lab/<device>/<explore\|sandbox\|repair>[/<case>]` |
| `src/ui/pages.tsx` | Landing, library, cases, progress pages | |
| `src/ui/lab/*` | Lab panels: parts list, info, workbench, toolbar, run overlay, case panel and result | |
| `src/styles.css` | All styles. Tokens in `:root` | |
| `src/match/judge.ts` | Match Score Judge: scores a render against a photo, region hints, overlay image | Pure TS. Unit tested. |
| `src/match/RenderView.tsx` | Dev-only render page `#/render/<device>` for the match CLI | Not in production builds. |
| `tools/match.mjs` | Match loop CLI: render, judge, tune, status, apply, restore | Node only, no new dependencies. |
| `match/refs/<device>/` | Reference photos of the real object | Own photos or licensed only. |
| `match/out/` | Renders, overlays, reports, best designs, history | Gitignored. |

## Lanes (who may touch what)
Work stays in one lane per task so agents do not collide.
- **content**: `public/data/**`. Easiest lane: no code. Run `npm test` to validate.
- **engine**: `src/engine/**`. Must stay pure and fully tested.
- **game**: `src/game/**`.
- **store**: `src/store/**`.
- **scene**: `src/scene/**`.
- **ui**: `src/ui/**`, `src/styles.css`, `index.html`.
- **match**: `src/match/**`, `tools/match.mjs`, `match/**`. `npm run match -- apply` may write shapes into a device JSON (the only content-lane write this lane makes).
- **ops**: build config, CI, deploy.
- **docs**: `plan.md`, `progress.md`, `decisions.md`, `todo.md`, this file. Every agent updates these at the end of a task.

Cross-lane change (for example a new schema field): write the plan in `decisions.md` first, then change `types.ts` → `validate.ts` → `engine.ts` → data → UI, with tests at each step.

## How the simulation works
- A device has **slots** (components). Each slot holds a part id. The factory part id equals the component id. Spare parts live in `spares`.
- `requires`: slots that must be removed before this slot can be removed or installed. Teardown order comes from this graph (outermost first).
- **Battery** = the one component with `powerSource: true`.
  - `connectorAccess`: slots that sit over the battery connector. They may be unplugged with power on (this matches the iFixit order).
  - `connectsTo`: slots the battery plugs into. Removing one cuts power. The battery cannot be connected while one is missing.
- `electrical: true` parts must not be plugged or unplugged with the battery connected. Explore mode blocks it. Sandbox and Repair allow it, damage the part, and count a violation.
- **Run**: each slot reports an effect (`onMissing`, `onDamaged`, `onIncompatible`; a part's own `effect` overrides them). Result = worst outcome by rank. Temperature = 36 °C + sum of `tempC`. At 52 °C or more the outcome is a thermal shutdown.
- Outcomes: `boots`, `degraded`, `thermal-shutdown`, `no-boot`, `no-power`, `short-circuit`.
- Repair cases: `setup` puts a faulty part in a slot, `culprit` names the slot, `spares` go on the workbench. The validator proves every case is fixable with a spare.
- Repair mode hides damage until the part is reachable. The player must mark the faulty part, replace it, and run the device until it boots with no symptoms.

## 3D conventions
- Units are millimetres in JSON, scaled by 0.05 in the scene.
- Viewed from the back: +x right, +y top, +z out of the back. Higher `layer` = closer to the back cover.
- `shapes`: boxes and cylinders with `size`, `pos`, optional `rot`, `color`, and `screen: true` for the display glow.
- `exit`: direction a part slides out (default out of the back). Exploded view offsets each layer by 9 mm.

## Match loop (make the 3D model look like the real object)
Photos go in `match/refs/<device>/<target>-<view>.png|jpg|webp`.
- `target` is `device` for the whole object, or a component id for a part shot on its own.
- `view` is `back`, `front`, `left`, `right`, `top` or `bottom`. Left and right are the edges as seen with the screen facing you. Check orientation with `render` and rotate the photo to match.
- Shoot straight on from 50 cm or more with 2x zoom, so perspective is small. The object fills most of the frame.
- Use a plain background that contrasts with the object, with no hard shadows. Best: a PNG cut-out with a transparent background (the phone gallery's "lift subject" feature).
- Only your own photos or photos whose licence allows it. List each photo's origin in `match/refs/<device>/SOURCES.md`.

Match Score (0..100) = 35% silhouette overlap + 30% inner edges (lenses, seams, cutouts) + 20% colour + 15% aspect ratio. Default target: 85.

Command chain (run from the project root; `--part <id>` targets one component, `--parts a,b` tunes only those components):
```
npm run match -- render <device> --view back      # 1. render; compare orientation with the photo
npm run match -- judge  <device>                  # 2. Match Score Judge: score, sub-scores, worst regions, overlay PNG
npm run match -- tune   <device> --parts <ids>    # 3. automatic loop: change one value, judge, keep only if better
npm run match -- status <device>                  # 4. Progress Judge over all runs: PASS / IMPROVING / STALLED / REGRESSED
                                                  # 5. REDESIGN or STALLED: see below, then go back to 2
npm run match -- apply  <device>                  # 6. PASS: validate + back up + copy the tuned shapes into public/
npm test                                          # 7. then check #/lab/<device>/explore by eye
```
Step 5, redesign (agent): open `match/out/<device>/<target>/<view>-overlay.png` (photo | model | difference: red = photo only, cyan = model only, yellow = brightness differs) and `<view>-report.json` (worst regions with hints). Edit the shapes in the device JSON: add, remove or split boxes, add lens rings or cutouts, fix colours. Run `judge`. If the score drops, undo the edit. Then `tune` again with `--from match/out/<device>/<target>/best-device.json` or from the edited file.

Rules:
- `tune` changes only `shapes` (`pos`, `size`, `color`), within `--max-delta` mm (default 6) of the published design, also across chained `--from` runs. Shapes a redesign added or moved further keep their own start values as the bound. It never changes specs, removal order or effects.
- A published dimension beats a photo. If tuning moves an outline away from `dimensionsMm` or a datasheet value, the photo is wrong (perspective or lens distortion): retake it.
- Nothing in `public/` changes until `apply`. `apply` copies only `shapes` from `best-device.json` (later edits to specs, cases or sources stay), runs the validator and saves a backup; `restore` undoes the last `apply`.
- Needs Edge or Chrome. Set `TECHLAB_BROWSER` to the executable if it is not found. Rendering uses SwiftShader, so scores do not depend on the GPU.

## Add a device (content lane)
1. Research: at least one teardown guide (iFixit) plus one more source. Record each in `verification.sources`.
2. Copy `galaxy-s23-ultra.json` as a template. Fill components outermost to innermost with `requires`, `info` (what / does / ifFails), `specs`, `fastening`, `shapes`, effects.
3. Anything you could not confirm: `verified: false` and a `note` saying what is unsure.
4. Keep `verification.status: "draft"` until a human checks the photos.
5. Add the device to `index.json` with `available: true`.
6. `npm test` must pass. Then open `#/lab/<id>/explore` and do a full teardown in the browser.

## Add a repair case (content lane)
Add an entry to the device's `cases`: `id` (`<prefix>-NNN`), `title`, `level`, `brief`, `symptoms`, `setup` (slot → faulty part id), `culprit`, `spares` (must include a healthy compatible part for the culprit), `targetSeconds`, `explanation`. Run `npm test`.

## Gotchas
- Device JSON is fetched from `${BASE_URL}data/devices/`. Ids must match `^[a-z0-9-]+$`.
- `vite.config.ts` uses `base: './'` for static hosting under any sub-path. Do not change it to `/`.
- three.js loads only with the lazy `LabPage` chunk. Do not import from `src/scene` or `three` in `App.tsx` or `pages.tsx`.
- In dev, `loadDevice` runs the validator and logs problems with `console.warn`.
- Simulated failure behavior is simplified and for learning. Keep the disclaimer in the run overlay.
- `#/render/<device>` exists only in dev (`import.meta.env.DEV`). The match CLI starts its own Vite server on a random port, so it does not clash with `npm run dev`.

## Handoff
At the end of every session or task: add a dated entry at the top of `progress.md` (done, in progress, next, blockers), tick `plan.md`, update `todo.md`, and log real alternatives in `decisions.md`. Never delete history; mark old decisions "Superseded by ...".
