# Procedure spec: Pilsner (locked)

**Status: locked.** The mechanic, sim, scoring and thresholds are approved
and protected. This spec records them; it changes nothing. Source status is
in `docs/source-claim-audit.md`.

- **The core procedure is verified (GPT review)** against two sources:
  - The Brewers Association *Draught Beer Quality Manual* (2019), p. 56.
  - Cicerone's "How to Pour The Perfect Beer in 5 Simple Steps".
- Claude's environment did not open them.
- The sim's thresholds remain GAME decisions.

**Method:** the general American draught method. The Czech-style pours
(*hladinka*, *šnyt*, *mlíko*) are explicitly not taught (see
`docs/pour-procedure.md`).

## Learning objectives
1. Tilt the glass before opening the tap.
2. Open the tap fully, and pour down the side.
3. Begin bringing the glass upright at about half to two-thirds full, gradually.
4. Finish upright, into the middle, to build the head.
5. Stop at the line with a head of about an inch.

## Steps (source status)
| # | Step | Status |
|---|---|---|
| 1 | Glass at about 45° under the faucet | verified (GPT review: BA DBQM p. 56; Cicerone) |
| 2 | Open fully; partly open pours foamy | verified (GPT review: BA DBQM p. 56; Cicerone) |
| 3 | Straighten at about half (Cicerone) to two-thirds (others), gradually (BA: "gradually tilt it upright") | verified (GPT review): BA "near halfway"; Cicerone sometimes nearer two-thirds |
| 4 | Finish down the middle to build the head | verified (GPT review) |
| 5 | About 1-inch head for most American ales and lagers | verified (GPT review: BA DBQM p. 56) |
| 6 | Close the tap quickly, and keep the faucet out of the beer | Close promptly: verified (GPT review). Faucet out of the beer: excerpt only. **Not modelled.** |

## Mode flow
- **Watch:**
  - A ghost demo with a demo thumb and captions (`PourSim.GHOST`).
  - Straighten chevrons from the cue layer.
- **Guided:**
  - The player pours.
  - The BRING UP band and LINE marks are on the glass.
  - At-most-once hints: tilt first, the backup straighten hint, the spill warning, near the line, and stop.
  - The "Keep holding · slide up slowly" cue.
- **Solo:**
  - No marks and no cues.
  - A passing serve certifies (M6).

## Player actions
- Press and hold the pad to pour; the tap is open while it's held.
- Slide up to straighten (the continuous variant). Arrow keys work as alternatives.
- Release to close.
- Serve.

## Sim (protected, `js/sim.js`)
A trapezoid glass and a turbulence-based foam model.
- The head settles only while beer is flowing, so it holds after the tap closes.
- A tilted glass spills sooner, head first; this is a PHYSICAL constraint.

## Scored conditions (protected)
Pass = technique + pour.

**Technique:**
- The glass was at 35° or more when the tap opened.
- The tap closed with the glass at 15° or less, after at least 0.5 s of upright pouring.

**Pour:**
- Head between 8% and 16% of the glass height.
- Level 93–97%, centred on the line at 95%.
- Spill of 2% or less.

**Not scored on its own:**
- Straightening timing. It is reported via verdicts: in range is 50–67%.
- Bring-up style.

## Debrief
- A primary and a secondary cause from `COPY`.
- The action verdicts.
- Bring-up style.
- Chips for technique and pour.

## Sourced vs game
- **PHYSICAL:** the glass and the spill limit.
- **SOURCED:** 45°, half to two-thirds, about an inch, and finishing upright.
- **GAME:** every band width, the 35° and 15° thresholds, the 0.5 s minimum, the foam constants, and the 95% line. Real service closes "once the foam reaches the rim" (Cicerone excerpt), so the line is a training abstraction.

## Open decisions (none blocking)
- Copy wording flagged in the CLAIM audit, proposed only.
- Whether the debrief should mention "don't let the faucet touch the beer". It isn't modelled, so it would be information only.
