# Art brief: landing plate (Riverside exterior)

For GPT and the user. The landing is the first screen a new learner sees,
inside the web app (and so inside the Storyline Web Object). The code is in
place with a dimmed, labelled stand-in; this image replaces it.

## The scene

- The Riverside Brewing Co. building from outside, at dusk or early night:
  modern industrial (dark brick or charcoal cladding, steel, big warm-lit
  windows), copper brewhouse tanks visible through the glass, the Riverside
  hop emblem / sign on the building. The sense of arriving: the learner is
  about to walk in to the bar they'll see next (same materials and warm
  amber light as the hub and the Pilsner backdrop).
- No people close up; a few soft figures in the windows are fine.
- Do not include: buttons, titles, "Perfect Pour" or any text other than the
  Riverside sign, slogans (no "Good Beer, Better People"), other brands, UI.

## Layout (landscape 16:9, the primary format)

- **Left ~45% is the title zone** (x 0-45%, y 20-85%): the app places the
  emblem, "PERFECT POUR", a subtitle and the Start Training button there.
  Keep it calm and darker: street, shadow, sky, a plain wall. No bright
  windows, signs or busy detail in that zone.
- **The building and its sign sit centre-right** (roughly x 50-85%). Put the
  sign/entrance near x 55-70% so it also survives the portrait crop (below).
- Keep the bottom ~10% simple (a small "Provisional art" label sits
  bottom-right during development; it disappears with the real art).

## Portrait (secondary)

Phones show the same image cropped to a narrow slice centred at 60% of the
width (about x 47-73% of the image is visible), with the title block at the
bottom. If the sign/entrance sits in that slice, no separate portrait plate
is needed for now.

## Format

- 2560 x 1440 preferred (16:9), at least 1920 x 1080. Other ratios get cropped.
- WebP or high-quality JPG, under about 800 KB.
- Save as `assets/landing/landing.webp`; switching it on is one line in
  `js/brewery.js` (`LANDING`).
