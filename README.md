# Perfect Pour: prototype v2.3 (one glass, one pilsner)

A prototype for E-Learning Heroes challenge #570: gamified onboarding for a new
bartender at a fictional brewery. The goal is **procedural memory first,
precision second, speed third**: after training, the learner should be able to
rehearse the pour in their head ("tilt, open fully, bring it up past half,
finish upright, stop at the line").

v2 tests one open question: **staged or continuous straightening?** Both use
the same simulation, rendering, scoring and feedback; only the straightening
input differs.

## Status: Pilsner pour mechanic settled

First-timer cold-start test (main link, no explanation): passed on the first
attempt, brought the glass up slowly (the gradual motion the Watch demo
teaches), and recited the steps afterwards. One brief hesitation, at
straightening ("how do I… ah, I see"), resolved within seconds. Decision: the
mechanic is settled; making the straighten gesture more obvious is a
presentation task for the station redesign (M5), not a mechanics change.
Head gauge: kept (revisit only if testers watch it instead of the foam).

## Links

| Page | What it is |
|---|---|
| `/?angle=staged` | **A: staged.** Hold the pad to pour; swipe up once to start straightening. The glass comes upright at a fixed rate. |
| `/` or `/?angle=continuous` (default) | **B: continuous.** Hold the pad to pour; slide up to bring the glass upright (down to tilt more). |
| `/?debug=1` | Adds ⚙: live state, tuning, variant switch, ghost check, pour log download |
| `/v2.2/` | v2.2 (glass is the meter, A/B), frozen for comparison |
| `/v2.1/` | v2.1 (fixed dial), frozen for comparison |
| `/v2/` | v2 as first playtested (moving arc), frozen for comparison |
| `/v1/` | The v1 prototype, frozen as a comparison baseline |

`?angle=slider` and `?angle=toggle` still give the v1 controls, kept as
accessible fallbacks.

## Controls

- **Glass switch** (or `T`): tilts the glass before pouring. During a staged
  pour it is the button version of the swipe.
- **Pour pad**: hold to pour (or hold Space/Enter). The track on its right edge
  shows the glass angle, top = upright.
  - Staged: swipe up (or `↑`, or the switch) to start straightening.
  - Continuous: slide up/down (or `↑`/`↓` in 5° steps).
- "Tap to start/stop pouring" turns hold into tap-on/tap-off; in that mode a
  drag on the pad still moves the glass without toggling the tap.
- `S` serves, `R` restarts.

## What v2.3 changed: B is the default, and teaches itself

Playtest of v2.2: technique was right on every served pour, and B
(continuous) won. Its realistic gesture, keep holding and slide the glass up
gradually, only appeared once the player was told about it, and every failed
pour was a hair over the line.

- **B (continuous) is the default.** `?angle=staged` keeps A.
- **Fill zone centred on the drawn line** (93-97%, was 91-95% with the line at
  the top edge). Releasing at the line, plus the 0.15 s closing ramp, used to
  fail; now it passes. Still judged after the tap fully closes. Tests release
  just before, at and just after the line and check that the verdict, the
  score and the shown level agree.
- **The gesture is taught:** the Watch demo shows a thumb sliding up the pad
  in step with the glass, with a short pause to show a still thumb holds the
  angle while the beer keeps flowing. Pad copy while pouring: "Keep holding.
  Slide up slowly to bring the glass upright." Guided adds "Keep it steady."
  after the straighten verdict while the glass is still rising.
- **Shorter thumb travel:** 70 px for 45° (was 110, about the whole pad), with
  an 8 px dead zone so a resting thumb does not move the glass. The mapping is
  a pure, tested function (`padTarget`).
- **Bring-up style, information only:** the debrief says "Brought up
  gradually" or "Brought up all at once"; it is never scored. Logged as
  `bringUpSeconds` / `bringUpStyle`.
- Head gauge unchanged (decision pending). Log key `perfectPour.log.v2.3`.

## What v2.2 changed: the glass is the meter

Playtest finding on v2.1: it still wasn't clear what the dial asked you to
do. The needle moved by itself, so there was nothing to "hit". v2.2 removes
the dial. **The glass is the meter, the rising beer is the indicator, and the
player's existing actions are the timing decisions**, like a 2K release
window but with real beer.

- **Two distinct windows on the training glass:** a green dotted
  **BRING UP** band (start bringing the glass upright when the beer gets
  there; the sourced half-to-two-thirds range) and the hatched white **LINE**
  band (stop). Both are a couple of seconds of pour wide, not frame-perfect.
- **Feedback on the action, at the action** (Guided): when the glass starts
  coming up, and when the tap fully closes, a mark appears on the glass at
  that level and the caption names that action only, e.g. "Started
  straightening in range" or "Stopped above the line". It never says the
  pour as a whole was good; the debrief does that.
- **Verdict bands are measured, not guessed:** "early"/"late" only where the
  head will miss; "a little early/late" just outside the window where a pour
  can still pass; "in range" with a good stop always passes. A test sweep
  holds that promise.
- **Solo:** no BRING UP band and no live verdicts; the beer, foam, glass and
  the normal fill line stay. The result sheet shows a small training glass
  with both bands and where you acted (approach 3, after the pour).
- **The Guided straighten hint is now a backup:** it fires only if the beer
  passes the BRING UP band without the player acting.
- Event capture (`state.events`) is tested at the edges: one straighten
  event at the moment the glass starts coming up, a stop event when the tap
  has fully closed (closing ramp included), one per stop when a pour is
  paused and restarted, nothing for pre-pour adjustments or small wobbles,
  straightening during a pause captured on resume.
- The head gauge stays for now; flagged for the next usability review.
- Controls, sim behaviour and scoring are unchanged. Log key `perfectPour.log.v2.2` (now includes the events).

## What v2.1 changed (instructional clarity only)

Playtest finding: v2's arc was confusing. It moved with the glass, its band
drifted continuously, and the glass angle was shown three times. v2.1 splits
the two questions: **the beer says when to act; the dial shows where the
glass is.**

- **BRING UP training mark on the glass** at the sourced half-to-two-thirds
  height. Shown in Watch and Guided, gone in Solo. The Watch transcript says
  it is a training mark, not something real glasses have.
- **Fixed glass dial** in the bottom-right corner. Needle = glass angle. In
  Watch and Guided one region lights up for the stage the beer is in:
  *keep it tilted* until the beer reaches the mark, then *bring it up*, then
  *upright* once the glass itself is upright. It changes only at those points
  and never drifts. There is no second fill-percentage rule. Solo shows the
  needle only. Whether the dial earns its place at all is an open question.
- **Watch narration** introduces the dial and the mark; the Guided hint points
  at the glass ("The beer's past the mark. Start bringing it up.") and fires
  a little after the mark, so the learner has the chance to act first.
- The pad's angle track now appears only in continuous mode.
- No changes to the controls, the sim, or scoring. Log key: `perfectPour.log.v2.1`.

## What v2 changed

- **Procedure + outcome assessment.** Pass needs *tilted first* and *finished
  upright* (closed upright after at least 0.5 s of upright pouring) **and**
  head, level and spill in range. Right technique with an off pour is shown as
  a near miss ("Good technique. Adjust the pour.").
- **Exploits closed.** v1 passed a pour held at any one angle from 34° to 42°
  without ever straightening; that now fails. Flicking upright at the last
  instant fails. The head no longer shrinks while you wait to press Serve.
- **Real tilt geometry.** The sim models the glass shape: a tilted glass holds
  less (79% at 45°), and tipping too far for the fill spills over the lip. The
  renderer draws the true angle using the sim's own geometry, replacing v1's
  "draw at 75%" workaround.
- **Angle arc** around the glass with a moving coaching band (replaced in v2.1).
- **Gradual straightening** in the demo and the coaching, per the sources.
- Sources and rule categories: [`docs/pour-procedure.md`](docs/pour-procedure.md).

## Tests

```
npm test            # simulation (61) + hub layout (15), Node 18+, no installs
npm run test:ui     # browser: 34 Playwright tests (npm install first)
npm run test:all    # both
```

**Simulation tests** run `js/sim.js`, the exact file the page loads.
Covered: geometry, purity, the staged rate, spill, Serve timing, the ghost
passing mid-band and staying in its own zone, every v1 exploit, the
straightening window, known-bad pours and their feedback, the centred fill
zone, pad travel, bring-up style, action events, and the guided hints.

**Browser tests** drive the real page with Playwright and a paused clock, so
every frame is reproducible: Watch demo, Guided touch pour with live
feedback, Solo fade and debrief, release at the line, snap vs gradual,
result-sheet layering, keyboard path, blur closes the tap, tap mode, the
staged fallback, the pour log, the debug ghost check, glass treatments and
frozen versions loading, and clean mount/unmount (no leaked listeners or
animation frames; a remount pours exactly like a fresh page), and the M2
design pages (the sheet loads; the composite runs the unmodified demo to a
clean pour, filters only the art, and its shadow follows the glass).

`node test/ui/snapshots.mjs <dir>` writes deterministic screenshots for
pixel-parity checks across refactors.

| Pour (staged) | Result |
|---|---|
| Demo | pass; head 0.121, level 0.932, straightening from 54% |
| Straighten at 45-60% full | pass |
| Straighten at 30% | fail: started early, head too big |
| Straighten at 70% | fail: started late, head too small |
| Never straighten (any angle) | fail: not finished upright, spilled over the lip |
| Open upright | fail: opened upright |
| Overpour by 1.5 s | fail: overflow |
| Stop at 86% | fail: short |

## Visual pass (in progress)

- **Faucet** redesigned as an illustrated brewery tap (live on the main link):
  named SVG parts `#tapShank`, `#tapNut`, `#tapBody`, `#tapSpout`, `#handle`
  (rotates with flow), `#tapBadge` + `#tapLabel` (swap the colour/text per
  beer), `#tapGlow` (nozzle glow while pouring). The stream has a lighter core.
- **Glass: A (refined) chosen and now the default.** Same cavity as the sim,
  so beer, foam, bands and scoring are unchanged. Creamier foam shading and a
  bright line where beer meets foam. Alternatives kept for reference:
  `?glass=b` (warm craft) and `?glass=old` (the prototype glass). Art lives in `SKINS` in
  the renderer: back-wall art behind the beer, wall/rim/base/highlights in
  front, training overlays always on top.

## M3: brewery hub and navigation (for review)

**`/brewery.html`** is the brewery app: a U-shaped bar hub, and the Pilsner
station opened from it. `index.html` stays the standalone station (the test
links and the composite page use it); M4 can make the app the front door.

- **Hub (visual pass, in review):** an image-based brewery scene with live
  hotspots. Each composition (portrait, desktop) is a plate with station
  anchors in the plate's own pixels (`js/hub-scenes.js`); `layoutScene()`
  fits the plate like `object-fit: cover` but never at the cost of a
  station, and maps the anchors to the screen (unit-tested in
  `test/hub-layout.test.js`). Station cards are real buttons, in teaching
  order, standing on a ring at their anchor; Final Rush is a locked medallion
  in the centre aisle. On very small screens the hub scrolls rather than
  stacking cards.
- **Art status:** the clean hub plates are not made yet. The app shows
  provisional template plates generated from the anchor table
  (`node tools/make-hub-plates.mjs`), labelled "Provisional art" on screen.
  The art spec is [`docs/art-brief-brewery-hub.md`](docs/art-brief-brewery-hub.md)
  with full-size templates in `design/hub-templates/`.
- **Progress states:** new ("Start here", green) → in progress ("Continue",
  blue) → certified ("Replay", M6 only). Hefeweizen and Nitro Stout show a
  dashed "Coming soon" chip and no Start. The state is in words on the card
  (and for screen readers), with a matching ring (colour plus line style).
- **Navigation:** hash routes (`#/`, `#/pilsner`), so the browser's back
  button works and the page still opens from disk. The station's brand is
  replaced by "‹ Bar", which steps back in history (or returns to the hub if
  the station was opened from a link). Focus goes to "‹ Bar" on entering and
  back to the station's card on return; coming-soon deep links fall back to
  the hub.
- **Interrupted pour (agreed rule):** leaving a station by any route closes
  the tap at once and abandons an unserved attempt: never graded, logged with
  `endedBy: "navigate"`, counted as abandoned in progress, and the station
  stays In progress. The hub says "Pour stopped. That attempt wasn't
  scored; you'll start fresh next time." Coming back starts fresh (Watch,
  empty glass). Watching the demo or leaving after serving abandons nothing.
