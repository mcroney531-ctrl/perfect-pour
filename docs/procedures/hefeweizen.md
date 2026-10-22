# Procedure spec: Hefeweizen (draft) — Foam Control

**Status: draft spec, with direction amended in the planning review.**
Nothing is implemented. Source status is in `docs/source-claim-audit.md`.

**Card label:** **Foam Control**, replacing "Transfer pour". That term matched
no draft source. The hub card still shows the old label until the station's
build, or a separate copy change.

**Scope:** a draft (tap) pour into a tall weizen glass.
- **Bottle technique is out of scope:** neck-in-glass, leaving beer in the bottle, swirling the yeast.
- ERDINGER's rinse-and-swirl sequence is bottle-specific (verified, GPT review), so it is not transferred to draft.

## What the sources support, and what they don't
- **Supported:**
  - Tall traditional weizen glassware accommodates substantially more foam (Cicerone, per GPT review).
  - Wheat beer is foam-prone (excerpts).
  - The general draught technique applies: tilt, open fully, straighten, finish upright. This is verified for draught generally (BA DBQM p. 56, GPT review).
- **Not supported:**
  - A universal rule that draft hefeweizen must be straightened later.
  - Any required rinse step for draft.
  - Any precise head or timing band.

## The learning challenge
**Adapt the familiar technique to a more foam-prone beer.** The learner
brings the Pilsner routine and has to read the foam and adjust.

- **Too much foam building early:** stay tilted longer.
- **Too little:** come up sooner.

This is Cicerone's general adjust-the-transition advice, applied to a beer
that foams more. It is presented as *adaptation*, not as an external
"straighten at X%" standard. Any target point the game uses is a
**Riverside / game-design rule pending calibration**, and the copy must not
present it as a universal fact.

## Learning objectives
1. Tilt and open fully, as with Pilsner (transfer from Pilsner).
2. Read the foam as it builds, and adapt when to bring the glass upright.
3. Finish upright to a larger, style-appropriate head in the tall glass, without overflow.

## Steps
| # | Step | Status |
|---|---|---|
| 1 | Glass at about 45° | verified for draught generally (GPT review) |
| 2 | Open the tap fully | verified for draught generally (GPT review) |
| 3 | Pour down the side; adapt the straighten point to the foam | The direction comes from Cicerone's general advice. **The amount is GAME / house rule.** |
| 4 | Bring upright gradually; finish upright | verified for draught generally |
| 5 | A larger head, fitting the tall glass | Supported (Cicerone, GPT review). **The band is GAME.** |
| — | Rinse the glass | **Not required or scored in v1.** |
| — | Swirl the yeast, leave beer in the bottle | Bottle only. Excluded. |
| — | Lemon wedge, rousing the keg | Not taught |

## Mode flow
- **Watch:** a demo that shows the foam building faster than in the Pilsner, and the pourer adapting to it.
- **Guided:** a coaching mark for the house target, plus hints that react to the foam ("Foam is building fast: stay tilted a little longer"). They are not fixed-percentage orders.
- **Solo:** no marks. A pass certifies.

## Player actions
The same pad, slide and release vocabulary as Pilsner, deliberately, for
motor transfer. No new actions in v1.

## Sim requirements (new `HefeSim`; nothing changes in `PourSim`)
- **Glass:**
  - A curved weizen vase as a multi-point polygon.
  - Upright height-to-volume needs a numeric solve.
  - Its own spill limit at tilt.
- **Foam:** higher conversion at turbulence, and a larger, dense head that holds after close. All GAME constants.
- **Optional, decided at build time:** a small, deterministic per-pour variation in foaminess, so that "adapt" means something. Without it, a single memorised point passes every time. The variation must be seeded and reproducible (pure sim, testable).

## Scored conditions (all bands GAME, pending calibration)
- **Technique:** tilted at the open; finished upright (the same rule shape as Pilsner).
- **Pour:** head within a larger band; level at the line; spill of 2% or less.
- **Straighten timing:** reported, not scored on its own.

Bands are never presented as external facts in copy.

## Debrief
- The same structure as Pilsner.
- Copy explains the adaptation: "The foam built fast, and coming up at 52% left too big a head. Stay tilted a little longer on a wheat beer."

## Differences from Pilsner
- A taller, curved glass.
- A more foam-prone beer.
- A larger head.
- The skill is adapting to the foam, not hitting a new fixed number.

## Open items (for build time)
1. The exact head band and the house straighten target (calibration).
2. Whether to include per-pour foam variation.
