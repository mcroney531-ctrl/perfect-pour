# Procedure spec: Hefeweizen (draft) — for review

**Status: draft spec.** Nothing is implemented. All sources are search
excerpts only; none was opened first-hand (see
`docs/source-claim-audit.md`).

**Scope:** a draft (tap) pour into a weizen glass.
- Bottle technique is out of scope: neck-in-glass, leaving some beer in the bottle, swirling to rouse the yeast.
- None of it is added automatically, as instructed.

## What research established, and what it didn't
- **Established (excerpts):** wheat beer is highly carbonated and foams readily. Weissbier service uses a tall weizen glass and expects a large head ("about three finger-widths", a German-service excerpt). General draught technique applies: tilt, open fully, straighten, and finish upright.
- **Commonly advised for weissbier, but sourced mostly to bottle service:** rinse the glass in cold water and don't dry it.
- **Not found:** an authoritative source for a *draft* hefeweizen pour that differs from the standard draught pour.
  - One excerpt (bottle/general) says to stay tilted "almost the entire pour", straightening only at the end.
  - Search tools judged "straighten later for a foamy beer" to be a reasonable inference, not an established standard.
  - Cicerone's general adjustment supports the direction: if the foam is too big, move to pouring down the middle later next time.
- **"Transfer pour"** (the current hub card label) matched no source term for draft hefeweizen. It reads as a bottle-to-glass term, so the label needs an owner decision.

**Honest risk:** if the only differences are the numbers (a later straighten
point and a bigger head), Hefeweizen is "Pilsner with different bands". It
would add little *procedural* learning. The spec therefore proposes one
distinguishing skill, below, and leaves the rest as owner choices.

## Learning objectives (proposed)
1. Choose and prepare the right glass. Rinsing in cold water is an *owner decision*.
2. Tilt and open fully, as with Pilsner (transfer from Pilsner).
3. **Manage a foamy beer:** stay tilted longer and straighten later than for the Pilsner. This is the distinguishing skill.
4. Finish upright to a large, dense head that sits at the rim, with no overflow.

## Steps
| # | Step | Status |
|---|---|---|
| 0 | Rinse the weizen glass with cold water | Owner decision. Excerpts support it for weissbier, but mostly from bottle service. **Not added automatically.** |
| 1 | Glass at about 45° | SOURCED (general draught, excerpt) |
| 2 | Open the tap fully | SOURCED (general draught: partly open pours foamy) |
| 3 | Pour down the side; stay tilted longer than for the Pilsner | GAME/inference (the direction is sourced, the amount is not) |
| 4 | Bring upright late, gradually | GAME/inference |
| 5 | Finish upright to a large head | SOURCED (excerpt: "three finger-widths" in German service) |
| — | Lemon wedge | Not taught unless the owner wants house service; it is a garnish, not a pour step |
| — | Rousing the keg yeast | Out of scope (cellar practice, not a pour step) |

## Mode flow
- **Watch:** a demo that shows the *later* straighten against a ghost marker of the Pilsner point. That makes the contrast the lesson.
- **Guided:**
  - A BRING UP band set higher on the glass.
  - A hint if the player straightens at the Pilsner point: "Wheat beer foams more: stay tilted longer."
  - Optional rinse prompt, only if step 0 is adopted.
- **Solo:** no marks. A pass certifies.

## Player actions
- The same pad, slide and release vocabulary as Pilsner. Reusing it is deliberate: motor transfer.
- If rinse is adopted, one extra pre-pour action, a "Rinse" button or gesture. It is scored as procedure (done or not), never timed.

## Sim requirements (new `HefeSim`; nothing changes in `PourSim`)
- **Glass:**
  - A curved weizen vase defined as a multi-point polygon.
  - Upright height-to-volume needs a numeric solve: Pilsner's closed form is trapezoid-only.
  - The spill limit at tilt differs: a tall narrow glass tolerates more tilt.
- **Foam:**
  - Higher conversion at turbulence, and a larger, denser head that holds after close (like Pilsner).
  - All GAME constants, tuned so the demo lands mid-band.
- **Rinse (if adopted):** a procedure flag only. Whether rinsing changes the foam is a physical claim we can't source, so it is *not* modelled.

## Scored conditions (proposed; all GAME bands pending tuning)
- **Technique:**
  - Tilted at the open.
  - Finished upright, with the same rule shape as Pilsner.
  - Rinse done, if adopted.
- **Pour:**
  - Head within a larger band: proposed ~15–25% of glass height, tune to "about three fingers" on the drawn glass.
  - Level at the line.
  - Spill of 2% or less.
- **Straighten timing:** reported, not scored on its own. The same principle as Pilsner, with a higher window: proposed about two-thirds to three-quarters. GAME, pending.

## Debrief
- The same structure as Pilsner.
- Copy explicitly compares with the Pilsner: "You straightened at 52%: right for the Pilsner, early for a wheat beer."

## Differences from Pilsner
- A taller, curved glass.
- More foam.
- A later straighten.
- A bigger head.
- Possibly a rinse step.

## Sourced vs game summary
- **SOURCED (excerpt):** foamy beer, the weizen glass, a large head, the general tilt and open-fully technique, and cold-rinse custom.
- **GAME:** every band, the late-straighten amount, and the foam constants.

## Open decisions for the owner
1. Include the cold-water rinse step? (Recommendation: yes, if Riverside does it in house; it adds a real procedural step.)
2. Head target: German "three fingers" or a smaller American bar convention?
3. Card label: keep "Transfer pour", or use something like "Foam control" or "Wheat pour"?
4. Lemon: never, or house option with no score?
