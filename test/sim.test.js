'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./load-sim.js')();

const VARIANTS = ['staged', 'continuous'];
const fmt = r => {
  const s = r.state;
  return `level ${S.levelOf(s).toFixed(3)} head ${S.headOf(s).toFixed(3)} waste ${s.waste.toFixed(3)} ` +
    `began ${s.straightenBegan === null ? 'null' : s.straightenBegan.toFixed(2)} ` +
    `close ${s.closeAngle === null ? 'null' : s.closeAngle.toFixed(1)} -> ${r.result.primary}/${r.result.secondary}`;
};

// Policy runner: reacts to the glass rather than the clock, the way a player
// would. Straightens when the level reaches `at`, closes at level `stop`.
// In continuous mode the thumb brings the glass up at the same rate the
// staged assist uses, so the two variants are compared like for like.
// `extra` keeps the tap open that many seconds past `stop` (overpouring).
function pour({ variant = 'staged', angle = 45, at = Infinity, stop = 0.93, extra = 0, upright = 0, serveWait = 1 } = {}) {
  let s = S.initState(), straightenT = null, reachedT = null, closedAt = null;
  for (let i = 0; i < 40 * S.HZ; i++) {
    const t = i / S.HZ;
    if (straightenT === null && S.levelOf(s) >= at) straightenT = t;
    const straighten = straightenT !== null;
    if (reachedT === null && S.levelOf(s) >= stop) reachedT = t;
    const open = t >= 1 && closedAt === null && (reachedT === null || t < reachedT + extra);
    if (!open && t >= 1 && closedAt === null) closedAt = t;
    if (closedAt !== null && t >= closedAt + serveWait) break;
    let target = t < 0.5 ? upright : angle;
    if (straighten && variant !== 'staged') target = Math.max(0, angle - S.CONTROL.assistRate * (t - straightenT));
    s = S.step(s, { pour: open, target, straighten, variant });
  }
  const result = S.evaluate(s);
  return { state: s, result, text: S.feedback(result) };
}

// ---- Geometry ---------------------------------------------------------------

test('geometry: upright holds everything, tilting holds less, and height/volume invert', () => {
  assert.equal(S.capacity(0), 1);
  assert.ok(S.capacity(30) > S.capacity(45) && S.capacity(45) > S.capacity(60));
  for (const h of [0, 0.3, 0.5, 0.9, 1]) assert.ok(Math.abs(S.heightOf(S.volumeOf(h)) - h) < 1e-9);
  // The pilsner glass widens toward the top, so the top tenth holds more than a tenth.
  assert.ok(1 - S.volumeOf(0.9) > 0.1);
});

test('geometry: the drawn surface encloses exactly the sim volume at any tilt', () => {
  // surfaceAt is what the renderer draws with; check it against capacity at the lip.
  for (const a of [0, 20, 45]) {
    const v = S.capacity(a) * 0.999;
    const h = S.surfaceAt(v, a);
    assert.ok(Number.isFinite(h));
  }
  assert.ok(Math.abs(S.surfaceAt(0.5, 0) - S.heightOf(0.5)) < 1e-6);
});

// ---- The sim itself --------------------------------------------------------

test('step is pure: same input, same output, input state untouched', () => {
  const a = S.initState();
  const frozen = JSON.stringify(a);
  const b1 = S.step(a, { pour: true, target: 45, variant: 'staged' });
  const b2 = S.step(a, { pour: true, target: 45, variant: 'staged' });
  assert.equal(JSON.stringify(a), frozen);
  assert.deepEqual(b1, b2);
});

test('staged: straightening runs at a fixed rate, not one tuned to the fill', () => {
  let s = Object.assign(S.initState(), { angle: 45, target: 45, opened: true, startAngle: 45 });
  for (let i = 0; i < S.HZ; i++) s = S.step(s, { pour: false, target: 45, straighten: true, variant: 'staged' });
  assert.ok(Math.abs(s.angle - (45 - S.CONTROL.assistRate)) < 0.5, `after 1 s ${s.angle}`);
  // Same rate with a nearly full glass.
  let f = Object.assign(S.initState(), { angle: 45, target: 45, opened: true, startAngle: 45, fill: 0.7 });
  for (let i = 0; i < S.HZ; i++) f = S.step(f, { pour: false, target: 45, straighten: true, variant: 'staged' });
  assert.ok(Math.abs(f.angle - s.angle) < 0.01);
});

test('staged: the straighten input does nothing before the tap has opened', () => {
  let s = Object.assign(S.initState(), { angle: 45, target: 45 });
  s = S.step(s, { pour: false, target: 45, straighten: true, variant: 'staged' });
  assert.equal(s.assist, false);
});

test('a glass tilted past what it can hold spills, and it counts as a tilted spill', () => {
  let s = Object.assign(S.initState(), { angle: 45, target: 45, fill: 0.85, opened: true, startAngle: 45 });
  s = S.step(s, { pour: false, target: 45, variant: 'continuous' });
  assert.ok(s.waste > 0 && s.tiltWaste === s.waste);
  assert.ok(S.total(s) <= S.capacity(45) + 1e-9);
});

