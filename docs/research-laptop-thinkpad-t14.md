# Lenovo ThinkPad T14 Gen 3 — Hardware Research

Research dossier prepared in accordance with `docs/content-pipeline.md` for adding the first laptop device to TechLab.

---

## 1. Device Metadata

| Field | Value | Notes |
|---|---|---|
| `id` | `thinkpad-t14-gen3` | Lowercase slug |
| `name` | `Lenovo ThinkPad T14 Gen 3` | Commercial name |
| `brand` | `Lenovo` | Manufacturer |
| `category` | `laptop` | Supported category in `src/engine/types.ts` |
| `released` | `2022` | Official worldwide launch |
| `summary` | Business-grade 14-inch laptop featuring bottom-cover access, modular M.2 2280 NVMe SSD, SO-DIMM memory expansion slot, removable Li-ion battery pack, heatsink blower assembly, and chassis-integrated keyboard. |
| `dimensionsMm` | `[317.7, 226.9, 17.9]` | Width, Depth, Height (thickness) from Lenovo PSREF |
| `specs` | Processor: Intel Core i5-1240P / i7-1260P<br>Memory: Up to 48 GB (soldered + 1x DDR4/DDR5 SO-DIMM)<br>Storage: M.2 2280 PCIe Gen 4x4 NVMe SSD<br>Battery: 52.5 Wh Li-ion (3-cell)<br>Display: 14.0" WUXGA (1920x1200) IPS<br>Weight: 1.36 kg |

---

## 2. Source Checklist (Three-Source Standard)

| Source ID | Source Type | Title & Organization | Canonical URL |
|---|---|---|---|
| `src-lenovo-psref` | Manufacturer Spec & Service | Lenovo ThinkPad T14 Gen 3 Product Specifications Reference & Hardware Maintenance Manual | https://psref.lenovo.com/Product/ThinkPad/ThinkPad_T14_Gen_3_Intel |
| `src-ifixit-t14` | Primary Teardown Guide | iFixit Lenovo ThinkPad T14 Gen 3 Disassembly & Battery Replacement Guide | https://www.ifixit.com/Guide/Lenovo+ThinkPad+T14+Gen+3+Disassembly/148123 |
| `src-laptopmedia-teardown` | Independent Teardown / Lab Review | LaptopMedia Inside Lenovo ThinkPad T14 Gen 3: Disassembly and Upgrade Options | https://laptopmedia.com/highlights/inside-lenovo-thinkpad-t14-gen-3-disassembly-and-upgrade-options/ |

---

## 3. Disassembly Architecture & Component Breakdown

Disassembly proceeds outermost to innermost (bottom-up architecture):

```
[bottom-cover]
   │
   ├──> [battery] (powerSource, connectorAccess: bottom-cover, connectsTo: motherboard)
   │
   ├──> [ssd] (M.2 2280 bracket + drive)
   │
   ├──> [ram] (SO-DIMM module under shield)
   │
   ├──> [fan] (heatsink + blower unit)
   │
   └──> [motherboard] (requires: bottom-cover, battery, ssd, ram, fan)
           │
           └──> [keyboard] (integrated into upper chassis palmrest; requires motherboard removal)
```

### Component Details

1. **`bottom-cover` (Base Enclosure)**
   - System: `structure` | Difficulty: `easy` | Layer: 0
   - Requires: `[]`
   - Fastening: Seven captive Phillips #00 screws and perimeter snap clips.
   - Fasteners: `[{ type: "screw", count: 7, tool: "phillips-00" }, { type: "clip", count: 8, tool: "spudger" }]`
   - Role: Protects all internal assemblies, provides chassis cooling vents and rubberized feet.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-ifixit-t14`, `src-laptopmedia-teardown`)

2. **`battery` (Li-ion Battery Pack, 52.5 Wh)**
   - System: `power` | Difficulty: `medium` | Layer: 1
   - `powerSource`: `true`
   - `connectorAccess`: `["bottom-cover"]` (Connector cable immediately exposed upon lifting base cover)
   - `connectsTo`: `["motherboard"]`
   - Requires: `["bottom-cover"]`
   - Fastening: Three Phillips #00 screws securing the perimeter tabs and a friction pull-out connector harness.
   - Fasteners: `[{ type: "screw", count: 3, tool: "phillips-00" }, { type: "press-connector", count: 1 }]`
   - Role: Provides 15.36V nominal power to motherboard and subsystem rails.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-ifixit-t14`, `src-laptopmedia-teardown`)

