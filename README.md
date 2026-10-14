# Perfect Pour: prototype v2.3 (one glass, one pilsner)

A prototype for E-Learning Heroes challenge #570: gamified onboarding for a new
bartender at a fictional brewery. The goal is **procedural memory first,
precision second, speed third**: after training, the learner should be able to
rehearse the pour in their head ("tilt, open fully, bring it up past half,
finish upright, stop at the line").

v2 tests one open question: **staged or continuous straightening?** Both use
the same simulation, rendering, scoring and feedback; only the straightening
input differs.

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
npm test
```

Node 18+, no installs. The tests lift the `<script id="sim">` block out of
`index.html` and run that exact code. Covered: geometry, purity, the staged
rate, spill, Serve timing, the ghost passing mid-band in both variants and
staying in its own zone, every v1 exploit, the straightening window (40-65%
full passes), known-bad pours and their feedback, the zone being
coaching-only, and the guided hints.

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

## Architecture

- **Sim** (`<script id="sim">`): pure `step(state, input, dt)` at a fixed
  60 Hz; geometry, coaching zone, evaluation, feedback copy, hints, and the
  ghost timeline. Constants are labelled PHYSICAL, SOURCED or GAME.
- **Renderer** (`Renderer.render(state, view)`): inline SVG, read-only on sim
  state. Swapping to Canvas or final art touches only this block.
- **App**: pad input, modes, result sheet, live region, metrics log
  (`perfectPour.log.v2`), debug panel.

## Still open

- Verify the sources first-hand (see the doc), and decide American-standard vs
  Czech-style pilsner pour.
- Copy marked `CLAIM` in the source states beer behaviour as fact.
- Out of scope until the playtest picks a control: badges, other styles, rush,
  branding, final art.
