# Shared station UI: smallest safe extraction (proposal, for review)

**Status:**
- **Steps 0 and 1:** done and approved.
- **Step 2:** done, markup only, for review.
- **Step 3:** not started (separate gate).

See §6 and §7.

Written after the Hefeweizen functional review, before Nitro's station UI.

**Goal:** stop copying a whole interface per beer, without a rewrite and
without changing what Pilsner looks like or does.

## 1. What is duplicated today (measured)

Lines of `js/hefe-station.js` (915 lines) that are character-for-character
the same as a line in `js/pilsner-station.js` (1,238 lines), ignoring
whitespace and lines under 12 characters:

| Section of the Hefeweizen station | Lines | Identical to Pilsner |
|---|---|---|
| Markup (header, controls, result sheet, tap, gauge) | 167 | 76% |
| Renderer | 188 | 55% |
| State | 22 | 36% |
| Input (pad, keys, tap mode, safety stops) | 68 | **88%** |
| Speech and captions | 12 | **92%** |
| Modes, restart, serve, result sheet, Watch | 192 | 59% |
| UI sync | 17 | 65% |
| Pour log | 26 | 27% |
| Loop | 10 | 80% |
| Unmount | 21 | 81% |
| **Whole file** | 738 | **63%** |

The duplication is concentrated in plumbing that has nothing to do with beer:
input, speech, lifecycle, the loop, panel markup and result-sheet chrome. That
is what to share.

## 2. The boundary

**Shared (a station kit), because it is the same for every beer:**
- **Lifecycle:**
  - Tracked window and document listeners.
  - The `alive` flag.
  - `emit` to the host.
  - The unmount teardown: loop, timers, listeners, markup.
  - The abandoned-pour rule (unserved means abandoned, logged, never graded).
- **Speech:**
  - The polite live region, with 80 ms batching.
  - The caption setter (plain, hint or verdict).
- **The fixed-step loop:** a 60 Hz accumulator with a 0.25 s cap, calling the station's `tick` and `draw`.
- **The pour-log store:** a capped localStorage list per key.
  - Each station still decides what goes in its entry, including `station` and scenario.
- **Pad input:** the continuous pad, keys, tap mode, the click-for-assistive-tech toggle, and the safety stops.
  - The pad is press-and-hold with slide-to-angle and a dead zone.
  - Keys: Space or Enter holds, arrows change the angle, T tilts, S serves, R restarts.
  - Safety stops close the tap on blur, page hide or a hidden tab.
  - Focus is dropped after pointer clicks.
- **Panel markup:**
  - The header with the brand slot and mode tabs.
  - The caption.
  - The controls panel: the glass switch, the pad with its track and demo thumb, tap mode, help text, Serve and Restart.
  - Watch buttons: Replay and Skip are standard, and a station adds its own (for example "Watch a calmer pour").
  - The transcript box with a station-supplied note.
  - The result-sheet frame: title, the two chip lists, the debrief slot, feedback lines, the suggest line, fine print, the actions row.
  - The live region.
- **Result-sheet chrome:**
  - The chip builder.
  - Building the actions row and focusing the primary button.
  - The "N misses in a row" suggestion.
- **The Watch step fold** already lives in `js/station-chrome.js`.

**Beer-specific, deliberately not shared:**
- The **sims**: `js/sim.js`, `js/hefe-sim.js`, and Nitro's later. Physics, scoring, verdicts, feedback copy, scenarios.
- The **renderers**:
  - Glass geometry and art, the beer and foam drawing, the stream and walls, spill, splash.
  - The stage overlays: Pilsner's BRING UP band, Hefeweizen's FOAM bracket, Nitro's phase states.

  They are 55% similar today, but Nitro's cascade and set-down states will differ. Revisit at three, not two.
- **Watch timelines and captions.**
- **Coaching:** Guided hints, cue layers (`station-cues.js`) and the look layer (`station-look.js`), which are Pilsner's.
- **Debrief content:** the debrief glass and its text, the result titles, which chips exist.
- **Mode and phase behaviour:**
  - What `restart`, `serve` and `setMode` do beyond the shared chrome.
  - Hefeweizen's scenario sequence.
  - Nitro's pour, set-down, settle and top-up phases.
- **Pilsner-only extras:** the debug panel and the staged, slider and toggle control variants.

## 3. Proposed steps (smallest first; each its own commit and review)

### Step 0: the safety net first (no product change)
1. **DOM-parity fixtures.** A browser test mounts each station at fixed clock points and compares the station's normalised `innerHTML` with committed fixtures (`test/ui/fixtures/<station>-<state>.html`). The points:
   - Watch idle.
   - Watch mid-demo.
   - The result sheet.
   - Guided idle.
   - Solo idle.

   DOM equality is exact. Pixel screenshots are not: the moving pour stream varies between runs. So DOM fixtures are the gate, and pixels are the backup.
2. **Parity tool.** Commit the before/after screenshot script used in slices 1 and 2 as `tools/station-parity.mjs`, covering both stations.

