# Progress Log
Newest entry first. Each entry: Done / In progress / Next / Blockers.

## 2026-11-07 - T2: T-010 Match Loop Self-Test
- Done:
  - Fixed Windows file lock (`EBUSY: resource busy or locked`) when reading `DevToolsActivePort` in `tools/match.mjs` by adding retry logic when reading the port file and polling the DevTools HTTP `/json/list` endpoint.
  - Ran synthetic self-test chain on `galaxy-s23-ultra` using perturbed lens (`pos.x += 4`, `pos.y -= 3`, `size.x -= 1`).
  - Rendered baseline fake photo to `match/out/selftest/device-back.png`.
  - Ran `judge`: scored 94.7 (silhouette 1.0, edges 0.83, color 0.99, aspect 1.0; below the 97 threshold).
  - Ran `tune` with `--parts main-camera --iters 60 --target 99`: successfully recovered camera lens from 94.7 to 98.61 (+3.91 points, exceeding the required 3-point gain) in 42 iterations across 3 shape parameters.
  - Moved T-010 to Done in `todo.md`.
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 31 unit tests pass, typecheck clean, static build succeeds.
- Could not do: None.
- Unsure of: None.

## 2026-11-07 - T1: GitHub Actions CI Workflow
- Done:
  - Added `.github/workflows/ci.yml` with triggers on `push` and `pull_request`, running on `ubuntu-latest`, using `actions/checkout@v4` and `actions/setup-node@v4` (node-version 24, npm cache). Workflow runs `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Contains no secrets.
  - Added CI workflow badge to `README.md`: `![CI](https://github.com/surypratapsingh/techlab-repair-sim/actions/workflows/ci.yml/badge.svg)`.
- Tested:
  - Ran `npm ci && npm run typecheck && npm test && npm run build` locally; all commands exited with code 0 (31/31 unit tests passed, typecheck clean, static build generated in `dist/`).
- Could not do: None.
- Unsure of: None.

## 2026-10-17 - Opt-in Sound Effects Synthesizer (T-015)
- Done:
  - Created `src/audio/sound.ts`: pure procedural Web Audio API sound synthesizer with 8 sound types (button click, screwdriver ratchet, component snap install, part lift removal, ascending chord boot chime, electrical short-circuit buzz/crackle, thermal-shutdown alarm, diagnostic warning tone, and achievement arpeggio). Zero asset files or network weight.
  - Implemented opt-in sound preference with localStorage persistence (`techlab-sound`, default muted `false`).
  - Added interactive `SoundToggle` button in the top bar (`src/ui/App.tsx`) and lab toolbar (`src/ui/lab/Controls.tsx`).
  - Wired sound events into the lab session store (`src/store/lab.ts`) for component removal/install, power connection, short-circuit violations, test runs, and achievement unlocks.
  - Added unit test suite in `src/audio/sound.test.ts` (tested mute state, toggle listeners, persistence, AudioContext absence, and audio node synthesis).
  - Verification: all 31 unit tests pass (`npm test`), TypeScript check is clean (`npm run typecheck`), and production build compiles (`npm run build`).
- In progress: nothing.
- Next: T-009 (owner takes S23 Ultra reference photos), T-001 (verify S23 Ultra components).
- Blockers: T-009 needs a person with the physical S23 Ultra.

## 2026-10-16 - iPhone 12 Photorealistic Component and Texture Overhaul (T-014)
- Done:
  - Generated and integrated ultra-detailed photorealistic teardown textures for all remaining iPhone 12 components:
    - Super Retina XDR Display: Front screen with slim bezels, notch, speaker slit, front cameras, and iOS lockscreen UI (`public/textures/screen_front.jpg`) + rear stainless steel heat shield plate (`#c4c8cc`).
    - Rear chassis: Glossy black glass back with centered Apple logo, camera plateau with dual lenses and True Tone flash, plus aerospace aluminum rail geometry (`public/textures/rear_chassis.jpg`).
    - MagSafe wireless charging coil: Copper spiral induction coil surrounded by 18 neodymium alignment magnets and connector ribbon (`public/textures/magsafe_coil.jpg`).
    - Bottom loudspeaker module: Acoustic chamber housing with APN markings, mesh grill, and connector flex (`public/textures/loudspeaker.jpg`).
    - Lightning connector assembly: Lower flex cable with silver Lightning port bracket, microphone, and antenna contacts (`public/textures/lightning.jpg`).
    - TrueDepth camera & Face ID module: Precision metal bracket housing the infrared camera, selfie camera with multi-coated optical reflection, Face ID dot projector, and flex cable (`public/textures/truedepth.jpg`).
    - Earpiece speaker & sensor assembly: Earpiece speaker module with acoustic mesh, ambient light/proximity sensors, and connector ribbons (`public/textures/earpiece.jpg`).
  - Updated `public/data/devices/iphone-12.json` with texture mapping and cleaned up legacy procedural primitives that previously obstructed visual textures.
  - Verification: `npm test` (25 tests passing), `npm run typecheck`, and production static build `npm run build` all pass cleanly.
- In progress: nothing.
- Next: T-009 (owner takes S23 Ultra reference photos), T-001 (verify S23 Ultra components).
- Blockers: T-009 needs a person with the physical S23 Ultra.

## 2026-10-15 - Match loop fixes from the 2026-10-10 review
- Done:
  - `tools/match.mjs`: the render timeout timer is cleared, so `judge` takes 6 s instead of 63 s. CDP calls fail when the browser connection closes instead of hanging forever. `--refs` on another drive is rejected. `tune` is bounded by the published design across chained `--from` runs (checked: two chained runs with `--max-delta 1` stayed exactly 1 mm from the published values). `apply` copies only `shapes` (checked on both device files: a stale `name` and `info` in `best-device.json` were not written; `restore` was byte-identical; the plain-formatted file keeps its missing final newline).
  - `src/scene/LabScene.tsx`: the slot fade now multiplies each shape's own `opacity`, and opaque parts become transparent while fading. Checked in the browser: iPhone 12 glass keeps 0.65 to 0.85; removing the display fades it (0.65 to 0.27 to 0.08). No console errors.
  - CLAUDE.md "Match loop" rules and a decision entry updated.
  - `npm test` (25 tests) and `npm run typecheck` pass. Self-test chain (T-010) still passes: 94.7 to 95.98 with `--max-delta 1`.
- In progress: nothing.
- Not done (low value): `VIEW_AXES` ignores `rot`. Only one S23 Ultra shape is rotated (inside the frame, hidden in every exterior view).
- Next: T-009 (owner takes photos), then T-011. Earlier review items still need the owner's OK (see the 2026-10-07 entry, item 3). `git init` is needed before `/code-review ultra` can run.
- Blockers: T-009 needs a person with the phone.

## 2026-10-10 - Review of the match loop (read-only, no code changed)
- Done: reviewed `tools/match.mjs`, `src/match/*`. Timed `judge` on the synthetic self-test: score 94.7 (same as before), wall time 63 s.
- Findings, waiting for the owner's OK to fix:
  1. `tools/match.mjs:176` the 60 s timeout timer is never cleared, so every command waits about 60 s after it finishes. Fix: `clearTimeout` when the run settles.
  2. `apply` writes the whole `best-device.json`. `iphone-12.json` is plain `JSON.stringify` format, so edits made after a tune (specs, cases, sources) are silently reverted. Fix: copy only `shapes` from the best design into the current file.
  3. `tune --from` takes its ±max-delta bounds from the `--from` file, so chained runs can drift without limit from the researched values. Fix: always bound against the published file.
  4. `LabScene.tsx:98` the slot fade overwrites shape `opacity` (4 iPhone 12 shapes use it). The render page honours it, so the judge scores a look the lab never shows.
  5. Low: `--refs` on another Windows drive passes the inside-project check (`path.relative` returns an absolute path); `VIEW_AXES` ignores `rot` (1 S23 Ultra shape); CDP `send` has no timeout, so a dead socket hangs forever (possible cause of the earlier hang).
- Next: owner decides on the fixes above; then T-009 (photos), T-011.
- Blockers: same as the entry below.

## 2026-10-07 - Match Score loop (3D model vs photos of the real object)
- Done:
  - `src/match/judge.ts`: Match Score Judge (0..100 = 35% silhouette IoU, 30% inner edges, 20% colour, 15% aspect). Finds the object from alpha or from the border colour (Otsu). Returns the worst 3x3 regions with hints and an overlay image (photo | model | difference). 5 unit tests in `judge.test.ts`.
  - `src/match/RenderView.tsx`: dev-only route `#/render/<device>`. Orthographic views back/front/left/right/top/bottom, the lab's own `ShapeMesh` and `Lights` (both now exported from `LabScene.tsx`). Exposes `window.techlabMatch.run()`. Not in production builds (checked in `dist/`).
  - `tools/match.mjs` (`npm run match -- ...`): `render`, `judge`, `tune` (hill climb + Progress Judge), `status`, `apply` (validator + backup, keeps the hand-formatted JSON layout), `restore`. Starts its own Vite server and headless Edge; no new dependencies.
  - Self-test on this machine: moved the main camera lens by 4/-3 mm and shrank it 1 mm, rendered that as a fake photo, judged 94.7, `tune` reached 98.61 in 42 iterations (~17 s). `apply` changed exactly one shape line; `restore` was byte-identical.
  - Docs: CLAUDE.md "Match loop" (photo rules, command chain, rules) and the new **match** lane; plan.md "Track: Model fidelity"; todo.md T-009 to T-013; two decisions.
  - `npm test` (25 tests) and `npm run build` (includes typecheck) pass. The lab page still renders with no console errors.
- In progress: nothing.
- Next (in this order):
  1. T-009: the owner photographs a real S23 Ultra (back, front, left, right) into `match/refs/galaxy-s23-ultra/`. Agents cannot do this step.
  2. T-011: run the loop on those photos until `npm run match -- status galaxy-s23-ultra` says PASS, then `apply` and `npm test`.
  3. Still open from the earlier review, waiting for the owner's OK: iPhone 12 sources are unverified but marked `verified: true`; no git repository; rendering bugs (slot fade overrides shape opacity, black metal without an environment map).
- Blockers: T-009 needs a person with the phone. Real-photo scoring is untested until then; busy backgrounds may need PNG cut-outs.

## 2026-10-07 - iPhone 12 & S23 Ultra Photorealistic 3D Shape Overhaul
- Done:
  - Extended `Shape` interface in `src/engine/types.ts` with optional per-primitive `metalness`, `roughness`, and `opacity` parameters.
  - Updated `ShapeMesh` in `src/scene/LabScene.tsx` to render metallic reflections, glossy glass, and transparent layers.
  - Re-modeled every iPhone 12 component with realistic multi-primitive geometry:
    - **A14 Bionic Logic Board**: L-shaped green PCB, EMI shield cans, A14 processor heat spreader package, and gold flex connector headers.
    - **Dual 12 MP Camera Module**: Dual metallic lens bezels, optical glass elements, True Tone flash, and mic port.
    - **MagSafe Wireless Coil**: Dual concentric copper coil rings and magnet alignment backing.
    - **Super Retina XDR Display**: Ceramic Shield cover glass, OLED panel (`screen: true`), camera/speaker notch cutout bar, speaker mesh, and home bar indicator.
    - **Taptic Engine**: Brushed aluminum body with acoustic resonant ridges and gold contact pads.
    - **Battery**: Matte black pouch wrapper, BMS circuit header, silver pull tabs, and printed text.
    - **Lightning Connector & Enclosure**: Flat-edge aerospace aluminum rails, Lightning socket, lower mic rubber boots, and camera bump.
  - Verified `npm test` (20/20 passing), `npm run typecheck`, and `npm run build`. Live dev server running on `http://localhost:5173/`.


- Done:
  - Documented design decision in `decisions.md` for structured fasteners and tool requirements schema.
  - Defined `FastenerSpec` interface and added optional `fasteners?: FastenerSpec[]` field to `Component` in `src/engine/types.ts`.
  - Added schema validation rules to `src/engine/validate.ts` (verifying fastener types, positive screw counts, and known tool IDs).
  - Added `componentFasteners` helper function in `src/engine/engine.ts` to compute screw counts and tool requirements.
  - Enriched device JSON files (`public/data/devices/galaxy-s23-ultra.json` and `iphone-12.json`) with structured fastener & tool data.
  - Updated `src/ui/lab/InfoPanel.tsx` to display fastener tags and screw counts when inspecting components.
  - Added unit tests in `src/engine/engine.test.ts` (20/20 tests passing). `npm test`, `npm run typecheck`, and `npm run build` pass cleanly.
- In progress: nothing.
- Next (in this order):
  1. T-001: a person verifies `main-camera`, `aux-cameras` and `thermal-paste`.
  2. T-002: deploy after the owner picks a host.
- Blockers: T-001 needs a person with teardown photos. T-002 needs a hosting choice.


- Done:
  - Added `public/data/devices/iphone-12.json` describing Apple's front-opening flagship phone (13 components, 7 spare parts, 3 repair cases `ip12-001`, `ip12-002`, `ip12-003`, 8 iFixit teardown sources).
  - Proved that the Device Simulation Engine schema and validator handle front-opening devices (screws/adhesive on screen, screen opening like a book to expose the logic board bracket, battery connector under shield plate) without needing any engine code changes.
  - Set `"available": true` for `iphone-12` in `public/data/devices/index.json`.
  - All 19 tests pass in `npm test` (including validator tests for stock boot, teardown/rebuild, and all 3 repair cases). `npm run typecheck` and `npm run build` pass clean.
- In progress: nothing.
- Next (in this order):
  1. T-007: Screws and tools as data (V1.1).
  2. T-001: a person verifies `main-camera`, `aux-cameras` and `thermal-paste`.
  3. T-002: deploy after the owner picks a host.
- Blockers: T-001 needs a person with teardown photos. T-002 needs a hosting choice.


- Done:
  - Added 3 new realistic repair cases to `public/data/devices/galaxy-s23-ultra.json`:
    - `s23u-003` ("The Loose Plug"): faulty USB-C charging daughterboard causing no wired charging or data transfer.
    - `s23u-004` ("Vibrations Without Vision"): torn display flex cable causing pitch black screen despite healthy display & vibration.
    - `s23u-005` ("Shaky Shutter"): main 200 MP camera OIS motor failure from handlebar vibrations/impacts. Includes decoy spare.
  - Added 6 corresponding spare parts (`charging-board-new`, `charging-board-damaged`, `screen-cable-new`, `screen-cable-damaged`, `main-camera-new`, `main-camera-damaged`).
  - `validateDevice` tested all 5 cases: verified setup failure, spare compatibility, and clean boot recovery. `npm test` and `npm run typecheck` pass cleanly.
- In progress: nothing.
- Next (in this order):
  1. T-007: Screws and tools as data (V1.1).
  2. T-008: iPhone 12 (V2).
  3. T-001: a person verifies `main-camera`, `aux-cameras` and `thermal-paste`.
  4. T-002: deploy after the owner picks a host.
- Blockers: T-001 needs a person with teardown photos. T-002 needs a hosting choice.


- Done:
  - `CaseResult` modal: `useRef` + `useEffect` focus trap (Tab/Shift+Tab cycles within the dialog; focus moves to first focusable element on open); Escape key triggers Replay/reset.
  - `prefers-reduced-motion` in `LabScene.tsx`: shake amplitude zeroed (`Rig`), `<Sparkles>` and `<Smoke>` suppressed (`Effects`), camera transitions set to instant (`CameraRig`), part lerp factor set to 1 (instant snap, `Slot`). All guarded by a `reducedMotion()` helper that calls `window.matchMedia` on each frame (cheap query, no listener needed because R3F re-renders on each frame anyway).
  - `PartsPanel`: battery status wrapped in `aria-live="polite"` span; status dot `aria-hidden="true"`; parts list `ul` gets `aria-label="Component list"`. Keyboard walkthrough confirmed: Tab into the parts list → Enter to select → Tab to InfoPanel buttons (Remove, Mark as faulty, Install) → Tab to Toolbar (Run device) — all reachable without a mouse.
  - `.muted` (`#8b9bb0`) on `.panel` (`#121922`) contrast = 6.24:1. AA passes for both normal and large text — no colour change needed.
  - `npm test` exits 0, 18/18 pass. `npm run typecheck` clean.
- In progress: nothing.
- Next (in this order):
  1. T-004: WebGL fallback message in the lab stage.
  2. T-001: a person verifies `main-camera`, `aux-cameras` and `thermal-paste`.
  3. T-002: deploy after the owner picks a host.
- Blockers: T-001 needs a person with teardown photos. T-002 needs a hosting choice.


- Done:
  - Added `src/store/lab.test.ts` with 4 vitest covering all scripted flows: explore blocks hot-unplug of an electrical part (strict mode), sandbox allows it but records a violation and fires a spark, full s23u-001 battery repair with no violations scores `repair.done.total === 100` after `RUN_MS` using fake timers, and resetting during the boot animation cancels the score card.
  - Stubbed `localStorage` globally so zustand/persist does not throw. Used `useLab.setState()` / `useProgress.setState()` between tests to keep state isolated without dynamic module re-imports.
  - Key finding: with vitest fake timers `Date.now()` is frozen; the reset-cancels-score test must advance time by 1ms before calling `reset()` so the new session gets a different `startedAt` than the one captured in the `setTimeout` closure.
  - `npm test` exits 0 with 18/18 passing. `npm run typecheck` clean. The zustand persist stderr warnings about localStorage are noise (the middleware falls back gracefully; tests still pass).
- In progress: nothing.
- Next (in this order):
  1. T-003: accessibility pass (modal focus trap and Escape, reduced motion in 3D, keyboard-only repair run).
  2. T-004: WebGL fallback message in the lab stage.
  3. T-001: a person verifies `main-camera`, `aux-cameras` and `thermal-paste`.
  4. T-002: deploy after the owner picks a host.
- Blockers: T-001 needs a person with teardown photos. T-002 needs a hosting choice.


- Done:
  - Scaffold (Vite 8, React 19, TS 7, React Three Fiber, zustand, vitest). Static build with `base: './'`.
  - Engine (`src/engine`): schema, removal order, battery safety, compatibility, damage, run outcomes, temperature. The validator proves content is consistent and every case is solvable.
  - Content: Galaxy S23 Ultra draft (16 components, 7 spares, cases s23u-001 and s23u-002, 8 iFixit sources). 3 components are `verified: false`.
  - 3D lab, Explore / Sandbox / Repair modes, XP, levels, 9 achievements, case scoring, localStorage saves.
  - Pages: landing, library, repair cases, progress. Responsive layout. three.js loads only on lab pages.
  - Checks: `npm run typecheck`, `npm test` (14 tests) and `npm run build` pass. Browser check: Explore blocks a hot unplug and a full teardown works; Sandbox with a punctured battery gives a short circuit with smoke; Repair case s23u-001 completed end to end and scored 100/100; mobile width has no horizontal scroll; no console errors.
  - Docs: `plan.md`, `todo.md`, `decisions.md`, `CLAUDE.md`, `AGENTS.md`. Dev server config is in `.claude/launch.json`.
- In progress: nothing.
- Next (in this order):
  1. T-005: add `src/store/lab.test.ts` (scripted flows with fake timers).
  2. T-003: accessibility pass (modal focus trap and Escape, reduced motion in 3D, keyboard-only repair run).
  3. T-004: WebGL fallback message in the lab stage.
  4. T-001: a person verifies `main-camera`, `aux-cameras` and `thermal-paste`, then the device is marked verified.
  5. T-002: deploy after the owner picks a host.
- Blockers: T-001 needs a person with teardown photos. T-002 needs a hosting choice. The project is not a git repository yet; run `git init` only with the owner's OK.

## 2026-10-07 - Project started
- Done: memory files created
- Next: fill in plan.md
