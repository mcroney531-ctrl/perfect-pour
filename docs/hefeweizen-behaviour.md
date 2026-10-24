# Hefeweizen (Foam Control): behaviour spec and tuning

**Status:**
- **Playable station built** (for review):
  - `js/hefe-sim.js` (`HefeSim`) and `js/hefe-station.js` (`HefeStation`), registered by `js/stations/hefeweizen.js`.
  - Tests: 16 node tests (`test/hefe-sim.test.js`) and 14 browser tests (`test/ui/hefeweizen.test.mjs`).
- **Tuning:** approved **provisionally** in the simulation review. Bands are not final until interactive pours have been seen.
- **Art:** provisional backdrop only.
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

## 2. Tuning targets (approved provisionally)

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

## 3. Behaviour by mode (as built, after the simulation review)

**Watch:**
- **The lively demo plays first** (L 1.18). It visibly waits past half full and starts up at about 71%, passing with a 19% head. The "past half full" caption is timed from the beer.
- **"Calmer pour"** is an optional button. It plays the calm demo (L 0.88): little foam forms while tilted, and the same movement starts at about 37%.
  - The button then reads "Lively pour".
  - The visible labels are short so the three Watch actions fit a sideways phone. The accessible names say what plays: "Calmer pour: watch a calm pour, where the foam builds slowly" and "Lively pour: watch the lively pour again, where the foam builds fast".
  - Learners never have to sit through both.
- The FOAM bracket marks the foam already on the beer while the glass is tilted.
- Both demos show this pour's **BRING UP guide** (see §3b): low on the calm pour, high on the lively one.

**Guided:**
- **This pour's BRING UP guide** appears a little way into the pour (§3b). It was originally left out (review decision 5) and reinstated in the guide review.
- The learner-facing signal is still the beer itself:
  - The foam layer has a darker beer/foam edge.
  - A **FOAM bracket** sits beside the glass, from the top of the foam to the beer, while the glass is tilted and pouring.
- The hidden calibrated window decides only two things:
  - When a hint is due.
  - What the action verdict says ("…at a good point for this pour").
- **Hints**, at most once each:
  - Tilt first.
  - **Foam fast:** on a lively pour, at the habitual half-full point. The FOAM bracket lights up for 3 s with it.
  - **Foam slow:** on a calm pour, once its window opens. The bracket lights up the same way.
  - The backup "bring it up now", past the window.
  - Spill warning, near the line, stop.

  Typical pours get no foam hint.

**Solo:**
- No bracket, no hints, no action marks.
- **Only calm or lively pours are dealt.**
- A passing Solo pour certifies (the M6 rule). **One pass shows success on that pour's condition, not mastery of both.** The certificate wording claims only "virtual Hefeweizen training", per M6.

**Scenarios (deterministic, balanced; no free rerolls):**
- `HefeSim.scenario(mode, n)` gives pour n of a mode:
  - **Guided:** typical (L 1), then lively, calm, typical, and so on.
  - **Solo:** each pair of pours holds one calm and one lively, in an order set by the pair's seed.
  - Where a pour sits inside its category comes from its own seed.
- The next index per mode is kept on the device (`riverside.hefe.scenario`).
- **Only a served pour moves a mode on.** Restarting, switching modes, or leaving the station and coming back replays the same pour.
  - The review allowed a deliberate mode change to advance the sequence. We chose the stricter rule because it is simpler.
- **What this does and doesn't prevent:**
  - Any served pour advances the sequence, a failed one included. A learner can still serve a deliberately bad pour to move on to the next scenario.
  - That is accepted (functional review). This is a training experience, not an anti-cheating system, and no extra anti-gaming logic is planned.