### Step 1: the kit core (no markup, so no visual change by construction)
1. Add `js/station-kit.js` with:
   - `lifecycle()`.
   - `announcer(liveEl)`.
   - `caption(el)`.
   - `loop(tick, draw)`.
   - `logStore(key, cap)`.
   - `chip()`.
2. Both stations replace their copies.

**Gates:** DOM fixtures identical; all tests unchanged.

**Expected:** about 100 lines out of each station.

### Step 2: panel and result-sheet markup builders
1. Builders that return markup strings:
   - `kit.markup.header({ sub })`.
   - `kit.markup.controls({ ghostButtons, transcriptNote, extraControls })`.
   - `kit.markup.result({ fineprint })`.
2. Pilsner passes its extras: the slider and the debug panel stay in Pilsner's own markup.
3. A result-sheet helper (`kit.result.actions(...)`, `kit.result.suggest(...)`). Each station still builds its own title, chips and debrief.

**Gates:** the builders must give **byte-identical** Pilsner markup (the DOM fixtures); Hefeweizen fixtures identical; all tests.

### Step 3: pad input controller (last; it touches feel)
1. `kit.padInput({ pad, toggle, tapMode, ctl, locked, onTarget, onStraightenNote, keys })` handles the continuous pad, keys, tap mode, assistive-tech clicks and safety stops.
2. Pilsner keeps its staged, slider and toggle branches as hooks passed in: a swipe callback and an arrow mapping. Nothing about them moves.

**Gates:**
- The Pilsner game tests (keyboard path, tap mode, blur closes the tap, staged fallback, the iframe release).
- The Hefeweizen tests.
- The DOM fixtures.
- An owner device check of the pad feel on both stations.

**Not proposed now:**
- Shared renderer pieces.
- A shared mode, restart or serve state machine. Nitro's phases will show what is really common.
- Renaming `css/pilsner-station.css` to a station-wide name (touches `index.html`; cosmetic).

**Expected result after steps 1–3:**
- Hefeweizen station: about 915 → 450 lines.
- Pilsner station: about 1,238 → 950 lines.
- Nitro's station starts from the kit plus its own renderer and phase logic.

## 4. Risks and how each step is protected

| Risk | Protection |
|---|---|
| Pilsner looks or behaves differently | DOM-parity fixtures (exact), the pixel tool, 61 sim tests, the existing game, design and brewery tests, all unchanged |
| A subtle input regression (the pad is the core skill) | Input goes last, alone, with Pilsner's input tests plus an owner device check |
| A kit that bends to fit Nitro early | The kit holds only what two stations already share verbatim. Nitro adds to it only when it needs the same thing |
| A big-bang refactor | Three small commits, each reviewable and revertible on its own |

## 5. Recommendation

Approve **step 0 and step 1** as the next slice. They are pure plumbing with
no possible visual change, and they put the exact-parity safety net in place
first. Steps 2 and 3 follow as separate reviewed commits. Step 3 comes with
the owner's device check of the pad.

## 6. Done so far (steps 0 and 1)

**Step 0, safety net** (commits `fac70a0` and `2c7ff8c`):

*DOM-parity fixtures* (`test/ui/dom-parity.test.mjs`):
- **What they cover:** Pilsner and Hefeweizen in the app, and the legacy `index.html`.
- **States:** Watch start, mid-demo and result; the calmer demo; Guided idle and after a scripted pour; Solo idle.
- **Exact comparison:** every element, attribute (aria-*, hidden, disabled, classes) and text node. The only normalisation is geometry rounded to 0.1.
- **Speech and progression trace:** a fixture per station of what the live region said, in order, and the level every 250 ms. It holds the batching and the frame progression.

*Lifecycle tests* (`test/ui/lifecycle.test.mjs`, both stations and the legacy page):
- The tap closes on blur, page hide and a hidden tab.
- Unmount mid-pour: abandoned exactly once and logged once, ungraded. A repeat unmount is a no-op.
- No listener, animation frame, pending timer or queued announcement is left behind.
- The log keeps its key, its fields (a fixture), its 2000-entry cap and its attempt numbering.

*Entry points* (`test/entry-points.test.js`): both pages load every script's dependencies before it.

*Screenshots* (`tools/station-parity.mjs`):
- `shoot` and `compare` at 1280×720 and 844×390.
- It separates real differences from Chromium's few-pixel rasteriser noise: identical DOM still gives up to about 46 edge pixels off by at most 27/255.

*Exact test clock* (`openPage(..., { exactClock: true })`):
- **Why:** on a loaded machine the test clock kept running while a page loaded. Frames, and the demo, shifted by a tick, and the fixtures failed on the *unchanged* stations.
- **How it works:** page time reads 0 and frames are held until load completes. Then the clock is paused and released, and frames run every 16 ms of test time.
- **Result:** verified 6 of 6 under a 6-way parallel load, before and after the kit. The fixtures were regenerated from the pre-kit stations.
- **Scope:** opt-in. The rest of the suite keeps its original clock.

