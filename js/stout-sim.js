// Nitro Stout simulation. Pure: no DOM, no clock, no randomness, so a replay
// or a headless test gets bit-for-bit the same pour every time. Its own
// module, sharing no code with the Pilsner sim (protected) or the Hefeweizen
// sim: share the framework, never the physics
// (docs/architecture-multi-station.md). Publishes StoutSim on globalThis.
//
// The skill (docs/procedures/nitro-stout.md): a two-stage pour. Stage one,
// tilted then upright, closed at about two-thirds to three-quarters; set
// down; WAIT until the beer has visibly settled; top up upright with the
// faucet fully open, to a slight dome. Unlike Pilsner and Hefeweizen, the
// beer keeps changing while the tap is shut: that settling is what the
// learner has to read. Nothing here stops an early top-up: it is allowed,
// recorded, and it has consequences (docs/nitro-behaviour.md).
(function (root) {
  'use strict';

  const HZ = 60;
  const STEP = 1 / HZ;

  // ---- Three kinds of number, kept apart as in the other sims:
  //   PHYSICAL  - geometry of the glass, conservation of volume.
  //   SOURCED   - service guidance (docs/source-claim-audit.md).
  //   GAME      - rates and tolerances picked for feel and teaching.
  const STOUT = {
    verified: false,
    // GAME: the beer, as three parts (shares of the glass's volume):
    //   liquid - settled dark beer;  surge - beer still full of fine gas
    //   bubbles (the cloudy, cascading part);  head - creamy foam.
    // Beer from the stout faucet arrives as surge; a little goes straight to
    // head, more when it lands upright than down the side.
    flowRate: 0.10,           // glass volumes per second at full flow (fully open: BA)
    headTilt: 0.02, headUp: 0.06,
    turbAngle: 45,
    // GAME: settling. Surge turns into liquid and head with time constant
    // settleTau, the tap open or shut, a share settleHead of it becoming
    // head. Compressed for training: real settles take about a minute or
    // two (sources vary); this one about 10 s. Readiness is read from the
    // beer, never a timer.
    settleTau: 5,             // s: settled about 10 s after set-down (docs/nitro-behaviour.md)
    settleHead: 0.085,
    // GAME: topping up into beer that is still surging stirs that left-over
    // surge up into loose foam (CLAIM, unverified as a measured effect):
    // while the tap runs, the surge still there from stage one turns to head
    // at agitateRate, agitateHead of it head. (The top-up's own fresh surge
    // is not stirred: a settled glass tops up clean.)
    agitateRate: 1.5,         // per second, times the flow
    agitateHead: 0.7,
    // GAME: "settled" - the cloudy surge is under this share of the beer in
    // the glass (the surge band has all but gone): the readiness criterion,
    // shown by the beer. Topping up passes up to waitTol, a little before the
    // line is perfectly clean, so a learner is not failed at the visual edge.
    settledShare: 0.06,
    waitTol: 0.09,
    // GAME: a pause of at least this long counts as setting the glass down
    // (shorter is a stutter inside stage one).
    setDownMin: 0.6,          // s
    // PHYSICAL (simplified): foam can stand a little proud of the rim (the
    // dome); liquid cannot.
    domeMax: 0.06,            // share of glass height (room for the finish band's top, 105%)
    // SOURCED (BA p. 32, Guinness, via GPT review): stage one to about
    // two-thirds to three-quarters. GAME: the band around it.
    // The preferred level is the sourced two-thirds to three-quarters; the
    // passing band around it is deliberately more forgiving (GAME), and a
    // pass outside the preferred range says so.
    stage1Preferred: [0.66, 0.75],
    stage1Band: [0.6, 0.82],  // level (all parts) as a share of glass height
    // GAME: the finish. Level counts the head, so above 1 is a dome. The top
    // was 103%; widened to 105% after the owner's playtest so letting go has
    // about 0.67 s of leeway at full flow instead of 0.45 s.
    finishBand: [0.99, 1.05],
    headBand: [0.08, 0.15],   // settled head height, share of glass height
    wasteTol: 0.02,
    tiltThreshold: 35, straightenThreshold: 15
  };

  // PHYSICAL: a nonic pint as a section of height 1: half-width at each
  // height, bottom to rim (taper, the bulge near the top, the rim).
  const PROFILE = [[0, 0.112], [0.3, 0.126], [0.6, 0.14], [0.78, 0.15], [0.86, 0.163], [0.92, 0.155], [1, 0.157]];

  // GAME: control feel, the same values as the other stations.
  const CONTROL = { padTravel: 70, padDead: 8, flowRamp: 0.15, dragTau: 0.05, tiltAngle: 45, maxAngle: 60 };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rad = d => d * Math.PI / 180;
  function padTarget(angle0, dyUp, ctl = CONTROL) {
    if (Math.abs(dyUp) <= ctl.padDead) return angle0;
    const eff = dyUp - Math.sign(dyUp) * ctl.padDead;
    return clamp(angle0 - eff * 45 / ctl.padTravel, 0, ctl.maxAngle);
  }

  // ---- Geometry (PHYSICAL) -------------------------------------------------
  // Frame and method as js/hefe-sim.js (curved outline, numeric volumes).
  const POLY = [...PROFILE.slice().reverse().map(([y, w]) => [-w, y]), ...PROFILE.map(([y, w]) => [w, y])];
  const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c]; };
  function areaBelow(pts, h) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const pin = p[1] <= h, qin = q[1] <= h;
      if (pin) out.push(p);
      if (pin !== qin) { const t = (h - p[1]) / (q[1] - p[1]); out.push([p[0] + t * (q[0] - p[0]), h]); }
    }
    let a = 0;
    for (let i = 0; i < out.length; i++) { const p = out[i], q = out[(i + 1) % out.length]; a += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(a) / 2;
  }
  const AREA = areaBelow(POLY, 2);
  const RIM = PROFILE[PROFILE.length - 1][1];
  const capCache = new Map();
  function capacity(angleDeg) {           // share held before the lower lip, at this tilt
    const key = Math.round(angleDeg * 100);
    if (capCache.has(key)) return capCache.get(key);
    const pts = POLY.map(p => rot(p, rad(key / 100)));
    const v = areaBelow(pts, Math.min(pts[0][1], pts[pts.length - 1][1])) / AREA;
    capCache.set(key, v);
    return v;
  }
  function surfaceAt(volume, angleDeg) {
    const pts = POLY.map(p => rot(p, rad(angleDeg)));
    let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
    const want = clamp(volume, 0, 1) * AREA;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (areaBelow(pts, m) < want) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // Upright: volume below a height and back, by table. Above the rim (a
  // dome of foam) the section continues straight up at the rim's width.
  const volumeOf = h => h <= 1 ? areaBelow(POLY, clamp(h, 0, 1)) / AREA : 1 + (h - 1) * 2 * RIM / AREA;
  const VN = 2000, VT = Array.from({ length: VN + 1 }, (_, i) => volumeOf(i / VN));
  function heightOf(volume) {
    const v = Math.max(0, volume);
    if (v >= 1) return 1 + (v - 1) * AREA / (2 * RIM);
    let lo = 0, hi = VN;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (VT[m] < v) lo = m; else hi = m; }
    const span = VT[hi] - VT[lo];
    return (lo + (span > 0 ? (v - VT[lo]) / span : 0)) / VN;
  }

  const total = s => s.liquid + s.surge + s.head;
  const levelOf = s => heightOf(total(s));
  // Upright heights of the three layers, bottom up: dark liquid, cloudy surge, head.
  function bands(s) {
    const l = heightOf(s.liquid), u = heightOf(s.liquid + s.surge), t = heightOf(total(s));
    return { liquidTop: l, surgeTop: u, headTop: t, head: t - u, surge: u - l };
  }
  const surgeShare = s => (total(s) > 1e-9 ? s.surge / total(s) : 0);
  const isSettled = (s, cfg = STOUT) => s.closedOnce && surgeShare(s) <= cfg.settledShare;

  // What the glass looks like once the surge has all settled, without
  // stepping time: how evaluate() sees the pour, so the time taken to press
  // Serve cannot change the verdict.
  function settledOf(s, cfg = STOUT) {
    return Object.assign({}, s, { surge: 0, head: s.head + s.surge * cfg.settleHead, liquid: s.liquid + s.surge * (1 - cfg.settleHead) });
  }

  // ---- Verdicts on the learner's two decisions ---------------------------
  function stage1Verdict(level, cfg = STOUT) {
    const [a, b] = cfg.stage1Band;
    return level < a ? 'low' : level > b ? 'high' : 'inBand';
  }
  // Topping up: how much surge was still in the beer.
  // Lined up with the check: 'settled' and 'littleEarly' pass it (the
  // latter with a note), 'early' fails it.
  function topUpVerdict(share, cfg = STOUT) {
    return share <= cfg.settledShare ? 'settled' : share <= cfg.waitTol ? 'littleEarly' : 'early';
  }
  const VERDICT_TEXT = {
    stage1: { inBand: 'Set it down at a good level.', low: 'Set it down low: less than two-thirds full.', high: 'Set it down high: more than three-quarters full.' },
    topUp: { settled: 'Topped up once it had settled.', littleEarly: 'Topped up a touch early: a little surge left, within tolerance.', early: 'Topped up while it was still surging.' },
    stop: { finish: 'Stopped at the rim.', short: 'Stopped short of the rim.', over: 'Stopped with too big a dome.' }
  };

  // ---- State and step --------------------------------------------------------
  function initState() {
    return {
      tick: 0, elapsed: 0,
      angle: 0, target: 0, flow: 0,
      liquid: 0, surge: 0, head: 0, waste: 0, tiltWaste: 0,
      capacity: 1, spill: 0,
      opened: false, pouring: false,
      // Phases, read from what the player did (never imposed):
      //   'empty' -> 'stage1' -> 'settling' (set down) -> 'topUp' (tap open again) -> 'settling' ...
      phase: 'empty',
      closedOnce: false,        // stage one has been set down
      startAngle: null,         // angle when the tap first opened
      stage1Level: null, stage1CloseAngle: null, stage1SetDownTick: null,
      closeTick: null,          // when the tap last closed (for the set-down pause)
      closeAngle: null,         // the glass angle when it did
      topUpTick: null, topUpShare: null, topUpLevel: null,
      topUpMaxAngle: 0,         // steepest angle while topping up with the tap open
      oldSurge: 0,              // stage-one surge still in the glass when the top-up began
      settledTick: null,        // when the beer first counted as settled after set-down
      finalCloseAngle: null,
      events: []
    };
  }

  // input: { pour, target }
  function step(s, input, dt = STEP, cfg = STOUT, ctl = CONTROL) {
    const n = Object.assign({}, s);
    const tick = s.tick + 1;
    const open = !!input.pour;
    if (open && !n.opened) { n.opened = true; n.startAngle = s.angle; n.phase = 'stage1'; }

    // Closing and re-opening: the first close that lasts setDownMin is the
    // set-down; any opening after that is a top-up.
    if (!open && s.pouring) { n.closeTick = tick; n.closeAngle = s.angle; }
    if (open && !s.pouring && n.opened && s.closeTick !== null && n.phase !== 'stage1' && n.closedOnce) {
      n.phase = 'topUp';
      if (n.topUpTick === null) {
        n.topUpTick = tick; n.topUpShare = surgeShare(s); n.topUpLevel = levelOf(s); n.oldSurge = s.surge;
        n.events = s.events.concat({ type: 'topUp', tick, level: n.topUpLevel, share: n.topUpShare, verdict: topUpVerdict(n.topUpShare, cfg) });
      }
    }
    n.pouring = open;
    const ramp = dt / ctl.flowRamp;
    n.flow = open ? Math.min(1, n.flow + ramp) : Math.max(0, n.flow - ramp);

    const target = clamp(input.target, 0, ctl.maxAngle);
    n.target = target;
    n.angle += (target - n.angle) * (1 - Math.exp(-dt / ctl.dragTau));
    if (Math.abs(n.angle - target) < 0.05) n.angle = target;

    // Beer in: mostly surge, a little straight to head.
    const inflow = n.flow * cfg.flowRate * dt;
    const up = clamp(1 - n.angle / cfg.turbAngle, 0, 1);
    const toHead = cfg.headTilt + (cfg.headUp - cfg.headTilt) * up;
    n.head += inflow * toHead;
    n.surge += inflow * (1 - toHead);

    // Settling: always, tap open or shut.
    const keep = Math.exp(-dt / cfg.settleTau);
    const settled = n.surge * (1 - keep);
    n.surge -= settled;
    n.head += settled * cfg.settleHead;
    n.liquid += settled * (1 - cfg.settleHead);
    n.oldSurge *= keep;
    // Topping up into stage-one surge stirs it into loose foam.
    if (n.phase === 'topUp' && n.flow > 0 && n.oldSurge > 0) {
      const stirred = Math.min(n.oldSurge, n.surge, n.oldSurge * cfg.agitateRate * n.flow * dt);
      n.surge -= stirred; n.oldSurge -= stirred;
      n.head += stirred * cfg.agitateHead;
      n.liquid += stirred * (1 - cfg.agitateHead);
    }

    // Spill: above what this tilt holds (upright, foam may dome above the
    // rim), head first.
    n.capacity = n.angle > 0.5 ? capacity(n.angle) : 1 + volumeOf(1 + cfg.domeMax) - 1;
    const liquidCap = n.angle > 0.5 ? n.capacity : 1;
    n.spill = 0;
    let excess = total(n) - n.capacity;
    if (excess > 0) {
      const fromHead = Math.min(n.head, excess);
      n.head -= fromHead; excess -= fromHead;
      const fromSurge = Math.min(n.surge, excess);
      n.surge -= fromSurge; excess -= fromSurge;
      n.liquid -= excess;
      const spilt = fromHead + fromSurge + excess;
      n.waste += spilt; n.spill = spilt;
      // Any noticeable tilt counts: a slightly tilted top-up spills over the
      // lower lip, and the advice is "upright", not "stop sooner".
      if (n.angle > 3) n.tiltWaste += spilt;
    }
    if (n.liquid + n.surge > liquidCap) {            // beer itself can't dome
      const over = n.liquid + n.surge - liquidCap;
      n.liquid -= over; n.waste += over; n.spill += over;
    }

    if (n.phase === 'topUp' && n.flow > 0) n.topUpMaxAngle = Math.max(n.topUpMaxAngle, n.angle);

    // Set-down: the first close of stage one that lasts setDownMin.
    if (n.phase === 'stage1' && !open && n.flow === 0 && n.closeTick !== null && (tick - n.closeTick) / HZ >= cfg.setDownMin) {
      n.phase = 'settling'; n.closedOnce = true;
      n.stage1Level = levelOf(n); n.stage1CloseAngle = n.closeAngle; n.stage1SetDownTick = tick;
      n.events = n.events.concat({ type: 'setDown', tick, level: n.stage1Level, verdict: stage1Verdict(n.stage1Level, cfg) });
    }
    if (n.phase === 'topUp' && !open && n.flow === 0 && s.flow > 0) {
      n.phase = 'settling'; n.finalCloseAngle = s.angle;
      const lv = levelOf(settledOf(n, cfg));
      const v = lv < cfg.finishBand[0] ? 'short' : lv > cfg.finishBand[1] ? 'over' : 'finish';
      n.events = n.events.concat({ type: 'stop', tick, level: lv, verdict: v });
    }
    if (n.closedOnce && n.settledTick === null && surgeShare(n) <= cfg.settledShare) n.settledTick = tick;

    n.tick = tick;
    n.elapsed = tick * dt;
    return n;
  }

  const canServe = s => s.opened && s.flow === 0 && !s.pouring;

  // ---- Evaluation -------------------------------------------------------------
  // Judged on the glass as it will look once settled (settledOf), so the
  // moment Serve is pressed cannot change the verdict.
  function evaluate(s, cfg = STOUT) {
    const f = settledOf(s, cfg), b = bands(f);
    const level = b.headTop, head = b.head;
    const [h0, h1] = cfg.headBand, [f0, f1] = cfg.finishBand, [s0, s1] = cfg.stage1Band;
    const EPS = 1e-9;
    const toppedUp = s.topUpTick !== null;
    const procedure = {
      tilted: s.startAngle !== null && s.startAngle >= cfg.tiltThreshold,
      upright1: s.stage1CloseAngle !== null && s.stage1CloseAngle <= cfg.straightenThreshold,
      stage1: s.stage1Level !== null && s.stage1Level >= s0 - EPS && s.stage1Level <= s1 + EPS,
      waited: toppedUp && s.topUpShare <= cfg.waitTol + EPS,
      uprightTopUp: toppedUp && s.topUpMaxAngle <= cfg.straightenThreshold + EPS
    };
    const checks = {
      head: head >= h0 - EPS && head <= h1 + EPS,
      finish: level >= f0 - EPS && level <= f1 + EPS,
      waste: s.waste <= cfg.wasteTol + EPS
    };
    const techniqueOk = Object.values(procedure).every(Boolean);
    const pourOk = Object.values(checks).every(Boolean);
    const pass = techniqueOk && pourOk;
    const causes = [];
    if (!pass) {
      if (s.stage1Level === null) causes.push('noSetDown');
      else if (!toppedUp) causes.push('noTopUp');
      if (!procedure.tilted) causes.push('upright');
      if (toppedUp && !procedure.waited) causes.push('earlyTopUp');
      if (toppedUp && !procedure.uprightTopUp) causes.push('tiltedTopUp');
      if (!checks.waste) causes.push(s.tiltWaste >= s.waste / 2 ? 'tiltSpill' : 'overflow');
      if (s.stage1Level !== null && s.stage1Level < s0 - EPS) causes.push('stage1Low');
      if (s.stage1Level !== null && s.stage1Level > s1 + EPS) causes.push('stage1High');
      if (s.stage1Level !== null && !procedure.upright1) causes.push('notUpright1');
      if (toppedUp && level < f0 - EPS) causes.push('short');
      if (toppedUp && checks.waste && level > f1 + EPS) causes.push('overDome');
      if (head > h1 + EPS && !causes.includes('earlyTopUp')) causes.push('headHigh');
      if (head < h0 - EPS) causes.push('headLow');
    }
    // Notes: true, but not failing (a pass can carry them).
    const notes = [];
    if (toppedUp && procedure.waited && s.topUpShare > cfg.settledShare + EPS) notes.push('littleEarly');
    if (procedure.stage1 && (s.stage1Level < cfg.stage1Preferred[0] - EPS || s.stage1Level > cfg.stage1Preferred[1] + EPS)) notes.push('stage1Wide');
    return {
      pass, procedure, checks, techniqueOk, pourOk, causes, notes,
      primary: pass ? 'pass' : (causes[0] || 'headHigh'),
      secondary: pass ? null : (causes[1] || null),
      metrics: {
        startAngle: s.startAngle, stage1Level: s.stage1Level, stage1CloseAngle: s.stage1CloseAngle,
        topUpShare: s.topUpShare, topUpLevel: s.topUpLevel, topUpMaxAngle: toppedUp ? s.topUpMaxAngle : null,
        settleWaitS: s.stage1SetDownTick !== null && s.topUpTick !== null ? (s.topUpTick - s.stage1SetDownTick) / HZ : null,
        readyAfterS: s.stage1SetDownTick !== null && s.settledTick !== null ? (s.settledTick - s.stage1SetDownTick) / HZ : null,
        finalLevel: level, finalHead: head, waste: s.waste, tiltWaste: s.tiltWaste, elapsed: s.elapsed
      }
    };
  }

  // ---- Feedback copy ------------------------------------------------------------
  // CLAIM marks sentences stating beer behaviour as fact (to audit). The
  // settle is compressed for training; copy never states a real duration.
  const pct = v => Math.round(v * 100);
  const COPY = {
    noSetDown: () => 'You never set the glass down to settle. Pour to about three-quarters, close the tap and let it settle.',
    noTopUp: m => `You set it down at ${pct(m.stage1Level)}% but never topped it up. Once it has settled, open the tap again to finish.`,
    upright: m => `You opened the tap with the glass upright (${Math.round(m.startAngle)}°). Start at about 45° and bring it upright as it fills.`,
    // The loose head is this simulation's modelled consequence (GAME), said
    // as what happened here, not as measured beer physics.
    earlyTopUp: m => `You topped up while it was still surging (${pct(m.topUpShare)}% of the beer still cloudy). In this pour, that surge was stirred into a loose, oversized head (${pct(m.finalHead)}%). Wait until the head has separated cleanly from the dark beer.`,
    tiltedTopUp: m => `You topped up with the glass tilted (up to ${Math.round(m.topUpMaxAngle)}°). Top up with the glass upright.`,
    tiltSpill: m => `Beer ran over the lip while the glass was tilted (${pct(m.waste)}% spilled). Bring it upright as it fills, and keep it fully upright for the top-up.`,
    overflow: m => `It overflowed (${pct(m.waste)}% spilled). Let go as the head rises just proud of the rim.`,
    stage1Low: m => `You set it down at ${pct(m.stage1Level)}%: less than two-thirds full. Stage one goes to about three-quarters.`,
    stage1High: m => `You set it down at ${pct(m.stage1Level)}%: more than three-quarters full. Leave room for the top-up.`,
    notUpright1: m => `You set it down still tilted (${Math.round(m.stage1CloseAngle)}°). Bring the glass upright before you close the tap.`,
    short: m => `You stopped short of the rim (${pct(m.finalLevel)}%). Top up until the head stands just proud of the rim.`,
    overDome: m => `The dome came out too tall (${pct(m.finalLevel)}%). Let go a little sooner.`,
    headHigh: m => `The head came out too big (${pct(m.finalHead)}%).`,
    headLow: m => `The head came out too thin (${pct(m.finalHead)}%).`,
    // Says what this pour actually did: how long it settled, and whether it
    // finished domed or level with the rim.
    pass: (m, cfg) => `Clean two-stage pour. Set down at ${pct(m.stage1Level)}%, ` +
      (m.topUpShare <= cfg.settledShare ? 'waited for it to settle, ' : 'topped up just before it had fully settled, ') +
      (m.finalLevel > 1.0025 ? 'and finished with a slight dome.' : 'and finished level with the rim.')
  };
  const NOTE = {
    littleEarly: m => `A little surge was still there when you topped up (${pct(m.topUpShare)}%), within the tolerance. Waiting until the line is fully clean is better.`,
    stage1Wide: (m, cfg) => `Stage one went to ${pct(m.stage1Level)}%, which passes; the target is about two-thirds to three-quarters (${pct(cfg.stage1Preferred[0])}–${pct(cfg.stage1Preferred[1])}%).`
  };
  // A pass's notes are its secondary line; a fail's second cause is.
  function feedback(result, cfg = STOUT) {
    const m = result.metrics;
    const secondary = result.pass
      ? (result.notes.length ? result.notes.map(n => NOTE[n](m, cfg)).join(' ') : null)
      : result.secondary ? COPY[result.secondary](m, cfg) : null;
    return { primary: COPY[result.primary](m, cfg), secondary };
  }

  // ---- Guided hints (advisory; the caller keeps the at-most-once set) --------
  // They never stop an action: an early top-up is warned about, not blocked.
  const HINTS = {
    tiltFirst: 'Tilt the glass before you open the tap.',
    nearStage1: 'Nearly three-quarters: bring it upright and let go.',
    settling: 'Let it settle. Watch the cloudy surge sink and the head separate.',
    stillSurging: 'Still surging: wait until the head separates from the dark beer.',
    settled: 'Settled: the head has separated. Top up, glass upright.',
    tiltedTopUp: 'Keep the glass upright for the top-up.',
    nearRim: 'Nearly there: let go as the head rises just proud of the rim.'
  };
  function guidedHints(prev, s, fired, cfg = STOUT) {
    const due = [];
    const want = (id, cond) => { if (cond && !fired.has(id)) due.push(id); };
    const level = levelOf(s);
    want('tiltFirst', s.opened && !prev.opened && s.startAngle < cfg.tiltThreshold);
    want('nearStage1', s.phase === 'stage1' && s.flow > 0 && level >= cfg.stage1Band[0] + 0.03);
    want('settling', s.phase === 'settling' && s.topUpTick === null && prev.phase === 'stage1');
    want('stillSurging', s.phase === 'topUp' && prev.phase !== 'topUp' && s.topUpShare > cfg.settledShare);
    want('settled', s.closedOnce && s.topUpTick === null && isSettled(s, cfg));
    want('tiltedTopUp', s.phase === 'topUp' && s.flow > 0 && s.angle > cfg.straightenThreshold);
    want('nearRim', s.phase === 'topUp' && s.flow > 0 && levelOf(settledOf(s, cfg)) >= cfg.finishBand[0] - 0.03);
    return due;
  }

  // ---- Reference player (calibration, tests, the Watch demo) ------------------
  // Opens tilted, starts bringing the glass up at `upAt`, closes stage one
  // at `stage1` level, waits `wait` seconds after the set-down (or, with
  // wait = 'settled', until the beer has settled plus `extra`), then tops up
  // at `topAngle` and lets go when the settled level reaches `finish` (or
  // keeps pouring `overpour` seconds past it; a top-up never runs past
  // `topMax` seconds, as a person would stop).
  function policyPour({ stage1 = 0.72, upAt = 0.5, wait = 'settled', extra = 1, topAngle = 0, finish = 1.01, overpour = 0, topMax = 10,
    tilt = 45, rampS = 2, cfg = STOUT, ctl = CONTROL, dt = STEP } = {}) {
    let s = initState(), t0 = null, phase = 'pre', downAt = null, readyAt = null, settleTicks = 0, topAt = null, reached = null;
    for (let i = 0; i < 120 * HZ; i++) {
      const t = i * dt;
      let pour = false, target = tilt;
      if (phase === 'pre') { if (t >= 0.5) phase = 'stage1'; }
      if (phase === 'stage1') {
        pour = true;
        if (t0 === null && levelOf(s) >= upAt) t0 = t;
        target = t0 === null ? tilt : Math.max(0, tilt * (1 - (t - t0) / rampS));
        if (levelOf(s) >= stage1) { phase = 'down'; downAt = t; pour = false; }
      } else if (phase === 'down') {
        target = 0;
        if (wait === 'settled') { if (readyAt === null && isSettled(s, cfg)) readyAt = t; if (readyAt !== null && t >= readyAt + extra) phase = 'top'; }
        else if (s.closedOnce && t >= downAt + wait) phase = 'top';
      }
      if (phase === 'top') {
        if (topAt === null) topAt = t;
        target = topAngle; pour = true;
        if (reached === null && levelOf(settledOf(s, cfg)) >= finish) reached = t;
        if ((reached !== null && t >= reached + overpour) || t >= topAt + topMax) { phase = 'end'; pour = false; }
      }
      if (phase === 'end') { target = topAngle; if (s.flow === 0 && ++settleTicks > 6) break; }
      s = step(s, { pour, target }, dt, cfg, ctl);
    }
    return s;
  }

  // The Watch demo as keyframes { t, pour?, target?, ramp?, caption?, serve? }
  // (timed from the beer, by running the reference player).
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
  function buildGhost(cfg = STOUT) {
    const marks = {};
    let s = initState(), phase = 'pre', up = null;
    for (let i = 0; i < 120 * HZ && phase !== 'done'; i++) {
      const t = i / HZ;
      let pour = false, target = 45;
      if (phase === 'pre' && t >= 1.6) phase = 'stage1';
      if (phase === 'pre') target = t >= 0.5 ? 45 : 0;
      if (phase === 'stage1') {
        pour = true;
        if (up === null && levelOf(s) >= 0.5) { up = t; marks.up = t; }
        target = up === null ? 45 : Math.max(0, 45 * (1 - (t - up) / 2));
        if (levelOf(s) >= 0.72) { phase = 'down'; marks.close = t; pour = false; }
      } else if (phase === 'down') {
        target = 0;
        if (marks.settled === undefined && isSettled(s, cfg)) marks.settled = t;
        if (marks.settled !== undefined && t >= marks.settled + 1) { phase = 'top'; marks.top = t; }
      }
      if (phase === 'top') {
        target = 0; pour = true;
        if (levelOf(settledOf(s, cfg)) >= 1.01) { phase = 'done'; marks.end = t; pour = false; }
      }
      s = step(s, { pour, target }, STEP, cfg);
    }
    const r = x => Math.round(x * 100) / 100;
    const keys = [
      { t: 0, target: 0, caption: 'Stage one: tilt the glass to about 45°.' },
      { t: 0.5, target: 45 },
      { t: 1.6, pour: true, caption: 'Open the tap fully and pour down the side.' },
      { t: r(marks.up), target: 0, ramp: 2, caption: 'Bring the glass upright as it fills.' },
      { t: r(marks.close), pour: false, caption: 'At about three-quarters, let go and set it down. Let it settle (shortened for training).' },
      { t: r(marks.close + 2.5), caption: 'Watch the cloudy surge sink and the dark beer rise. The head is separating.' },
      { t: r(marks.settled), caption: 'Settled: a clean line between the dark beer and the head.' },
      { t: r(marks.top), pour: true, caption: 'Top up to the brim, glass upright, faucet fully open.' },
      { t: r(marks.end), pour: false, caption: 'Stop when the foam just crowns the rim, then serve.' },
      { t: r(marks.end + 1.5), serve: true }
    ];
    let k = 0;
    keys.forEach(x => { if (x.caption) x.stepIndex = k++; });
    return keys;
  }
  const GHOST = buildGhost();
  const GHOST_STEPS = GHOST.filter(k => k.caption).map(k => k.caption);

  // The optional Watch comparison: what topping up too early looks like.
  // Short: it starts from the main demo's own state just after stage one
  // was set down (no need to watch the first pour again), tops up into the
  // surge, and is served. Labelled as an example of what not to do.
  // -> { start: state, timeline } (timeline times are absolute, from start.tick).
  function buildEarlyGhost(cfg = STOUT) {
    let s = initState();
    const down = GHOST.find(k => k.caption && /set it down/.test(k.caption)).t;
    for (let tick = 0; tick < tickOf(down + 1.2); tick++) { const i = inputAt(GHOST, tick); s = step(s, { pour: i.pour, target: i.target }, STEP, cfg); }
    const t0 = s.tick / HZ, r = x => Math.round(x * 100) / 100;
    let q = s, end = null;
    for (let i = 0; i < 20 * HZ && end === null; i++) {
      const t = q.tick / HZ, pour = t >= t0 + 1.5;
      if (pour && levelOf(settledOf(q, cfg)) >= 1.01) end = t;
      q = step(q, { pour: pour && end === null, target: 0 }, STEP, cfg);
    }
    const keys = [
      { t: r(t0), target: 0, caption: 'Example of what not to do: topping up while the beer is still surging.' },
      { t: r(t0 + 1.5), pour: true, caption: 'The surge has not settled, but the tap opens again.' },
      { t: r(t0 + 3), caption: 'The cloudy surge gets stirred up into loose foam.' },
      { t: r(end), pour: false, caption: 'Too much loose head. The fix: wait until the head separates cleanly.' },
      { t: r(end + 1.5), serve: true }
    ];
    let k = 0;
    keys.forEach(x => { if (x.caption) x.stepIndex = k++; });
    return { start: s, timeline: keys };
  }
  const EARLY = buildEarlyGhost();
  const EARLY_STEPS = EARLY.timeline.filter(k => k.caption).map(k => k.caption);
  function runTimeline(timeline = GHOST, cfg = STOUT, ctl = CONTROL, start = null) {
    let s = start ? Object.assign({}, start) : initState();
    for (let tick = s.tick; tick < 120 * HZ; tick++) {
      const inp = inputAt(timeline, tick);
      if (inp.serve) break;
      s = step(s, { pour: inp.pour, target: inp.target }, STEP, cfg, ctl);
    }
    const result = evaluate(s, cfg);
    return { state: s, result, text: feedback(result, cfg) };
  }

  root.StoutSim = {
    HZ, STEP, STOUT, CONTROL, PROFILE, POLY,
    padTarget, capacity, surfaceAt, heightOf, volumeOf, levelOf, total, bands, surgeShare, isSettled, settledOf,
    stage1Verdict, topUpVerdict, VERDICT_TEXT, NOTE,
    initState, step, canServe, evaluate, feedback, COPY, HINTS, guidedHints,
    policyPour, tickOf, inputAt, GHOST, GHOST_STEPS, buildGhost, runTimeline, EARLY, EARLY_STEPS, buildEarlyGhost
  };
})(globalThis);
