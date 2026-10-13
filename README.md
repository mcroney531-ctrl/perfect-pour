# Perfect Pour: prototype v0 (one glass, one pilsner)

A throwaway prototype for E-Learning Heroes challenge #570. It answers one
question: **is pouring a digital pilsner satisfying, understandable, and worth
building around?** No other styles, badges, rush mode, sound or final art.

## Running it

`index.html` is the whole game: one file, no build, no dependencies, no
network requests. Open it in a browser, or serve the folder (`npx serve .`).
The repo root is the site; `netlify.toml` publishes it as-is.

| URL | What it does |
|---|---|
| `?angle=slider` (default) | Angle control A: continuous 0-60° slider |
| `?angle=toggle` | Angle control B: Upright / Tilted 45° switch |
| `?debug=1` | ⚙ button: live state, constant tuning, variant switch, ghost check, pour log export |

Controls: hold **Pour** (or hold Space/Enter). Arrow keys move the slider 5°,
`T` flips the toggle, `S` serves, `R` restarts. "Tap to start/stop pouring"
next to the pour button turns hold into tap-on/tap-off.

## Tests

```
npm test
```

Node 18+, no installs. The tests pull the `<script id="sim">` block out of
`index.html` and run that exact code. They check that the ghost run passes
under both angle controls and lands mid-band, and that each known-bad pour
gets the expected feedback:

| Timeline (slider) | Head | Level | Spill | Straightened at | Feedback |
|---|---|---|---|---|---|
| Ghost demo | 0.126 | 0.935 | 0 | 0.80 | pass |
| Opens upright | 0.189 | 0.990 | 0.013 | 0.00 | upright / early |
| Straightens at 40% | 0.270 | 0.876 | 0 | 0.40 | early / short |
| Never straightens | 0.059 | 0.929 | 0 | none | stayed tilted |
| Straightens at the line | 0.078 | 0.928 | 0 | 0.90 | stayed tilted |
| Overpours | 0.096 | 0.995 | 0.153 | 0.79 | overflow |
| Stops short | 0.099 | 0.798 | 0 | 0.71 | short |

Targets: head 0.08-0.16, level 0.91-0.95, spill ≤ 0.02. The toggle ghost
lands at head 0.120, level 0.935.

## Architecture

- **Sim** (`<script id="sim">`): pure `step(state, input, dt)` at a fixed
  60 Hz. No DOM, clock or randomness. It also holds `evaluate` (spec §4),
  cause ranking and copy (§5), guided hint triggers (§3), and the ghost timeline.
- **Renderer** (`Renderer.render(state, view)`): inline SVG, read-only on
  sim state. Swapping to Canvas touches only this block.
- **App**: input, modes, result sheet, live region, metrics log, debug panel.

## Tuning (all placeholders, `verified: false`)

Changed from the spec's starting config:

- `k` 0.5 → **0.6**, `d` 0.04 → **0.08**. With the spec's values, a pour that
  straightened right at the line (or barely at all) still scraped into the
  head band at 0.083, so the "straighten near the end" step hardly mattered.
  A faster settle makes foam from the tilted phase fade, so the head has to
  come from the upright finish.
- Ghost: tilt at 0.5 s, open at 1.6 s, straighten at 8.4 s, close at 9.6 s,
  serve at 10.6 s (8 s of open tap).

## Design calls and deviations to review

- **"Stop pouring" hint** waits until the level is in the fill zone, not just
  when the head reaches the band. Taken literally, the spec's trigger fires
  at the start of an upright pour, or at about 86% on a good pour, and
  obeying it fails the pour as short. **"Close to the line"** fires 4% below
  the zone so it arrives first as a warning.
- **Extra fail causes** beyond the spec table: *stopped above the line*
  (level 95-100% with no spill), and generic *head too big / too small* for
  pours that straightened inside the window but still missed. Without these
  a fail could arrive with no reason given.
- **Upright start**: the copy says "upright" at ≤15° and "before the glass
  was fully tilted" between 15° and 35°.
- `straightenFill` and the guided straighten window use the **total** level
  (beer + head), which is what the player sees.
- The **glass is drawn at 3/4 of the sim angle**. Drawn true, a 45° glass at
  80% looked like it was overflowing right when the cue said to straighten.
  Readouts use the true angle.
- A **click with no pointer press** (screen reader or switch access) on the
  pour button toggles it, since those users can't hold.
- Pours **abandoned** by Restart or a mode switch are logged with
  `served: false`.

## Copy that states real-world claims (unverified, spec §9)

Marked `CLAIM` in the source. All are true of this sim; none is checked
against a brewery or beer-service source:

1. "The stream dropped straight onto the beer and turned mostly to foam. Tilt first."
2. "The head spills first." (overflow)
3. "Most of the pour landed upright, which builds foam…" (straightened early)
4. Ghost step 3: "Straighten near the end to build the head."
5. Implied by the whole demo: 45° tilt, when to straighten, the 8-16% head
   band, "Open the tap fully."

The result sheet carries a one-line notice that cues and numbers are
placeholders.

## Phone test checklist (spec §8)

Open the Netlify URL on the phone, portrait first. Add `?debug=1` when you
want the log.

1. **First 10 s feel.** Fresh load, watch the demo once, then Guided. Does
   the stream appear the instant you press? Does the level visibly climb? Does
   foam react when you straighten (bigger splash, head bar jumps)? Any lag
   between finger and tap?
2. **Can you say why?** Deliberately make three bad pours in Solo (open
   upright; straighten at about half; overfill). Before reading the sheet,
   say out loud why it failed, then compare with the feedback.
3. **Angle control.** Do 3 pours with `?angle=slider` and 3 with
   `?angle=toggle`, in portrait and in landscape. Note any accidental angle
   changes while holding Pour, or accidental pours while adjusting the angle.
   Which felt better?
4. **Hold-to-pour tolerance.** Is holding for about 8 s comfortable? Try tap
   mode once. Does a slipping thumb or a notification stop the pour cleanly?
   (Switch apps mid-pour: the tap should be closed when you come back.)
5. **SVG good enough?** Any stutter while pouring? Does it read as beer
   without explanation? Ask testers "what is this?" before telling them.
6. **2-3 attempts?** For each first-timer, count Solo attempts to the first
   pass (the log's `attempt` and `pass` fields).
7. **Fill line and band visible in Solo.** Do passing testers look at the
   gauge and line rather than the beer? If so, try a Solo pass with the line
   ignored, and decide whether to hide them.

After each session: ⚙ → Download JSON (or Copy JSON) and keep the file.
