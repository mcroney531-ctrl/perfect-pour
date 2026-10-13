'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./load-sim.js')();

const VARIANTS = ['slider', 'toggle'];
const fmt = r => {
  const s = r.state;
  return `fill ${s.fill.toFixed(3)} foam ${s.foam.toFixed(3)} total ${(s.fill + s.foam).toFixed(3)} ` +
    `waste ${s.waste.toFixed(3)} straighten ${s.straightenFill === null ? 'null' : s.straightenFill.toFixed(3)} ` +
    `-> ${r.result.primary}/${r.result.secondary}`;
};

// ---- The sim itself --------------------------------------------------------

test('step is pure: same input, same output, input state untouched', () => {
  const a = S.initState();
  const frozen = JSON.stringify(a);
  const b1 = S.step(a, { pour: true, target: 45, variant: 'slider' });
  const b2 = S.step(a, { pour: true, target: 45, variant: 'slider' });
  assert.equal(JSON.stringify(a), frozen);
  assert.deepEqual(b1, b2);
});

test('flow reaches full in ~150 ms and closes the same way', () => {
  let s = S.initState();
  for (let i = 0; i < 9; i++) s = S.step(s, { pour: true, target: 0, variant: 'slider' });
  assert.equal(s.flow, 1);
  for (let i = 0; i < 9; i++) s = S.step(s, { pour: false, target: 0, variant: 'slider' });
  assert.equal(s.flow, 0);
});

test('toggle takes ~300 ms to swing 45 degrees; slider settles in ~100 ms', () => {
  let t = S.initState(), sl = S.initState();
  for (let i = 0; i < 18; i++) t = S.step(t, { pour: false, target: 45, variant: 'toggle' });
  assert.equal(t.angle, 45);
  t = S.initState();
  for (let i = 0; i < 9; i++) t = S.step(t, { pour: false, target: 45, variant: 'toggle' });
  assert.ok(t.angle > 20 && t.angle < 25, `toggle half way ${t.angle}`);
  for (let i = 0; i < 6; i++) sl = S.step(sl, { pour: false, target: 45, variant: 'slider' });
  assert.ok(sl.angle > 42, `slider after 100 ms ${sl.angle}`);
});

test('upright pours make far more foam than tilted ones', () => {
  const run = angle => {
    let s = Object.assign(S.initState(), { angle });
    for (let i = 0; i < 120; i++) s = S.step(s, { pour: true, target: angle, variant: 'slider' });
    return s.foam / (s.fill + s.foam);
  };
  assert.ok(run(0) > 4 * run(45));
});

test('overflow spills foam first, then beer, and counts it as waste', () => {
  let s = Object.assign(S.initState(), { fill: 0.9, foam: 0.1, opened: true, startAngle: 45, angle: 45, target: 45 });
  s = S.step(s, { pour: true, target: 45, variant: 'slider' });
  assert.ok(s.waste > 0);
  assert.ok(s.fill + s.foam <= 1 + 1e-12);
  assert.ok(s.foam < 0.1, 'foam went first');
});

// ---- The ghost (Watch) run --------------------------------------------------

for (const v of VARIANTS) {
  test(`ghost run passes all three criteria (${v})`, () => {
    const r = S.runTimeline(S.GHOST, v);
    const msg = `ghost/${v}: ${fmt(r)}`;
    assert.equal(r.result.pass, true, msg);
    assert.deepEqual({ ...r.result.checks }, { head: true, total: true, waste: true }, msg);
  });

  test(`ghost lands mid-band on head height (${v})`, () => {
    const r = S.runTimeline(S.GHOST, v);
    const [b0, b1] = S.PILSNER.headBand;
    const mid = (b0 + b1) / 2, quarter = (b1 - b0) / 4;
    assert.ok(Math.abs(r.state.foam - mid) <= quarter / 2,
      `head ${r.state.foam.toFixed(3)} should be within ${(quarter / 2).toFixed(3)} of ${mid}`);
    const zoneMid = S.PILSNER.fillLine - S.PILSNER.fillTol / 2;
    assert.ok(Math.abs(S.total(r.state) - zoneMid) <= S.PILSNER.fillTol / 4, `total ${S.total(r.state).toFixed(3)}`);
  });
}

