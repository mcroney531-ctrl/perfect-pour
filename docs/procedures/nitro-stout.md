# Procedure spec: Nitro Stout (two-stage) — for review

**Status: draft spec.** Nothing is implemented. All sources are search
excerpts only; none was opened first-hand (see
`docs/source-claim-audit.md`).

**Brand use:** Guinness practice is a reference only. No brand names, harp
logo, branded glass or "119.5 seconds" appear in the game.

## What research established (excerpts)
- **The two-stage pour is consistent across sources:**
  1. Glass at about 45°.
  2. Pull the stout faucet fully forward.
  3. Bring the glass upright as it reaches about three-quarters full. Guinness uses the harp logo as the mark.
  4. Close.
  5. Set the glass down to settle.
  6. Top up with the glass upright.
- **The top-up flow:**
  - On faucets that support it, the handle is *pushed back* for a slower top-up flow.
  - This is a feature of some stout faucets, not all nitro taps. One retailer excerpt says the push-back "does not change the ratio of beer to gas", just the speed.
- **Settle time varies by source:** "about 60 s", "90–120 s", and a whole ritual of about 120 s. The Guinness ambassador figure is 119.5 s from the start of the first pour to ready-to-top-up. One source describes it as "86 s settle".
  - **Conclusion:** there is no single sourced number; the principle is "wait until the surge has settled."
- **Why it surges:**
  - A stout faucet has a restrictor plate (a disc with small holes) that knocks nitrogen out of solution. That gives the cascade and the creamy head.
  - This is equipment fact, from retailer and manufacturer excerpts.
- **The finish:** a head that domes slightly above the rim (common description; a weaker source).
- **Not part of the pour, so not modelled:**
  - Gas blend (e.g. 75/25 N₂/CO₂) and pressure.
  - One manufacturer's warning not to pull a particular faucet past 45°.

## Learning objectives
1. Pour stage one at about 45°, faucet fully open, coming upright to about three-quarters.
2. **Set the glass down and wait for the surge to settle.** This is the distinguishing skill: patience as procedure.
3. Top up with the glass upright, using the slow top-up flow, to a slight dome with no overflow.

## Steps
| # | Step | Status |
|---|---|---|
| 1 | Glass at about 45° | SOURCED (excerpt) |
| 2 | Faucet fully forward | SOURCED (excerpt) |
| 3 | Upright as it nears ¾; close at about ¾ | SOURCED (excerpt; the "¾" mark is generic in game) |
| 4 | Set down; let it settle until the head separates cleanly | SOURCED principle (excerpt); **duration is GAME** |
| 5 | Top up upright, with the slow (push-back) flow | SOURCED (excerpt; faucet-dependent) |
| 6 | Finish to a slight dome, without overflow | SOURCED (weak excerpt) / GAME tolerance |

## Mode flow
- **Watch:**
  - The full two-stage demo.
  - During settle, the demo *visibly waits*, with the surge band moving and a caption: "Let it settle. The head separates from the dark beer."
- **Guided:**
  - A ¾ mark on the glass for stage one.
  - During settle, a "settling" indicator. It is the beer itself, not a timer.
  - A hint if the player tries to top up early: "Still surging. Wait until the head separates."
  - Top-up cue: "Glass upright, slow flow."
- **Solo:**
  - No marks and no indicator; read the beer.
  - A pass certifies.

## Player actions (proposal)
- **Stage one:** the same pad, slide and release as Pilsner, to tilt, open and come upright.
- **Set down:** releasing the pad after stage one puts the glass on the rail spot. That is a phase change, not a new gesture.
- **Top-up:** a distinct, slower-flow control: "push back". There are two options; the owner decides:
  - (a) The same pad with a secondary "Top up" toggle that selects slow flow.
  - (b) A separate top-up button that holds the slow flow.

  Either way, the glass must be upright, and tilt is ignored in the top-up phase or warned about.
- **Serve.**

## Sim requirements (new `StoutSim`; nothing changes in `PourSim`)
**Phases:** `pour1` → `settling` → `topUp` → `ready`.

**State** (all GAME constants):
- **Suspended:** the share of the pour still surging (cloudy). Created at a high rate by the restrictor flow.
- **Liquid:** the dark body.
- **Head:** tan foam.

**Dynamics:**
- **After the tap closes** (the key difference from Pilsner):
  - Suspended converts to head + liquid with a time constant τ.
  - The surge band falls; the dark body rises from the bottom up.
- **"Settled"** means suspended < threshold. That is a GAME threshold, drawn as the moment the band clears.
- **Top-up flow:** low turbulence, mostly liquid. It lifts the head into a dome.
- **Overflow:** spills head first. The same PHYSICAL principle as Pilsner, with Nitro's own geometry.

**Glass:**
- A stout glass (nonic or tulip-ish) as its own polygon.
- A bulged nonic needs the general numeric solver, not the trapezoid closed form.

**Settle duration — owner decision** (real 60–120 s is long for a training loop):
- (a) Real time, around 60 s, the low end of sources.
- (b) Compressed. For example, about 15 s of game time with the cascade animated faster, with a one-line note in Watch: "time shortened for training".
- (c) Real time in Solo and certification, compressed in Watch and Guided.

Recommendation: (b), stated honestly in Watch. The skill is *recognising
settled*, not enduring the clock.

## Scored conditions (proposed; all bands GAME)
**Technique:**
- Tilted at the open (35° or more, as Pilsner).
- Stage one closed at about ¾. Proposed band: 65–85% of the glass height.
- **Topped up only after settling.** The top-up starts with suspended below the threshold.
- Top-up with the glass upright (15° or less).

**Pour:**
- Final head within a band. Proposed: about 10–15% of height, tuned to "a creamy head about an inch"; to be confirmed.
- A dome at the rim. Total level within a narrow band around 100%, with a slight positive tolerance.
- Spill of 2% or less.

**Not penalised:**
- Waiting longer than necessary in station play. In Final Rush, it costs only time.

**Main causes for the debrief:**
- Topped up too early.
- Stopped stage one too high, or too low.
- Tilted top-up.
- Overflow.
- Short of the rim.
- Opened upright.

## Debrief
- The two-stage timeline: stage one level, settle wait (shown as "waited until settled ✓" or "topped up while still surging"), and the top-up.
- The same chip structure as Pilsner.

## Differences from Pilsner
- Two pours with a hands-off phase between them.
- Physics continue after the tap closes.
- A distinct slow top-up control.
- The finish is a dome at the rim, not a line below it.
- A dark beer: the art and contrast risk is reversed.

## Sourced vs game summary
- **SOURCED (excerpt):** 45°, fully open, about ¾, settle, top up upright with slow flow, dome, and the restrictor-plate mechanism.
- **GAME:**
  - All bands.
  - τ and the "settled" threshold.
  - Settle compression.
  - The foam split.
  - The ¾ band width.
- **Reference only, never stated as a rule:** 119.5 s, the harp.

## Open decisions for the owner
1. Settle duration: real, compressed or mixed (recommend compressed, labelled).
2. Top-up control: toggle on the pad, or a separate button.
3. Does Riverside's faucet push back? If not, the top-up is "upright, gentle", using the same control.
4. Head target and dome tolerance.
5. Final Rush: may the stout park while another order is poured? See `docs/final-rush-outline.md`.
