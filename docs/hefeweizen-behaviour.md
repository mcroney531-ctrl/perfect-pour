# Hefeweizen (Foam Control): behaviour spec and proposed tuning — for review

**Status:**
- **Built:** the simulation, `js/hefe-sim.js` (`HefeSim`), with 13 node tests (`test/hefe-sim.test.js`).
- **Not built:** the station UI, the hub entry, art.
- **Not locked:** the scoring bands. They are proposals for this review.
- **Unchanged:** Pilsner's sim and scoring.

Procedure background is in `docs/procedures/hefeweizen.md` and source status
in `docs/source-claim-audit.md`.

## 1. The skill, and how the sim makes it real

**Skill:** the same tilt, hold, slide and release as the Pilsner, on a beer
that foams more and **varies from pour to pour**. The learner reads the foam
already on the beer and adapts when to bring the glass up. Foamy: stay tilted
longer. Calm: come up sooner.

**Why variation is needed.** The first calibration used one fixed beer. In it,
straightening anywhere from 32% to 62% full passed every pour, so one
memorised number always worked. "Adapting" would have been decoration, and
the station would have been "Pilsner with different bands", which the
planning review asked us to avoid.

**The mechanism (all GAME):**
1. **Liveliness L.** Each pour gets a liveliness from 0.85 to 1.25.
   - It is drawn from a seed, so pours are deterministic and replayable. The station logs the seed.
   - The debrief labels it by range:

     | L | Label | Share of pours |
     |---|---|---|
     | below 0.95 | calm | about 25% |
     | 0.95–1.10 | typical | about 37% |
     | above 1.10 | lively | about 37% |

   - **Honest framing:** real wheat-beer foaming does vary with keg, line and glass temperature and with pressure. The range and its effect are game choices, and no copy states them as service facts.
2. **Foam model.** The foam share of incoming beer runs from `kTilt` (down the side of a tilted glass) to `kUp` (straight down into an upright glass).
   - L scales `kUp` directly.
   - L scales `kTilt` as L³, so a lively pour **visibly carries more foam while still tilted**. That is the cue.
3. **The cue is readable.**

   | Pour | Foam on the beer at half full |
   |---|---|
   | Calm | about 3% of the glass height |
   | Typical | about 5% |
   | Lively | about 10% |

   The difference is more than 3×. On the drawn glass, about 7 px against 23 px of foam band. The renderer must make this layer legible (§6).

**What this produces (measured; reference player, 2 s bring-up from 45°, letting go at the line):**

| L | Label | Proposed Guided band (% full) | Measured passing range (% full) | Foam at half full |
|---|---|---|---|---|
| 0.85 | calm | 28–45 | 19–54 | 2.9% |
| 0.90 | calm | 34–51 | 28–59 | 3.5% |
| 0.95 | typical | 40–57 | 35–62 | 4.1% |
| 1.00 | typical | 46–62 | 42–66 | 4.8% |
| 1.05 | typical | 51–66 | 47–69 | 5.6% |
| 1.10 | typical | 56–69 | 53–72 | 6.4% |
| 1.15 | lively | 60–72 | 58–75 | 7.4% |
| 1.20 | lively | 64–75 | 62–78 | 8.5% |
| 1.25 | lively | 69–79 | 66–81 | 9.6% |

"% full" is the level when straightening is detected, the same moment the
action verdict is given.

