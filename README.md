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
npm test            # Pilsner sim (61), Hefeweizen sim (16), Nitro Stout sim (23), hub layout (8), station registry (3), progress (4), entry points (3), station kit (5), station markup (2); Node 18+, no installs
npm run test:ui     # browser: 105 Playwright tests, incl. DOM/speech parity, lifecycle and input (npm install first)
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

**Parity safety net (for the shared station kit).**
- `test/ui/dom-parity.test.mjs` compares each station's DOM at fixed points of a deterministic run against `test/ui/fixtures/`. It covers Pilsner and Hefeweizen in the app and the legacy page, and also checks what the live region said, in order, and the level every 250 ms.
- `test/ui/lifecycle.test.mjs` covers:
  - The tap closing on blur, page hide and a hidden tab.
  - Unmount: abandoned once, safe to repeat, nothing left behind.
  - The log's key, fields, cap and attempt numbering.
- `test/entry-points.test.js` checks script order on both pages.
- After an intended change: `UPDATE_FIXTURES=1 node --test test/ui/dom-parity.test.mjs test/ui/lifecycle.test.mjs`.
- `node tools/station-parity.mjs shoot <dir>` / `compare <a> <b>` gives before/after screenshots at 1280×720 and 844×390. It separates real differences from Chromium's few-pixel rasteriser noise.

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

## M6: certification (for review)

- One passing **Solo** pour certifies the Pilsner station: once, permanently
  (a failed replay never revokes it). Watch and Guided never certify.
- The first certifying pour shows the Riverside seal above the full pour
  debrief: "Pilsner station complete · You've completed Riverside's virtual
  Pilsner training." Scoped wording: not a professional qualification, not a
  centrally kept record (progress lives in the browser).
- Hub: seal on the Pilsner card, "Replay", "1 of 3 certified"; Final Rush
  stays locked until all three stations are certified.
- Spec and implementation notes: [`docs/m6-certification-spec.md`](docs/m6-certification-spec.md).
- M5's fresh-learner playtest is still open. The owner's device playtest
  (phone sideways, mouse/keyboard, cues, full first-visit flow, mid-pour exit)
  passed with no issues.

## M5: Pilsner station in the brewery look (implementation complete; fresh-learner validation pending)

- **Backdrop:** revision 2 approved (`assets/station/pilsner.webp`), with the
  M2 treatment applied from outside the station (`js/station-look.js`: warm
  grade + light wrap, faucet and contact shadows, subtle glass edge).
- **Straighten-gesture cues** (`js/station-cues.js`, presentation only; reads
  what the station shows, sends no input): Watch shows rising chevrons by the
  demo thumb while it brings the glass up; Guided shows "Keep holding · slide
  up slowly" on the pad from the BRING UP band until the glass starts coming
  up; Solo shows nothing. While a pour is held, the Tilted/Upright switch
  dims so it doesn't read as the way to straighten (it still works).
- **Panel:** Watch steps fold behind "Show all steps"; the caption carries
  the current step.
- **Reachability** tested at 1920 x 1080, 1280 x 720, 844 x 390 and 667 x 375:
  modes, tilt, pad, Serve, Restart and the result buttons. (Delivered as a
  standalone web app; Storyline embedding is not a target, though the frame
  would drop into a Web Object unchanged.)

## M5A: Pilsner station layout in the 16:9 frame (approved)

- Inside the brewery app the station now uses the frame: the stage (faucet,
  glass, head gauge) large on the left; caption, controls and the result
  sheet in a dark panel on the right; tap mode as a row under the pour pad.
  The panel scales with the frame (0.8x on a phone held sideways, 1x at
  1280 x 720, 1.5x at 1920 x 1080); short frames tighten spacing so tilt,
  pad, Serve and Restart stay reachable without scrolling.
- Provisional, labelled backdrop generated from the measured layout.
  Template, zones and brief for the real one:
  [`docs/art-brief-pilsner-station-16x9.md`](docs/art-brief-pilsner-station-16x9.md)
  (`node tools/make-station-template.mjs` regenerates them).
- Simulation, scoring, controls and timing unchanged; standalone
  `index.html` keeps the original layout, so its regression and pixel
  tests still guard the mechanics. Intro goal copy updated.

## M4: landing, first visit, station intro, transitions (approved)

- **One format: a single 16:9 frame.** The whole app (landing, hub, intro,
  station) renders in one 16:9 frame scaled to the window, with dark bars
  around it, like a video player. The portrait
  layout and plate are retired (in the git history). Upright phones get a
  dismissable "Turn your phone sideways" prompt. The live UI scales with the
  frame: 0.7x on small frames (phone held sideways), 1x at 1280 x 720, 1.5x
  at 1920 x 1080.

- **Landing** (inside the app, so the GitHub Pages version stays complete):
  Riverside emblem, "Perfect Pour", Start Training. First-time learners see
  it; returning learners open straight on the hub. `#/welcome` always shows
  it. Exterior plate: `assets/landing/landing.webp` (Riverside at dusk);
  spec: [`docs/art-brief-landing.md`](docs/art-brief-landing.md).
