# Task board

How to use (people and agents):
1. Pick one `open` task in a lane you are allowed to touch (lanes are defined in `CLAUDE.md`).
2. Claim it: set **Status** to `in progress (your-name, YYYY-MM-DD)`. One claimed task per agent.
3. Stay inside the listed files. If you must touch another lane, say so in `progress.md`.
4. Done means the acceptance check passes and `npm test` and `npm run typecheck` are green.
5. Move the task to **Done** with the date, add a `progress.md` entry, tick `plan.md`.
6. New task ideas go to the bottom of **Open** with the next free ID.

## Open

### T-001 Verify the uncertain S23 Ultra components
- Lane: content (`public/data/devices/galaxy-s23-ultra.json`)
- Status: open (needs a human with teardown photos or a physical device)
- Work: check `main-camera`, `aux-cameras` (removal order relative to the motherboard cover) and `thermal-paste` (placement, and whether the vapor chamber belongs to the frame). Fix data if wrong. Set `verified: true` and remove the note. When all components are verified, set `verification.status` to `verified` and add the sources used.
- Accept: `npm test` passes; every component has `verified: true`; "Draft data" tag disappears in the lab.

### T-002 Static deploy
- Lane: ops (new `.github/workflows/*` or host config only)
- Status: open (blocked: owner must choose a host, e.g. GitHub Pages, Netlify, Cloudflare Pages)
- Work: build with `npm run build`, publish `dist/`. `base: './'` already supports sub-paths.
- Accept: the deployed URL loads the landing page and the lab; hash routes work after a reload.

### T-009 Shoot reference photos of a real Galaxy S23 Ultra
- Lane: match (`match/refs/galaxy-s23-ultra/` only)
- Status: open (needs a person with the phone; agents cannot take photos)
- Work: take `device-back`, `device-front`, `device-left`, `device-right` (and `device-top`, `device-bottom` if you can) following CLAUDE.md "Match loop" photo rules. Prefer PNG cut-outs with a transparent background. Add `match/refs/galaxy-s23-ultra/SOURCES.md` with who took each photo, when, and the phone colour.
- Accept: `npm run match -- render galaxy-s23-ultra --view <v>` shows the same orientation as each photo; `npm run match -- judge galaxy-s23-ultra` finds the object in every photo (no "no object found" hint).

### T-010 Self-test the match loop on your machine (no photos needed)
- Lane: match (writes only `match/out/`)
- Status: open for any agent on a new machine. Passed on the owner's machine on 2026-10-07 (94.7 -> 98.6).
- Work: run this chain. It moves the main camera lens in a copy of the device, renders that copy as a fake photo, then lets `tune` find the lens again.
```bash
mkdir -p match/out/selftest
node -e "const f=require('fs');const d=JSON.parse(f.readFileSync('public/data/devices/galaxy-s23-ultra.json','utf8'));const s=d.components.find(c=>c.id==='main-camera').shapes[1];s.pos[0]+=4;s.pos[1]-=3;s.size[0]-=1;f.writeFileSync('match/out/selftest/perturbed.json',JSON.stringify(d))"
npm run match -- render galaxy-s23-ultra --from match/out/selftest/perturbed.json --out match/out/selftest/device-back.png
npm run match -- judge galaxy-s23-ultra --refs match/out/selftest
npm run match -- tune galaxy-s23-ultra --refs match/out/selftest --parts main-camera --iters 60 --target 99
```
- Accept: `judge` prints a score below 97, finishes in about 10 s, and `tune` ends at least 3 points higher. If the browser does not start, set `TECHLAB_BROWSER` to an Edge or Chrome executable.

### T-011 Match the S23 Ultra exterior to the photos (Match Score >= 85 on every view)
- Lane: match, plus `apply` into `public/data/devices/galaxy-s23-ultra.json`
- Status: blocked by T-009 (photos)
- Work: run the loop until the Progress Judge says PASS. One round:
```bash
npm run match -- judge galaxy-s23-ultra
npm run match -- tune galaxy-s23-ultra --parts back-cover,main-camera,aux-cameras,display-frame --iters 120
npm run match -- status galaxy-s23-ultra
```
  - Verdict `IMPROVING`: tune again from the best design: `npm run match -- tune galaxy-s23-ultra --parts <same> --from match/out/galaxy-s23-ultra/device/best-device.json`.
  - Verdict `REDESIGN` or `STALLED`: redesign round (CLAUDE.md "Match loop", step 5). Read `match/out/galaxy-s23-ultra/device/<view>-overlay.png` and `<view>-report.json`, edit the shapes, `judge`, undo the edit if the score drops. Then tune again.
  - Verdict `REGRESSED`: undo the last edit, or `npm run match -- restore galaxy-s23-ultra` after an apply.
  - Verdict `PASS`: `npm run match -- apply galaxy-s23-ultra`, then `npm test`, then open `#/lab/galaxy-s23-ultra/explore` and check it by eye.
