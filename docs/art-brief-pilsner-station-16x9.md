# Art brief: Pilsner station backdrop, 16:9 (M5)

For GPT and the user. **Status: template ready; art not yet requested.**
Review the provisional layout first (M5A gate); then this brief goes to GPT.

## What it is

The environment behind the live Pilsner pour, in the one 16:9 frame. The
app draws the faucet, glass, beer, foam, training marks, head gauge and the
control panel live on top. Same place and treatment as the approved
portrait backdrop R3 (`design/backdrops/pilsner-r3.png`): dark, warm,
industrial, softened room, sharp bar top and drip tray.

## Templates (2560 x 1440, measured from the live layout)

- `design/station-templates/pilsner-template-tilted.png`: the Watch demo
  mid-pour at 45 degrees, zones overlaid.
- `design/station-templates/pilsner-template-upright.png`: the finish,
  glass upright on the tray.
- `design/station-templates/pilsner-template-zones.png`: zones only.
- `design/station-templates/pilsner-zones.json`: the numbers.

Regenerate after any layout change: `node tools/make-station-template.mjs`.

## Zones (plate pixels, x0 y0 x1 y1)

| Zone | Box | Rule |
|---|---|---|
| Live faucet | 864, 135 - 1362, 473 | No tap, spout, handle or tower here. Plain dark wall. |
| Shank mount | 1358, 218 - 1456, 1241 | The live shank ends at x ~1360: a dark steel or matte wall/tower edge from here rightwards, so the tap reads as mounted. Nothing shiny. |
| Glass sweep | 413, 467 - 1207, 1256 | Every glass position from 45 degrees to upright. Calm, dark, low contrast; no highlights, hard edges, strong verticals, text. |
| Drip tray surface | 739, 1223 - 1213, 1262 | The upright glass base rests at (976, 1223): the tray's top face at y ~1223, centred on x 976. |
| Head gauge | 365, 272 - 549, 918 | Calm and dark (labels read here). |
| Control panel | 1696, 137 - 2560, 1440 | Covered by the dark control panel; keep it dark and even (the room can continue softly). |
| Header | 0, 0 - 2560, 137 | Back button and mode switch; calm. |

Nozzle: (976, 432).

## Rules carried over from R3

- The beer is the brightest warm amber element in the scene.
- Selective depth of field: bar top and tray sharp, room soft.
- One warm key light from above, slightly left.
- No UI, text (other than a soft, secondary Riverside sign away from the
  zones above), slogans or game elements baked in.

## Format

2560 x 1440 (16:9), WebP or high-quality JPG under ~800 KB, saved as
`assets/station/pilsner.webp`; switching it on is one line in
`js/brewery.js` (`STATION_BACKDROP`).
