# Progress Log
Newest entry first. Each entry: Done / In progress / Next / Blockers.

## 2026-11-09 - Ops: vitest timeout (branch friend/fix-test-timeout, cut from main)
- Done: `vite.config.ts` uses `vitest/config` and sets `test.testTimeout` to 30 s. `src/match/judge.test.ts` timed out at the 5 s default under `nice -n 19` on a shared PC (with and without other changes).
- Tested: typecheck clean, `npm test` 64/64.

## 2026-11-08 - H-TECH lane: missing tests
- Done:
  - `src/store/progress.test.ts`: XP for discover, case replay, achievement unlock, course bonus (4 tests).
  - `src/data.test.ts`: bad device id rejected before fetch; index load (2 tests).
  - F2 FAIL check: no FAIL line for a TechLab commit. Nothing to fix.
  - `src/engine/validate.ts`: already exercised by `engine.test.ts` on every device JSON. No new test.
- Tested: `npm test` 64/64, `npm run typecheck` clean.
- Blocked (owner): T-001, T-002, T-009, T-011, T-012, T-013 (photos, teardown check, host choice). Not touched.
- Unsure: plan "Cross-device parts and compatibility experiments" has no spec. Not started.
- Next: owner input on the blocked items above. Cross-device spec if owner wants it.

## 2026-11-08 - Final Summary: Wave 2 Complete (T7 - T10)
- Status: All Wave 2 items (T7, T8, T9, T10) successfully completed, thoroughly verified, and committed locally.
- T7 (Laptop Research): Authored `docs/research-laptop-thinkpad-t14.md` for Lenovo ThinkPad T14 Gen 3 following `docs/content-pipeline.md` with 3-source checklist (`src-lenovo-psref`, `src-ifixit-t14`, `src-laptopmedia-teardown`), component disassembly DAG, fastener specs, and proposed repair cases. No device JSON added in T7.
- T8 (Laptop Device Data): Created `public/data/devices/thinkpad-t14.json` using the existing engine schema (8 components: `bottom-cover`, `battery`, `ssd`, `ram`, `fan`, `motherboard`, `keyboard`, `display`) with fastener specs and verified sources. Enabled `"available": true` in `index.json`. Engine schema proved completely sufficient; 0 engine modifications required.
- T9 (Laptop Repair Cases): Added 6 spare parts and 3 repair cases (`t14-001` battery swap, `t14-002` SSD upgrade, `t14-003` fan cleaning). Validated in tests and verified in live headless browser (Edge via CDP) across all 3 cases at both 375 px (mobile) and 1280 px (desktop) viewports with zero console errors.
- T10 (glTF Option with Procedural Shapes Fallback): Verified `GLTFLoader` already available in bundled `three` package (0 new dependencies added). Added optional `gltf?: string` field to `Component` in `src/engine/types.ts` and validator in `src/engine/validate.ts`. Handcrafted test glTF model `public/models/test-cube.gltf` with valid PBR mesh geometry (no external assets). Implemented `ComponentVisual` in `src/scene/LabScene.tsx` with automatic procedural shapes fallback upon omission or error. Authored unit test suite in `src/scene/gltf.test.ts` (10/10 tests pass). Documented in `decisions.md` and ticked `plan.md`.
- Quality gates:
  - `npm run typecheck`: clean (0 errors)
  - `npm test`: 8/8 test suites pass (58 unit tests passed)
  - `npm run build`: static production bundle built cleanly in `dist/`

## 2026-11-08 - T10: glTF Option with Procedural Shapes Fallback
- Done:
  - Verified `GLTFLoader` is already present in the existing `three` dependency without adding any npm packages.
  - Documented architectural decision in `decisions.md`.
  - Added optional `gltf?: string` field to `Component` interface in `src/engine/types.ts`.
  - Added validation rule in `src/engine/validate.ts` ensuring `gltf` path is a non-empty string when provided.
  - Handcrafted calibration glTF 2.0 test model `public/models/test-cube.gltf` with embedded base64 buffer, PBR material, 8 vertices, and 36 indices (no downloaded models).
  - Created `src/scene/gltf.ts` providing `resolveVisualMode`, `resolveGltfUrl`, and `loadGltf`.
  - Implemented `ComponentVisual` in `src/scene/LabScene.tsx` to conditionally render glTF models while gracefully falling back to procedural shapes upon omission or network/parsing error.
  - Added unit test suite in `src/scene/gltf.test.ts` testing fallback state resolution, URL handling, glTF parsing of handcrafted test model, and error fallback (10/10 tests pass).
  - Ticked `plan.md` for "glTF model option per component, procedural shapes stay as fallback".
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 8 test suites pass (58 tests), typecheck clean, production build clean.
- Could not do: None.
- Unsure of: None.