- Accept: `status` says PASS; `npm test` passes; the diff touches only `shapes`; the progress entry lists start and end scores per view.

### T-012 Match single parts from teardown photos
- Lane: match, plus `apply`
- Status: blocked (needs photos of removed parts: battery, motherboard, cameras, charging board)
- Work: photos named `<component-id>-back.png` etc. Same loop with `--part <component-id>`, for example `npm run match -- tune galaxy-s23-ultra --part battery`.
- Accept: each part's `status` says PASS.

### T-013 Match the iPhone 12
- Lane: match, plus `apply`
- Status: blocked (photos needed, and the device's sources must be checked first; see the owner's review notes)
- Work: same as T-009 and T-011 for `iphone-12`. Note: it opens from the front, so the `front` view matters most.
- Accept: as T-011.

## In progress
(none)

## Done
- 2026-10-17 T-015: Opt-in sound effects via Web Audio API (`src/audio/sound.ts`). Synthesizes 8 procedural sound effects (click, screw ratchets, component snap install, part lift removal, ascending boot chime, electrical short-circuit spark crackle, thermal-shutdown alarm, alert warning, and achievement arpeggio). Zero asset footprint. Opt-in toggle button in top bar and toolbar with localStorage persistence. Unit tested in `src/audio/sound.test.ts` (31/31 tests pass).
- 2026-10-16 T-014: Full photorealistic component texture and shape overhaul for iPhone 12. Generated and integrated high-resolution teardown textures for all remaining components: Super Retina XDR display (`screen_front.jpg`), rear chassis back glass with Apple logo (`rear_chassis.jpg`), MagSafe copper wireless charging coil with magnet array (`magsafe_coil.jpg`), bottom loudspeaker module (`loudspeaker.jpg`), Lightning connector flex cable assembly (`lightning.jpg`), TrueDepth infrared & selfie camera module (`truedepth.jpg`), and earpiece speaker & sensor assembly (`earpiece.jpg`). All 25 unit tests, content validation, and TypeScript check pass cleanly.
- 2026-10-15 Match loop review fixes: `judge` no longer waits 60 s after finishing; `tune` bounded by the published design across `--from` runs; `apply` copies only shapes; dead browser connection fails fast; `--refs` on another drive rejected. Lab slot fade now keeps each shape's opacity.
- 2026-10-07 Match Score loop tools: `src/match/judge.ts` (+ 5 tests), dev-only `#/render/<device>` page, `tools/match.mjs` (render, judge, tune, status, apply, restore). Self-test recovered a moved camera lens from 94.7 to 98.6. `apply` and `restore` checked: the diff touched one shape line and restore was byte-identical.
- 2026-10-07 T-007: Screws and tools as data — Added `FastenerSpec` interface and `fasteners?: FastenerSpec[]` to `Component` in `src/engine/types.ts`. Added validation rules in `src/engine/validate.ts` for fastener types/counts/tools. Added `componentFasteners` helper in `src/engine/engine.ts`. Displayed fastener tags and screw counts in `src/ui/lab/InfoPanel.tsx`. Added unit tests in `src/engine/engine.test.ts` (20/20 tests pass).
- 2026-10-07 T-008: Added `public/data/devices/iphone-12.json` (13 components, 7 spares, 3 repair cases `ip12-001`, `ip12-002`, `ip12-003`, 8 iFixit teardown sources) and set `"available": true` in `index.json`. Tests front-opening device teardown flow. All 19 tests pass cleanly in `validateDevice`.
- 2026-10-07 T-006: Added 3 new Galaxy S23 Ultra repair cases (`s23u-003` USB-C port, `s23u-004` display cable, `s23u-005` main camera OIS) and 6 matching spare parts (`charging-board-new`, `charging-board-damaged`, `screen-cable-new`, `screen-cable-damaged`, `main-camera-new`, `main-camera-damaged`). All pass `validateDevice` and `npm test`.
- 2026-10-07 T-004: WebGL fallback — `hasWebGL()` probe + `SceneBoundary` React error boundary in `LabPage.tsx`. Shows centered message in the stage when WebGL is unavailable or Canvas throws; all panels keep working. `.scene-fallback` CSS added to `styles.css`.
- 2026-10-07 T-003: Accessibility pass — CaseResult modal focus trap + Escape key; prefers-reduced-motion in 3D (no shake, no sparkles, instant camera moves, instant part lerp); battery status aria-live; parts list aria-label; dots aria-hidden. `.muted` contrast is 6.24:1 (AA pass, no colour change needed).
- 2026-10-07 T-005: `src/store/lab.test.ts` — 4 lab store tests (explore hot-unplug block, sandbox violation + spark, perfect s23u-001 repair scores 100, reset during run cancels score card). 18/18 tests pass.
- 2026-10-07 Scaffold, engine, validator, S23 Ultra draft data, 3D lab, three modes, game rules, pages, styles. Verified in the browser: explore teardown, sandbox short circuit, repair case s23u-001 scored 100.
