# Art brief: landing plate (Riverside exterior)

For GPT and the user. The landing is the first screen a new learner sees,
inside the web app.

**Status:** candidate 1 installed (`assets/landing/landing.webp`, 2560 x 1440,
scaled up from 1672 x 941). Its left side (sunset, skyline) is brighter than
this brief asked; a light left-side scrim plus text shadows keep the title and
Start Training readable without editing the image.

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

## Layout (16:9)

- **Left ~45% is the title zone** (x 0-45%, y 20-85%): the app places the
  emblem, "PERFECT POUR", a subtitle and the Start Training button there.
  Keep it calm and darker: street, shadow, sky, a plain wall. No bright
  windows, signs or busy detail in that zone.
- **The building and its sign sit centre-right** (roughly x 50-85%).
- Keep the bottom ~10% simple (a small "Provisional art" label sits
  bottom-right during development; it disappears with the real art).

## One format

The app is a single 16:9 frame everywhere, so there is no
portrait version of this image.

## Format

- 2560 x 1440 preferred (16:9), at least 1920 x 1080. Other ratios get cropped.
- WebP or high-quality JPG, under about 800 KB.
- Save as `assets/landing/landing.webp`; switching it on is one line in
  `js/brewery.js` (`LANDING`).