## 2026-11-08 - T9: Laptop Repair Cases (ThinkPad T14)
- Done:
  - Added 6 spare parts to `public/data/devices/thinkpad-t14.json`: `battery-healthy`, `battery-swollen` (damaged), `ssd-fast`, `ssd-corrupt` (damaged), `fan-clean`, `fan-clogged` (damaged).
  - Added 3 repair cases to `thinkpad-t14.json`:
    1. `t14-001` (Swollen Cell Syndrome): battery degradation causing unexpected shutdowns under load, solvable with `battery-healthy`.
    2. `t14-002` (Storage Detection Failure): NVMe controller failure with 2100 error, solvable with `ssd-fast`.
    3. `t14-003` (Thermal Exhaust Blockage): clogged thermal fan bearings causing thermal throttling and emergency shutdown, solvable with `fan-clean`.
  - Verified in headless browser (Edge via CDP) across all 3 repair cases at both 375 px (mobile) and 1280 px (desktop) viewports: all cases loaded with zero console errors.
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 7 test suites pass (48 tests proving every case starts unbootable and solves to clean boot with spare), typecheck clean, static build clean.
  - Browser verification script: checked `#/lab/thinkpad-t14/repair/t14-001`, `t14-002`, `t14-003` at 375x667 and 1280x800; 0 console errors logged.
- Could not do: None.
- Unsure of: None.

