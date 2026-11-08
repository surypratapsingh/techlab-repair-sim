# Decision Log
Format per entry:
## YYYY-MM-DD - Decision title
- Decision:
- Context:
- Alternatives rejected:
- Consequences:

## 2026-10-07 - Static web stack: Vite + React + TypeScript + React Three Fiber + zustand
- Decision: Single-page static site. Vite 8, React 19, TypeScript, three.js through @react-three/fiber and drei, zustand for state, vitest for tests.
- Context: V1 has no accounts and no server data. 3D is the core of the product. React Three Fiber lets the 3D view react to the same state as the panels.
- Alternatives rejected: Next.js (server features not needed); Babylon.js (smaller React ecosystem); plain three.js with manual DOM code (more glue); Redux (more boilerplate than zustand).
- Consequences: Any static host works. three.js adds about 260 kB gzip, loaded only on lab pages.

## 2026-10-07 - Devices are data; the engine is pure TypeScript
- Decision: Device content lives in `public/data/devices/*.json` and follows the schema in `src/engine/types.ts`. Rules live in `src/engine/engine.ts` with no React, DOM or device-specific ids.
- Context: The product plan requires a "Device Simulation Engine" where new devices are content, not code.
- Alternatives rejected: hand-coded logic per device; bundling device JSON into the JS (content edits would touch the code bundle); a CMS or database (needs a server).
- Consequences: Content authors work only in JSON. Schema changes need a decision entry and validator updates.

## 2026-10-07 - Content validator proves every device and repair case is consistent and solvable
- Decision: `validateDevice` checks references, cycles, a single power source, that the stock device boots cleanly, that a strict-mode teardown and rebuild succeeds, and that every repair case can be fixed with its spares. `npm test` runs it on every device file.
- Context: Many people and agents will write content. Broken content must fail in tests, not in the player's browser.
- Alternatives rejected: JSON Schema only (cannot check game logic such as solvability); manual review only.
- Consequences: Any new engine rule needs a matching validator check.

## 2026-10-07 - First device: Galaxy S23 Ultra, sourced from iFixit, status "draft"
- Decision: Build V1 on the Galaxy S23 Ultra. Removal order, fastening and connectors come from 8 iFixit guides, fetched through the iFixit public API because web search was unavailable in this session. Three components stay `verified: false`.
- Context: The plan recommends the S23 Ultra or iPhone 12 because their teardown data can be verified. The S23 Ultra has complete iFixit coverage and opens from the back, which is the simpler first case.
- Alternatives rejected: iPhone 12 first (opens from the front, more complex screen removal); Galaxy S26 Ultra (not enough verified teardown data).
- Consequences: The lab shows a "Draft data" tag until a person verifies the remaining components (todo T-001).

## 2026-10-07 - Procedural 3D geometry for V1 instead of glTF models
- Decision: Each component is drawn from boxes and cylinders defined in its JSON `shapes`, in millimetres.
- Context: No licensed, accurate 3D model of the device is available. Structure and order matter more for learning than looks.
- Alternatives rejected: buying or modelling a glTF (cost, licensing, slows V1); 2D diagrams (the plan asks for 3D).
- Consequences: Not photorealistic. V1.1 can add an optional glTF per component and keep shapes as the fallback.

## 2026-10-07 - Battery safety rules
- Decision: Unplugging or plugging an `electrical` part while the battery is connected is blocked in Explore mode. In Sandbox and Repair it damages the part and counts a violation. Slots in the battery's `connectorAccess` are exempt. Removing a slot in the battery's `connectsTo` cuts power.
- Context: iFixit removes the coil/NFC assembly before the battery connector can be reached, so a strict "disconnect first" rule would make the real procedure impossible.
- Alternatives rejected: no safety rule (loses the main lesson); blocking in all modes (Sandbox exists to show consequences).
- Consequences: Explore teaches the safe order, Sandbox shows the cost of skipping it, Repair scores it.

## 2026-10-07 - Run outcome model
- Decision: Each slot reports one effect. The run result is the worst outcome by rank. Temperature is 36 °C plus the sum of effect `tempC`; 52 °C or more forces a thermal shutdown. Symptoms are hidden when the device has no power.
- Context: The model must be simple, explainable and deterministic for scoring.
- Alternatives rejected: a physical thermal or electrical simulation (false precision that cannot be verified).
- Consequences: Outcomes are educational approximations. The run overlay shows a disclaimer.

## 2026-10-07 - Repair scoring and fairness
- Decision: Score = 30% diagnosis (marked the culprit, minus wrong marks), 30% safe repair (minus violations), 20% correct parts (minus unneeded swaps), 20% time (never below 40). The first clear pays the score plus 50 XP; replays pay only the improvement. Damage stays hidden in Repair mode until the part is reachable. The parts list compares against the case's starting parts, so it does not reveal the culprit.
- Context: The score should reward diagnosis and safe work more than speed.
- Alternatives rejected: pass/fail only; scoring weighted mostly on time.
- Consequences: The formula lives in `src/game/game.ts` and is unit tested.