- **Station intro:** the first time a learner opens the Pilsner station, one
  card says how it runs (Watch, Guided, Solo) and its goal; Begin opens the
  station. Never shown again. Entering the station (including the intro)
  starts "In progress"; backing out of the intro abandons nothing.
- **Camera push:** choosing a station zooms the hub toward it and fades to
  dark over 0.65 s, then the station (or its intro) opens; returning fades
  the hub back in over 0.3 s. Any navigation during the push (browser back)
  cancels it cleanly. Reduced motion: no push, no fade.
- **Mid-pour exit message:** "Pour stopped. Attempt not scored. Return to
  Pilsner to try again."
- **Progress:** one-time screens are recorded in `seen` (`landing`,
  `intro.pilsner`), added without a version bump (older saved data simply
  has none yet).

## M3: brewery hub and navigation (approved)

**`/brewery.html`** is the brewery app: a U-shaped bar hub, and the Pilsner
station opened from it. `index.html` stays the standalone station (the test
links and the composite page use it); M4 can make the app the front door.

- **Hub (visual pass, in review):** an image-based brewery scene with live
  hotspots. The composition (one 16:9 landscape plate) has station
  anchors in the plate's own pixels (`js/hub-scenes.js`); `layoutScene()`
  fits the plate like `object-fit: cover` but never at the cost of a
  station, and maps the anchors to the screen (unit-tested in
  `test/hub-layout.test.js`). Station cards are real buttons, in teaching
  order, standing on a ring at their anchor; Final Rush is a locked medallion
  in the centre aisle. On very small screens the hub scrolls rather than
  stacking cards.
- **Art status:** one landscape plate (`assets/hub/hub-desktop.webp`,
  revision 2) with its stations mapped to the art; the portrait plate was
  retired when the app became a single 16:9 frame. Spec:
  [`docs/art-brief-brewery-hub.md`](docs/art-brief-brewery-hub.md).
- **Progress states:** new ("Start here", green) → in progress ("Continue",
  blue) → certified ("Replay", M6 only). All three stations are playable;
  Final Rush stays locked, and says "Coming soon" once all three are
  certified. The state is in words on the card
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
| `assets/hub/`, `tools/make-hub-plates.mjs` | The hub plate, and a provisional-template generator (from the station table) for future plates |
| `js/progress.js` | Versioned training progress on this device (`RiversideProgress`). Older or damaged saves are repaired per station, never wiped |
| `js/stations.js` | The station registry (`RiversideStations`): the shell builds the hub and mounts stations from what is registered |
| `js/stations/pilsner.js` | Registers Pilsner: its card, intro and backdrop, and a thin adapter around `PilsnerStation.mount` that adds the Pilsner-only look and cue layers |
| `js/stations/hefeweizen.js`, `js/hefe-station.js`, `js/hefe-sim.js` | The Hefeweizen station: registration, station (renderer, input, modes, debrief, log) and its own sim |
| `js/station-chrome.js` | Panel chrome shared by both stations (the folded Watch steps) |
| `js/station-kit.js` | Station plumbing shared by both stations: listener lifecycle, batched speech, captions, the fixed-step loop, the log store (loaded by both entry points) |
| `js/station-markup.js` | The panel, result sheet and live region every station shares, built around the station's own stage, with slots for station-specific parts (loaded by both entry points) |
| `js/station-input.js` | The continuous pad and keyboard shared by both stations (hold, drag and dead zone, tap mode, assistive-tech clicks, keys, safety stops); Pilsner's staged, slider and switch variants plug in through hooks |
| `js/stations/stout.js`, `js/stout-station.js`, `js/stout-sim.js` | The Nitro Stout station: registration, station (renderer, two-stage modes, debrief, log) and its own sim |
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
knows nothing about the hub, and the shell names no beer. A station joins
the app by registering (slice 1 of the contract in
`docs/architecture-multi-station.md`):

```js
RiversideStations.register({
  id: 'pilsner', contract: 1,
  meta: { name, sub, glass, intro: { label, title, steps, goal }, backdrop: { src, provisional } },
  mount(host, { onExit, onEvent }) { /* ... */ return { unmount(reason) { return { abandoned }; } }; }
});   // no mount = shown as coming soon
```

## Step 3: Nitro Stout station (playable, for hands-on review; settle and bands provisional, art provisional)

**Staged pouring and patience.** Pour to about three-quarters, set the glass
down, wait until the cloudy surge has settled, then top up upright to a
slight dome.

- **Station:** `js/stout-station.js` (`StoutStation`), registered by `js/stations/stout.js`, built on the shared kit, markup builder and pad controller. Same controls as the other stations.
- **On screen:** the glass slides to a set-down spot while it settles; the cloudy band shrinks and a clean line forms between dark beer and cream head.
- **Watch:** the full two-stage demo, plus an optional short "Early top-up" example, labelled as what not to do.
- **Guided:** a SET DOWN band for stage one, a SURGE bracket while it settles, one "Settled" hint. No timer.
- **Solo:** no coaching; early top-ups allowed; a pass certifies.
- **Spec, measurements and open review items:** `docs/nitro-behaviour.md` §10.

