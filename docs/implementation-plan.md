# Incremental implementation plan — for review

**Status:** a plan only. Each step is its own review gate.

Two rules for every step:
1. **No change to `js/sim.js`, Pilsner scoring, thresholds or copy** unless the owner approves a specific item from `docs/source-claim-audit.md`.
2. **Every existing test passes unchanged.** That is 69 node tests and 53 browser tests, including the `index.html` pixel guards.

## Step 1 — Prove the station contract with Pilsner (first slice; approved, amended)
App layer only. The Pilsner player experience must be visually and
behaviourally identical.

1. **`js/stations.js`:** a registry, `RiversideStations.register/get/list`, with definitions checked as they register.
2. **Pilsner adapter** (`js/stations/pilsner.js`):
   - Registers Pilsner with its `meta`: name, card label, glass, intro, backdrop.
   - Wraps `PilsnerStation.mount` with no change to the station.
   - Brings the Pilsner-only presentation wiring out of `brewery.js` and into the adapter: the look, the cues, the pad observer, the Watch step fold and the exit focus.
3. **The upcoming stations** (Hefeweizen, Nitro Stout) register `meta` only. No `mount` means "coming soon".
4. **`brewery.js` mounts through the registry.**
   - Hub, intro, backdrop and messages come from `meta`.
   - The exact Pilsner strings are unchanged.
5. **Backward-compatible progress loading.**
   - A missing or damaged station record is added back as `new`, without wiping the others.
   - Fields that are missing get defaults.
   - Unknown keys are kept.
   - No version bump.
   - `finalRush` will later be a separate top-level record, not a station.
6. **Contract and regression tests.**
   - Registry validation (node).
   - Progress loading (node).
   - A browser contract test: every playable station mounts, unmounts idempotently and abandons cleanly, and every registered station has a hub anchor and a progress record.
   - All existing tests unchanged.

**Deferred** until a concrete consumer needs them:
- Mode locking (`ctx.mode`, `lockMode`).
- Enriched `served` metrics.
- The `phase` event.
- `describe()`.
- `park` / `advance` / `resume`.
- Station-tagging the pour log. Hefeweizen is the first consumer, so it comes with step 2.

**Stop for review after this slice.**

## Step 2 — Validate against Hefeweizen
1. Directions are set (`docs/procedures/hefeweizen.md`): Foam Control, no scored rinse, adaptation to the foam. Calibrate the bands at build time. Station-tag the pour log here.
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

## Step 2b — Shared station UI, before Nitro (proposed)
- **Status of step 2:** the Hefeweizen station is functionally approved. Its bands stay provisional until the owner's playtest.
- **Why this step:** the two stations share 63% of the Hefeweizen station's lines verbatim. That shared part is plumbing, not beer.
- **Proposal:** a narrow kit in `docs/shared-station-ui.md`. Shared: lifecycle, speech, loop, log store, panel and result markup, pad input. Beer-specific: sims, renderers, coaching, debrief, phases.
- **Order:**
  1. Step 0: DOM-parity fixtures and a parity tool.
  2. Step 1: the kit core.
  3. Step 2: markup builders.
  4. Step 3: input, with an owner device check.
- **Protection:** Pilsner DOM and pixel parity, plus Hefeweizen behaviour tests, gate every step.

## Step 3 — Add Nitro Stout
1. Directions are set (`docs/procedures/nitro-stout.md`): compressed settle in all modes, readiness read from the beer, hold-to-pour top-up at full flow, slight dome. Calibrate at build time.
2. **`js/stout-sim.js`:**
   - A phase machine, with settling while the tap is closed.
   - Static `advance()` and `judge()` for parking.
3. **`js/stout-station.js`:**
   - The multi-state renderer (cascade, separation, dome).
   - The set-down spot and the top-up control.
4. Art: a stout backdrop with a set-down spot, a stout faucet and a calm contrast behind the dark glass.

## Step 4 — Consolidate the entry point, then Final Rush
1. **Entry-point migration** (architecture §8): `brewery.html` becomes the root front door, and the legacy Pilsner page gets its own path.
2. **Final Rush** (`docs/final-rush-outline.md`):
   - The shell orchestrator, mode locking and the enriched `served` event (built here, for their first consumer).
   - A separate `finalRush` progress record.
   - The results screen.
   - Stout parking only if enabled.

## Step 5 — Polish
The owner's visual pass per station, art re-exports, and the open M5 items:
- The fresh-learner playtest.
- The sideways-phone result-panel scroll.

## First slice
Step 1 above.