## 2026-10-07 - Browser-only saves with zustand persist (localStorage)
- Decision: Two persisted stores: `techlab-progress` (XP, discoveries, achievements, best scores) and `techlab-lab` (current session, so a reload resumes it).
- Context: V1 has no accounts. Saved data is a few kilobytes.
- Alternatives rejected: IndexedDB (not needed at this size); a backend (out of scope for V1).
- Consequences: Progress is per browser. Clearing site data erases it, and the Progress page says so.

## 2026-10-07 - Hash routing without a router library
- Decision: `useSyncExternalStore` on `location.hash` with a small switch in `App.tsx`.
- Context: There are five routes. Hash routes work on any static host without rewrite rules.
- Alternatives rejected: react-router (a dependency for five routes); history routing (needs server rewrites).
- Consequences: URLs contain `#/`. Easy to swap later if needed.

## 2026-10-07 - Let Vite split three.js through the lazy lab page
- Decision: Removed the `manualChunks` rule that put three.js in its own chunk. `LabPage` is lazy-loaded, so three.js ends up in that chunk.
- Context: The manual chunk also captured shared modules, so the landing page preloaded all of three.js.
- Alternatives rejected: keeping manual chunks plus a separate React chunk (more config for the same result).
- Consequences: Landing and library pages load about 74 kB gzip. The lab chunk is about 262 kB gzip. `chunkSizeWarningLimit` is raised to 1200 kB.

## 2026-10-07 - Structured fasteners and tool requirements schema
- Decision: Add optional structured `fasteners?: FastenerSpec[]` to `Component` in `src/engine/types.ts`. A fastener specifies `type` (`'screw' | 'adhesive' | 'clip' | 'press-connector'`), `count` (number), `tool` (`'phillips-00' | 'tri-point-y000' | 'pentalobe-p2' | 'spudger' | 'suction-pick' | 'sim-tool' | 'heat-gun'`), and `notes` (optional string).
- Context: `fastening` was previously a single human-readable string. Structuring fasteners allows the simulation, content validator, and UI to display exact screw counts, required tools, and fastening breakdown per component.
- Alternatives rejected: Replacing `fastening` string entirely (breaking backwards compatibility); adding a separate tools database table (overcomplicates static JSON content).
- Consequences: Existing device files remain backward-compatible; validator checks `fasteners` integrity if provided.

## 2026-10-08 - 2D texture mapping for photorealistic 3D fallback
- Decision: Added `textureUrl` to the `Shape` interface and updated `LabScene.tsx` to use `useTexture` from `@react-three/drei` to map photorealistic 2D images onto the procedural 3D meshes.
- Context: User feedback indicated strong dissatisfaction with plain colored boxes and cylinders for complex parts like the A14 Bionic chip, battery, and cameras in the iPhone 12.
- Alternatives rejected: Generating or downloading 3D glTF models dynamically (too complex and error-prone to automate for every device component on the fly).
- Consequences: Retains the performance of procedural meshes while drastically improving visual fidelity. Requires texture files in `public/textures/`.
## 2026-10-07 - Match Score Judge uses classic image metrics
- Decision: Score a render against a photo with silhouette IoU (35%), correlation of blurred inner-edge maps (30%), per-cell CIE76 colour distance after a clamped brightness match (20%) and bounding-box aspect ratio (15%). Both images are cropped to the object and resampled to one grid, so framing and distance do not matter. The judge is pure TypeScript (`src/match/judge.ts`) and runs in the browser on the render page.
- Context: The owner wants a "match score judge" that scores how well the 3D model matches photos of the real object and drives an iterate-and-redesign loop. It must be deterministic, fast enough to run hundreds of times, and say where the mismatch is.
- Alternatives rejected: raw pixel difference (breaks on exposure changes and small shifts); learned perceptual metrics such as LPIPS or CLIP (model weights plus a Python or ONNX runtime, and no per-region explanation); a vision-language model as the only judge (slow, paid, not deterministic; it may still be added later as a redesign critic).
- Consequences: Works best with straight-on photos on a plain background or a transparent cut-out. A score compares designs for the same device and view; it is not an absolute quality grade.

## 2026-10-07 - Match loop: hill climbing in headless Edge/Chrome, agents do structural redesign
- Decision: `tools/match.mjs` renders with the app's own meshes and lights in a headless browser (SwiftShader WebGL, Chrome DevTools Protocol over Node's built-in WebSocket, no new dependencies). `tune` is a (1+1) hill climb: change one shape value (position, size or colour), keep it only if the score rises by more than 0.05. Step size follows the 1/5 success rule, values hidden from every photo are dropped, and the run stops at the target or after `patience` iterations without a 0.5 gain. The Progress Judge turns that into a verdict (pass, continue, redesign) and `status` judges the trend over all runs (pass, improving, stalled, regressed). Adding, removing or splitting shapes is an agent step guided by the overlay image and region hints. Results stay in `match/out/` until `apply`, which runs the validator and saves a backup.
- Context: Shapes are hand-placed boxes and cylinders. Most errors are positions, sizes and colours, which a simple search fixes; missing or extra parts need judgement.
- Alternatives rejected: Puppeteer or Playwright (a large dependency for about 40 lines of CDP); CMA-ES or other population methods (more renders per step; worth adding only if coupled values often stall); differentiable rendering (needs a different renderer); automatic shape insertion (placing parts from 2D hints is guesswork).
- Consequences: About 0.3 s per view per evaluation on SwiftShader. Tuning only changes visual shape data within +-6 mm by default, never specs, removal order or effects. A published dimension wins over a photo.