- **Progress storage:** `localStorage["riverside.progress"]`, versioned
  (`version: 1`): per station `status`, `attempts` (served pours), `passes`,
  `abandoned`, `lastPlayed`. Unreadable data starts fresh; data written by a
  newer version is left untouched.
- The simulation (`js/sim.js`) is unchanged. The station gained only host
  hooks: `onExit`, `onEvent('served' | 'abandoned')`, and
  `unmount(reason)` returning `{ abandoned }`.
- The station inside the app still uses its current layout; the brewery
  look for the station is M5.

## M2: visual system and compositing test (approved)

Nothing in the game changed. These are review pages:

| Page | What it is |
|---|---|
| `/design/components.html` | Riverside visual system: palette, type (self-hosted Barlow / Barlow Condensed), buttons, station status chips (Hefeweizen and Nitro Stout shown as "Coming soon", not playable), hub hotspots, caption pills, certification seal, and a result panel that lists only what the pass is judged on. |
| `/design/composite.html` | The live game (faucet, glass A, beer, foam) inside a fixed 390 x 844 portrait frame over a replaceable backdrop. Pick a treatment, a backdrop (or load your own image file), stage only or stage + pad, the mode, and the reserved-zone overlay. Settings live in the URL, e.g. `?fx=all&zones=1&bg=<image url>`. |
| `/design/composite-compare.html` | The four treatments side by side. |