**Step 1, the kit core:**
- **`js/station-kit.js`** (`RiversideStationKit`, 87 lines). Moved there unchanged from both stations:

  | Function | What it holds |
  |---|---|
  | `lifecycle()` | Tracked window and document listeners, the alive flag, end-once |
  | `announcer(live)` | 80 ms batched polite speech, cancelled on unmount |
  | `caption(el)` | Plain, hint or verdict; written only on change |
  | `loop(step, tick, draw)` | 60 Hz fixed steps, at most 0.25 s caught up, one draw per frame |
  | `logStore(key, cap)` | The capped localStorage transport |
- **Each station still owns:**
  - Its log entries: fields, `station`, scenario, attempt numbering, session.
  - Its unmount rule (an abandoned pour is logged and reported) and the order of teardown.
- **Result-chip markup** is deferred to step 2, as asked.
- **Loading:** both entry points load the kit before the stations. The legacy `index.html` gained one script line.
- **Size:** Pilsner station 1,238 → 1,211 lines; Hefeweizen station 915 → 895.

  The small saving is expected: step 1 is the plumbing with the most behaviour risk, not the most lines.

**Evidence for step 1:**
- **Fixtures:** all DOM, speech and progression fixtures, made from the pre-kit code, match exactly, 6 of 6 under load.
- **Screenshots:** no real differences, only rasteriser noise in a few states.
- **Full suite:** 100 node tests (5 new kit unit tests) and 75 browser tests, all existing tests unchanged.
- **Kit unit tests** (`test/station-kit.test.js`) cover:
  - End-once lifecycle.
  - Batching order, and the region emptied first.
  - Cancel on unmount.
  - The fixed-step and catch-up cap.
  - Write-on-change captions.
  - The log cap, bad data and a full disk.

## 7. Step 2: shared markup builder (markup only, for review)

**Before the builder:** a separate commit (`cca5626`) fixed the certification seal. The shared seal artwork had "PILSNER STATION" baked in, so it showed on every station's seal. The station name is now drawn per seal. New assertions read the seal's own label on both stations' certification cards and hub cards. No parity fixture changed, because no fixture state shows a certified seal.

**`js/station-markup.js`** (`RiversideStationMarkup.station(slots)`):
- **What it builds:** the markup every station shares, around the station's own stage. It is generated from the Pilsner station's markup text unchanged.
  - The header and mode tabs.
  - The caption.
  - The `#stage` wrapper.
  - The controls panel: the glass switch, the pad with its track and demo thumb, tap mode, help text, Serve and Restart, the Watch buttons, the transcript box.
  - The result-sheet frame and its slots.
  - The live region.
- **Slots:**

  | Slot | Purpose |
  |---|---|
  | `brand` | The line under "Perfect Pour" |
  | `headerExtra` | Pilsner: the debug toggle |
  | `stage` | The station's scene |
  | `angleExtra` | Pilsner: the v1 slider |
  | `toggleHidden` | Pilsner: the switch starts hidden |
  | `pourHelp` | The assistive-tech description of the controls |
  | `watchExtra` | Hefeweizen: "Watch a calmer pour" |
  | `transcriptNote` | The note under the Watch steps |
  | `resultNote` | The result fine print |
  | `after` | Pilsner: the debug panel |

- **Nitro:** gets the same frame. Its two-stage controls can go in `angleExtra` or `watchExtra`, or in a new slot added when it needs one, without forking the layout.

**Not moved**, as scoped: pointer and keyboard behaviour, result-action callbacks, focus management, the mode and restart state machines, and the sim, scoring, timing, coaching and rendering. Each station keeps its stage (`STAGE`) and its slot content.

**Evidence:**
- **Byte identity:**
  - Before switching, the builder's output with each station's slots equalled each station's original markup string, byte for byte.
  - After switching, each station mounted in the real page gives `innerHTML` identical to the same station built from the previous commit (Pilsner 15,529 characters, Hefeweizen 12,896).
- **Fixtures:** all pre-extraction DOM, speech and progression fixtures still match exactly, 6 of 6 under a 6-way parallel load. No fixture was regenerated.
- **Screenshots** at 1280×720 and 844×390: no real differences, only rasteriser noise.
- **Tests:** full suite 102 node and 75 browser tests, existing tests unchanged. The two new node tests in `test/station-markup.test.js` check the ids and their order, and where each slot lands.
- **Entry points:** both load `js/station-markup.js` before the stations. `index.html` gained one more script line, and the entry-point test holds it.

**Size:**
- Pilsner station 1,211 → 1,155 lines; Hefeweizen 895 → 837; builder 100.
- Remaining verbatim overlap: 61% of the Hefeweizen station's substantive lines (63% before steps 1–2). By part:

  | Part | Lines identical to Pilsner | Notes |
  |---|---|---|
  | Stage art | 68 of 87 | The tap and head gauge. They could become shared stage parts later; deliberately not done here (art and the stage are beer-specific) |
  | Renderer | 104 of 188 | Not proposed for sharing until Nitro |
  | Input | 60 of 68 | Step 3, held |
  | Modes, result sheet, Watch | 113 of 192 | Result actions and focus: a possible small follow-up; mode logic stays per station |
  | Unmount | 15 of 19 | |
