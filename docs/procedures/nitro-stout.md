# Procedure spec: Nitro Stout (two-stage)

**Status: draft spec, with direction amended in the planning review.**
Nothing is implemented. Source status is in `docs/source-claim-audit.md`.

**Brand use:** Guinness is a reference only. No brand names, harp logo,
branded glass or "119.5 seconds" appear in the game.

## What the sources establish
- **Brewers Association training presentation** ("Presenting Draught Beer", p. 32; verified, GPT review). It documents the two-part nitro pour:
  1. Fill about **two-thirds to three-quarters**.
  2. Set the glass aside to settle.
  3. **Open the faucet completely again** for the top-off.
- **Guinness Draught guidance** (verified, GPT review): a 45° start, fill to three-quarters, settle, then finish.
- **Excerpts only:**
  - Some stout faucets offer a push-back, slower top-up flow.
  - Settle times quoted range from about 60 to 120 s.
  - The restrictor plate causes the surge.
- **Conclusion:**
  - The two-stage objective (pour, wait for the settle, finish) is well supported.
  - **A slower push-back top-up is not universal** and is not part of the required skill.
  - The settle duration is not a single sourced number: the principle is "wait until it has settled".

## Learning objectives
1. Stage one: at about 45°, faucet fully open, upright toward the end, close at about two-thirds to three-quarters.
2. **Set the glass down and wait until the beer has visibly settled.** This is the distinguishing skill.
3. Top up, with the faucet fully open again, to a slight dome, with no uncontrolled overflow.

## Steps
| # | Step | Status |
|---|---|---|
| 1 | Glass at about 45°, faucet fully open | verified (GPT review: Guinness; BA) |
| 2 | Close at about ⅔–¾ | verified (GPT review: BA p. 32) |
| 3 | Set aside; let it settle | verified principle (GPT review). **Duration is GAME** (compressed). |
| 4 | Top up with the faucet fully open | verified (GPT review: BA p. 32) |
| 5 | A slight dome, with no uncontrolled overflow | GAME target (common description) |
| — | Push-back slow top-up | **Not required.** Only if Riverside explicitly chooses that faucet as house equipment. |

## Settling (decided direction)
- **Compressed consistently in all three modes.** Watch, Guided and Solo use the same game-time settle, so the learner never meets two different clocks. A one-line note in Watch says the settle is shortened for training.
- **Readiness is read from the beer, never from a countdown:**
  - The surge band falls.
  - The dark body rises.
  - The head line becomes clean.
- **No timer** is shown in any mode.

## Mode flow
- **Watch:** the full two-stage demo. During settle, the demo visibly waits, with the caption "Let it settle. Wait until the head separates from the dark beer."
- **Guided:**
  - A ⅔–¾ coaching mark for stage one.
  - During settle, a hint if the player tries to top up while it is still surging.
  - A top-up cue.
- **Solo:** no marks and no hints; read the beer. A pass certifies.

## Player actions
- **Stage one:** the same pad (hold to pour, slide to bring upright, release to close) as Pilsner.
- **Set down:** releasing after stage one puts the glass on the set-down spot. This is a phase change, not a new gesture.
- **Top-up:** **the same hold-to-pour interaction.** The glass comes back under the faucet upright, and holding the pad opens it fully. No push-back control in v1.
- **Serve.**

## Sim requirements (new `StoutSim`; nothing changes in `PourSim`)
**Phases:** `pour1` → `settling` → `topUp` → `ready`.

**State** (GAME constants):
- Surging (suspended).
- Liquid.
- Head.

**Dynamics:**
- After the tap closes, surging converts to head + liquid with a time constant τ. **This keeps running while the tap is closed**, the key difference from Pilsner.
- **"Settled"** means surging below a threshold (GAME). It is drawn as the moment the band clears.
- **Top-up at full flow:** the flow when topping up a settled glass lifts the head into a dome. Topping up while still surging over-foams. GAME tuning.
- **Overflow:** spills head first (PHYSICAL principle, with stout geometry).

**Glass:** its own polygon, with a numeric solver.

**Architecture:** the pure sim must allow later `advance(snapshot, dt)` for
Final Rush parking. That is designed in, not built, in the first Nitro
slice.

## Scored conditions (all bands GAME)
- **Technique:**
  - Tilted at the open.
  - Stage one closed within a ⅔–¾ band.
  - **Top-up began only after settling.**
  - Top-up upright.
- **Pour:**
  - Head within a band.
  - A slight dome at the rim, with a narrow positive tolerance.
  - No uncontrolled overflow (spill of 2% or less).
- **Not penalised:** waiting longer than needed. In Final Rush it costs only time.
- **Main debrief causes:**
  - Topped up too early.
  - Stage one too high or too low.
  - Tilted top-up.
  - Overflow.
  - Short of the rim.
  - Opened upright.

## Differences from Pilsner
- Two pours with a hands-off phase between them.
- Physics run after the tap closes.
- The finish is a dome at the rim.
- A dark beer, which reverses the art contrast risk.

## Open items (for build time)
1. Settle compression amount: the game-time seconds.
2. Head band and dome tolerance (calibration).
3. Push-back faucet: only if a house-equipment decision is made later.