- **Treatments** (page-side SVG filters; bands, labels, marks and the head
  gauge are never filtered): *original*; *warm grade + light wrap* (cool
  whites pulled toward the amber room light, a faint amber edge on the glass
  and faucet); *contact shadows* (faucet drop shadow on the wall, a soft
  shadow on the bar top that follows the glass and fades as it lifts);
  *grade + shadows*.
- **Backdrop focus** (review round 1): blur, dim and a vignette centred on
  the pour, applied to the backdrop only, to test separating the flat live
  art from a sharp photographic backdrop. `?blur=3&dim=20&vig=50`.
- **Glass edge** `?edge=subtle`: glass A's outline restyled from the page as
  a thin warm stroke, brighter on the lit left side, instead of the crisp
  white outline. Visual only; same geometry, beer and overlays.
- **Backdrop** `design/backdrops/temp-pilsner.svg` is a labelled temporary
  stand-in. `design/backdrops/pilsner-portrait-template.png` (1170 x 2532,
  3x of the frame) marks what the real one must respect: no tap hardware in
  the live faucet zone (the shank runs off the right edge), a low-contrast
  glass sweep, the bar top / drip tray at y 507 (the shadow plane; was 494
  before the round-2 move), and a dark,
  even area below y 560 for the controls.
- **Frame layout** is a proposal for M5, not the current station layout: the
  scene spans the full width, the caption sits on top and the pad below the
  bar. The station's own layout is untouched.
