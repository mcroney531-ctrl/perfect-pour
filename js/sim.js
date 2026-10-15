// Perfect Pour simulation. Pure: no DOM, no clock, no randomness, so a ghost
// replay or a headless test gets bit-for-bit the same pour every time.
// test/load-sim.js runs this exact file under Node, which is why it publishes
// onto globalThis instead of touching anything else.
(function (root) {
  'use strict';

  const HZ = 60;
  const STEP = 1 / HZ;

  // ---- Three kinds of number live here, and they are kept apart on purpose:
  //   PHYSICAL  - geometry of the glass. Follows from the shape, not opinion.
  //   SOURCED   - service guidance found in beer-service sources (see
  //               docs/pour-procedure.md). Still marked unverified until
  //               someone reads the sources directly.
  //   GAME      - tolerances and rates picked for feel. Placeholders.
  const PILSNER = {
    verified: false,
    // GAME: flow and foam model, tuned so the ghost lands mid-band.
    flowRate: 0.12,          // glass volumes per second at full flow
    k: 0.4,                  // foam conversion at full turbulence
    d: 0.08, r: 0.3,         // head settle rate (only while pouring), share returned to liquid
    turbAngle: 45,           // deg at which turbulence bottoms out
    // SOURCED (approx.): "about 45°", "a head of about an inch", "straighten
    // at half to two-thirds full". GAME: the exact bands around them.
    // fillLine is the drawn LINE; the passing zone is centred on it
    // (fillZone below). v2.2 put the line at the zone's top edge, so
    // releasing at the line -- plus the tap's closing ramp -- failed.
    fillLine: 0.95, fillTol: 0.04,          // level, as a share of glass height; zone width
    headBand: [0.08, 0.16],                 // head height, share of glass height (~1 inch on a pint-size pilsner)
    wasteTol: 0.02,
    tiltThreshold: 35,                      // deg; at or above counts as "tilted"
    straightenThreshold: 15,                // deg; at or below counts as "upright"
    straightenWindow: [0.5, 0.67],          // level at which straightening should begin
    // GAME: procedure rule. "Finish upright" means the tap closed upright
    // after at least this much upright pouring, so a flick at the end does
    // not count.
    minUprightPour: 0.5,                    // s
    // GAME: coaching zone shape (never scored on its own).
    zoneTiltMin: 30,                        // deg, lower edge before straightening is due
    zoneUprightBy: 0.72,                    // level by which the lower edge reaches upright
    zoneSpillMargin: 0.02                   // volume kept between the beer and the lip
  };

  // PHYSICAL: the glass, as a trapezoid section of height 1 (bottom and top
  // half-widths). Volume is the 2D section's area -- a deliberate
  // simplification, used identically by the sim and the renderer so what you
  // see is what is scored.
  const GLASS = { hw0: 0.107, hw1: 0.177 };

  // GAME: feel of the controls.
  const CONTROL = {
    padTravel: 70,    // px of thumb slide for 45° (v2.2: 110, about the whole pad)
    padDead: 8,       // px the thumb can drift before the glass moves
    flowRamp: 0.15,   // s for the tap to go fully open or closed
    assistRate: 18,   // deg/s; staged straightening, fixed and not fill-aware (~2.5 s from 45°)
    dragTau: 0.05,    // s; continuous pad, glass easing toward the thumb
    sliderTau: 0.033, // s; v1 slider fallback
    toggleRate: 150,  // deg/s; v1 switch fallback
    tiltAngle: 45,    // what "Tilt" means
    maxAngle: 60
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // The passing level range, centred on the drawn line.
  const fillZone = (cfg = PILSNER) => [cfg.fillLine - cfg.fillTol / 2, cfg.fillLine + cfg.fillTol / 2];

  // Continuous pad: glass target from where the thumb landed (angle0) and how
  // far it has slid up since (dyUp, px; negative = down). Pure so it can be
  // tested without a browser. Holding the thumb still holds the angle.
  function padTarget(angle0, dyUp, ctl = CONTROL) {
    if (Math.abs(dyUp) <= ctl.padDead) return angle0;
    const eff = dyUp - Math.sign(dyUp) * ctl.padDead;
    return clamp(angle0 - eff * 45 / ctl.padTravel, 0, ctl.maxAngle);
  }

  // Information only, never scored: did the glass come up gradually or all
  // at once? Measured from the start of straightening to reaching upright.
  const GRADUAL_MIN = 0.5;   // s; GAME, provisional (playtest: 0.75 s read as deliberate, 0.07 s as a flick)
  const bringUpStyle = sec => sec === null ? null : sec >= GRADUAL_MIN ? 'gradual' : 'allAtOnce';
  const rad = d => d * Math.PI / 180;

  // ---- Geometry (PHYSICAL) ------------------------------------------------
  // Frame: y up, origin at the inside bottom centre; tilting rotates the top
  // toward +x. The renderer uses the same functions, so the drawn level and
  // the scored level cannot disagree.
  const AREA = GLASS.hw0 + GLASS.hw1;
  const POLY = [[-GLASS.hw1, 1], [-GLASS.hw0, 0], [GLASS.hw0, 0], [GLASS.hw1, 1]];
  const rot = (p, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c];
  };

  // Area of the rotated glass section below the horizontal line y = h.
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

  // Share of the glass that holds liquid at this tilt before it reaches the
  // lower lip. 1 upright; less as the glass tips.
  function capacity(angleDeg) {
    const a = rad(angleDeg);
    const pts = POLY.map(p => rot(p, a));
    const lip = Math.min(pts[0][1], pts[3][1]);
    return areaBelow(pts, lip) / AREA;
  }

  // Height of the horizontal surface (in the frame above) that encloses this
  // share of the glass at this tilt. The renderer draws with it.
  function surfaceAt(volume, angleDeg) {
    const a = rad(angleDeg);
    const pts = POLY.map(p => rot(p, a));
    let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
    const want = clamp(volume, 0, 1) * AREA;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (areaBelow(pts, mid) < want) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Upright: the height a given share of the glass fills to, and back.
  function heightOf(volume) {
    const { hw0, hw1 } = GLASS, v = clamp(volume, 0, 1) * AREA, k = hw1 - hw0;
    return k === 0 ? v / (2 * hw0) : (-2 * hw0 + Math.sqrt(4 * hw0 * hw0 + 4 * k * v)) / (2 * k);
  }
  function volumeOf(height) {
    const { hw0, hw1 } = GLASS, h = clamp(height, 0, 1);
    return (2 * hw0 * h + (hw1 - hw0) * h * h) / AREA;
  }

  // The steepest tilt that still holds this much beer (plus a margin).
  function spillLimit(volume, margin = 0, maxAngle = CONTROL.maxAngle) {
    if (capacity(maxAngle) >= volume + margin) return maxAngle;
    if (capacity(0) < volume + margin) return 0;
    let lo = 0, hi = maxAngle;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (capacity(mid) >= volume + margin) lo = mid; else hi = mid;
    }
    return lo;
  }

  const total = s => s.fill + s.foam;
  const levelOf = s => heightOf(total(s));
  const headOf = s => heightOf(total(s)) - heightOf(s.fill);

  // ---- Coaching zone ----------------------------------------------------------
  // v2 drew this as a moving band; v2.1 does not show it at all (playtest: a
  // drifting target confused more than it helped). It survives only as the
  // logged zoneShare metric, for comparing pours. Never scored. Upper edge is
  // PHYSICAL (tip further and it spills). Lower edge follows the SOURCED
  // advice (stay tilted until about half full, then come up gradually) with
  // GAME numbers. Where the two cross, physics wins.
  function zoneAt(s, cfg = PILSNER, ctl = CONTROL) {
    const level = levelOf(s);
    const hi = spillLimit(total(s), cfg.zoneSpillMargin, ctl.maxAngle);
    const [w0] = cfg.straightenWindow;
    let lo = level < w0 ? cfg.zoneTiltMin
      : cfg.zoneTiltMin * (1 - clamp((level - w0) / (cfg.zoneUprightBy - w0), 0, 1));
    lo = Math.min(lo, hi);
    return { lo, hi };
  }

  // ---- Action verdicts (v2.2) -------------------------------------------------
  // The glass is the meter and the beer is the indicator: each of the
  // player's two timing actions is judged against a window on the glass, at
  // the moment it happens. Verdicts describe that one action only, never the
  // whole pour (the debrief does that), and their bands are chosen so a
  // verdict cannot contradict the final result:
  //   'inRange'     - inside the SOURCED half-to-two-thirds window
  //   'littleEarly' / 'littleLate' - just outside it; the pour can still pass
  //   'early' / 'late' - far enough out that the head will miss
  // (test/sim.test.js sweeps straightening points to hold that promise.)
  const EARLY_GRACE = 0.13, LATE_GRACE = 0.04;   // measured: straightening from ~38% to ~69% full can pass
  function straightenVerdict(level, cfg = PILSNER) {
    const [w0, w1] = cfg.straightenWindow;
    if (level < w0 - EARLY_GRACE) return 'early';
    if (level < w0) return 'littleEarly';
    if (level <= w1) return 'inRange';
    if (level <= w1 + LATE_GRACE) return 'littleLate';
    return 'late';
  }
  function stopVerdict(level, cfg = PILSNER) {
    const [z0, z1] = fillZone(cfg);
    if (level < z0 - 1e-9) return 'short';
    if (level > z1 + 1e-9) return 'over';
    return 'inZone';
  }
  const VERDICT_TEXT = {
    straighten: {
      inRange: 'Started straightening in range.',
      littleEarly: 'Started straightening a little early.',
      early: 'Started straightening early.',
      littleLate: 'Started straightening a little late.',
      late: 'Started straightening late.'
    },
    stop: {
      inZone: 'Stopped in the fill zone.',
      short: 'Stopped short of the line.',
      over: 'Stopped above the line.'
    }
  };

  function initState() {
    return {
      tick: 0, elapsed: 0,
      angle: 0, target: 0, assist: false,
      flow: 0, fill: 0, foam: 0, waste: 0, tiltWaste: 0,
      turb: 1, spill: 0, capacity: 1,
      opened: false, pouring: false, pourTime: 0, uprightPour: 0,
      startAngle: null,
      straightenBegan: null,    // level when the glass first came below "tilted" while pouring
      straightenFill: null,     // level when it first reached "upright" while pouring
      closeAngle: null,         // angle when the tap last closed
      straightenTick: null, uprightTick: null,   // for bring-up speed (information only)
      zoneTicks: 0, flowTicks: 0,
      // Player actions as they happened: { type: 'straighten' | 'stop', tick,
      // level, verdict }. Appended, never edited, so the app and the tests can
      // read exactly when each decision was made.
      events: []
    };
  }

  // input: { pour, target, variant, straighten }
  //   variant 'staged'     - straighten (edge) starts a fixed-rate move to upright
  //   variant 'continuous' - the glass eases toward target (the thumb)
  //   variant 'slider' / 'toggle' - v1 controls, kept as fallbacks
  function step(s, input, dt = STEP, cfg = PILSNER, ctl = CONTROL) {
    const n = Object.assign({}, s);

    if (input.pour && !n.opened) { n.opened = true; n.startAngle = s.angle; }
    if (!input.pour && s.pouring) n.closeAngle = s.angle;
    n.pouring = !!input.pour;

    const ramp = dt / ctl.flowRamp;
    n.flow = input.pour ? Math.min(1, n.flow + ramp) : Math.max(0, n.flow - ramp);

    // The glass. Staged: once straightening starts it runs at a fixed rate
    // to upright; when to start is the learner's call, and the rate does not
    // adapt to the fill, so starting early or late still shows.
    const target = clamp(input.target, 0, ctl.maxAngle);
    n.target = target;
    if (input.variant === 'staged') {
      if (input.straighten && !n.assist && n.opened) n.assist = true;
      if (n.assist) n.angle = Math.max(0, n.angle - ctl.assistRate * dt);
      else n.angle += (target - n.angle) * (1 - Math.exp(-dt / ctl.dragTau));
    } else if (input.variant === 'toggle') {
      const diff = target - n.angle, max = ctl.toggleRate * dt;
      n.angle = Math.abs(diff) <= max ? target : n.angle + Math.sign(diff) * max;
    } else {
      const tau = input.variant === 'slider' ? ctl.sliderTau : ctl.dragTau;
      n.angle += (target - n.angle) * (1 - Math.exp(-dt / tau));
    }
    if (Math.abs(n.angle - (n.assist ? 0 : target)) < 0.05) n.angle = n.assist ? 0 : target;

    const inflow = n.flow * cfg.flowRate * dt;
    const turb = clamp(0.15 + 0.85 * (1 - n.angle / cfg.turbAngle), 0.15, 1);
    const foamShare = turb * cfg.k;
    n.fill += inflow * (1 - foamShare);
    n.foam += inflow * foamShare;
    // The head settles while beer is going in and holds once the tap is shut,
    // so how long the player takes to press Serve cannot change the verdict.
    if (n.flow > 0) {
      const settle = n.foam * cfg.d * dt;
      n.foam -= settle;
      n.fill += settle * cfg.r;
    }

    // Spill: anything above what this tilt can hold runs over the lip, head
    // first. Tilted spills are tracked apart from overpouring an upright glass.
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
      n.flowTicks++;
      const z = zoneAt(n, cfg, ctl);
      if (n.angle >= z.lo - 2 && n.angle <= z.hi + 2) n.zoneTicks++;
      if (n.angle <= cfg.straightenThreshold) n.uprightPour += dt;
      // Straightening "began" once the glass has come up a few degrees from
      // where the pour opened -- the moment of the decision, not the moment
      // it crossed a threshold half a second later.
      if (n.straightenBegan === null && n.startAngle !== null && n.startAngle >= cfg.tiltThreshold &&
          n.angle < Math.max(cfg.tiltThreshold, n.startAngle - 5)) {
        n.straightenBegan = levelOf(n);
        n.straightenTick = s.tick + 1;
        n.events = s.events.concat({ type: 'straighten', tick: s.tick + 1, level: n.straightenBegan,
          verdict: straightenVerdict(n.straightenBegan, cfg) });
      }
      if (n.straightenFill === null && n.angle <= cfg.straightenThreshold) {
        n.straightenFill = levelOf(n);
        n.uprightTick = s.tick + 1;
      }
    }

    // "Stop" is judged when the tap has fully shut, not when the finger
    // lifts: the 150 ms close still adds beer, and judging earlier could call
    // a pour "in the zone" that then finishes above the line. Every full close
    // is an event, so a stop-and-restart pour gets a verdict per stop.
    if (s.flow > 0 && n.flow === 0) {
      const level = levelOf(n);
      n.events = n.events.concat({ type: 'stop', tick: s.tick + 1, level, verdict: stopVerdict(level, cfg) });
    }

    n.turb = turb;
    n.tick = s.tick + 1;
    n.elapsed = n.tick * dt;
    return n;
  }

  const canServe = s => s.opened && s.flow === 0;

  // ---- Evaluation: procedure + outcome -------------------------------------
  // Procedure is the two steps a learner can plainly get wrong: tilt before
  // opening, finish upright. Straightening *timing* is not a pass/fail rule;
  // it shows up through the head it produces, and the feedback names it.
  function evaluate(s, cfg = PILSNER) {
    const level = levelOf(s), head = headOf(s);
    const [b0, b1] = cfg.headBand;
    const [w0, w1] = cfg.straightenWindow;
    const EPS = 1e-9;
    const procedure = {
      tilted: s.startAngle !== null && s.startAngle >= cfg.tiltThreshold,
      upright: s.closeAngle !== null && s.closeAngle <= cfg.straightenThreshold &&
        s.uprightPour >= cfg.minUprightPour - EPS
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
        startAngle: s.startAngle, straightenBegan: began, straightenFill: s.straightenFill,
        closeAngle: s.closeAngle, uprightPour: s.uprightPour,
        finalLevel: level, finalHead: head,
        finalFill: s.fill, finalFoam: s.foam, waste: s.waste, tiltWaste: s.tiltWaste,
        pourDuration: s.pourTime,
        zoneShare: s.flowTicks ? s.zoneTicks / s.flowTicks : null,
        bringUpSeconds: s.straightenTick !== null && s.uprightTick !== null && s.uprightTick >= s.straightenTick
          ? (s.uprightTick - s.straightenTick) / HZ : null
      }
    };
  }

  // ---- Feedback copy ------------------------------------------------------
  // Sentences that state beer behaviour as fact are marked CLAIM. They match
  // the sim and the sources in docs/pour-procedure.md, which still need
  // reading first-hand before anything ships.
  const pct = v => Math.round(v * 100);
  const COPY = {
    upright: (m, cfg) => (m.startAngle <= cfg.straightenThreshold
        ? `You opened the tap with the glass upright (${Math.round(m.startAngle)}°).`
        : `You opened the tap before the glass was tilted (${Math.round(m.startAngle)}°).`) +
      // CLAIM: an upright stream turns mostly to foam.
      ' The stream dropped straight onto the beer and turned mostly to foam. Tilt first.',
    notUpright: (m, cfg) => (m.closeAngle !== null && m.closeAngle > cfg.straightenThreshold
        ? `You finished with the glass still tilted (${Math.round(m.closeAngle)}°).`
        : 'You only came upright at the last moment.') +
      // CLAIM: the head is built by finishing upright, into the middle.
      ' Bring the glass upright and finish the pour into the middle to build the head.',
    // CLAIM: a tilted glass spills sooner.
    tiltSpill: m => `Beer ran over the lip while the glass was still tilted (${pct(m.waste)}% spilled). As it fills, bring it upright sooner.`,
    // CLAIM: on overflow, the head spills before the beer.
    overflow: m => `You kept pouring past the line and the glass overflowed (${pct(m.waste)}% spilled). The head spills first.`,
    // CLAIM: pouring upright builds foam.
    early: m => `You started straightening early, at about ${pct(m.straightenBegan)}% full. More of the pour landed upright, which builds foam, so the head came out too big (${pct(m.finalHead)}%).`,
    stayedTilted: m => (m.straightenBegan === null
        ? 'You stayed tilted almost to the end,'
        : `You started straightening late, at about ${pct(m.straightenBegan)}% full,`) +
      ` so there wasn't enough upright pouring to build a head (${pct(m.finalHead)}%). Start bringing it up around half to two-thirds full.`,
    short: (m, cfg) => `You stopped short of the line (${pct(m.finalLevel)}% full; aim for ${pct(fillZone(cfg)[0])}-${pct(fillZone(cfg)[1])}%, around the line).`,
    overLine: (m, cfg) => `You stopped above the line (${pct(m.finalLevel)}% full; aim for ${pct(fillZone(cfg)[0])}-${pct(fillZone(cfg)[1])}%, around the line). Let go a little sooner.`,
    headHigh: (m, cfg) => `The head came out too big (${pct(m.finalHead)}%; aim for ${pct(cfg.headBand[0])}-${pct(cfg.headBand[1])}%). Start straightening a little later, or stop a little sooner.`,
    headLow: (m, cfg) => `The head came out too small (${pct(m.finalHead)}%; aim for ${pct(cfg.headBand[0])}-${pct(cfg.headBand[1])}%). Start straightening a little sooner.`,
    pass: m => m.straightenBegan === null
      ? 'Clean pour.'
      : `Clean pour. You tilted first, started straightening at about ${pct(m.straightenBegan)}% full and finished upright.`
  };

  function feedback(result, cfg = PILSNER) {
    const m = result.metrics;
    return {
      primary: COPY[result.primary](m, cfg),
      secondary: result.secondary ? COPY[result.secondary](m, cfg) : null
    };
  }

  // ---- Guided hints ---------------------------------------------------------
  // Advisory only; the caller keeps the at-most-once set.
  const HINTS = {
    tiltFirst: 'Tilt the glass before you open the tap.',
    straighten: "The beer's past the BRING UP band. Bring the glass up now.",
    spillWarn: 'Nearly at the lip. Bring it up.',
    nearLine: 'Close to the line.',
    stop: 'Stop pouring.'
  };
  const NEAR_LINE_LEAD = 0.04;

  function guidedHints(prev, s, fired, cfg = PILSNER) {
    const due = [];
    const level = levelOf(s);
    const zone = fillZone(cfg)[0];
    const tilted = s.angle > cfg.straightenThreshold;
    const want = (id, cond) => { if (cond && !fired.has(id)) due.push(id); };
    want('tiltFirst', s.opened && !prev.opened && s.startAngle < cfg.tiltThreshold);
    // A backup, not the cue: it fires only once the beer has passed the
    // BRING UP window without the player acting. The window is the cue.
    want('straighten', s.flow > 0 && !s.assist && s.straightenBegan === null &&
      s.angle >= cfg.tiltThreshold && level > cfg.straightenWindow[1]);
    want('spillWarn', s.flow > 0 && tilted && total(s) >= s.capacity - 0.03);
    want('nearLine', s.flow > 0 && level >= zone - NEAR_LINE_LEAD);
    want('stop', s.flow > 0 && headOf(s) >= cfg.headBand[0] && level >= zone);
    return due;
  }

  // ---- Scripted timelines ---------------------------------------------------
  // Keyframes { t, pour?, target?, ramp?, straighten?, caption?, serve? }.
  // A target with ramp moves there linearly over that many seconds; the
  // straighten flag is what the staged control reacts to. Both are set on the
  // same keyframe, so one script drives either variant through the same pour.
  const tickOf = t => Math.round(t * HZ);

  function inputAt(timeline, tick) {
    const out = { pour: false, target: 0, straighten: false, caption: null, stepIndex: -1, serve: false };
    let from = 0;
    for (const k of timeline) {
      const k0 = tickOf(k.t);
      if (k0 > tick) break;
      if ('pour' in k) out.pour = k.pour;
      if ('target' in k) {
        if (k.ramp) {
          const f = Math.min(1, (tick - k0) / (k.ramp * HZ));
          out.target = from + (k.target - from) * f;
        } else out.target = k.target;
        from = k.target;
      }
      if (k.straighten) out.straighten = true;
      if (k.caption) { out.caption = k.caption; out.stepIndex = k.stepIndex; }
      if (k.serve) out.serve = true;
    }
    return out;
  }

  // The Watch demo. Rates follow CONTROL.assistRate so staged and continuous
  // trace the same motion. CLAIM: captions state technique from the sources
  // in docs/pour-procedure.md (45°, tap fully open, straighten at half to
  // two-thirds, finish upright), not yet verified first-hand.
  // Continuous is the default, so the demo is a thumb sliding up steadily,
  // with a short pause partway to show that a still thumb holds the angle
  // while the beer keeps flowing. (The staged fallback reacts to the
  // straighten flag on the same keyframe and runs its own fixed rate.)
  const GHOST_STRAIGHTEN = 5.4;
  const GHOST_CLOSE = 9.6;
  const GHOST_UP = [1.1, 0.5, 1.2];          // slide, hold, slide (s)
  const GHOST_UPRIGHT = GHOST_STRAIGHTEN + GHOST_UP[0] + GHOST_UP[1] + GHOST_UP[2];
  const GHOST = [
    { t: 0, target: 0, caption: 'Tilt the glass to about 45°. Watch the two bands on the glass.', stepIndex: 0 },
    { t: 0.5, target: 45 },
    { t: 1.6, pour: true, caption: 'Open the tap fully. Pour down the side.', stepIndex: 1 },
    { t: GHOST_STRAIGHTEN, target: 25, ramp: GHOST_UP[0], straighten: true,
      caption: 'At the BRING UP band, keep holding and slide your thumb up slowly.', stepIndex: 2 },
    { t: GHOST_STRAIGHTEN + GHOST_UP[0] + GHOST_UP[1], target: 0, ramp: GHOST_UP[2] },
    { t: GHOST_UPRIGHT, caption: 'Finish upright to build the head.', stepIndex: 3 },
    { t: GHOST_CLOSE, pour: false, caption: 'The beer reached the LINE: let go, then serve.', stepIndex: 4 },
    { t: GHOST_CLOSE + 1, serve: true }
  ];
  const GHOST_STEPS = GHOST.filter(k => k.caption).map(k => k.caption);

  function runTimeline(timeline, variant = 'continuous', cfg = PILSNER, ctl = CONTROL) {
    let s = initState();
    for (let tick = 0; tick < 30 * HZ; tick++) {
      const inp = inputAt(timeline, tick);
      if (inp.serve) break;
      s = step(s, { pour: inp.pour, target: inp.target, straighten: inp.straighten, variant }, STEP, cfg, ctl);
    }
    const result = evaluate(s, cfg);
    return { state: s, result, text: feedback(result, cfg) };
  }

  root.PourSim = {
    HZ, STEP, PILSNER, CONTROL, GLASS,
    capacity, surfaceAt, heightOf, volumeOf, spillLimit, zoneAt, levelOf, headOf,
    straightenVerdict, stopVerdict, VERDICT_TEXT, fillZone, padTarget, bringUpStyle, GRADUAL_MIN,
    initState, step, total, canServe, evaluate, feedback, COPY,
    HINTS, guidedHints, tickOf, inputAt, runTimeline, GHOST, GHOST_STEPS, GHOST_STRAIGHTEN, GHOST_CLOSE, GHOST_UP
  };
})(globalThis);