## 2026-11-08 - T8: Laptop Device Data (Lenovo ThinkPad T14)
- Done:
  - Created `public/data/devices/thinkpad-t14.json` using the existing engine schema without modifications:
    - 8 components: `bottom-cover`, `battery` (powerSource, connectorAccess, connectsTo), `ssd` (M.2 NVMe), `ram` (SO-DIMM), `fan` (blower & heatsink), `motherboard`, `keyboard` (integrated chassis), `display` (14" WUXGA panel).
    - Structured fasteners with Phillips #00 screws, clips, spudgers, and counts.
    - All facts verified against 3 sources (`src-lenovo-psref`, `src-ifixit-t14`, `src-laptopmedia-teardown`).
    - Verified status set to `draft` until full manual photo match.
  - Enabled `"available": true` for `thinkpad-t14` in `public/data/devices/index.json`.
  - Schema expresses laptop hardware cleanly; no engine or schema alterations required.
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 7 test suites pass (48 tests including `thinkpad-t14 passes validation` verifying clean boot and full strict teardown & reassembly), typecheck clean, production build clean.
- Could not do: None.
- Unsure of: None.

## 2026-11-08 - T7: Laptop Research (Lenovo ThinkPad T14 Gen 3)
- Done:
  - Researched hardware architecture and teardown specifications for Lenovo ThinkPad T14 Gen 3 following `docs/content-pipeline.md`.
  - Authored `docs/research-laptop-thinkpad-t14.md` containing complete research dossier:
    - Device metadata (dimensions 317.7 x 226.9 x 17.9 mm, Intel 12th/13th Gen, 52.5 Wh battery, M.2 2280 NVMe SSD, SO-DIMM expansion slot, heatsink/fan unit, integrated keyboard chassis).
    - Three-source checklist with IDs and canonical URLs: `src-lenovo-psref` (official PSREF/manual), `src-ifixit-t14` (primary teardown guide), `src-laptopmedia-teardown` (independent lab disassembly).
    - Detailed component breakdown, DAG order (base cover -> battery/SSD/RAM/fan -> motherboard -> keyboard), fastener specs (Phillips #00 screws, clips, spudger tool), and electrical rules.
    - Proposed spare parts and 3 proposed repair cases (battery swap, SSD upgrade, fan cleaning).
  - Maintained repository strictly free of device JSON for T7.
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 7 test suites pass (47 tests), typecheck clean, static production build succeeds.
- Could not do: None.
- Unsure of: None.

## 2026-11-07 - Final Summary: Autonomous Session (T1 - T6 Complete)
- Status: All items (T1 through T6) successfully completed, verified, and committed locally.
- T1 (CI Workflow & Badge): Added `.github/workflows/ci.yml` (Ubuntu, Node 24, checkout@v4, setup-node@v4 with cache, npm ci, typecheck, test, build) and CI badge to `README.md`.
- T2 (T-010 Match Loop Self-Test): Fixed Windows `EBUSY` file locking on `DevToolsActivePort` with retry polling; executed synthetic self-test (lens perturbation scored 94.7, tune recovered to 98.61 in 42 iterations); moved T-010 to Done in `todo.md`.
- T3 (Content Pipeline & Validation): Wrote `docs/content-pipeline.md` (research template, 3-source checklist with IDs, reviewer checklist); updated `src/engine/validate.ts` to enforce valid source citations for `verified: true` components with unit test in `engine.test.ts`. Documented architectural decision in `decisions.md`.
- T4 (Google Pixel 7): Created `public/data/devices/pixel-7.json` (13 components, 4 spares, 2 cases, fully sourced); added to `index.json`; verified in browser via dev server with full teardown, battery isolation, reassembly, and boot test (`ok: true`).
- T5 (Daily Repair Challenge): Created `src/game/daily.ts` with 32-bit Murmur-style avalanche hash, date arithmetic, streak tracking across months/leap years/missed days; persisted `daily` scores and `dailyStreak` in `useProgress` (v2 migration); added daily challenge card to Cases page; unit tests in `src/game/daily.test.ts`.
- T6 (Interactive Starter Course): Created `src/game/courses.ts` with 5-step "Phone battery safety" guided interactive course on Galaxy S23 Ultra using Explore mode actions; persisted course progress in `useProgress` (v3 migration) with +50 XP bonus; created `CourseGuide` component in lab, course card in Library, and course tracker in ProgressPage; unit tests in `src/game/courses.test.ts` (8/8 tests pass). Engine types schema remained 100% untouched.
- Quality gates:
  - `npm run typecheck`: clean (0 errors)
  - `npm test`: 7/7 test suites pass (47 tests passed)
  - `npm run build`: static production bundle built cleanly in `dist/`

## 2026-11-07 - T6: Interactive Starter Course ("Phone Battery Safety")
- Done:
  - Implemented starter interactive course "Phone battery safety" in `src/game/courses.ts` consisting of 5 guided steps on `galaxy-s23-ultra` using existing Explore mode actions (`select`, `remove`, `power`):
    1. Inspect battery hazard and specifications (`select('battery')`).
    2. Remove back cover to access phone interior (`remove('back-cover')`).
    3. Remove wireless charging coil assembly shielding battery connector (`remove('coil-speaker')`).
    4. Disconnect battery power before touching motherboard electronics (`power(false)`).
    5. Safely extract battery cell with zero safety violations (`remove('battery')` with 0 violations).
  - Maintained `src/engine/types.ts` strictly unchanged (no schema changes needed).
  - Extended `src/store/progress.ts` to store `courses: Record<string, number>` in `localStorage` under `techlab-progress`, bumping persist version to 3 with migration and awarding a 50 XP completion bonus.
  - Created `src/ui/lab/CourseGuide.tsx` providing in-lab step guidance, instructions, safety context explanations, dynamic completion detection, progress bar, and completion actions.
  - Integrated `CourseGuide` into `src/ui/lab/LabPage.tsx` active in Explore mode when `?course=phone-battery-safety` is present.
  - Added "Interactive courses" card section to `Library()` in `src/ui/pages.tsx` when browsing in Explore mode, showing real-time step progress and navigation.
  - Added course completion status to `ProgressPage()` in `src/ui/pages.tsx`.
  - Added dedicated styling for courses and guide panels in `src/styles.css`.
  - Added unit tests in `src/game/courses.test.ts` verifying each step check, end-to-end simulation using real S23 Ultra device and engine rules, and progress persistence.
  - Ticked `plan.md` for Interactive hardware courses.
- Tested:
  - Ran `npm run typecheck`, `npm test`, and `npm run build`: all 7 test files pass (47 unit tests), TypeScript typecheck clean, Vite production build clean.
- Could not do: None.
- Unsure of: None.

## 2026-11-07 - T5: Daily Repair Challenge
- Done:
  - Created `src/game/daily.ts` with deterministic avalanche `hashString`, calendar date utilities, `calculateStreak`, and `pickDailyCase`.
  - Extended `src/store/progress.ts` to persist daily scores map and `dailyStreak` to localStorage under `techlab-progress` with version 2 migration.
  - Added Daily challenge card to Cases page in `src/ui/pages.tsx` showing date, streak, today's case, and replay/play actions.
  - Added daily challenge completion hook in `src/store/lab.ts` to record daily score on repair clear.
  - Added daily streak indicator to ProgressPage in `src/ui/pages.tsx`.
  - Styled daily card, metadata, highlight tag, and streak badge in `src/styles.css`.
  - Added unit tests in `src/game/daily.test.ts` covering deterministic selection, 60-day distribution across all 10 cases, month-end/leap-year/missed-day streak math, and progress store recording.
  - Ticked `plan.md` for Daily repair challenge.
- Tested:
  - Ran `npm run typecheck`, `npm test`, and `npm run build`: 6/6 test files pass (39 tests), TypeScript typecheck clean, Vite production build clean.
- Could not do: None.
- Unsure of: None.

## 2026-11-07 - T4: Google Pixel 7 Device and Repair Cases
- Done:
  - Researched Google Pixel 7 hardware architecture using iFixit screen & battery replacement guides, Google Store official specifications, and PBKreviews disassembly.
  - Added `public/data/devices/pixel-7.json` (content lane only, engine unchanged):
    - 13 components with front-opening assembly order: `screen`, `sim-tray`, `display-cable-bracket`, `midframe-bracket`, `battery-connector-bracket`, `battery`, `front-camera`, `rear-cameras`, `motherboard`, `loudspeaker`, `thermal-paste`, `wireless-charging-coil`, `rear-chassis`.
    - Unconfirmed SoC thermal paste parameters set to `verified: false` with explanatory `note`; device verification status set to `"draft"`.
    - Added 4 spare parts (`battery-new`, `battery-degraded`, `screen-new`, `screen-damaged`).
    - Added 2 repair cases: `p7-001` (Swollen Cell Syndrome) and `p7-002` (Cracked Canvas).
  - Added `pixel-7` to `public/data/devices/index.json` with `"available": true`.
  - Ticked `plan.md` for "One more Android phone".
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 33 unit tests pass (including content validator tests proving stock boot, strict teardown & reassembly, and both repair cases solvable with spares).
  - Browser test in headless Edge on live Vite dev server: navigated to `#/lab/pixel-7/explore`, executed strict-mode teardown across all 13 components, verified power cut when connector became accessible, reassembled in reverse order with power reconnection, and ran device test run (`ok: true`, 29 log events).
- Could not do: None.
- Unsure of: None.

## 2026-11-07 - T3: Content Pipeline and Source Citation Validation
- Done:
  - Authored `docs/content-pipeline.md`: (a) complete research template mapping directly to `src/engine/types.ts` device schema; (b) source checklist requiring primary teardown guide (iFixit), maker specification page, and an independent third source (e.g. PBKreviews/FCC), with mandatory source ID tagging; (c) review protocol detailing author, technical, and model reviewer roles and criteria for promoting components to `verified: true` and devices to `status: "verified"`.
  - Added optional `id?: string` to `Source` and optional `sources?: string[]` and `sourceId?: string` to `Component` in `src/engine/types.ts`. Documented architectural decision in `decisions.md`.
  - Extended `src/engine/validate.ts` to reject any component that is `verified: true` but cites no source ID that exists in the device's sources list (when sources are cited or when `device.verification.status === 'verified'`), and verify that all cited source IDs match `device.verification.sources`.
  - Added unit test in `src/engine/engine.test.ts` verifying validator rejection of a verified component citing a non-existent source ID.
  - Ticked `plan.md` for Content pipeline.
- Tested:
  - `cmd.exe /c "npm run typecheck && npm test && npm run build"`: all 32 unit tests pass, typecheck clean, static build succeeds.
- Could not do: None.
- Unsure of: None.

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
