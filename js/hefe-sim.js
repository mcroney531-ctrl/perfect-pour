// Hefeweizen simulation. Pure: no DOM, no clock, no randomness (the pour's
// liveliness comes from a seed), so a replay or a headless test gets
// bit-for-bit the same pour every time. Its own module on purpose: the
// Pilsner sim (js/sim.js) is protected and shares no code with this one
// (docs/architecture-multi-station.md: share the framework, never the
// physics). Publishes HefeSim on globalThis, as js/sim.js publishes its own.
//
// The skill (docs/procedures/hefeweizen.md): the same tilt, hold, slide and
// release as the Pilsner, applied to a beer that foams more and varies from
// pour to pour. The learner reads the foam and adapts when to bring the
// glass up. There is no universal "straighten at X%" for draft hefeweizen;
// the windows below are Riverside / game rules.
(function (root) {
  'use strict';

  const HZ = 60;
  const STEP = 1 / HZ;

  // ---- Three kinds of number, kept apart as in js/sim.js:
  //   PHYSICAL  - geometry of the glass.
  //   SOURCED   - service guidance (see docs/source-claim-audit.md).
  //   GAME      - tolerances and rates picked for feel. Pending calibration
  //               review (docs/hefeweizen-behaviour.md).
  const HEFE = {
    verified: false,
    // GAME: flow and foam model. Foam share of the incoming beer runs from
    // kTilt (pouring down the side of a tilted glass) to kUp (straight down
    // into an upright one). Liveliness L scales kUp, and kTilt as L cubed,
    // so a lively pour shows clearly more foam while still tilted: that
    // visible foam is the cue the learner reads (docs/hefeweizen-behaviour.md).
    flowRate: 0.10,          // glass volumes per second at full flow (a taller glass than the Pilsner's)
    kTilt: 0.12, kUp: 0.60, tiltExp: 3,
    d: 0.08, r: 0.3,         // head settle rate (only while pouring), share returned to liquid
    turbAngle: 45,           // deg at which the stream is fully "down the side"
    // GAME: liveliness, the pour-to-pour variation the learner adapts to
    // (keg, line and glass temperature all change how a wheat beer foams;
    // the range is a game choice). 1 is a typical pour; Watch uses 1.
    liveRange: [0.85, 1.25],
    // SOURCED (GPT review, Cicerone): tall weizen glassware holds a larger
    // head. GAME: the band itself.
    fillLine: 0.95, fillTol: 0.04,          // level (beer + head) as a share of glass height
    headBand: [0.16, 0.24],                 // head height, share of glass height (~"three fingers" on the drawn glass; as wide as the Pilsner's band)
    wasteTol: 0.02,
    tiltThreshold: 35,                      // deg; same rule shape as Pilsner
    straightenThreshold: 15,
    minUprightPour: 0.5                     // s; "finished upright" needs this much upright pouring
  };

  // PHYSICAL: a weizen vase, as a section of height 1: half-width at each
  // height, bottom to rim. Narrow base with a small bulb, a waist, a long
  // flare, and a rim that turns slightly in. As in js/sim.js, volume is the
  // 2D section's area, and the renderer must use these same functions.
  const PROFILE = [
    [0, 0.085], [0.07, 0.102], [0.16, 0.106], [0.3, 0.094], [0.5, 0.118],
    [0.7, 0.146], [0.86, 0.158], [1, 0.150]
  ];

  // GAME: feel of the controls. Deliberately the Pilsner's values, so the
  // hands do the same thing at both taps.
  const CONTROL = {
    padTravel: 70, padDead: 8, flowRamp: 0.15, dragTau: 0.05,
    tiltAngle: 45, maxAngle: 60
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rad = d => d * Math.PI / 180;
  const fillZone = (cfg = HEFE) => [cfg.fillLine - cfg.fillTol / 2, cfg.fillLine + cfg.fillTol / 2];

  // ---- Liveliness from a seed (deterministic) ------------------------------
  // A small integer hash (mulberry32's mix) spread over liveRange.
  function liveliness(seed, cfg = HEFE) {
    let t = (seed >>> 0) + 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const [a, b] = cfg.liveRange;
    return a + (b - a) * u;
  }
  // How the debrief names it. GAME wording thresholds.
  const liveLabel = L => L < 0.95 ? 'calm' : L <= 1.1 ? 'typical' : 'lively';

  // ---- Geometry (PHYSICAL) -------------------------------------------------
  // Frame: y up, origin at the inside bottom centre; tilting rotates the top
  // toward +x (as js/sim.js).
  const POLY = [...PROFILE.slice().reverse().map(([y, w]) => [-w, y]), ...PROFILE.map(([y, w]) => [w, y])];
  const rot = (p, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
  };
  // Area of a polygon below the horizontal line y = h (clip, then shoelace;
  // correct for this non-convex outline too).
  function areaBelow(pts, h) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const pin = p[1] <= h, qin = q[1] <= h;
      if (pin) out.push(p);
      if (pin !== qin) {
        const t = (h - p[1]) / (q[1] - p[1]);
        out.push([p[0] + t * (q[0] - p[0]), h]);
      }
    }
    let a = 0;
    for (let i = 0; i < out.length; i++) {
      const p = out[i], q = out[(i + 1) % out.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a) / 2;
  }
  const AREA = areaBelow(POLY, 2);
  const RIM_L = 0, RIM_R = POLY.length - 1;     // the two rim corners

  // Share of the glass that holds liquid at this tilt before it reaches the
  // lower lip.
  const capCache = new Map();
  function capacity(angleDeg) {
    const key = Math.round(angleDeg * 100);
    if (capCache.has(key)) return capCache.get(key);
    const pts = POLY.map(p => rot(p, rad(key / 100)));
    const v = areaBelow(pts, Math.min(pts[RIM_L][1], pts[RIM_R][1])) / AREA;
    capCache.set(key, v);
    return v;
  }
  // Height of the horizontal surface enclosing this share at this tilt.
  function surfaceAt(volume, angleDeg) {
    const pts = POLY.map(p => rot(p, rad(angleDeg)));
    let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
    const want = clamp(volume, 0, 1) * AREA;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (areaBelow(pts, mid) < want) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  // Upright: share of the glass below a height, and back. The outline has
  // no closed form (unlike the Pilsner's), so heights come from a table of
  // volumes, inverted by search and linear interpolation (error < 1e-6).
  const volumeOf = h => areaBelow(POLY, clamp(h, 0, 1)) / AREA;
  const VN = 2000, VT = Array.from({ length: VN + 1 }, (_, i) => volumeOf(i / VN));
  function heightOf(volume) {
    const v = clamp(volume, 0, 1);
    let lo = 0, hi = VN;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (VT[m] < v) lo = m; else hi = m; }
    const span = VT[hi] - VT[lo];
    return (lo + (span > 0 ? (v - VT[lo]) / span : 0)) / VN;
  }
  function spillLimit(volume, margin = 0, maxAngle = CONTROL.maxAngle) {
    if (capacity(maxAngle) >= volume + margin) return maxAngle;
    if (capacity(0) < volume + margin) return 0;
    let lo = 0, hi = maxAngle;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (capacity(m) >= volume + margin) lo = m; else hi = m; }
    return lo;
  }

  const total = s => s.fill + s.foam;
  const levelOf = s => heightOf(total(s));
  const headOf = s => heightOf(total(s)) - heightOf(s.fill);

  // ---- The straighten window for this pour (GAME) --------------------------
  // The level at which starting to bring the glass up (as detected, the
  // same moment the verdict is given) lands the head in the band, for a
  // player who then comes up steadily and stops at the line. It moves with
  // liveliness: a livelier pour wants a later start. Rows [L, from, to],
  // interpolated between: a band inside the measured passing range for
  // bring-ups taking 1.5 to 3 s from 45° (docs/hefeweizen-behaviour.md has
  // the sweep; test/hefe-sim.test.js holds the table to the sim). Used for
  // the Guided band and the action verdicts, never scored on its own.
  const WINDOW = [[0.85, 0.28, 0.45], [0.95, 0.40, 0.57], [1.05, 0.51, 0.66], [1.15, 0.60, 0.72], [1.25, 0.685, 0.785]];
  function straightenWindow(L) {
    const rows = WINDOW, x = clamp(L, rows[0][0], rows[rows.length - 1][0]);
    let i = 0;
    while (i < rows.length - 2 && x > rows[i + 1][0]) i++;
    const [l0, a0, b0] = rows[i], [l1, a1, b1] = rows[i + 1], f = (x - l0) / (l1 - l0);
    return [a0 + (a1 - a0) * f, b0 + (b1 - b0) * f];
  }
  // Wide enough that "early" or "late" always means the head will miss.
  const EARLY_GRACE = 0.10, LATE_GRACE = 0.10;
  function straightenVerdict(level, L, cfg = HEFE) {
    const [w0, w1] = straightenWindow(L);
    if (level < w0 - EARLY_GRACE) return 'early';
    if (level < w0) return 'littleEarly';
    if (level <= w1) return 'inRange';
    if (level <= w1 + LATE_GRACE) return 'littleLate';
    return 'late';
  }
  function stopVerdict(level, cfg = HEFE) {
    const [z0, z1] = fillZone(cfg);
    if (level < z0 - 1e-9) return 'short';
    if (level > z1 + 1e-9) return 'over';
    return 'inZone';
  }
  const VERDICT_TEXT = {
    straighten: {
      inRange: 'Started bringing it up at a good point for this pour.',
      littleEarly: 'Started bringing it up a little early for this pour.',
      early: 'Started bringing it up early for this pour.',
      littleLate: 'Started bringing it up a little late for this pour.',
      late: 'Started bringing it up late for this pour.'
    },
    stop: { inZone: 'Stopped in the fill zone.', short: 'Stopped short of the line.', over: 'Stopped above the line.' }
  };

  // ---- State and step ------------------------------------------------------
  // opts: { live } (liveliness, default 1) or { seed }.
  function initState(opts = {}) {
    const live = typeof opts.live === 'number' ? opts.live : typeof opts.seed === 'number' ? liveliness(opts.seed) : 1;
    return {
      tick: 0, elapsed: 0, live,
      angle: 0, target: 0,
      flow: 0, fill: 0, foam: 0, waste: 0, tiltWaste: 0,
      foamShare: 0, spill: 0, capacity: 1,
      opened: false, pouring: false, pourTime: 0, uprightPour: 0,
      startAngle: null, straightenBegan: null, straightenFill: null, closeAngle: null,
      headAtStraighten: null,      // head on the beer when straightening began: what the learner could see
      events: []
    };
  }

  // input: { pour, target }. The glass eases toward target (the thumb), as
  // the Pilsner's continuous control.
  function step(s, input, dt = STEP, cfg = HEFE, ctl = CONTROL) {
    const n = Object.assign({}, s);
    if (input.pour && !n.opened) { n.opened = true; n.startAngle = s.angle; }
    if (!input.pour && s.pouring) n.closeAngle = s.angle;
    n.pouring = !!input.pour;
    const ramp = dt / ctl.flowRamp;
    n.flow = input.pour ? Math.min(1, n.flow + ramp) : Math.max(0, n.flow - ramp);

    const target = clamp(input.target, 0, ctl.maxAngle);
    n.target = target;
    n.angle += (target - n.angle) * (1 - Math.exp(-dt / ctl.dragTau));
    if (Math.abs(n.angle - target) < 0.05) n.angle = target;

    // Foam: down the side (tilted) makes little; straight down makes a lot.
    const up = clamp(1 - n.angle / cfg.turbAngle, 0, 1);
    const kt = cfg.kTilt * Math.pow(n.live, cfg.tiltExp), ku = cfg.kUp * n.live;
    const share = clamp(kt + (ku - kt) * up, 0, 0.95);
    const inflow = n.flow * cfg.flowRate * dt;
    n.fill += inflow * (1 - share);
    n.foam += inflow * share;
    // The head settles while beer is going in and holds once the tap is shut,
    // so the time taken to press Serve cannot change the verdict (as Pilsner).
    if (n.flow > 0) {
      const settle = n.foam * cfg.d * dt;
      n.foam -= settle;
      n.fill += settle * cfg.r;
    }

    // Spill: above what this tilt holds runs over the lip, head first.
    n.capacity = capacity(n.angle);
    n.spill = 0;
    const excess = n.fill + n.foam - n.capacity;
    if (excess > 0) {
      const fromFoam = Math.min(n.foam, excess);
      n.foam -= fromFoam;
      n.fill -= excess - fromFoam;
      n.waste += excess;
      if (n.angle > cfg.straightenThreshold) n.tiltWaste += excess;
      n.spill = excess;
    }

    if (input.pour) n.pourTime += dt;
    if (n.flow > 0) {
      if (n.angle <= cfg.straightenThreshold) n.uprightPour += dt;
      // Straightening "began" once the glass came up a few degrees from where
      // the pour opened (the decision, as js/sim.js).
      if (n.straightenBegan === null && n.startAngle !== null && n.startAngle >= cfg.tiltThreshold &&
          n.angle < Math.max(cfg.tiltThreshold, n.startAngle - 5)) {
        n.straightenBegan = levelOf(n);
        n.headAtStraighten = headOf(n);
        n.events = s.events.concat({ type: 'straighten', tick: s.tick + 1, level: n.straightenBegan,
          verdict: straightenVerdict(n.straightenBegan, n.live, cfg) });
      }
      if (n.straightenFill === null && n.angle <= cfg.straightenThreshold) n.straightenFill = levelOf(n);
    }
    if (s.flow > 0 && n.flow === 0) {
      const level = levelOf(n);
      n.events = n.events.concat({ type: 'stop', tick: s.tick + 1, level, verdict: stopVerdict(level, cfg) });
    }
    n.foamShare = share;
    n.tick = s.tick + 1;
    n.elapsed = n.tick * dt;
    return n;
  }

  const canServe = s => s.opened && s.flow === 0;

  // ---- Evaluation: procedure + outcome (same rule shape as the Pilsner) ----
  function evaluate(s, cfg = HEFE) {
    const level = levelOf(s), head = headOf(s);
    const [b0, b1] = cfg.headBand;
    const [w0, w1] = straightenWindow(s.live);
    const EPS = 1e-9;
    const procedure = {
      tilted: s.startAngle !== null && s.startAngle >= cfg.tiltThreshold,
      upright: s.closeAngle !== null && s.closeAngle <= cfg.straightenThreshold && s.uprightPour >= cfg.minUprightPour - EPS
    };
    const checks = {
      head: head >= b0 - EPS && head <= b1 + EPS,
      total: level >= fillZone(cfg)[0] - EPS && level <= fillZone(cfg)[1] + EPS,
      waste: s.waste <= cfg.wasteTol + EPS
    };
    const techniqueOk = procedure.tilted && procedure.upright;
    const pourOk = checks.head && checks.total && checks.waste;
    const pass = techniqueOk && pourOk;
    const began = s.straightenBegan;
    const causes = [];
    if (!pass) {
      if (!procedure.tilted) causes.push('upright');
      if (!procedure.upright) causes.push('notUpright');
      if (!checks.waste) causes.push(s.tiltWaste >= s.waste / 2 ? 'tiltSpill' : 'overflow');
      if (head > b1 && began !== null && began < w0) causes.push('early');
      if (head < b0 && (began === null || began > w1)) causes.push('stayedTilted');
      if (level < fillZone(cfg)[0] - EPS) causes.push('short');
      if (checks.waste && level > fillZone(cfg)[1] + EPS) causes.push('overLine');
      if (head > b1 && !causes.includes('early')) causes.push('headHigh');
      if (head < b0 && !causes.includes('stayedTilted')) causes.push('headLow');
    }
    return {
      pass, procedure, checks, techniqueOk, pourOk, causes,
      primary: pass ? 'pass' : (causes[0] || 'headHigh'),
      secondary: pass ? null : (causes[1] || null),
      metrics: {
        live: s.live, liveLabel: liveLabel(s.live), window: [w0, w1],
        startAngle: s.startAngle, straightenBegan: began, headAtStraighten: s.headAtStraighten,
        straightenFill: s.straightenFill, closeAngle: s.closeAngle, uprightPour: s.uprightPour,
        finalLevel: level, finalHead: head, finalFill: s.fill, finalFoam: s.foam,
        waste: s.waste, tiltWaste: s.tiltWaste, pourDuration: s.pourTime
      }
    };
  }

  // ---- Feedback copy ---------------------------------------------------------
  // CLAIM marks sentences stating beer behaviour as fact (to audit, as in
  // js/sim.js). Lines about this pour's liveliness describe the game's
  // variation and the foam the learner saw, not a service standard.
  const pct = v => Math.round(v * 100);
  const FOAMED = { calm: 'This pour foamed less than usual', typical: 'This pour foamed about as a wheat beer usually does', lively: 'This pour foamed more than usual' };
  const COPY = {
    // CLAIM: pouring straight down into an upright glass makes a lot of foam.
    upright: m => `You opened the tap with the glass upright (${Math.round(m.startAngle)}°). Wheat beer foams fast poured straight down. Tilt first.`,
    notUpright: (m, cfg) => (m.closeAngle !== null && m.closeAngle > cfg.straightenThreshold
        ? `You finished with the glass still tilted (${Math.round(m.closeAngle)}°).`
        : 'You only came upright at the last moment.') +
      ' Bring the glass upright and finish into the middle to build the head.',
    // PHYSICAL: a tilted glass holds less.
    tiltSpill: m => `Beer ran over the lip while the glass was still tilted (${pct(m.waste)}% spilled). Even on a foamy pour, start bringing it up before it reaches the lip.`,
    // PHYSICAL: foam sits on top.
    overflow: m => `You kept pouring past the line and the glass overflowed (${pct(m.waste)}% spilled). The head spills first.`,
    early: m => `${FOAMED[m.liveLabel]}, and you started bringing it up at about ${pct(m.straightenBegan)}% full, so the head came out too big (${pct(m.finalHead)}%). When the foam is building fast, stay tilted a little longer.`,
    stayedTilted: m => `${FOAMED[m.liveLabel]}, and ` + (m.straightenBegan === null
        ? 'you stayed tilted almost to the end,'
        : `you started bringing it up at about ${pct(m.straightenBegan)}% full,`) +
      ` so the head came out too small (${pct(m.finalHead)}%). When the foam is building slowly, come up a little sooner.`,
    short: (m, cfg) => `You stopped short of the line (${pct(m.finalLevel)}% full; aim for ${pct(fillZone(cfg)[0])}-${pct(fillZone(cfg)[1])}%).`,
    overLine: (m, cfg) => `You stopped above the line (${pct(m.finalLevel)}% full; aim for ${pct(fillZone(cfg)[0])}-${pct(fillZone(cfg)[1])}%). Let go a little sooner.`,
    headHigh: (m, cfg) => `The head came out too big (${pct(m.finalHead)}%; aim for ${pct(cfg.headBand[0])}-${pct(cfg.headBand[1])}%). ${FOAMED[m.liveLabel]}: stay tilted a little longer.`,
    headLow: (m, cfg) => `The head came out too small (${pct(m.finalHead)}%; aim for ${pct(cfg.headBand[0])}-${pct(cfg.headBand[1])}%). ${FOAMED[m.liveLabel]}: come up a little sooner.`,
    pass: m => m.straightenBegan === null ? 'Clean pour.'
      : `Clean pour. ${FOAMED[m.liveLabel]}, and you brought it up at about ${pct(m.straightenBegan)}% full to match.`
  };
  function feedback(result, cfg = HEFE) {
    const m = result.metrics;
    return { primary: COPY[result.primary](m, cfg), secondary: result.secondary ? COPY[result.secondary](m, cfg) : null };
  }

  // ---- Guided hints (advisory; the caller keeps the at-most-once set) -------
  // The foam hints react to this pour's foam: on a lively pour, when the
  // player is still tilted at the habitual Pilsner point (about half full),
  // a reminder to wait; on a calm one, a nudge once its band is reached.
  const HINTS = {
    tiltFirst: 'Tilt the glass before you open the tap.',
    foamFast: 'Foam is building fast on this one: stay tilted a little longer.',
    foamSlow: 'Foam is building slowly on this one: start bringing it up a little sooner than usual.',
    straighten: "The beer's past the BRING UP band. Bring the glass up now.",
    spillWarn: 'Nearly at the lip. Bring it up.',
    nearLine: 'Close to the line.',
    stop: 'Stop pouring.'
  };
  const HABIT = 0.5, NEAR_LINE_LEAD = 0.04;
  function guidedHints(prev, s, fired, cfg = HEFE) {
    const due = [];
    const level = levelOf(s), zone = fillZone(cfg)[0];
    const tilted = s.angle > cfg.straightenThreshold;
    const [w0, w1] = straightenWindow(s.live);
    const want = (id, cond) => { if (cond && !fired.has(id)) due.push(id); };
    const stillTilted = s.flow > 0 && s.straightenBegan === null && s.angle >= cfg.tiltThreshold;
    want('tiltFirst', s.opened && !prev.opened && s.startAngle < cfg.tiltThreshold);
    want('foamFast', stillTilted && liveLabel(s.live) === 'lively' && level >= HABIT - 0.04);
    want('foamSlow', stillTilted && liveLabel(s.live) === 'calm' && level >= w0);
    want('straighten', stillTilted && level > w1);
    want('spillWarn', s.flow > 0 && tilted && total(s) >= s.capacity - 0.03);
    want('nearLine', s.flow > 0 && level >= zone - NEAR_LINE_LEAD);
    want('stop', s.flow > 0 && headOf(s) >= cfg.headBand[0] && level >= zone);
    return due;
  }

  // ---- Watch demo and scripted pours -----------------------------------------
  // Keyframes { t, pour?, target?, ramp?, caption?, serve? }, as js/sim.js.
  const tickOf = t => Math.round(t * HZ);
  function inputAt(timeline, tick) {
    const out = { pour: false, target: 0, caption: null, stepIndex: -1, serve: false };
    let from = 0;
    for (const k of timeline) {
      const k0 = tickOf(k.t);
      if (k0 > tick) break;
      if ('pour' in k) out.pour = k.pour;
      if ('target' in k) {
        if (k.ramp) { const f = Math.min(1, (tick - k0) / (k.ramp * HZ)); out.target = from + (k.target - from) * f; }
        else out.target = k.target;
        from = k.target;
      }
      if (k.caption) { out.caption = k.caption; out.stepIndex = k.stepIndex; }
      if (k.serve) out.serve = true;
    }
    return out;
  }

  // A player who opens tilted, starts bringing the glass up when the level
  // reaches `at` (or, at the latest, when beer starts over the lip), takes
  // `rampS` to come upright, and lets go at the line. This is the
  // calibration and test model (and how the Watch demo pours).
  function policyPour(live, at, { tilt = 45, rampS = 2.2, stopAt = null, cfg = HEFE, ctl = CONTROL } = {}) {
    let s = initState({ live });
    const release = stopAt === null ? fillZone(cfg)[0] + 0.004 : stopAt;
    let t0 = null, closed = false, settleTicks = 0;
    for (let tick = 0; tick < 40 * HZ; tick++) {
      if (tick < 0.5 * HZ) { s = step(s, { pour: false, target: tilt }, STEP, cfg, ctl); continue; }
      const level = levelOf(s);
      if (t0 === null && (level >= at || s.spill > 0)) t0 = tick;
      const target = t0 === null ? tilt : Math.max(0, tilt * (1 - (tick - t0) / (rampS * HZ)));
      if (!closed && level >= release) closed = true;
      s = step(s, { pour: !closed, target }, STEP, cfg, ctl);
      if (closed && s.flow === 0 && ++settleTicks > 6) break;
    }
    return s;
  }

  // The Watch demo: a lively pour, so the pourer is seen waiting past the
  // Pilsner's half-full point because of the foam, straightening in the
  // middle of this pour's window.
  const GHOST_LIVE = 1.18;
  function buildGhost(cfg = HEFE) {
    // Times come from running the policy, so the captions line up with the beer.
    const at = (straightenWindow(GHOST_LIVE)[0] + straightenWindow(GHOST_LIVE)[1]) / 2;
    let s = initState({ live: GHOST_LIVE }), tHalf = null, tUp = null, tClose = null;
    const release = fillZone(cfg)[0] + 0.004;
    for (let tick = 0; tick < 40 * HZ && tClose === null; tick++) {
      const t = tick / HZ;
      const pour = t >= 1.6;
      if (pour && tHalf === null && levelOf(s) >= 0.52) tHalf = t;
      if (pour && tUp === null && levelOf(s) >= at) tUp = t;
      if (pour && levelOf(s) >= release) tClose = t;
      const target = tUp === null ? (t >= 0.5 ? 45 : 0) : Math.max(0, 45 * (1 - (t - tUp) / 2.2));
      s = step(s, { pour: pour && tClose === null, target }, STEP, cfg);
    }
    const r = x => Math.round(x * 100) / 100;
    return [
      { t: 0, target: 0, caption: 'Same routine as the Pilsner: tilt the glass to about 45°.', stepIndex: 0 },
      { t: 0.5, target: 45 },
      { t: 1.6, pour: true, caption: 'Open the tap fully and watch the foam. This one is building it fast.', stepIndex: 1 },
      { t: r(tHalf), caption: 'Past half full, but plenty of foam already: stay tilted a little longer.', stepIndex: 2 },
      { t: r(tUp), target: 0, ramp: 2.2, caption: 'Now bring the glass up. Read the foam each time: later when it builds fast, sooner when it builds slowly.', stepIndex: 3 },
      { t: r(tUp + 2.2), caption: 'Finish upright to build the big wheat-beer head.', stepIndex: 4 },
      { t: r(tClose), pour: false, caption: 'The head reached the LINE: let go, then serve.', stepIndex: 5 },
      { t: r(tClose + 1), serve: true }
    ];
  }
  const GHOST = buildGhost();
  const GHOST_STEPS = GHOST.filter(k => k.caption).map(k => k.caption);

  function runTimeline(timeline = GHOST, live = GHOST_LIVE, cfg = HEFE, ctl = CONTROL) {
    let s = initState({ live });
    for (let tick = 0; tick < 40 * HZ; tick++) {
      const inp = inputAt(timeline, tick);
      if (inp.serve) break;
      s = step(s, { pour: inp.pour, target: inp.target }, STEP, cfg, ctl);
    }
    const result = evaluate(s, cfg);
    return { state: s, result, text: feedback(result, cfg) };
  }

  root.HefeSim = {
    HZ, STEP, HEFE, CONTROL, PROFILE, POLY, WINDOW,
    liveliness, liveLabel, capacity, surfaceAt, heightOf, volumeOf, spillLimit, levelOf, headOf, total,
    straightenWindow, straightenVerdict, stopVerdict, VERDICT_TEXT, fillZone,
    initState, step, canServe, evaluate, feedback, COPY,
    HINTS, guidedHints, tickOf, inputAt, policyPour, GHOST, GHOST_STEPS, GHOST_LIVE, runTimeline
  };
})(globalThis);
