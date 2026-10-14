# Perfect Pour: prototype v2.1 (one glass, one pilsner)

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
| `/?angle=staged` (default) | **A: staged.** Hold the pad to pour; swipe up once to start straightening. The glass comes upright at a fixed rate. |
| `/?angle=continuous` | **B: continuous.** Hold the pad to pour; slide up to bring the glass upright (down to tilt more). |
| `/?debug=1` | Adds ⚙: live state, tuning, variant switch, ghost check, pour log download |
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
