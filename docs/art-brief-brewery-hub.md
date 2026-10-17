# Art brief: brewery hub plates (portrait and desktop)

For GPT and the user. The hub's code is done and waiting on these two images;
until they arrive the app shows labelled provisional plates. Attach
`design/hub-templates/hub-portrait-template.png` and
`hub-desktop-template.png` (same size as the deliverables, anchors marked) and
the Brewery Hub Visual Guide for atmosphere.

## What the plates are

Two clean environment images of the same Riverside brewery bar: no UI, no
text other than the Riverside sign, no station labels, glows, rings, cards,
buttons or progress. The app draws all of that live on top, at the anchor
points below, so state can change without new art.

## Camera and content (both plates)

- Standing at the open end of a U-shaped bar, slightly elevated, looking
  toward the back wall. Left arm comes toward the viewer, back run across the
  middle, right arm comes toward the viewer, open centre aisle between them.
- Beyond the bar: brewery architecture, copper and steel tanks, shelves,
  pendants, the Riverside sign; soft depth of field and warm amber light. The
  hub may be richer and livelier than the Pilsner station backdrop (no
  transparent glass has to read against it), but it is the same place: same
  materials, light direction and branding as the approved Pilsner backdrop
  (`design/backdrops/pilsner-r3.png`).
- Three tap stations, each a real tap tower on the counter with a drip tray in
  front of it: near-left (Pilsner), back centre (Hefeweizen), near-right
  (Nitro Stout). Taps may differ by station but carry no readable labels.
- A Final Rush spot in the centre aisle near the bottom: a floor medallion,
  inlay or lit floor area that reads as a destination. No lock, text or
  laurels baked in (the app draws them).
- People may appear in the background, soft and small; nobody in the
  foreground or near an anchor.
- Do not include: "Good Beer, Better People" or any other slogan, any other
  brand, readable menus, UI of any kind.

## Anchors (where the app puts each station)

Coordinates are in the deliverable's own pixels (x from the left, y from the
top). The ring sits on this point, so it should be the drip-tray / counter
surface in front of that tap. The station card is drawn above the point.

| | Portrait 1170 x 2532 | Desktop 1920 x 1080 |
|---|---|---|
| 1 Pilsner tap (near left) | (330, 1560) | (600, 650) |
| 2 Hefeweizen tap (back centre) | (585, 1170) | (960, 480) |
| 3 Nitro Stout tap (near right) | (840, 1560) | (1320, 650) |
| 4 Final Rush medallion (centre aisle) | (585, 2060) | (960, 905) |

Zones to respect (portrait, at a typical phone scale):

- **Header:** the top ~300 px is under a dark scrim with the title. Keep it
  calm; ceiling, pendants or the top of the back wall are fine.
- **Above each tap anchor:** a station card covers roughly 500 x 310 px
  directly above the anchor. The tap tower itself can sit under the card's
  lower edge; keep the drip tray and anchor point visible.
- **Final Rush:** a medallion roughly 870 x 300 px is centred on its anchor.
- The sign and the back wall sit between the header and the Hefeweizen card
  (about y 330-850): that is where the brewery identity should read.
- Desktop scales the same ideas to 1920 x 1080; cards there cover about
  230 x 120 px above each anchor.

If the composition works better with an anchor moved, move it and say where:
the anchors are one table in `js/hub-scenes.js`, and the app re-maps them
for every screen size.

## Format

- Portrait exactly 1170 x 2532 (or 2340 x 5064, same ratio); desktop exactly
  1920 x 1080 (or 2560 x 1440, same ratio). Other ratios get cropped and move
  the anchors.
- WebP or high-quality JPG; aim under ~600 KB portrait and ~800 KB desktop.
- Save as `assets/hub/hub-portrait.webp` and `assets/hub/hub-desktop.webp`
  (or `.jpg`); the code switch is two lines in `js/hub-scenes.js`.