- `design/backdrops/pilsner-r2.png`: revision 2 from the brief; `pilsner-r3.png`: its retouch (tray dimmed,
  gauge corner cleared, calmer field behind the faucet), now the composite's default backdrop.
- Backdrop art brief (revision 2, agreed): [`docs/art-brief-pilsner-backdrop.md`](docs/art-brief-pilsner-backdrop.md).
- Carried to M3 unchanged: what happens if the player leaves mid-pour (close
  the tap, then record or deliberately discard the attempt).

## Pour log fields (the ones easy to mix up)

All levels are shares of the glass height, upright.

| Field | Meaning |
|---|---|
| `straightenBegan` | Level when the glass **started** coming up (first 5° below the angle the tap opened at). This is the decision moment, and what the feedback and the "in range / early / late" verdict use. |
| `straightenFill` | Level when the glass **reached upright** (≤ 15°) while pouring. Not a decision; the end of the movement. |
| `bringUpSeconds` / `bringUpStyle` | Time between those two moments, and "gradual" (≥ 0.5 s) or "allAtOnce". Information only. |
| `endedBy` | How the pour ended: `served`, `restart`, `modeChange`, or `navigate` (left the station mid-pour; M3). |
| `events` | Each action as it happened: `straighten` (= `straightenBegan`) and every full tap close (`stop`), with the verdict shown. |
| `finalLevel` / `finalHead` | What was scored. |