**Debrief** (after the pour; the only place this pour's window is shown):
- The glass with this pour's good range, the LINE zone, and ticks where the player acted.
- "Started up at 56%, with foam 10% of the glass. Good range for this pour: 68–78%: early for this pour. Stopped at 94%: in the zone."
- Then the feedback line. Copy describes the observed pour ("This pour built foam fast / slowly / a moderate amount of foam"), never what wheat beer "usually" does. A test forbids "usual", "standard", "rule" and "always".

**Accessibility:**
- While tilted, the level milestones add the foam ("Level 50%. Foam 9% of the glass."). That is the cue in words.
- Hints and verdicts go to the live region, as at Pilsner.

**Log:**
- `perfectPour.log.hefe.v1`, entries tagged `station: 'hefeweizen'`, with the scenario (n, seed, liveliness, label).
- Pilsner's entries now carry `station: 'pilsner'`.

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

## 6. Perception check (the next review's question)

The calculated foam difference has to be **visible during play**. Measured on
screen at half full, on a phone held sideways (844×390):

| Pour | Foam on the beer | Head gauge |
|---|---|---|
| Lively | a cream band about 12 px thick | 9% |
| Calm | a thin line about 4 px thick | 3% |

At 1280×720 the bands are about 22 px and 7 px. Both sizes were measured
from the drawn geometry. The head gauge shows the same number in every mode,
Solo included.

This is a judgment for a person: whether a learner notices and acts on it is
what the next review is for. Levers if it reads too subtly, all presentation
or GAME, no scoring change:
- A creamier, higher-contrast foam texture.
- More splash and agitation on lively pours.
- A wider liveliness range.

## 3b. This pour's BRING UP guide (Watch and Guided)

**Why:** reinstated in the guide review, at the owner's request. Guided is a
teaching environment: showing where this pour wants the glass brought up, and
why (the foam), is instruction, not giving the game away. Solo stays the
independent test.

**What it looks like (revised after the owner's Guided playtest):**
- **Sketched from the start:** a faint dashed outline of this pour's range on the glass, labelled "BRING UP ▲ / this pour" on the left (clear of the FOAM bracket).
- **Active at straightening time:** when the level reaches this pour's range (its own window, so calm and lively still differ), it lights up with a filled band, a stronger outline and full-strength labels, and the note changes to "now".
- **Quiet afterwards:** once the glass starts coming up, or the beer passes the range while still tilted, it returns to the sketched look. The existing early/late feedback and the "past the BRING UP band" hint handle mistakes. It stays, quietly, on the result; a restart returns it to the sketch.
- **Pulse:** when it turns active, the band breathes three times (0.9 s each, the station's existing pulse rhythm: a brighter fill and thicker outline), then holds steady. Added after the owner asked to see it. Not with reduced motion: there the change of fill and outline alone is the cue. CSS only (`.pp-st--hefe`, `css/pilsner-station.css`).
- The FOAM bracket and the foam hints are unchanged.

**What it is, and is not:** the band is the sim's own window for this pour (`straightenWindow`). It is set from the pour's liveliness and stays fixed for the whole pour. It does **not** track the foam as it builds: it is "this pour's guide", not a live foam sensor. The foam on the beer is what tells the learner why it sits where it does. This is presentation only: no change to the sim, windows, verdicts or scoring.

**Spoken:**
- When the tap opens: "Guide for this pour: bring the glass up from about 46 to 62% full."
- When it lights: "In the BRING UP range for this pour."

**Why the change:** the owner played Guided with the foam-first reveal (below). The range helped, and seeing it from the start, then having it switch on at the moment to act, was the clearer cue. GPT agreed: it separates *where* to straighten (the sketch) from *when* (the active state). This replaces the reveal rule (`GUIDE_FLOOR`/`GUIDE_LEAD`, removed). Timing lead is no longer a constraint, because the range is visible before the tap opens.

**Superseded: the foam-first reveal (guide review), for the record.** The guide first appeared 20 points below the window, never before 10% full. That gave 1.5–2.2 s of warning across the liveliness range, and on the calmest pours there was almost no foam yet when it appeared.

**Debrief (Watch and Guided):** links the guide to the foam. For example: "A lively pour: the foam built fast, so its guide sat high. This pour's BRING UP guide: 63–74%: good timing for this pour." Solo keeps "Good range for this pour: …".

**Solo:** unchanged. No guide, no announcement, no hints, same scenarios and the same certification bar.

**Watch layout (sideways phone):** the longest demo captions run to five lines, which pushed Replay, the comparison and Skip below the frame (up to 48 px at 667×375). This is fixed for Hefeweizen only (`.pp-st--hefe` in `css/pilsner-station.css`, Watch only):
- Compact visible labels.
- A slightly smaller Watch caption (0.95 rem).
- Watch buttons with less side padding and 0.9 rem text, so each label takes at most two lines.

The buttons stay 48 CSS px tall. A browser test checks every frame of both demos at 844×390 and 667×375. Nitro's Watch panel shows a smaller version of the same overhang (up to 20 px at 667×375 on its set-down caption); it is not changed here.

**Not built (decided):** removing the guide after the first Guided pass (Option 2). Reconsider after the owner has played several Guided pours.

**Tests:** five browser tests:
- Guided calm, typical and lively: sketched from the start and below the range, lit within a point of the range's start ("now"), both announcements, quiet once the glass starts up and on the result, back to the sketch on restart, the debrief link.
- Guided, staying tilted: sketch, lit, then quiet past the range, with the late hint still firing.
- Watch: sketched as the demo starts; both demos light it, the calm one sooner and lower than the lively one.
- Solo: never shown.
- Watch on sideways phones: every Watch button whole and in view through both demos.

## 7. Decisions (functional review) and open items

**Decided:**
- **Functional station approved.**
- ~~The good straighten range appears in the debrief only.~~ **Revised in the guide review:** Watch and Guided show this pour's BRING UP guide (§3b); Solo still shows it in the debrief only. The foam remains the primary cue.
- **Seed progression as built is accepted** (see §3).

**Open:**
1. **Final scoring bands, after the owner's sideways-phone playtest of a calm and a lively pour.** Provisional now: head band 16–24%, liveliness range, calibrated windows.
   - Key question: does the learner watch the foam in the glass, or read the HEAD gauge? The intent is to teach observation, not to swap a timing meter for a foam meter.
   - If the foam is too subtle, fix the rendering, not the scoring.
2. Art: the measured template and backdrop, with a taller glass zone (M5 method).
3. ~~Lock Hefeweizen until Pilsner is certified?~~ **Decided: stays unlocked** (functional review).
   - The hub recommends Pilsner first and Hefeweizen is open.
   - Certification proves performance on that station, not completion of earlier content.
   - The only hard gate is Final Rush (all three certified).
4. The fresh-learner playtest (shared with Pilsner's open item).
