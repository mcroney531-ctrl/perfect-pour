# Multi-station architecture (proposal, for review)

Status: **this is a proposal for review. Nothing in it is implemented.** It
is written from the code as it stands at commit `4a237eb`, with Pilsner
playable and M6 certification implemented.

Companion docs:
- `docs/procedures/` holds the three procedure specs.
- `docs/source-claim-audit.md` audits the sources and the CLAIM copy.
- `docs/final-rush-outline.md` outlines Final Rush.
- `docs/implementation-plan.md` gives the build order.

The rule this document is built on: **share the framework, never the
physics.** Each beer brings its own simulation, its own renderer, its own
input and its own debrief. The shell knows a station only through a small
contract (§3). It never reads a sim state, a glass level or a foam number.

## 1. What exists today

| Layer | File | What it really is |
|---|---|---|
| App shell | `js/brewery.js` | Owns the landing, hub, intro card, hash router, camera push, certification seal and progress writes. **It hard-codes Pilsner** (see §6). |
| Progress | `js/progress.js` | Per-station status, counts and `seen` flags, versioned (v1). The station IDs are fixed: `pilsner`, `hefeweizen`, `stout`. |
| Hub layout | `js/hub-scenes.js` | Plate anchors for all four destinations, including `finalRush`. It is pure and unit-tested. Already multi-station. |
| Station | `js/pilsner-station.js` | `PilsnerStation.mount(host, opts)` returns `{ unmount(reason) }`. It contains the markup, renderer, input, modes (Watch/Guided/Solo), Guided hints, result sheet, debrief, pour log and debug panel. It emits `served {mode, pass}` and `abandoned {mode, reason}`. |
| Sim | `js/sim.js` (`PourSim`) | Pure, fixed-step, deterministic. **It is Pilsner's sim:** the glass shape is module-global, there is one foam model, scoring is Pilsner's, the copy is Pilsner's, and so is the ghost timeline. It is protected. |
| Presentation | `js/station-look.js`, `js/station-cues.js` | These sit outside the station. They work by **reading Pilsner's DOM**: the `#glass` transform via regex, the `#levelText` text, `#modes [aria-current]`, `#pour[aria-pressed]`, and the constants `TRAY_Y = 340` and a glass height of 227. |
| Legacy page | `index.html` | Standalone Pilsner, guarded by pixel tests. |

Pilsner already works as a mounted component with a lifecycle and events.
The architecture below **formalises that existing shape.** It does not
replace it.

## 2. Shell and station modules: who owns what

**The shell owns everything that is the same for every beer:**
- Routing (`#/`, `#/<station>`, `#/welcome`, later `#/rush`).
- Hub, landing, intro card, camera push.
- Progress and certification: the rule is "a passing Solo serve certifies, once, permanently". The wording comes from the M6 spec.
- The 16:9 frame and the `--st-ui` scale.
- The station backdrop layer and the exit-to-bar affordance.
- Shell-level live announcements: certification, and coming-soon.
- Final Rush orchestration: the order queue, the clock and the results.