## Architecture

No build step; static files on GitHub Pages. Classic scripts (not ES
modules) so `index.html` still opens by double-click from disk.

| File | What it is |
|---|---|
| `index.html` | The standalone Pilsner station: a stylesheet link, a host element and a three-line boot |
| `brewery.html`, `js/brewery.js`, `css/brewery.css` | The brewery app (M3): hub, hash router, station mounting |
| `js/hub-scenes.js` | Hub plates, station anchors (plate pixels) and the pure `layoutScene()` mapping |
| `assets/hub/`, `tools/make-hub-plates.mjs` | Hub plates (provisional templates, generated from the anchors, until the art arrives) |
| `js/progress.js` | Versioned training progress on this device (`RiversideProgress`) |
| `css/pilsner-station.css` | The station's styles, scoped to its host (`.pp-st`) |
| `js/sim.js` | The simulation. Pure `step(state, input, dt)` at a fixed 60 Hz, geometry, scoring, feedback copy, hints, the demo timeline. Constants labelled PHYSICAL, SOURCED or GAME. Publishes `PourSim`. |
| `css/tokens.css`, `css/components.css` | M2 visual system: colour, type, spacing tokens and the shared components (used by the hub; the station adopts them in M5) |
| `design/` | M2 review pages and backdrops (see above) |
| `js/pilsner-station.js` | The Pilsner station (markup included): renderer (`Renderer.render(state, view)`, inline SVG, read-only on sim state), pad input, Watch/Guided/Solo, result sheet and debrief, live region, pour log (`perfectPour.log.v2.3`), debug panel. |

The station is a component:

```js
const station = PilsnerStation.mount(hostElement, {
  search: '?angle=staged',                 // optional: URL-style options
  onExit: () => { /* "‹ Bar" pressed */ }, // optional: adds the back button
  onEvent: (type, detail) => {}            // 'served' {mode, pass} | 'abandoned' {mode, reason}
});
station.unmount('navigate');  // closes the tap, abandons an unserved pour, removes its
                              // markup, loop, timers and every window/document listener;
                              // returns { abandoned }
```

The brewery app (`js/brewery.js`) mounts and unmounts stations; the station
knows nothing about the hub.

## Still open

- Verify the sources first-hand (see the doc), and decide American-standard vs
  Czech-style pilsner pour.
- Copy marked `CLAIM` in the source states beer behaviour as fact.
- Out of scope until the playtest picks a control: badges, other styles, rush,
  branding, final art.