**Consequences (all held by tests):**
- **No single straighten point passes every pour.** A learner on the Pilsner habit (50–55%) passes typical pours, fails lively ones with "head too big", and, at 60–65%, fails calm ones with "head too small".
- **Precision is comparable to Pilsner.** The head band is 8 points wide, the same width as Pilsner's.
  - Calm and typical pours have passing ranges of 24–35 points (Pilsner's is about 25).
  - Lively pours narrow to 15–17 points. Tilted capacity caps them: at 45° the glass holds only up to 85% before spilling.
- **There is a physical ceiling.** Staying tilted too long spills over the lip (PHYSICAL), so "just always wait" fails too.

## 2. Proposed tuning targets (for approval)

| Parameter | Proposed | Kind | Note |
|---|---|---|---|
| Head band | 16–24% of glass height | GAME | "Larger, style-appropriate" (Cicerone, per GPT review). Same width as Pilsner's 8–16%. About "three fingers" on the drawn glass |
| Fill zone | 93–97%, line at 95% | GAME | Same as Pilsner |
| Spill allowed | ≤ 2% | GAME | Same as Pilsner |
| Tilted / upright / finish-upright rules | ≥ 35° at open; ≤ 15°; ≥ 0.5 s upright pouring | GAME | Same rule shape as Pilsner |
| Liveliness range | 0.85–1.25 | GAME | Wider makes adapting matter more; narrower makes it subtler |
| Labels | calm < 0.95 ≤ typical ≤ 1.10 < lively | GAME | Debrief wording only |
| Foam model | `kTilt` 0.12 (× L³), `kUp` 0.60 (× L), settle `d` 0.08, `r` 0.3, flow 0.10 glass/s | GAME | Tuned so the cue is visible and the windows separate |
| Guided band | Per pour, from the table (interpolated) | GAME | Inside the passing range for 1.5–3 s bring-ups |
| Verdict grace | Early: 10 points below the band; late: 10 points above | GAME | Wide enough that "early" or "late" always means a miss |
| Glass | Weizen vase: bulb, waist, flare, rim turning in | PHYSICAL (for the drawing) | Tilted capacity: 81% of volume at 45° |

## 3. Behaviour by mode (for the station build, next slice)

**Watch:**
- The demo is a **lively** pour (L 1.18).
- It visibly waits past half full and starts up at about 71%, passing with a 19% head.
- Captions:
  1. "Same routine as the Pilsner: tilt the glass to about 45°."
  2. "Open the tap fully and watch the foam. This one is building it fast."
  3. "Past half full, but plenty of foam already: stay tilted a little longer." This is timed from the beer.
  4. "Now bring the glass up. Read the foam each time: later when it builds fast, sooner when it builds slowly."
  5. "Finish upright to build the big wheat-beer head."
  6. "The head reached the LINE: let go, then serve."
- **Proposal:** a second, calm demo, shown with a "Show a calm pour" toggle, so the contrast is seen as well as told. This is a decision for review.

**Guided:**
- A **per-pour BRING UP band** drawn on the glass. It moves with the pour; the coach "knows the keg".
- At-most-once hints:
  - Tilt first.
  - **Foam fast:** on a lively pour, when the player is still tilted at about half full (the habit point): "Foam is building fast on this one: stay tilted a little longer."
  - **Foam slow:** on a calm pour, once its band is reached: "…start bringing it up a little sooner than usual."
  - The backup "bring it up now" past the band.
  - Spill warning, near the line, stop.
- Typical pours get no foam hint.

**Solo:**
- No band, no hints. The learner reads the foam.
- A passing Solo pour certifies (the M6 rule, unchanged).
- **Decision for review:** if Solo draws from the full range, a learner can certify on a typical pour using the Pilsner habit, without ever adapting. Options:
  - **(a)** Full range (simplest; adaptation encouraged, not proven).
  - **(b)** Solo pours are always calm or lively, so a Solo pass shows adaptation. **Recommended.** The M6 rule is still one passing Solo pour.

**Seeds:**
- Watch is fixed.
- Guided and Solo pours take the next seed in a per-session sequence. The first Guided pour is typical, so the first experience isn't the hardest.
- The seed and liveliness are logged.

**Debrief** (`HefeSim.COPY`): every line names the pour and the adaptation. Examples:
- "This pour foamed more than usual, and you started bringing it up at about 53% full, so the head came out too big (27%). When the foam is building fast, stay tilted a little longer."
- "Clean pour. This pour foamed less than usual, and you brought it up at about 37% full to match."

A test checks that no line claims a "standard" or a universal rule.

**Action verdicts** are judged against this pour's band: "Started bringing it up a little early for this pour."

## 4. What the tests guarantee (`test/hefe-sim.test.js`)

**Sim basics:**
- Its own module: no use of `PourSim`.
- Geometry inverts and capacity falls with tilt.
- Bit-identical replays.
- Seeds cover all three labels.

**Calibration:**
- **Window held to the sim:** across the whole liveliness range and 1.5–3 s bring-ups, every start inside the Guided band passes.
- **Verdicts never contradict the result:** in range always passes; early or late always fails.
- **Robustness:** a slower or quicker bring-up still passes mid-band.

An offline fine-grid run (19,680 pours, liveliness every 0.01) found no
violations of either the window or the verdict guarantee.

**Adaptation and cue:**
- No single straighten point passes every pour.
- The Pilsner habit fails lively pours (head too big), and fails calm ones at the late end (head too small).
- The visible foam at half full rises with liveliness, lively at least 2.5× calm.

**Pours, copy and hints:**
- Watch demo: lively, passes mid-band, straightens inside its band and later than the Pilsner habit, captions timed to the beer.
- Known-bad pours fail for the right reason:
  - Opened upright.
  - Never straightened (spill and not upright).
  - Last-instant flick.
  - Overpour.
  - Stopping short.
- The head holds after the tap shuts.
- Feedback names the foam and the adaptation. Every cause has copy, and no line claims a standard.
- Guided hints fire on lively and calm pours only, at the right moments.

## 5. What is reused from Pilsner, and what isn't

**Reused, by design:**
- The interaction (pad feel constants are identical).
- The rule shape (technique + pour).
- The fill-line convention.
- The verdict and feedback structure.
- The Watch timeline format.

**Duplicated, not shared:**
- The polygon clip and the spill/surface solvers (copied from `js/sim.js`, generalised to a curved outline).
- The step-loop shape.

Per the rule of two, these are the extraction candidates once the station is
built: pure polygon helpers, the timeline `inputAt`, and the pad input. Pilsner
must stay pixel-identical when they are extracted.

**Different:**
- Curved glass with a numeric volume table.
- Two-coefficient foam with liveliness.
- Per-pour windows.
- Seeded variation.

## 6. Requirements carried into the station build
- **The renderer must make the foam layer on a tilted beer clearly legible.** It is the cue. This needs checking on a phone held sideways.
- Station-tagged pour log, with the seed and liveliness.
- Hub guidance for more than one playable station. The lede and "start here" currently come from the first playable station.
- Provisional backdrop. Then the measured template (a taller glass zone), then art.

## 7. Questions for this review
1. Approve the per-pour liveliness mechanism (range, labels, distribution)?
2. Approve the head band of 16–24% and the other targets in §2?
3. Solo draws: (a) full range, or (b) calm or lively only (recommended)?
4. A second, calm Watch demo?
5. Guided band moving per pour (proposed), or a fixed house band plus foam hints only?
