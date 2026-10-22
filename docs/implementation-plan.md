# Incremental implementation plan — for review

**Status:** a plan only. Each step is its own review gate.

Two rules for every step:
1. **No change to `js/sim.js`, Pilsner scoring, thresholds or copy** unless the owner approves a specific item from `docs/source-claim-audit.md`.
2. **Every existing test passes unchanged.** That is 69 node tests and 53 browser tests, including the `index.html` pixel guards.

## Step 1 — Prove the station contract with Pilsner (first slice)
App layer only. The Pilsner player experience must be pixel-identical.

1. **`js/stations.js`:** a registry, `RiversideStations.register/get/list`.
2. **Pilsner registers itself** through a thin adapter (`js/stations/pilsner.js`) that wraps `PilsnerStation.mount`.
   - It moves `INTRO.pilsner`, `STATION_BACKDROP` and the exit label out of `brewery.js` into `meta`.
   - It adds the `ctx.mode` and `ctx.lockMode` options. The lock hides the tabs and needs a small option in `pilsner-station.js` that doesn't touch the sim.
   - It enriches `served` with `summary` and `durationS`; `metrics` comes from the existing `evaluate()` output.
3. **`brewery.js` mounts through the registry.**
   - Hub and intro copy is generated from `meta`, keeping today's exact Pilsner strings.
   - "Coming soon" comes from registration: a station is playable if it is registered.
4. **Progress migration.**
   - A lenient load: missing station records are added as `new`, and existing saves are never wiped.
   - Tests cover v1 data loading after a new ID is added.
   - Do this now, even before `finalRush` exists.
5. **Station-tag the pour log:** add a `station` field. The old key and entries stay readable.
6. **Contract test:**
   - Every registered station mounts and unmounts.
   - `unmount` is idempotent.
   - Abandon emits.
   - `served` has `{mode, pass}`.
   - A Solo-locked mount shows no tabs.

**Deferred to step 2** (needs a second station to justify it): moving
`station-look` and `station-cues` behind `describe()`. Until then they stay
Pilsner-only layers, applied by the Pilsner adapter.

## Step 2 — Validate against Hefeweizen
1. **Owner decisions first:** rinse step, head target, card label (`docs/procedures/hefeweizen.md`).
2. **`js/hefe-sim.js` (`HefeSim`):**
   - A pure, fixed-step sim with its own Node tests.
   - Curved-glass geometry with a numeric solver, its foam model and its scoring.
   - Every constant labelled PHYSICAL, SOURCED or GAME.
3. **`js/hefe-station.js`:** the renderer, modes, debrief and Watch timeline.
   - Pilsner's station file is the pattern; copy where needed.
   - Do not share code yet.
4. **Then extract what both really share**, applying the rule of two. Likely candidates:
   - The pad input handler.
   - The result-sheet chrome.
   - Pure polygon helpers.

   Pilsner's own behaviour must stay pixel-identical after extraction.
5. Provisional SVG backdrop, then the measured template, then the art brief (architecture §7).

**Gate:** does Hefeweizen teach something Pilsner doesn't, in a fresh-player
check? If not, revisit the procedure before building Nitro.

## Step 3 — Add Nitro Stout
1. **Owner decisions first:** settle compression, top-up control, faucet type, head and dome (`docs/procedures/nitro-stout.md`).
2. **`js/stout-sim.js`:**
   - A phase machine, with settling while the tap is closed.
   - Static `advance()` and `judge()` for parking.
3. **`js/stout-station.js`:**
   - The multi-state renderer (cascade, separation, dome).
   - The set-down spot and the top-up control.
4. Art: a stout backdrop with a set-down spot, a stout faucet and a calm contrast behind the dark glass.

## Step 4 — Consolidate the entry point, then Final Rush
1. **Entry-point migration** (architecture §8): `brewery.html` becomes the root front door, and the legacy Pilsner page gets its own path.
2. **Final Rush** (`docs/final-rush-outline.md`): the shell orchestrator, the `finalRush` progress record and the results screen. Stout parking only if approved.

## Step 5 — Polish
The owner's visual pass per station, art re-exports, and the open M5 items:
- The fresh-learner playtest.
- The sideways-phone result-panel scroll.

## Recommended first slice
**Step 1, items 1–4 and 6:** the registry, the Pilsner adapter, the mode
options, the progress migration and the contract test.

Why this slice first:
- It is small.
- It changes nothing a player sees.
- It removes the two hazards that would otherwise bite the moment a second station appears: the progress wipe and the hard-coded Pilsner shell.

Item 5 (the log tag) can ride along.
