# Art brief: brewery hub plates (portrait and desktop)

For GPT and the user.

**Status:** portrait plate delivered (candidate 1, `assets/hub/hub-portrait.webp`)
and live in the app with its stations mapped to the art (table below).
Desktop plate still to come; the app shows a labelled provisional template
for it. Templates: `design/hub-templates/hub-portrait-template.jpg` (the
delivered art with the station points marked) and `hub-desktop-template.png`.

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
surface in front of that tap.

**Portrait (as delivered, candidate 1):** the three taps sit in one band, so
the cards are staggered: the Hefeweizen card floats above its tap tower
(slid right to clear the sign) and the Pilsner and Nitro Stout cards sit just
below their drip trays, on the counter. Final Rush sits on the floor medallion.

| | Portrait 1170 x 2532 (delivered) | Card | Desktop 1920 x 1080 (requested) |
|---|---|---|---|
| 1 Pilsner tap (near left) | (115, 1095) | below the tray | (600, 650) |
| 2 Hefeweizen tap (back centre) | (587, 935) | above the tower, slid right | (960, 480) |
| 3 Nitro Stout tap (near right) | (1065, 1095) | below the tray | (1320, 650) |
| 4 Final Rush medallion (centre aisle) | (584, 1772) | centred | (960, 905) |

For a future portrait revision, keep these four points (or say where they
moved). What to keep calm: the counter tops just below the side trays and
the area right of the sign above the back tower (cards sit there), and the
floor medallion (Final Rush sits on it).

Desktop zones: cards cover about 230 x 120 px above each anchor; keep the
anchor points visible and the space above them calm.

If the composition works better with an anchor moved, move it and say where:
the stations are one table in `js/hub-scenes.js`, and the app re-maps them
for every screen size.

## Format

- Portrait exactly 1170 x 2532 (or 2340 x 5064, same ratio); desktop exactly
  1920 x 1080 (or 2560 x 1440, same ratio). Other ratios get cropped and move
  the anchors.
- WebP or high-quality JPG; aim under ~600 KB portrait and ~800 KB desktop.
- Save as `assets/hub/hub-portrait.webp` and `assets/hub/hub-desktop.webp`
  (or `.jpg`); the code switch is two lines in `js/hub-scenes.js`.