test('the head holds once the tap is closed, so Serve timing cannot change the verdict', () => {
  const a = pour({ at: 0.55, serveWait: 1 }), b = pour({ at: 0.55, serveWait: 12 });
  assert.equal(S.headOf(a.state).toFixed(6), S.headOf(b.state).toFixed(6));
  assert.equal(a.result.pass, b.result.pass);
});

// ---- The ghost (Watch) run ---------------------------------------------------

for (const v of VARIANTS) {
  test(`ghost passes technique and pour (${v})`, () => {
    const r = S.runTimeline(S.GHOST, v);
    assert.equal(r.result.pass, true, `ghost/${v}: ${fmt(r)}`);
    assert.deepEqual({ ...r.result.procedure }, { tilted: true, upright: true });
  });

  test(`ghost lands mid-band and starts straightening inside the sourced range (${v})`, () => {
    const r = S.runTimeline(S.GHOST, v);
    const [b0, b1] = S.PILSNER.headBand, [w0, w1] = S.PILSNER.straightenWindow;
    const head = S.headOf(r.state);
    assert.ok(Math.abs(head - (b0 + b1) / 2) <= (b1 - b0) / 8, `head ${head.toFixed(3)}`);
    const level = S.levelOf(r.state), zoneMid = S.PILSNER.fillLine - S.PILSNER.fillTol / 2;
    assert.ok(Math.abs(level - zoneMid) <= S.PILSNER.fillTol / 4, `level ${level.toFixed(3)}`);
    assert.ok(r.state.straightenBegan >= w0 && r.state.straightenBegan <= w1, `began ${r.state.straightenBegan}`);
  });
}

for (const v of VARIANTS) {
  test(`the ghost stays inside its own coaching zone (${v})`, () => {
    const r = S.runTimeline(S.GHOST, v);
    assert.ok(r.result.metrics.zoneShare >= 0.95, `zoneShare ${r.result.metrics.zoneShare}`);
  });
}

test('ghost demo is 10-12 s, captions every step, and both variants trace the same pour', () => {
  const end = S.GHOST[S.GHOST.length - 1].t;
  assert.ok(end >= 10 && end <= 12);
  assert.equal(S.GHOST_STEPS.length, 5);
  const a = S.runTimeline(S.GHOST, 'staged').state, b = S.runTimeline(S.GHOST, 'continuous').state;
  assert.ok(Math.abs(S.headOf(a) - S.headOf(b)) < 0.01);
});

// ---- Procedure scoring: the exploits found in v1 ------------------------------

for (const angle of [34, 38, 42, 45]) {
  test(`exploit closed: holding ${angle}° the whole pour and never straightening fails`, () => {
    const r = pour({ variant: 'continuous', angle, stop: 0.93 });
    assert.equal(r.result.pass, false, fmt(r));
    assert.equal(r.result.procedure.upright, false, fmt(r));
  });
}

test('exploit closed: flicking upright in the last instant does not count as finishing upright', () => {
  const r = S.runTimeline([{ t: 0, target: 45 }, { t: 1, pour: true }, { t: 7.0, target: 0 },
    { t: 7.25, pour: false }, { t: 8.5, serve: true }], 'continuous');
  assert.equal(r.result.procedure.upright, false, fmt(r));
  assert.equal(r.result.primary, 'notUpright', fmt(r));
});

test('a top-up (close, straighten, reopen upright) is allowed when the result is right', () => {
  const r = S.runTimeline([{ t: 0, target: 45 }, { t: 1, pour: true }, { t: 5.2, pour: false },
    { t: 5.4, target: 0 }, { t: 6.0, pour: true }, { t: 9.0, pour: false }, { t: 10, serve: true }], 'continuous');
  assert.deepEqual({ ...r.result.procedure }, { tilted: true, upright: true }, fmt(r));
});

// ---- Straightening window: forgiving, with consequences at the ends -----------

for (const v of VARIANTS) {
  test(`straightening anywhere from 45% to 60% full passes (${v})`, () => {
    for (const at of [0.45, 0.5, 0.55, 0.6]) {
      const r = pour({ variant: v, at });
      assert.equal(r.result.pass, true, `at ${at}: ${fmt(r)}`);
    }
  });
}

// ---- Known-bad pours and their feedback ----------------------------------------

const BAD = {
  upright: [{ upright: 0, angle: 0, at: 0 }, 'upright'],
  early: [{ at: 0.3 }, 'early'],
  late: [{ at: 0.7 }, 'stayedTilted'],
  never: [{ at: Infinity }, 'notUpright'],
  overpour: [{ at: 0.55, extra: 1.5 }, 'overflow'],
  short: [{ at: 0.5, stop: 0.86 }, 'short']
};
for (const [name, [opts, cause]] of Object.entries(BAD)) {
  for (const v of VARIANTS) {
    test(`bad pour "${name}" (${v}) fails with "${cause}"`, () => {
      const r = pour({ variant: v, ...opts });
      assert.equal(r.result.pass, false, fmt(r));
      assert.equal(r.result.primary, cause, fmt(r));
      assert.ok(r.text.primary.length > 20);
    });
  }
}