## 2026-10-16 - Comprehensive photorealistic component texturing for entire device teardown
- Decision: Expanded texture mapping to 100% of internal and external electronic/mechanical modules on the iPhone 12 (display, rear glass chassis, MagSafe coil, loudspeaker, Lightning connector assembly, TrueDepth Face ID module, earpiece assembly, logic board, battery, cameras, and taptic engine).
- Context: Procedural colored boxes fail to convey the realism of real smartphone components, making teardown, diagnosis, and part identification unintuitive and unconvincing.
- Alternatives rejected: Relying only on key components (e.g. logic board only) while leaving display, chassis, speaker, and flex cables as plain geometry; this resulted in stark visual inconsistency between textured and untextured elements.
- Consequences: Every major component now visually mirrors real teardown hardware in both closed and exploded lab views. Static assets are bundled in `public/textures/` and cached by the browser.

## 2026-10-15 - Match loop: tune is bounded by the published design; apply copies shapes only
- Decision: `tune` measures its `--max-delta` bound from the published device file, not from the `--from` file. A shape that a redesign added, or moved further than `--max-delta`, is bounded by its own start values. `apply` copies only `shapes` from `best-device.json` into the current device file.
- Context: Review on 2026-10-10. Chained `--from` runs reset the bound each time, so a model could drift without limit from researched dimensions. `apply` wrote the whole tuned file, so edits made after a tune were reverted silently in plain-formatted files such as `iphone-12.json`.
- Alternatives rejected: bounding against the `--from` file (allows drift); a fixed per-shape bound stored in the device JSON (schema change for a tool-only concern); refusing `apply` when the file changed after the tune (blocks harmless edits).
- Consequences: Going past the bound needs a deliberate shape edit (the redesign step), which a person or agent reviews. Chained tune runs are safe. `apply` never touches non-shape data.

## 2026-10-17 - Web Audio API procedural sound synthesizer (opt-in)
- Decision: Use the browser's native `AudioContext` to synthesize tactile and mechanical sound effects (clicks, screw turns, snap installs, slide removals, boot chimes, short-circuit sparks, thermal shutdown alarms, and achievement arpeggios). Defaults to muted (opt-in) with user preference saved in localStorage.
- Context: V1.1 roadmap called for opt-in sound effects. Audio feedback enhances the physical feeling of unscrewing, removing, and assembling hardware components, and reinforces safety feedback (e.g. electrical short circuits).
- Alternatives rejected: Bundling MP3/WAV/OGG sound files (increases site payload and latency; requires asset licensing); Web Audio tone generators without envelope shaping (sounds artificial and harsh).
- Consequences: Zero download overhead (0 kB audio files). Operates completely client-side. Respects autoplay policy by initializing audio context upon user gesture. Opt-in toggle is easily accessible in the top navigation bar and lab toolbar.


## 2026-11-07 - Component source citations and verification validation
- Decision: Add optional `id?: string` to `Source` and optional `sources?: string[]` and `sourceId?: string` to `Component` in `src/engine/types.ts`. Update `validateDevice` in `src/engine/validate.ts` to verify that any cited source exists in `device.verification.sources`, and reject any component that is `verified: true` but cites no source id that exists in the device's sources list (when source citations are present or when `device.verification.status === 'verified'`).
- Context: Content pipeline requirement (docs/content-pipeline.md) to cross-reference component hardware facts to specific teardowns and spec pages.
- Alternatives rejected: Free-form text in `note` only (cannot be mechanically validated against `verification.sources`); breaking backward compatibility with existing draft devices by requiring retrofitting unverified sources before review.
- Consequences: New devices and verified devices must cite source IDs matching `verification.sources`.

## 2026-11-08 - Optional glTF component models with procedural shape fallback
- Decision: Add optional `gltf?: string` field to `Component` in `src/engine/types.ts`. When present, `LabScene` attempts to load and display the glTF model using Three.js `GLTFLoader` (available from the bundled `three` package). If `gltf` is omitted, or if loading/parsing fails for any reason, the renderer falls back seamlessly to procedural primitives (`shapes`).
- Context: Plan V1.1 roadmap calls for an optional glTF model per component while retaining procedural shapes as a reliable fallback. GLTFLoader is already included within the existing `three` dependency without adding new npm packages.
- Alternatives rejected: Requiring glTF models for all components (breaks lightweight procedural rendering and requires hundreds of complex 3D assets); adding external loader libraries (violates no-new-dependencies rule); crashing on glTF load failure (degrades lab reliability).
- Consequences: Content authors can optionally provide high-detail glTF 2.0 assets per slot without breaking procedural fallback. If a model fails to load, the user still experiences the complete interactive lab teardown.
