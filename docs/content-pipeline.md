# TechLab Content Pipeline

The TechLab Content Pipeline defines the process for researching, cross-checking, verifying, and publishing hardware device definitions in the simulator.

Core Principle: **Hardware facts are never invented**. Every dimension, removal constraint, screw count, and electrical dependency must be grounded in primary teardown documentation, manufacturer specifications, and independent cross-checks:
$$\text{Research} \longrightarrow \text{Cross-check} \longrightarrow \text{Verify} \longrightarrow \text{Build}$$

---

## 1. Research Template

A device definition is written as a JSON file (`public/data/devices/<id>.json`) following the schema contract in `src/engine/types.ts`. Contributors should use this template when gathering hardware facts.

### 1.1 Device Metadata
- `id`: Unique lowercase slug (`^[a-z0-9-]+$`), e.g., `"pixel-7"`.
- `name`: Full commercial name, e.g., `"Google Pixel 7"`.
- `brand`: Manufacturer name, e.g., `"Google"`.
- `category`: Device family (`'phone' | 'laptop' | 'audio' | 'console' | 'tv'`).
- `released`: Release year as an integer, e.g., `2022`.
- `summary`: One or two sentences describing the physical layout, opening direction, and architecture.
- `dimensionsMm`: Outer dimensions `[width, height, thickness]` in millimetres from official specifications.
- `specs`: Key technical attributes (`SoC`, `Battery`, `Display`, `Main Camera`, `Weight`, `Fast Charging`).

### 1.2 Verification Block
- `status`: `'draft'` (initial contribution) or `'verified'` (all components verified by maintainer review).
- `sources`: Array of source records. Each source has:
  - `id`: Short unique identifier, e.g., `"src-ifixit-teardown"`, `"src-maker-spec"`.
  - `title`: Descriptive publication name, article, or guide title.
  - `url`: Canonical HTTPS web link to the reference.
- `notes`: Summary of current verification progress and notes on remaining unconfirmed areas.

### 1.3 Component Definition (`components[]`)
Ordered from outermost (first removed) to innermost (last accessible).
- `id`: Component identifier (`^[a-z0-9-]+$`), matching the factory installed part ID.
- `name`: User-facing name (e.g., `"Super Actua Display"`).
- `kind`: Part family matching spare parts (e.g., `"screen"`, `"battery"`, `"main-board"`).
- `system`: Subsystem category (`'power' | 'compute' | 'display' | 'imaging' | 'audio' | 'charging' | 'connectivity' | 'thermal' | 'structure' | 'input'`).
- `difficulty`: Removal challenge level (`'easy' | 'medium' | 'hard'`).
- `requires`: Array of slot IDs that physically block this component and must be removed prior to removal or installation.
- `connectsTo`: Slots this component plugs into. For the `powerSource`, this designates the board slots it energizes (removing any cuts power).
- `electrical`: `true` if the part has a delicate board connector requiring power disconnection before handling.
- `powerSource`: `true` for the primary battery (must be exactly one component per device).
- `connectorAccess`: Slots that must be removed to physically reach and disconnect the battery connector.
- `info`:
  - `what`: Plain-language description of the hardware part.
  - `does`: The part's functional purpose in the device.
  - `ifFails`: Real-world symptoms observed when the part malfunctions or is missing.
  - `advanced`: Optional deeper engineering or diagnostic details.
- `specs`: Technical parameters (e.g., capacity, resistance, sensor size).
- `fastening`: Natural language summary of fastening (e.g., `"Ten Torx Plus 3IP screws and display adhesive"`).
- `fasteners`: Structured breakdown:
  - `type`: `'screw' | 'adhesive' | 'clip' | 'press-connector'`
  - `count`: Positive integer count.
  - `tool`: Specific service tool (`'phillips-00' | 'tri-point-y000' | 'pentalobe-p2' | 'spudger' | 'suction-pick' | 'sim-tool' | 'heat-gun'`).
  - `notes`: Fastener dimensions or torque notes.
- `layer`: Z-index depth layer for exploded view (0 = front display, increasing toward rear).
- `exit`: Extraction trajectory vector `[x, y, z]` (default `[0, 0, 1]` for rear exit, `[0, 0, -1]` for front exit).
- `shapes`: 3D procedural primitives (`type: 'box' | 'cylinder'`, `size`, `pos`, `rot`, `color`, `metalness`, `roughness`, `opacity`, `textureUrl`, `screen`).
- `onMissing`, `onDamaged`, `onIncompatible`: Effect definitions (`outcome`, `symptom`, `tempC`).
- `verified`: `true` ONLY if every aspect is confirmed and cited; otherwise `false`.
- `sources`: Array of source IDs from `verification.sources` proving this component's facts.
- `note`: Explanation of what is unverified or provisional if `verified: false`.

