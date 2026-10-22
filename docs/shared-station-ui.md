# Shared station UI: smallest safe extraction (proposal, for review)

**Status: proposal only.** Nothing in it is implemented yet. Written after the
Hefeweizen functional review, before Nitro's station UI.

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