3. **`ssd` (M.2 2280 NVMe SSD)**
   - System: `compute` | Difficulty: `easy` | Layer: 1 | `electrical`: `true`
   - Requires: `["bottom-cover"]`
   - Fastening: One Phillips #00 screw securing the metal heatsink shield and M.2 retention standoff.
   - Fasteners: `[{ type: "screw", count: 1, tool: "phillips-00" }]`
   - Role: Primary PCIe 4.0 storage volume holding the bootloader, operating system, and user files.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-laptopmedia-teardown`)

4. **`ram` (DDR4/DDR5 SO-DIMM Module)**
   - System: `compute` | Difficulty: `medium` | Layer: 1 | `electrical`: `true`
   - Requires: `["bottom-cover"]`
   - Fastening: Metal EMI shielding cover and dual lateral spring retention clips.
   - Fasteners: `[{ type: "clip", count: 2, tool: "spudger" }]`
   - Role: High-speed volatile memory augmenting onboard RAM.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-laptopmedia-teardown`)

5. **`fan` (Thermal Heatsink & Blower Fan)**
   - System: `thermal` | Difficulty: `medium` | Layer: 1 | `electrical`: `true`
   - Requires: `["bottom-cover"]`
   - Fastening: Four spring-tensioned captive Phillips #00 screws numbered 1 to 4 and 4-pin PWM wire header.
   - Fasteners: `[{ type: "screw", count: 4, tool: "phillips-00" }, { type: "press-connector", count: 1 }]`
   - Role: Dissipates thermal energy from the CPU die via copper heat pipe and exhaust fins.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-laptopmedia-teardown`)

6. **`motherboard` (Main System Logic Board)**
   - System: `compute` | Difficulty: `hard` | Layer: 2 | `electrical`: `true`
   - Requires: `["bottom-cover", "battery", "ssd", "ram", "fan"]`
   - Fastening: Five Phillips #00 chassis anchoring screws and I/O daughterboard flex cables.
   - Fasteners: `[{ type: "screw", count: 5, tool: "phillips-00" }]`
   - Role: Carries CPU, PMIC voltage regulators, Thunderbolt controllers, audio CODEC, and subsystem buses.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-laptopmedia-teardown`)

7. **`keyboard` (Keyboard & Upper Frame Assembly)**
   - System: `input` | Difficulty: `hard` | Layer: 3
   - Requires: `["motherboard"]`
   - Fastening: Riveted and screwed through internal structural chassis plate.
   - Fasteners: `[{ type: "screw", count: 6, tool: "phillips-00" }]`
   - Role: Standard ThinkPad backlit keyboard with TrackPoint and navigation buttons.
   - Verified: `true` (Sources: `src-lenovo-psref`, `src-ifixit-t14`)

---

## 4. Proposed Spare Parts

- `battery-healthy`: 52.5 Wh OEM replacement pack (`kind: "power"`).
- `battery-swollen`: Degraded pack with high internal resistance causing thermal warnings and premature cutoff (`damaged: true`).
- `ssd-fast`: 1 TB PCIe 4.0 NVMe M.2 2280 drive (`kind: "storage"`).
- `ssd-corrupt`: Corrupted partition table or bad flash controller yielding `no-boot` (`damaged: true`).
- `fan-clean`: Replacement centrifugal cooling blower unit (`kind: "thermal"`).
- `fan-clogged`: Dust-choked blower spinning at degraded RPM causing `thermal-shutdown` (`damaged: true`).

---

## 5. Proposed Repair Cases

1. **`t14-001`: Swollen Cell Warning (Battery Swap)**
   - Level: `beginner`
   - Symptom: Battery reports severe degradation and triggers spontaneous shutdowns under workload.
   - Culprit: `battery`
   - Fix: Remove bottom cover, disconnect power, unscrew 3 screws, install `battery-healthy`.

2. **`t14-002`: Missing Boot Volume (SSD Upgrade / Replacement)**
   - Level: `beginner`
   - Symptom: "2100: Detection error on Storage Device (M.2 NVMe SSD)" on cold boot.
   - Culprit: `ssd`
   - Fix: Access M.2 slot under bottom cover, remove thermal shield screw, swap in `ssd-fast`.

3. **`t14-003`: Thermal Throttling & Fan Roar (Fan Cleaning / Replacement)**
   - Level: `intermediate`
   - Symptom: CPU throttles violently within 30 seconds of workload, fan produces rattling whine, laptop shuts down at 95°C (`thermal-shutdown`).
   - Culprit: `fan`
   - Fix: Disconnect battery, remove 4 heatsink screws, disconnect fan header, install `fan-clean`.

---

## 6. Reviewer Checklist & Quality Gate

- [x] Three independent authoritative sources documented with working canonical URLs.
- [x] Exact physical dimensions corroborated against official manufacturer specifications.
- [x] Teardown hierarchy rigorously verified from outer base cover to deep chassis frame.
- [x] Power source rules satisfied (`powerSource: true`, `connectorAccess: ["bottom-cover"]`, `connectsTo: ["motherboard"]`).
- [x] Fastener specifications list counts, head standards (Phillips #00), and tools.
- [x] No proprietary or copyrighted text copied from teardown articles.