test('staying tilted too long spills over the lip and says so', () => {
  const r = pour({ variant: 'continuous', angle: 50, at: Infinity, stop: 0.93 });
  assert.ok(r.result.causes.includes('tiltSpill'), fmt(r));
});

test('feedback copy is templated with the player\'s own values', () => {
  const r = pour({ at: 0.3 });
  assert.match(r.text.primary, new RegExp(`about ${Math.round(r.state.straightenBegan * 100)}% full`));
  const u = pour({ upright: 0, angle: 0, at: 0 });
  assert.match(u.text.primary, /glass upright \(0°\)/);
});

// ---- Coaching zone -------------------------------------------------------------

test('zone: tilted early, opens toward upright as the glass fills, never beyond the spill limit', () => {
  const s0 = S.initState();
  const z0 = S.zoneAt(s0);
  assert.equal(z0.lo, S.PILSNER.zoneTiltMin);
  const full = Object.assign(S.initState(), { fill: S.volumeOf(0.9) });
  const z1 = S.zoneAt(full);
  assert.equal(z1.lo, 0);
  assert.ok(S.capacity(z1.hi) >= S.total(full));
  assert.ok(z1.hi < z0.hi);
});

test('zone is coaching only: leaving it briefly does not fail an otherwise good pour', () => {
  const r = S.runTimeline([{ t: 0, target: 45 }, { t: 1.6, pour: true }, { t: 2.0, target: 10 }, { t: 2.5, target: 45 },
    { t: 5.4, target: 0, ramp: 2.5 }, { t: 9.4, pour: false }, { t: 10.4, serve: true }], 'continuous');
  assert.ok(r.result.metrics.zoneShare < 1);
  assert.equal(r.result.pass, true, fmt(r));
});

// ---- Stage shown on the dial (v2.1) --------------------------------------------

test('stage: tilted until the beer reaches the BRING UP mark, then bring up, then upright once the glass is', () => {
  const [m0] = S.PILSNER.straightenWindow;
  const at = (level, angle) => S.stageAt(Object.assign(S.initState(), { opened: true, angle, fill: S.volumeOf(level) }));
  assert.equal(at(m0 - 0.05, 45), 'tilted');
  assert.equal(at(m0 - 0.05, 0), 'tilted');          // straightened early: dial still says tilted
  assert.equal(at(m0 + 0.01, 45), 'bringUp');
  assert.equal(at(m0 + 0.2, 30), 'bringUp');
  assert.equal(at(m0 + 0.2, 5), 'upright');           // lit by the glass, not by a fill number
});

test('stage: the ghost starts straightening after the mark is reached', () => {
  let s = S.initState(), firstBringUp = null;
  for (let tick = 0; tick < 12 * S.HZ; tick++) {
    const inp = S.inputAt(S.GHOST, tick);
    if (inp.serve) break;
    s = S.step(s, { pour: inp.pour, target: inp.target, straighten: inp.straighten, variant: 'staged' });
    if (firstBringUp === null && S.stageAt(s) === 'bringUp') firstBringUp = tick;
  }
  assert.ok(firstBringUp !== null && firstBringUp <= S.tickOf(5.4), `bringUp at tick ${firstBringUp}`);
});

// ---- Guided hints ----------------------------------------------------------------

function hintsFor(opts) {
  const fired = new Set(), order = [];
  let s = S.initState(), straighten = false;
  for (let i = 0; i < 30 * S.HZ; i++) {
    const t = i / S.HZ;
    if (S.levelOf(s) >= (opts.at ?? Infinity)) straighten = true;
    const open = t >= 1 && S.levelOf(s) < (opts.stop ?? 0.93);
    if (t > 2 && !open) break;
    const n = S.step(s, { pour: open, target: t < 0.5 ? 0 : (opts.angle ?? 45), straighten, variant: 'staged' });
    for (const id of S.guidedHints(s, n, fired)) { fired.add(id); order.push(id); }
    s = n;
  }
  return order;
}

test('guided: opening upright fires the tilt-first hint, once', () => {
  assert.deepEqual(hintsFor({ angle: 0 }).filter(x => x === 'tiltFirst'), ['tiltFirst']);
});

test('guided: staying tilted past the window fires "start bringing it upright", then the spill warning', () => {
  const h = hintsFor({});
  assert.ok(h.includes('straighten') && h.includes('spillWarn'), h.join(','));
  assert.ok(h.indexOf('straighten') < h.indexOf('spillWarn'));
});

test('guided: a good pour hears the line and stop hints, and nothing repeats', () => {
  const h = hintsFor({ at: 0.55 });
  assert.ok(h.includes('nearLine') && h.includes('stop'), h.join(','));
  assert.equal(new Set(h).size, h.length);
});