### 1.4 Spares (`spares[]`)
Healthy replacements and faulty parts for sandbox experimentation and repair cases.
- `id`, `name`, `kind`, `compatible`: Supported device IDs.
- `damaged`: Boolean indicating whether the part carries faults.
- `condition`: Inspection note (e.g., `"Punctured cell with electrolyte leak"`).
- `effect`: Custom run override.

### 1.5 Repair Cases (`cases[]`)
- `id`: `<device-prefix>-NNN`, e.g., `"p7-001"`.
- `title`, `level` (`'beginner' | 'intermediate' | 'advanced'`), `brief`, `symptoms`.
- `setup`: Slot ID to faulty part ID mapping.
- `culprit`: Slot ID containing the root cause failure.
- `spares`: List of part IDs provided on the workbench (must include a healthy compatible spare).
- `targetSeconds`: Parsed target time for repair scoring.
- `explanation`: Educational conclusion explaining why the failure occurred and how diagnosis succeeded.

---

## 2. Source Checklist

Every device must be cross-verified against at least three independent sources before it can exit draft status. Every factual claim (removal order, fasteners, battery capacity, connector placement) must be attributed to a source ID.

### The Three-Source Standard
1. **Primary Teardown Guide (e.g., iFixit)**:
   - Provides step-by-step disassembly sequence, high-resolution internal photos, connector disconnection order, and tool sizes.
   - Proves whether a screen opens from the front or rear, and whether midframes or brackets must be removed before battery disconnect.
2. **Manufacturer Official Specification & Service Manual**:
   - Establishes canonical device dimensions (`dimensionsMm`), battery capacity (`mAh`, `Wh`, voltage), display resolution, SoC, and OEM part numbers.
   - Authoritative for published specs and physical tolerances.
3. **Independent Cross-Check Source**:
   - Independent teardown video or article (e.g., PBKreviews, JerryRigEverything, FCC certification database, Chipworks/TechInsights silicon analysis).
   - Resolves discrepancies between aftermarket repair manuals and factory assembly.

### Source ID Assignment Rules
- In `verification.sources`, assign a clean, semantic `id` to each source:
  ```json
  {
    "id": "src-ifixit-teardown",
    "title": "iFixit: Google Pixel 7 Teardown",
    "url": "https://www.ifixit.com/Guide/Google+Pixel+7+Screen+Replacement/159840"
  }
  ```
- Any component that is marked `verified: true` must cite at least one existing source ID in its `sources` array:
  ```json
  "verified": true,
  "sources": ["src-ifixit-teardown", "src-maker-spec"]
  ```
- If a fact is unverified or derived by inference (e.g., camera sensor module internals without a separate lens guide), mark `verified: false`, omit unconfirmed sources, and explain the ambiguity in `note`.

---

## 3. Review Step

To maintain data integrity and prevent simulation bugs, device contributions pass through a structured review pipeline before moving from `draft` to `verified`.

### Who Checks What
| Role | Responsibility | Checklist |
|---|---|---|
| **Author (Contributor / Agent)** | Initial research and draft device JSON | Populates template; runs `validateDevice`; leaves `verification.status: "draft"`; marks unconfirmed items `verified: false` with explanatory `note`. |
| **Technical Reviewer (Maintainer)** | Physical & electrical disassembly logic | Verifies `requires` DAG matches teardown photos; confirms battery connector access (`connectorAccess`) and hot-unplug safety (`electrical`); checks fastener counts and tool types against disassembly steps. |
| **Model Reviewer** | Visual and spatial fidelity | Checks component bounding boxes against `dimensionsMm`; runs `npm run match -- judge <device>` against photos; verifies layer ordering (front to back). |

### Component Verification Promotion (`verified: false` $\rightarrow$ `verified: true`)
A component may change from `verified: false` to `verified: true` only when **all** of the following conditions are met:
1. **Photo/Video Proof**: Clear visual evidence from a teardown confirms the component's exact physical position, connectors, and removal path.
2. **Order Integrity**: Every item in `requires` and `connectsTo` is corroborated by the primary teardown source.
3. **Fastener Accuracy**: Screw types, counts, and required tools match teardown documentation.
4. **Valid Source Citation**: The component contains a `sources` array with at least one source ID that exists in `device.verification.sources`.
5. **No Speculation**: The `note` explaining uncertainty is removed.

### Device Promotion (`status: "draft"` $\rightarrow$ `status: "verified"`)
A device's overall `verification.status` may be updated from `"draft"` to `"verified"` only when:
- 100% of its components have achieved `verified: true`.
- All referenced source IDs exist and URLs are reachable.
- `npm test` passes `validateDevice(d)` with zero warnings or errors.
- A human reviewer has opened `#/lab/<device>/explore` and completed a complete teardown and reassembly cycle without blockage.