## Nitro Stout simulation

`js/stout-sim.js` (`StoutSim`) is its own pure, fixed-step sim.

- **The two-stage pour:** stage one to about three-quarters, set down, settle, top up upright to a slight dome.
- **The beer keeps changing with the tap shut.** It is three parts (dark liquid, cloudy surge, head), and the surge settles over about 10 s of compressed time.
- **When to top up is the learner's call.** It is never blocked: an early top-up is recorded and stirs the left-over surge into a loose head, and the debrief explains it.
- **Tests:** 23 isolated node tests.
- **Spec:** targets, the "what happens when" table, samples and open decisions are in `docs/nitro-behaviour.md`.

## Step 2: Hefeweizen station (playable, for review; bands provisional, art provisional)

**Foam Control.** The same routine as the Pilsner, applied to a foamier beer
that varies from pour to pour. The learner reads the foam and adapts when to
bring the glass up.

- **Sim:** `js/hefe-sim.js` (`HefeSim`), a pure, seeded sim of its own:
  - A curved weizen glass.
  - Per-pour liveliness (calm, typical or lively).
  - Calibrated hidden windows.
  - Deterministic, balanced scenarios.
- **Station:** `js/hefe-station.js` (`HefeStation`), registered by `js/stations/hefeweizen.js`.
  - It reuses the Pilsner station's markup structure and ids, so the station styles and the in-frame layout apply unchanged.
  - The pad, keys and buttons work the same.
  - The Pilsner station and sim are untouched.
- **Watch:** a lively demo, plus an optional "Watch a calmer pour".
- **Guided:** a FOAM bracket on the beer, hints that react to this pour, and this pour's dashed BRING UP guide, which appears once the foam has started (also in both Watch demos; never in Solo). See `docs/hefeweizen-behaviour.md` §3b.
- **Solo:** calm and lively pours only; a pass certifies (M6).
- **No free rerolls:** restarting, switching modes or leaving replays the same pour. Only a served pour moves on; a failed serve counts, which is accepted for training.
- **Hub:** guidance handles two playable stations. Pilsner is "Start here"; Hefeweizen is open ("Start") and becomes "Start here, recommended next" once Pilsner is certified.
- **Shared code:** the folded Watch steps moved into `js/station-chrome.js`, now used by both stations. Pilsner screens are pixel-identical.
- **Spec and perception notes:** `docs/hefeweizen-behaviour.md`.
- **Functional review:** approved. Hefeweizen stays unlocked, and the good range shows in the debrief only. Bands stay provisional until the owner's playtest.
- **Next:** the proposed shared-UI extraction before Nitro, in `docs/shared-station-ui.md`.

## Slice 1: station registry (for review)

The first implementation slice of the multi-station plan, approved with
amendments in the planning review. App layer only: no change to the Pilsner
station, simulation, scoring or art.

- **Registry.** `js/stations.js`, with Pilsner registered through a thin adapter.
- **Pilsner details moved out of the shell.** Card, intro, backdrop and the Pilsner-only look and cue layers now live in `js/stations/pilsner.js`, not `js/brewery.js`. The shell builds the hub, intro, messages and station screen from the registry.
- **Progress loading repairs instead of wiping.** Before, a save missing any station record, or with one damaged record, was discarded whole; adding a station would have reset every learner. Now only the affected record starts as new, and unknown keys are kept. Final Rush will be its own record later, not a station.
- **Tests.**
  - Registry checks and progress repair (node).
  - Browser tests:
    - The hub matches the registry.
    - Every playable station mounts, abandons a started pour exactly once, unmounts idempotently, and leaves no listeners or loops behind.
    - An older save missing a station keeps its certification.
- **Parity.** Before/after screenshots of the hub, intro, station, Watch, Guided and the return to the hub, at 1280×720 and 844×390. Static screens are pixel-identical. The only differences are in the moving pour stream and the demo thumb, and the old build differs from itself there between runs.
- **Deferred until something needs them:**
  - Mode locking.
  - Richer `served` details.
  - Phase events.
  - Parking.
  - Station-tagged pour logs (these come with Hefeweizen).
- The Hefeweizen card now reads "Foam Control", the agreed label (it was "Transfer pour").

## Multi-station planning (approved with amendments)

Specification gate before Hefeweizen, Nitro Stout and Final Rush:

- `docs/architecture-multi-station.md`: shell vs station modules, the station
  contract, the Nitro stress test, the art pipeline and the (not yet done)
  entry-point migration.
- `docs/procedures/`: Pilsner (locked), Hefeweizen and Nitro Stout specs.
- `docs/source-claim-audit.md`: what each source says and how it was accessed
  (search excerpts only so far; nothing verified first-hand), plus proposed
  copy corrections.
- `docs/final-rush-outline.md` and `docs/implementation-plan.md`.

## Still open

- Verify the sources first-hand (see the doc), and decide American-standard vs
  Czech-style pilsner pour.
- Copy marked `CLAIM` in the source states beer behaviour as fact.
- Out of scope until the playtest picks a control: badges, other styles, rush,
  branding, final art.
