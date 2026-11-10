# Sony PlayStation 5 (disc edition): Hardware Research

Console for V2. Read 2026-11-09. Device id `sony-ps5` (index entry renamed from `ps5`, was `available: false`).

## Sources
| id | What it gave |
|---|---|
| `src-ifixit-ps5-teardown` | Specs, drive pairing, liquid metal, board layout |
| `src-ifixit-ps5-fan` | Stand, panel, grille, shroud (TR9), wire cover, fan connector |
| `src-ifixit-ps5-psu` | Second panel, shells (TR8), 42 shield screws, PSU lift |
| `src-ifixit-ps5-storage` | Stand screw, SSD cover (Phillips #0) |
| `src-mp1st-ps5-dimensions` | 390 x 104 x 260 mm (secondary; playstation.com tech-specs 404) |

## Removal DAG (outermost first)
stand → right panel → grille / SSD cover → shroud → fan → inner shell → disc drive → top shield → left panel → second shell → PSU, main board → chassis.

## Decisions and gaps
- No battery: the power supply is the engine's `powerSource` (`connectorAccess: ["faceplate-right"]`). See `decisions.md`.
- TR8/TR9 Torx are not in the fastener tool enum: tools are in `notes`.
- Single source family (iFixit) for every part; no second teardown read. Device stays `draft`.
- `verified: false`: `mainboard`, `chassis-frame` (teardown only, no removal guide).
- Not modelled: Wi-Fi/antennas, front USB/LED/power boards, the M.2 expansion SSD, digital edition.
