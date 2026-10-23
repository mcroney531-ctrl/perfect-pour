# Nitro Stout: simulation, behaviour and calibration (for review)

**Status:**
- **Built:** the simulation only. `js/stout-sim.js` (`StoutSim`), with 18 isolated node tests in `test/stout-sim.test.js`.
- **Not built:** the station screen, art, Final Rush integration.
- **Provisional:** the scoring bands.
- **Unchanged:** the Pilsner and Hefeweizen sims.

The procedure direction is in `docs/procedures/nitro-stout.md`.

## 1. What makes Nitro different, and how the sim models it

**Two pours and two learner decisions:**
1. When to set the glass down: stage one to about two-thirds to three-quarters, upright.
2. When to top up: once the beer has settled.

Between them the tap is shut, and **the beer keeps changing**. This is the
opposite of Pilsner and Hefeweizen, where the head freezes when the tap closes.

**The beer is three parts** (shares of the glass's volume), drawn bottom up:

| Part | What it is | How the learner sees it |
|---|---|---|
| **liquid** | Settled dark beer | The dark body rising from the bottom |
| **surge** | Beer still full of fine gas | The cloudy, cascading band |
| **head** | Creamy foam | The cap on top |

**How the parts move:**
- **Pouring:**
  - Beer from the stout faucet arrives as surge.
  - A little goes straight to head: 2% down the side of a tilted glass, 6% straight down. GAME.
- **Settling, tap open or shut:**
  - Surge turns into liquid and head, with a time constant of 5 s. GAME.
  - 8.5% of it becomes head. GAME.
  - The top of the glass does not move: the beer only separates. Volume is conserved (PHYSICAL).
- **An early top-up:**
  - Topping up stirs the **stage-one surge still in the glass** into loose foam: rate 1.5/s × flow, 70% of it head. GAME, labelled CLAIM in code.
  - The top-up's own fresh surge is not stirred, so a settled glass tops up clean.
- **The dome:**
  - Foam can stand up to 4% of the glass height proud of the rim. PHYSICAL, simplified.
  - Liquid cannot.
  - Beyond that it spills, head first.
- **The glass:** a nonic pint, with a taper and the bulge near the top, measured numerically like the weizen glass.

**Phases are read from what the player did, never imposed:**
- `empty` → `stage1` → `settling`. Set-down is the first close lasting 0.6 s; a shorter close is a stutter inside stage one.
- Any opening after the set-down is `topUp`, then `settling` again after that close.
- **Nothing blocks an action in any mode:**
  - Topping up at any moment is allowed.
  - Serving after any close is allowed.

## 2. Settling and readiness (the proposal)

- **Readiness criterion:** the cloudy surge is at most **6% of the beer in the glass**.
  - Visually, the surge band is under 5% of the glass height.
  - At set-down it is over 25%.
  - It is a state of the beer, never a timer.
- **The measured settle:** about **10 s after set-down** (10.3 s for the reference pour; the test holds 8–12 s).
  - The reference pour runs about 25 s in all, Watch demo included.
  - Real settles quoted in sources run about 60–120 s, and differ. This is a compressed training animation. Copy never states a duration, and a test forbids it.
- **Same settle in all three modes.** No countdown anywhere.
- **Why about 10 s:**
  - Long enough that topping up at once, or after a few seconds, is visibly premature: the cloudy band is still large.
  - Short enough not to drag through repeated attempts.
  - Changing `settleTau` scales it. A test holds the band.

**The tolerance:**
- Topping up passes the "waited" check up to 9% surge (`waitTol`). That is about 2 s before the line is perfectly clean, so a learner is not failed at the exact visual edge.
- Verdicts, lined up with the check (simulation review):

  | Verdict | Surge at top-up | Result |
  |---|---|---|
  | `settled` | ≤ 6% | Passes the check, no note |
  | `littleEarly` | 6–9% | Passes, with a gentle note ("a little surge was still there…"). The pass line says "topped up just before it had fully settled", never "waited for it to settle". |
  | `early` | Over 9% | Fails |

  A test holds this across a sweep of waits.

## 3. Provisional targets

| Target | Proposed | Kind | Reference pour |
|---|---|---|---|
| Stage one: level at set-down | **Preferred 66–75%** (SOURCED ⅔–¾: BA p. 32, Guinness; GPT review). **Passing 60–82%** (GAME, deliberately more forgiving; a pass outside 66–75% carries a note naming the target) | as stated | 73% |
| Stage one: tilt | Open at ≥ 35°; upright (≤ 15°) when the tap closes | SOURCED 45° start, upright as it fills; thresholds GAME | 45°, closed at 0° |
| Readiness | Surge ≤ 6% of the beer; settle ≈ 10 s | GAME (compressed) | Ready 10.3 s after set-down |
| Top-up timing | Surge ≤ 9% when the tap reopens | GAME | 5% (waited 11.3 s) |
| Top-up angle | ≤ 15° throughout | SOURCED upright top-up; threshold GAME | 0° |
| Finish (level incl. head) | 99–103% (a slight dome) | GAME | 101.6% |
| Head (settled) | 8–15% of glass height | GAME | 12.2% |
| Spill | ≤ 2% | GAME (same as the other stations) | 0% |
| Flow | 0.10 glass/s, fully open for both pours | SOURCED fully open (BA); rate GAME | |

The reference pour clears every band by at least 0.02 of head, 0.01 of
finish level and 0.08 of stage-one level. A test holds those margins.

## 4. What happens when… (decided behaviour)

| The player… | What the sim does | Result and debrief |
|---|---|---|
| Stops stage one early (below 60%) | Settles as normal; the top-up is longer | Fail `stage1Low`: "You set it down at 56%: less than two-thirds full. Stage one goes to about three-quarters." |
| Stops stage one late (above 82%) | Same | Fail `stage1High`: "…Leave room for the top-up." |
| Closes stage one still tilted | Settles as normal | Fail `notUpright1`: "Bring the glass upright before you close the tap." |
| Tops up early | **Allowed.** Recorded with the surge share at that moment. The left-over surge is stirred into a loose head. | Fail `earlyTopUp`. The head grows the earlier it is (26% at once, 16% after 6 s, against 12% when waited). The debrief names the share still cloudy. |
| Waits long after readiness | Nothing more happens | No penalty (waits of 12–90 s all pass). In Final Rush it would cost only time. |
| Tops up tilted | Slight tilt: spills over the lower lip. Over 15°: a technique fail too. | `tiltedTopUp` or `tiltSpill`: the advice is "upright". |
| Stops short / domes too tall / keeps pouring | Normal physics | `short` / `overDome` / `overflow` |
| Never tops up, then serves | Serving is allowed after any close | Fail `noTopUp`: "Once it has settled, open the tap again to finish." |
| Closes and serves before setting down | | Fail `noSetDown` |
| Stutters (closes under 0.6 s) in stage one | Still stage one | Not counted as a top-up |
| Leaves unserved | (Station rule, as at the other stations) | Abandoned: logged, never graded |
| Takes their time pressing Serve | The verdict is judged on the fully settled glass | Unchanged, held by a test |

## 5. Samples (actual sim output, from the reference player)

| Pour | Result | Stage 1 | Surge at top-up | Head | Level | Feedback |
|---|---|---|---|---|---|---|
| Reference (Watch demo) | pass | 73% | 5% | 12% | 102% | Clean two-stage pour. Set down at 73%, waited for it to settle, and topped up to a slight dome. |
| Topped up at once | fail: earlyTopUp | 73% | 47% | 26% | 102% | You topped up while it was still surging (47% of the beer still cloudy). The new beer stirred that surge into a loose head (26%). Wait until the head has separated cleanly from the dark beer. |
| Topped up 6 s after set-down | fail: earlyTopUp | 73% | 16% | 16% | 102% | (as above, 16% / 16%) |
| Topped up 9.5 s after (a little early) | pass | 73% | 8% | 13% | 102% | Clean two-stage pour… |
| Waited 60 s | pass | 73% | 0% | 11% | 102% | Clean two-stage pour… |
| Stage one 55% | fail: stage1Low | 56% | 5% | 12% | 102% | You set it down at 56%: less than two-thirds full… |
| Stage one 86% | fail: stage1High | 87% | 5% | 12% | 102% | You set it down at 87%: more than three-quarters full. Leave room for the top-up. |
| Set down still tilted | fail: notUpright1 | 73% | 5% | 12% | 102% | You set it down still tilted (45°). Bring the glass upright before you close the tap. |
| Top-up at 20° | fail: tiltedTopUp / tiltSpill | 73% | 5% | 1% | 94% | You topped up with the glass tilted (up to 20°). Top up with the glass upright. Also: Beer ran over the lip… |
| Stopped short | fail: short | 73% | 5% | 11% | 96% | You stopped short of the rim (96%). Top up until the head stands just proud of the rim. |
| Dome too tall | fail: overDome | 73% | 5% | 13% | 104% | The dome came out too tall (104%). Let go a little sooner. |
| Kept pouring 1 s | fail: overflow / headLow | 73% | 5% | 7% | 104% | It overflowed (7% spilled). Let go as the head rises just proud of the rim. Also: The head came out too thin (7%). |

**Caveat on the tilted top-up spill figures:** the reference player keeps a
tilted top-up running for its full 10 s cap, so those spill figures (70%+) are
extreme. A person would stop sooner.

## 6. Proposed Watch / Guided / Solo sequence (for the station build)

**Watch:**
- One demo, about 25 s:
  - Stage one: tilt, open fully, bring upright at about half, close at about 73%.
  - Set down.
  - The demo **visibly waits**, with captions:
    1. "Let it settle (shortened for training)."
    2. "Watch the cloudy surge sink and the dark beer rise."
    3. "Settled: a clean line between the dark beer and the head."
  - It tops up 1 s after readiness, upright, to a dome, then serves.
- The captions are timed from the beer (`buildGhost`).
- Optional, for the station slice: a short "what topping up early looks like" comparison, mirroring Hefeweizen's calmer pour. Not built.

**Guided:**
- A ⅔–¾ coaching mark for stage one.
- Hints, at most once each, and **none of them blocks anything**:

  | Hint | When |
  |---|---|
  | `tiltFirst` | Opened without tilting |
  | `nearStage1` | Nearing three-quarters |
  | `settling` | On set-down |
  | `stillSurging` | Fires as an early top-up *starts*; the beer keeps flowing |
  | `settled` | When readiness arrives |
  | `tiltedTopUp` | Topping up tilted |
  | `nearRim` | Nearing the rim |

- The station should also point at the surge band on the glass during settling (like Hefeweizen's FOAM bracket), not at a timer.

**Solo:**
- No marks, no hints.
- The learner reads the beer and may top up whenever they choose.
- A pass certifies (M6). One pass shows that pour, as for the other stations.

**Input** (no new gestures):
- Stage one: hold and slide.
- Release to close; the 0.6 s pause is the set-down.
- Wait.
- Hold again to top up upright.
- Release, then Serve.

The shared pad controller only reports the pour and the target. The phase
logic is entirely the sim's.

## 7. What the tests hold (`test/stout-sim.test.js`, 18 tests)

**Basics:**
- Own module: nothing from the other sims.
- Geometry and dome inversion; capacity falls with tilt.
- Bit-identical replays.
- **Frame-rate independence:** the Watch demo driven at 30, 60 and 144 Hz and an irregular mix gives an identical final state.
- **Volume conservation:** in-glass plus spilt equals poured.

**Settling and readiness:**
- Settling with the tap shut: the surge shrinks, the liquid rises and the top doesn't move.
- Readiness 8–12 s after set-down; clean at readiness, cloudy at set-down.
- The reference and the Watch demo pass with margins.

**The decisions:**
- **An early top-up is allowed, recorded and penalised, monotonically.**
- Top-up verdicts never contradict the result.
- Waiting long never hurts.
- Stage one low, high and tilted; tilted top-up, slight-tilt spill, short, over-dome, overflow.
- `noTopUp` and `noSetDown`; opened upright; a stutter stays stage one.

**Verdicts and copy:**
- Serve timing cannot change the verdict.
- Every cause has copy, with no real duration claimed. Primary and secondary messages are correct.
- **Guided hints warn but never block.**

**Future parking:**
- The state is plain JSON.
- A round-tripped state continues identically.

## 8. Final Rush compatibility (decided: designed in, not built)

The state is a plain, serialisable object, and settling is just `step()` with
the tap shut. A parked glass can be held as data and advanced later, with
identical results (tested). No `park`, `advance` or `judge` API is built:
`docs/implementation-plan.md` is updated to match
`docs/procedures/nitro-stout.md`, which the review chose.

## 8b. Corrections after the simulation review
- **Verdicts:** lined up with the tolerance (§2).
- **Stage one:** the preferred range is distinguished from the passing band (§3).
- **The pass line describes the actual finish:** "finished with a slight dome" above the rim, "finished level with the rim" otherwise. The 99–103% band accepts both.
- **Early top-up wording:** the explanation now says what happened "in this pour". The agitation model is GAME, not verified beer physics.
- **Notes:** a pass can carry notes (`littleEarly`, `stage1Wide`) as its secondary line.
- **Tests:** four new tests hold all of this (22 in all).

## 9. Open product decisions (answered in the simulation review)
Settle about 10 s, kept provisionally. A touch-early top-up passes with a note.
Upright at set-down stays a hard check (≤ 15°). An optional, short early-top-up
Watch comparison: yes. Guided highlights the surge band and gives one
"Settled" hint. All of it is provisional until the station has been played.

Original questions:

1. **The settle length:** about 10 s compressed. Is that right in hand? It is one constant (`settleTau`).
2. **The early-top-up consequence:**
   - Currently a technique fail, plus a bigger, loose head that is described in the debrief.
   - A "little early" top-up (6–9% surge) passes. Should it pass with a note instead?
3. **The set-down rule:** "upright at set-down" is currently required (≤ 15° when the tap closes). Sources say to bring it upright as it fills. Keep it as a hard check, or make it a note?
4. **A Watch comparison demo** of an early top-up? (Station slice.)
5. **Guided coaching during settling:** confirm pointing at the surge band on the glass, plus the one-time "Settled" hint.