**Each station module owns everything that makes the beer what it is:**
- Its sim: state, step, evaluation, thresholds. Every number is labelled PHYSICAL, SOURCED or GAME.
- Its renderer and glass art hooks.
- Its input mapping: pad, keys, and any extra controls (for example Nitro's top-up).
- Its Watch timeline, Guided hints and Solo rules, plus the result sheet and debrief copy.
- Its pour log (station-tagged; see §6).
- Its presentation layers. The current look and cue layers move into the Pilsner module, or read a contract hook instead of the DOM.

**What stays deliberately unshared, at least until a second station proves
the need:**
- Glass geometry.
- Foam models.
- Scoring.
- Timeline formats.
- Control mappings.

**Rule of two:** a helper is extracted into shared code only once Pilsner and
Hefeweizen both need it in the same form. Predicting what Nitro "will"
share is how a framework ends up bending the physics.

## 3. The station contract (v1)

Each module registers itself with the shell. It is a classic script, so the
app keeps working from `file://`:

```js
RiversideStations.register({
  id: 'pilsner',                       // matches progress and hub-scenes ids
  contract: 1,
  meta: {
    name: 'Pilsner', sub: 'Foundation pour', glass: 'pils',
    intro: { label, title, steps: [...], goal },   // today: INTRO.pilsner in brewery.js
    backdrop: { src, provisional },                 // today: STATION_BACKDROP
    exitSub: 'Pilsner station'
  },
  mount(host, ctx) { /* returns a handle */ }
});
```

**What the shell passes in (`ctx`):**

| Field | Purpose | Today |
|---|---|---|
| `onExit()` | Back to the bar | exists (`opts.onExit`) |
| `emit(type, detail)` | Events, below | exists as `opts.onEvent` |
| `mode` | Initial mode: `watch`, `guided` or `solo` | **missing**: the station always starts in Watch |
| `lockMode` | Hide the mode tabs and stay in `mode` (Final Rush runs Solo only) | **missing** |
| `order` | Final Rush only: an opaque order object the module understands (for example `{ beer: 'stout' }`) | **missing** |
| `resume` | A snapshot from `park()`, to continue a parked glass (Nitro in Rush; §4) | **missing** |
| `search` | Debug query flags (`?angle=`, `?glass=`, `?debug=`) | exists |

**What the module returns (the handle):**

| Member | Required | Purpose |
|---|---|---|
| `unmount(reason)` returns `{ abandoned }` | yes | Exists. Closes the tap and treats an unserved attempt as abandoned, never graded. |
| `park()` returns a snapshot, or `null` | no | Takes the glass off the tap while its physics keep going. Only stations with a hands-off phase implement it. |
| `describe()` returns `{ phase, mode, cue }` | no | Lets presentation layers and the shell read state *without scraping the DOM*. `phase` is a module-defined string. `cue` is the module's own "a cue is due now" flag. |

**Module statics, for Final Rush:**
- `advance(snapshot, seconds)` returns a new snapshot.
- `judge(snapshot)` returns a result.

Both are pure, so a parked glass can keep changing without being mounted.

**Events.** The shell treats every payload as opaque except for the fields
named here.

| Event | Detail | Shell uses |
|---|---|---|
| `served` | `{ mode, pass, summary: { primary, secondary }, durationS, metrics }` | `pass` and `mode` (certification), `durationS` (Rush). `metrics` is logged, never interpreted. |
| `abandoned` | `{ mode, reason }` | progress count |
| `phase` | `{ phase }` | Rush HUD ("Stout settling"), cue layers |
| `modeChanged` | `{ mode }` | analytics only |

Today `served` carries only `{ mode, pass }`. Adding fields is backward
compatible.

**Lifecycle.** The `parked` step applies only when a module implements
`park()`.

```
register -> (intro, once) -> mount(ctx) -> [phase events ...] -> served | abandoned
                                    \-> parked: park() -> advance()* -> mount({resume}) -> ...
unmount(reason) is always safe and always idempotent.
```

**One station is mounted at a time.** The markup uses document-level IDs
(`#pour`, `#glass`, `#result`, `#exitBtn`), and `brewery.js` looks them up
with `document.getElementById`. Two mounted stations would collide. The
contract embraces that: Final Rush swaps mounts. It never co-mounts.

## 4. The Nitro stress test

Nitro breaks four Pilsner assumptions. Each one, and how the contract
absorbs it **without the shell learning any stout physics**:

1. **The glass leaves the tap mid-pour.**
   - The pour runs: pour 1 (tilted, to about ¾) → set down → settle → top-up → serve.
   - Pilsner is one continuous pour.
   - *Absorbed by:* a module-defined `phase` string (`pour1`, `settling`, `topUp`, `ready`). The shell shows the string; it doesn't branch on it.
2. **The physics run while the player does nothing.**
   - Pilsner deliberately *freezes* the head once the tap closes (in `step()`, the head settles only while `flow > 0`), so the time to press Serve can't change the verdict.
   - Nitro is the opposite: the surge and settle after the tap closes **is** the mechanic.
   - *Absorbed by:* separate sims. `StoutSim` is its own pure module with its own `step`, in which settling continues at `flow = 0`. Nothing in `PourSim` changes.
   - This is the single clearest proof that a shared physics core would have been wrong. Generalising `PourSim.step` to cover both would mean adding a "keep settling when closed" switch to protected Pilsner code.
3. **Timing is the decision, not just the angle.**
   - Topping up while the surge is still rising, or never letting it settle, is the main error.
   - *Absorbed by:* each module owning its own evaluation and causes. The shell reads only `pass`.
4. **In Final Rush, the settle should overlap other work.**
   - That is realistic and the best part of the Rush design.
   - *Absorbed by:* `park()` and the pure static `advance()`. This is designed in, but built only when Final Rush enables overlap (a later decision).
     1. The stout module hands Rush an opaque snapshot.
     2. Rush calls `StoutStation.advance(snap, dt)` on its clock while Pilsner is mounted.
     3. Rush remounts the stout with `{ resume: snap }` for the top-up.
   - The shell never looks inside the snapshot. Until overlap is enabled, the settle plays out in place.

What Nitro **does** share with Pilsner is everything that isn't the pour:
- Modes and their meaning: Watch demonstrates, Guided coaches, and Solo is independent and certifies.
- The station frame and exit.
- The result-sheet layout conventions.
- The progress and certification rules.
- The event contract.

So the framework is common, and the physics is entirely per beer.

**Nitro's visual states are a rendering problem the module owns:** the
cascade, the dark body rising as the head separates, the domed top-up. See
§7 for the art implications.

## 5. Tradeoffs and risks

| Choice | Benefit | Cost or risk |
|---|---|---|
| Per-beer sims, no shared core | Pilsner stays protected; Nitro and Hefeweizen can be faithful | Some duplicated geometry code. Mitigation: share **pure geometry helpers** (polygon area, the surface solver) only after Hefeweizen needs them, without touching `PourSim`. |
| A contract over a base class | Classic scripts, no build, easy to test | No compile-time checks. Mitigation: a contract test that mounts every registered station, checks the handle shape, and exercises unmount and abandon (generalising the current M3 and M6 browser tests). |
| One station mounted at a time | Matches the DOM-ID reality | Rush needs park and resume for overlap. That is optional, and v1 can skip it. |
| Moving `station-look` and `station-cues` into the Pilsner module | They stop scraping DOM that other stations won't have | Touches presentation code for an approved station. Mitigation: pixel and cue tests already exist and must pass unchanged. |
| A `describe()` hook in place of DOM scraping | Robust cue layers | Pilsner needs a small read-only accessor. This is an app-layer addition, with no sim or scoring change. |

## 6. Assumptions the code contradicts (must be fixed before a second station)

1. **Adding a station ID wipes all progress.**
   - In `progress.js`, `load()` accepts data only if `IDS.every(id => d.stations[id]...)`.
   - Adding `finalRush` to `IDS` makes every existing save fail that check, so the app silently starts fresh.
   - Needs: a lenient merge that adds missing stations as `new`, before any new ID ships. Tests must cover v1 data loading into the new shape.
   - **Final Rush is not a station record.** Its progress is a separate top-level `finalRush` record, a sibling of `stations`, so the three-station certification collection and the "X of 3 certified" count are never contaminated.
2. **The shell hard-codes Pilsner.**
   - `mountStation` calls `PilsnerStation.mount`.
   - There is one `STATION_BACKDROP`.
   - `INTRO` has only `pilsner`.
   - The hub copy says "Start at the Pilsner station" or "Pilsner certified".
   - The coming-soon message says "Start with the Pilsner".
   - The station's default exit sub-label is "Pilsner station".
3. **The sim's glass is global.**
   - `GLASS`, `POLY` and `AREA` are module constants.
   - `heightOf` and `volumeOf` are closed-form for a **trapezoid**.
   - A weizen glass is a curved vase and a nonic or tulip stout glass has a bulge, so neither can reuse `PourSim` geometry without change.
   - Another reason for per-beer sims.
4. **The head freezes after close.** That is correct for Pilsner and wrong for Nitro (§4).
5. **Presentation layers scrape Pilsner's DOM:**
   - The `#glass` transform regex.
   - The `#levelText` digits.
   - `TRAY_Y = 340`.
   - The 227 glass height.

   They are Pilsner layers in practice.
6. **The shell can't choose a mode.** The station always starts in Watch, and the tabs can't be locked. Final Rush needs Solo-only.
7. **`served` is thin.** It carries only `{mode, pass}`; Rush needs a duration and a summary.
8. **The pour log is untagged.**
   - The key is `perfectPour.log.v2.3`.
   - Entries have no `station` field, and `config` is Pilsner's.
   - Needs: per-station keys, or a `station` field, before Hefeweizen logs anything.
9. **The station label "Transfer pour" on the Hefeweizen card** has no source behind it. Decided in the planning review: it becomes **Foam Control** (see `docs/procedures/hefeweizen.md`).

Items 1, 2, 6, 7 and 8 are app-layer changes. None touches the protected sim
or scoring.

**Scope note (planning review):** the contract above is the target shape.
Members are built only when a concrete consumer needs them:
- **Slice 1 builds:**
  - `register` and `mount` / `unmount`.
  - `meta`.
  - The existing `served` and `abandoned` events.
- **Waits:**
  - Mode locking, enriched `served` metrics and `phase`: until Final Rush or another consumer needs them.
  - `describe()`: until the second station.
  - `park` / `advance` / `resume`: until Final Rush enables stout overlap.

## 6b. After two stations (update)
- **Proven:** Hefeweizen proved the registry and the contract with a second, different sim. Pilsner was untouched.
- **Cost:** a second copy of the station plumbing. The narrow shared kit proposed in `docs/shared-station-ui.md` addresses it.
- **Unchanged:** renderers, sims, coaching and phases stay per beer.

## 7. Art pipeline for further stations

Same method as M5, per station:

1. **Functional layout first.** The station runs on a provisional SVG backdrop (`assets/station/<id>-provisional.svg`).
2. **Measured template.** `tools/make-station-template.mjs` is generalised to take a station ID. It writes a 2560×1440 zones image plus `design/station-templates/<id>-zones.json` from the live layout.
3. **Art brief:** `docs/art-brief-<id>-station-16x9.md`, written against the template. It covers the same place, light and materials as the approved Pilsner backdrop.
4. **Integrate, then review** with the pixel test and the device check.

**Per-beer specifics:**
- **Hefeweizen.**
  - A tall weizen vase glass changes the glass-art zone height. The template must reserve a taller glass zone than Pilsner's.
  - The tap is a standard faucet.
  - Hazy, pale-gold beer art and a large, dense head.
- **Nitro Stout.** Several visual states, all drawn live by the renderer, not baked into the backdrop:
  1. The empty glass.
  2. Pour 1, with a tan cascade.
  3. Settling: the surge band moving downward and the dark body forming from the bottom up.
  4. Settled, with a clean tan head line.
  5. The top-up, with a dome slightly proud of the rim.
- **Nitro backdrop needs:**
  - **A set-down spot** beside the tap (a drip-rail landing zone), anchored in the template the way the drip tray is.
  - A stout faucet (restrictor nozzle) silhouette that reads differently from the Pilsner tap.
  - The backdrop must stay calm enough for a near-black glass to read: **contrast behind the glass is the art risk for stout.** This is the opposite of Pilsner, where transparent glass was the risk.
- **Visual consistency:** one backdrop per station, the same bar and the same light direction. The hub plate already shows all three taps, so station art should match what the hub shows at that tap.

## 8. Entry-point migration (done)

**Done (front-door slice, approved by GPT and the owner).** As built:
- `index.html` is the brewery.
- `pilsner.html` is the standalone Pilsner, at the root: no path changes, so its pixel tests guard the same output.
- `brewery.html` redirects to `./` with `location.replace()`, keeping the query and the route (the hub, `#/`, if none was given).
- Old root bookmarks with the prototype's options and no route (`/?angle=`, `/?glass=`, `/?debug=1`) forward to `pilsner.html`.
- All brewery cache tags are bumped (`?v=fd1`).
- `test/ui/front-door.test.mjs` covers the root, saved progress, the redirect (routes, query, Back) and the legacy forwarding.

The original plan follows, for the record.

**Goal:** `brewery.html` becomes the front door at the site root, and
`index.html` (standalone Pilsner) is kept as a legacy page.

1. Copy the current `index.html` to `legacy/pilsner.html`, or `pilsner.html` at the root.
   - Fix its relative asset paths.
   - Point the pixel tests (`test/ui/game.test.mjs`, `test/ui/design.test.mjs`) at the new path, so they still guard the same output.
2. Rename `brewery.html` to `index.html`.
   - Leave a tiny `brewery.html` that redirects to `./` and preserves the hash (`location.replace('./' + location.hash)`), so links already shared keep working.
3. Update the README links, the test harness URLs and the `?v=` cache tags. Bump the tags so phones drop the old root page.
4. Test:
   - The full browser suite.
   - Deep links (`#/pilsner`, `#/welcome`) through the redirect.
   - That old saved progress still loads. The key is unchanged, but keep a test.
   - That GitHub Pages serves the root from main.
5. One commit, after the station contract (implementation plan step 1) lands. Both touch `brewery.html` script tags, so landing them separately avoids two cache-busting rounds.

**Risk:** existing bookmarks to `/` would open the app instead of the
standalone station. That is the intended change; the legacy page is linked
from the README.
