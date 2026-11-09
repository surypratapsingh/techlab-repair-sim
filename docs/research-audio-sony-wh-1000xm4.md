# Sony WH-1000XM4: Hardware Research

Research dossier for the first audio device, written to `docs/content-pipeline.md`. Read 2026-11-08.

## Why this device
AirPods Pro 2 has no iFixit repair guide (zero repairability; battery swap is soldered and not documented). The WH-1000XM4 has iFixit guides for battery, ear pads, touch sensor, motherboard, swivel and microphone array, so removal order and fasteners can be cited.

## 1. Metadata
| Field | Value | Source |
|---|---|---|
| `id` | `sony-wh-1000xm4` | |
| `category` | `audio` | existing type |
| `released` | 2020 | Sony / 52Audio post dated Aug 2020 |
| Playback | about 30 h with noise cancelling | iFixit device page, Sony Canada spec page |
| Weight | 254 g | iFixit device page (Sony page not readable) |
| Driver | 40 mm dome | Sony spec page (search excerpt) |
| Bluetooth / codecs | 5.0; SBC, AAC, LDAC | iFixit device page |
| `dimensionsMm` | `[100, 108, 36]` | modelled right cup only, **not** an official figure |

## 2. Sources
| ID | Type | URL |
|---|---|---|
| `src-ifixit-xm4-battery` | Primary teardown guide (right cup) | https://www.ifixit.com/Guide/Sony+WH-1000XM4+Battery+Replacement/143625 |
| `src-ifixit-xm4-ear-pads` | Primary guide | https://www.ifixit.com/Guide/Sony+WH-1000XM4+Ear+Pads+Replacement/143667 |
| `src-ifixit-xm4-touch-sensor` | Primary guide (right cup) | https://www.ifixit.com/Guide/Sony+WH-1000XM4+Touch+Sensor+Replacement/167571 |
| `src-ifixit-xm4-motherboard` | Primary guide | https://www.ifixit.com/Guide/Sony+WH-1000XM4+Motherboard+Replacement/167572 |
| `src-ifixit-xm4-swivel` | Primary guide | https://www.ifixit.com/Guide/Sony+WH-1000XM4+Swivel+Replacement/167320 |
| `src-ifixit-xm4-topic` | Specs summary | https://www.ifixit.com/Topic/Sony_WH-1000XM4 |
| `src-sony-xm4-spec` | Manufacturer spec (returned 403 to direct fetch; read via search excerpt) | https://www.sony.ca/en/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm4/specifications |
| `src-52audio-xm4` | Independent teardown (search excerpt only, not used for any component) | https://thewalkmanblog.blogspot.com/2020/08/sony-wh-1000xm4-teardown-by-52audio.html |

## 3. Removal order (right ear cup, from iFixit)
```
ear-pad (clips, spudger)
  └ foam-liner
      └ cup-cover (4 x 8.4 mm Phillips #00; touch ribbon pulled from the board)   <- connectorAccess for the battery
          ├ thermal-sensor (foam + adhesive; flex cable pulled with tweezers)
          │    └ battery (powerSource; brittle connector, then pry with spudger)
          └ mainboard (2 screws, ribbon, data/power connector)
               └ swivel (2 hinge + 2 swivel screws, metal clip)
                    └ ear-cup-frame (housing + 40 mm driver)
```
The battery connector is reached as soon as the cover is off. iFixit disconnects it before the thermal sensor, matching the engine rule that `electrical` parts are only unplugged with power off.

## 4. Open points (kept `verified: false`)
- Main board: the Motherboard guide (left cup, four corner screws) and the Swivel guide (right cup, two board screws) disagree. Modelled as the right-cup board with two screws.
- Screwdriver: Swivel guide says Phillips #000, others #00. `#00` used (the only tool value in the schema).
- Thermal sensor: iFixit only says to move it to the new battery. Its function is inferred.
- Ear-cup frame / driver: no guide shows the driver. Position and housing shape are approximate.
- Not modelled: left cup (power button, ports, microphones), headband, USB-C port. No iFixit USB-port guide exists for the XM4, so no charging-port repair case.

## 5. Repair cases
`xm4-001` swollen battery (intermediate), `xm4-002` worn right ear pad (beginner; the left pad is a wrong-side spare), `xm4-003` dead touch sensor via a cover swap (intermediate).