test('ghost demo is 10-12 s with about 8 s of open tap, straightening inside the window', () => {
  const r = S.runTimeline(S.GHOST, 'slider');
  const end = S.GHOST[S.GHOST.length - 1].t;
  assert.ok(end >= 10 && end <= 12);
  assert.ok(Math.abs(r.state.pourTime - 8) <= 0.5, `pourTime ${r.state.pourTime}`);
  const [w0, w1] = S.PILSNER.straightenWindow;
  assert.ok(r.state.straightenFill >= w0 && r.state.straightenFill <= w1, `straightenFill ${r.state.straightenFill}`);
  assert.equal(S.GHOST_STEPS.length, 4);
});

// ---- Known-bad timelines (spec §10) ----------------------------------------
// Each is a plausible first-timer mistake, scripted by time. Times assume the
// current tuning (about 0.12 glass-heights a second); if the constants move a
// long way these may need re-timing, which is the point: they pin the feel.

const TILT = { t: 0, target: 45 };
const BAD = {
  // Opens upright and only tilts after a couple of seconds.
  upright: [{ t: 0, target: 0 }, { t: 0.3, pour: true }, { t: 2.5, target: 45 },
    { t: 8.0, target: 0 }, { t: 9.3, pour: false }, { t: 10.3, serve: true }],
  // Straightens at about 40% full.
  early: [TILT, { t: 1.6, pour: true }, { t: 5.0, target: 0 }, { t: 9.4, pour: false }, { t: 10.4, serve: true }],
  // Never straightens at all.
  neverStraighten: [TILT, { t: 1.6, pour: true }, { t: 9.5, pour: false }, { t: 10.5, serve: true }],
  // Straightens at the line, too late to build a head.
  lateStraighten: [TILT, { t: 1.6, pour: true }, { t: 9.2, target: 0 }, { t: 9.5, pour: false }, { t: 10.5, serve: true }],
  // Good technique, but keeps the tap open well past the rim.
  overpour: [TILT, { t: 1.6, pour: true }, { t: 8.3, target: 0 }, { t: 11.5, pour: false }, { t: 12.5, serve: true }],
  // Good technique, lets go early.
  short: [TILT, { t: 1.6, pour: true }, { t: 7.6, target: 0 }, { t: 8.4, pour: false }, { t: 9.4, serve: true }]
};
const EXPECT = {
  upright: 'upright', early: 'early', neverStraighten: 'stayedTilted',
  lateStraighten: 'stayedTilted', overpour: 'overflow', short: 'short'
};

for (const [name, tl] of Object.entries(BAD)) {
  for (const v of VARIANTS) {
    test(`bad timeline "${name}" (${v}) fails with "${EXPECT[name]}"`, () => {
      const r = S.runTimeline(tl, v);
      const msg = `${name}/${v}: ${fmt(r)}`;
      assert.equal(r.result.pass, false, msg);
      assert.equal(r.result.primary, EXPECT[name], msg);
      assert.ok(r.text.primary.length > 20, msg);
    });
  }
}

test('feedback copy is templated with the player\'s own values', () => {
  const r = S.runTimeline(BAD.early, 'slider');
  const pctStraight = Math.round(r.state.straightenFill * 100);
  assert.match(r.text.primary, new RegExp(`about ${pctStraight}% full`));
  const u = S.runTimeline(BAD.upright, 'slider');
  assert.match(u.text.primary, /glass upright \(0°\)/);
});

// ---- Guided hints ----------------------------------------------------------

function hintsFor(tl, v = 'slider') {
  const fired = new Set(), order = [];
  let s = S.initState();
  for (let tick = 0; tick < 30 * S.HZ; tick++) {
    const inp = S.inputAt(tl, tick);
    if (inp.serve) break;
    const n = S.step(s, { pour: inp.pour, target: inp.target, variant: v });
    for (const id of S.guidedHints(s, n, fired)) { fired.add(id); order.push(id); }
    s = n;
  }
  return order;
}

test('guided: opening upright fires the tilt-first hint, once', () => {
  const h = hintsFor(BAD.upright);
  assert.equal(h.filter(x => x === 'tiltFirst').length, 1);
});

test('guided: staying tilted into the window fires "Straighten now"', () => {
  assert.ok(hintsFor(BAD.neverStraighten).includes('straighten'));
});

test('guided: no hint fires more than once per pour', () => {
  for (const tl of Object.values(BAD)) {
    const h = hintsFor(tl);
    assert.equal(new Set(h).size, h.length, h.join(','));
  }
});

module.exports = { BAD, hintsFor, fmt };
