# Plan

## Goal
TechLab is a free, anonymous, browser-based 3D lab where people open real devices, learn what every part does, repair broken devices, and experiment safely. Loop: **Open → Explore → Repair → Experiment**. No accounts in V1; progress stays in the browser.

Core principle: a generic **Device Simulation Engine**. Devices, parts, failures and repair cases are data. Adding a device must not require engine changes. Hardware facts are never invented: Research → Cross-check → Verify → Build.

## Scope
- In (V1): one phone (Galaxy S23 Ultra) with full component discovery; Explore, Repair and Sandbox modes; removal order, battery safety, compatibility, damage, temperature and failure simulation; device test run with animations; XP, levels, achievements, case scoring; localStorage saves; static hosting.
- Out (V1): accounts, servers, leaderboards, photoreal models, screws and tools, sound, more devices.

## Architecture
- Static site: Vite + React 19 + TypeScript, three.js via @react-three/fiber and drei, zustand for state. No backend.
- `public/data/devices/*.json`: device content (components, parts, cases, sources). Fetched at runtime.
- `src/engine/`: pure TypeScript simulation (types = schema contract, engine = rules, validate = content checker). No React, no DOM.
- `src/game/`: pure rules for levels, scoring and achievements.
- `src/store/`: zustand stores. `lab.ts` wraps the engine for one session; `progress.ts` holds XP and achievements. Both persist to localStorage.
- `src/scene/`: 3D view built from the shapes in the device JSON.
- `src/ui/`: pages and lab panels. Hash routing, no router library.
- Details for contributors and agents: `CLAUDE.md`. Task board: `todo.md`.

## Versions and phases

### V1.0 — One phone, three modes (current)
- [x] P0 Foundations: Vite/React/TS scaffold, vitest, build, base path for static hosting
- [x] P1 Engine: schema, removal order, battery safety rules, compatibility, damage, run outcomes, temperature
- [x] P1 Validator: references, cycles, stock device boots, strict teardown and rebuild, every case solvable
- [x] P2 Content: Galaxy S23 Ultra draft (16 components, 7 spare parts, 2 repair cases, 8 iFixit sources)
- [ ] P2 Content verification: check the 3 `verified: false` components against teardown photos, then set device `verification.status` to `verified` (T-001)
- [x] P3 3D lab: procedural model, select/hover, remove/install animation, exploded view, flip, camera views
- [x] P3 Run effects: heat glow, screen glow, vibration, sparks, smoke
- [x] P4 Explore mode (strict safety), Sandbox mode (consequences), Repair mode (case brief, timer, mark faulty, score)
- [x] P5 Game and storage: XP, levels, 9 achievements, case scoring, localStorage persistence and resume
- [x] P6 Landing, library, cases, progress pages; responsive layout; lazy-loaded 3D chunk
- [x] P6 Accessibility pass: modal focus trap, reduced motion in 3D, keyboard walkthrough (T-003)
- [x] P6 WebGL fallback message (T-004)
- [x] P6 Lab store tests for the scripted flows (T-005)
- [ ] P6 Static deploy (T-002, needs a hosting choice from the owner)

### V1.1 — Polish
- [x] Screws and tools as data (fastening steps), screw → lift → workbench animation
- [x] Sound effects (opt-in) (T-015)
- [x] 3 to 5 more S23 Ultra repair cases (charging port, camera, display cable)
- [ ] glTF model option per component, procedural shapes stay as fallback
- [ ] IndexedDB only if saves outgrow localStorage

### Track: Model fidelity (Match Score loop, runs alongside V1.1 and V2)
Goal: the 3D model looks like the real object. Photos of the real device are the reference. The Match Score Judge scores each render, `tune` iterates to raise the score, the Progress Judge decides when to stop or redesign. Details and commands: `CLAUDE.md` "Match loop".
- [x] Match Score Judge: silhouette, inner edges, colour, aspect; worst-region hints; overlay image; unit tests
- [x] Dev-only render page `#/render/<device>` using the lab's own meshes and lights
- [x] CLI `tools/match.mjs`: render, judge, tune (hill climb + Progress Judge), status, apply (validated, backed up), restore
- [x] Synthetic self-test: a moved camera lens was found again (94.7 -> 98.6)
- [ ] Reference photos of a real Galaxy S23 Ultra (T-009, needs the owner)
- [ ] S23 Ultra exterior at Match Score >= 85 on every view (T-011)
- [ ] Single parts from teardown photos (T-012)
- [ ] iPhone 12 (T-013)
- [ ] Later, only if tuning often stalls: multi-value moves or CMA-ES; a vision-model critic that suggests redesigns

### V2 — More devices (engine unchanged, content only)
- [x] iPhone 12 (front-opening phone; tests the schema)
- [x] One more Android phone (Google Pixel 7; front-opening phone)
- [ ] Laptop, then audio, consoles, TVs
- [x] Content pipeline: research template, source checklist, review step
- [ ] Cross-device parts and compatibility experiments

### V3 — The real TechLab
- [ ] Optional accounts and cloud saves
- [x] Daily repair challenge (offline, deterministic date hash, day streak in localStorage)
- [x] Interactive hardware courses (Phone battery safety starter course)
