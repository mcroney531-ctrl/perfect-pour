// Nitro Stout simulation: geometry, determinism and frame-rate independence,
// settling that runs with the tap shut, readiness read from the beer, the two
// learner decisions (when to set down, when to top up) and their
// consequences, the finish, and the feedback. Isolated: no other sim loaded.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'stout-sim.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(SRC, ctx, { filename: 'js/stout-sim.js' });
const S = ctx.StoutSim;
const { STOUT, HZ, STEP } = S;
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const pour = o => S.evaluate(S.policyPour(o));
const json = v => JSON.stringify(v);

test('its own module: nothing from the Pilsner or Hefeweizen sims', () => {
  assert.doesNotMatch(SRC, /PourSim\s*[.[]|HefeSim\s*[.[]/);
  assert.equal(ctx.PourSim, undefined); assert.equal(ctx.HefeSim, undefined);
});

test('geometry: volumes and heights invert, a dome above the rim included; tilting holds less', () => {
  for (let h = 0; h <= 1.04; h += 0.02) assert.ok(close(S.heightOf(S.volumeOf(h)), h, 1e-5), `h ${h}`);
  assert.ok(close(S.capacity(0), 1));
  let prev = 1;
  for (let a = 5; a <= 60; a += 5) { const c = S.capacity(a); assert.ok(c < prev); prev = c; }
  // The nonic bulge: wider near the top than below it.
  const w = Object.fromEntries(Array.from(S.PROFILE, ([y, x]) => [y, x]));
  assert.ok(w[0.86] > w[0.78] && w[0.86] > w[0.92]);
});

test('replays are bit-identical, and the result does not depend on the frame rate', () => {
  assert.equal(json(S.policyPour({})), json(S.policyPour({})));
  // Drive the Watch demo the way a station does: fixed 60 Hz sim ticks from
  // whatever frames arrive (30, 60, 144 Hz and an irregular mix).
  const run = frameMs => {
    let s = S.initState(), acc = 0, i = 0;
    for (let t = 0; t < 40000;) {
      const dt = frameMs(i++); t += dt; acc += Math.min(0.25, dt / 1000);
      while (acc >= STEP) {
        const inp = S.inputAt(S.GHOST, s.tick);
        if (inp.serve) return s;
        s = S.step(s, { pour: inp.pour, target: inp.target });
        acc -= STEP;
      }
    }
    return s;
  };
  const ref = json(run(() => 1000 / 60));
  for (const f of [() => 1000 / 30, () => 1000 / 144, i => [7, 33, 16, 50, 4, 21][i % 6]]) assert.equal(json(run(f)), ref);
});

test('volume is conserved: what went in is in the glass or spilt', () => {
  let s = S.initState(), poured = 0;
  const steps = [[0, 30, false, 45], [30, 500, true, 45], [500, 1400, false, 0], [1400, 1700, true, 0], [1700, 1800, true, 30], [1800, 2000, false, 0]];
  for (const [a, b, open, target] of steps) for (let i = a; i < b; i++) { const n = S.step(s, { pour: open, target }); poured += n.flow * STOUT.flowRate * STEP; s = n; }
  assert.ok(close(S.total(s) + s.waste, poured, 1e-9), `${S.total(s) + s.waste} vs ${poured}`);
});

test('settling runs with the tap shut: the surge sinks, the dark beer rises, the head separates (unlike Pilsner)', () => {
  let s = S.policyPour({ wait: 0.001, topMax: 0 });   // stage one only
  // Stage one done; now hold the tap shut and watch.
  s = S.initState();
  for (let i = 0; i < 30; i++) s = S.step(s, { pour: false, target: 45 });
  for (let i = 0; S.levelOf(s) < 0.72; i++) s = S.step(s, { pour: true, target: S.levelOf(s) > 0.5 ? 0 : 45 });
  const shut = [];
  // (Sampled from 1 s after the tap starts closing, once the flow has stopped.)
  for (let i = 1; i <= 20 * HZ; i++) { s = S.step(s, { pour: false, target: 0 }); if (i % HZ === 0) shut.push(S.bands(s)); }
  for (let i = 1; i < shut.length; i++) {
    assert.ok(shut[i].surge < shut[i - 1].surge, 'surge band shrinks');
    assert.ok(shut[i].liquidTop > shut[i - 1].liquidTop, 'dark beer rises');
  }
  assert.ok(close(shut.at(-1).headTop, shut[0].headTop, 1e-9), 'the top does not move: the beer only separates');
  assert.ok(s.closedOnce && s.phase === 'settling');
});

test('readiness is a state of the beer: settled about 5.4 s after set-down, when the cloudy band has all but gone', () => {
  const s = S.policyPour({});
  const m = S.evaluate(s).metrics;
  assert.ok(m.readyAfterS >= 4.5 && m.readyAfterS <= 6.5, `ready after ${m.readyAfterS} s`);
  // At readiness the surge band is under 2% of the glass height; at set-down it was far larger.
  let t = S.initState();
  for (let i = 0; i < 30; i++) t = S.step(t, { pour: false, target: 45 });
  while (S.levelOf(t) < 0.72) t = S.step(t, { pour: true, target: S.levelOf(t) > 0.5 ? 0 : 45 });
  for (let i = 0; i < 40; i++) t = S.step(t, { pour: false, target: 0 });
  const atDown = S.bands(t).surge;
  while (!S.isSettled(t)) t = S.step(t, { pour: false, target: 0 });
  // (Over 20% of the glass: the faster settle, settleTau 3.15, has already thinned it from about 25%.)
  assert.ok(atDown > 0.2, `cloudy at set-down (${atDown})`);
  assert.ok(S.bands(t).surge < 0.05, `clean at readiness (${S.bands(t).surge})`);
});

test('the reference pour and the Watch demo pass comfortably inside every band', () => {
  for (const r of [pour({}), S.runTimeline().result]) {
    assert.equal(r.pass, true, r.primary);
    const m = r.metrics, mid = ([a, b], v, need) => assert.ok(v - a >= need && b - v >= need, `${v} inside [${a}, ${b}] by ${need}`);
    mid(STOUT.headBand, m.finalHead, 0.02);
    mid(STOUT.finishBand, m.finalLevel, 0.01);
    mid(STOUT.stage1Band, m.stage1Level, 0.08);
    assert.ok(m.topUpShare <= STOUT.settledShare, 'topped up once settled');
  }
});

test('an early top-up is allowed, recorded, and costs the pour; the earlier, the bigger the loose head', () => {
  const s = S.policyPour({ wait: 0 });
  assert.equal(s.phase === 'settling' || s.phase === 'topUp', true);
  assert.ok(s.topUpTick !== null, 'the top-up happened: nothing blocked it');
  const ev = Array.from(s.events).find(e => e.type === 'topUp');
  assert.equal(ev.verdict, 'early');
  const r = S.evaluate(s);
  assert.equal(r.pass, false); assert.equal(r.primary, 'earlyTopUp');
  assert.equal(r.procedure.waited, false);
  const heads = [0, 2, 4, 6, 8, 12].map(w => pour({ wait: w }).metrics.finalHead);
  for (let i = 1; i < heads.length; i++) assert.ok(heads[i] < heads[i - 1], `head shrinks the longer it settles: ${heads}`);
  assert.ok(heads[0] > STOUT.headBand[1] + 0.05, 'topping up at once: far too much head');
});

test('top-up verdicts never contradict the result: settled and a touch early pass the wait, early never does', () => {
  for (let w = 0; w <= 16; w += 0.25) {
    const s = S.policyPour({ wait: w }), r = S.evaluate(s);
    const v = Array.from(s.events).find(e => e.type === 'topUp').verdict;
    if (v === 'settled') assert.equal(r.procedure.waited, true, `wait ${w}`);
    if (v === 'early') assert.equal(r.procedure.waited, false, `wait ${w}`);
    if (v === 'littleEarly') assert.equal(r.procedure.waited, true, `wait ${w}: a passing top-up is never called a timing failure`);
    if (v === 'settled' || v === 'littleEarly') assert.equal(r.pass, true, `wait ${w}: ${r.primary}`);
  }
});

test('waiting beyond readiness never hurts', () => {
  for (const w of [12, 20, 40, 90]) assert.equal(pour({ wait: w }).pass, true, `wait ${w}`);
});

test('stage one: too low or too high fails with the right cause; anywhere in two-thirds to three-quarters passes', () => {
  // (The reference player starts bringing the glass up 0.22 below where it
  // will close, so it is upright by then.)
  const at = st => ({ stage1: st, upAt: st - 0.22 });
  assert.equal(pour(at(0.55)).primary, 'stage1Low');
  assert.equal(pour(at(0.86)).primary, 'stage1High');
  for (const st of [0.62, 0.66, 0.72, 0.78]) assert.equal(pour(at(st)).pass, true, `stage one ${st}`);
  // Still tilted at set-down.
  assert.ok(pour({ upAt: 0.9, rampS: 30 }).causes.includes('notUpright1'));
});

test('the top-up: tilted, short, too tall a dome, overflow', () => {
  assert.equal(pour({ topAngle: 20 }).primary, 'tiltedTopUp');
  assert.equal(pour({ topAngle: 10 }).primary, 'tiltSpill', 'a slight tilt spills over the lower lip: the advice is upright');
  assert.equal(pour({ finish: 0.95 }).primary, 'short');
  assert.equal(pour({ finish: 1.054 }).primary, 'overDome');
  assert.equal(pour({ overpour: 1 }).primary, 'overflow');
});

test('unfinished pours complete to a debrief instead of a hard stop', () => {
  // Set down, never topped up, served.
  let s = S.initState();
  for (let i = 0; i < 30; i++) s = S.step(s, { pour: false, target: 45 });
  while (S.levelOf(s) < 0.72) s = S.step(s, { pour: true, target: S.levelOf(s) > 0.5 ? 0 : 45 });
  for (let i = 0; i < 5 * HZ; i++) s = S.step(s, { pour: false, target: 0 });
  assert.equal(S.canServe(s), true);
  assert.equal(S.evaluate(s).primary, 'noTopUp');
  // Closed and served at once: never set down.
  let q = S.initState();
  for (let i = 0; i < 30; i++) q = S.step(q, { pour: false, target: 45 });
  for (let i = 0; i < 3 * HZ; i++) q = S.step(q, { pour: true, target: 45 });
  for (let i = 0; i < 12; i++) q = S.step(q, { pour: false, target: 45 });
  assert.equal(S.evaluate(q).primary, 'noSetDown');
  // Opened upright.
  assert.equal(pour({ tilt: 0 }).primary, 'upright');
});

test('a short stutter in stage one is still stage one, not a top-up', () => {
  let s = S.initState();
  for (let i = 0; i < 30; i++) s = S.step(s, { pour: false, target: 45 });
  for (let i = 0; i < 2 * HZ; i++) s = S.step(s, { pour: true, target: 45 });
  for (let i = 0; i < 0.3 * HZ; i++) s = S.step(s, { pour: false, target: 45 });
  for (let i = 0; i < HZ; i++) s = S.step(s, { pour: true, target: 45 });
  assert.equal(s.phase, 'stage1'); assert.equal(s.topUpTick, null);
});

test('the time taken to press Serve cannot change the verdict', () => {
  // Everything but the clock itself (metrics.elapsed), to floating-point precision.
  const verdict = st => { const r = S.evaluate(st); const m = Object.assign({}, r.metrics); delete m.elapsed;
    return JSON.stringify({ ...r, metrics: m }, (k, v) => (typeof v === 'number' ? +v.toFixed(9) : v)); };
  let s = S.policyPour({});
  const now = verdict(s);
  for (let i = 0; i < 60 * HZ; i++) s = S.step(s, { pour: false, target: 0 });
  assert.equal(verdict(s), now);
});

test('feedback: every cause has copy; early top-up names the surge; no real settle time is claimed', () => {
  const m = pour({ wait: 0 }).metrics;
  for (const [k, fn] of Object.entries(S.COPY)) {
    const text = fn(Object.assign({}, m, { stage1Level: 0.7, stage1CloseAngle: 20, topUpMaxAngle: 20 }), STOUT);
    assert.equal(typeof text, 'string', k);
    assert.doesNotMatch(text, /\d+\s*(s|sec|seconds)\b|119|two minutes/i, `${k}: no real duration`);
  }
  assert.match(S.feedback(pour({ wait: 0 })).primary, /still surging/);
  assert.match(S.feedback(pour({})).primary, /^Clean two-stage pour/);
  assert.equal(pour({ wait: 0 }).secondary, null, 'one clear message for an early top-up');
  assert.equal(pour({ stage1: 0.55, upAt: 0.33, finish: 0.95 }).secondary, 'short');
});

test('Guided hints warn and never block: an early top-up still pours, with a warning', () => {
  let s = S.initState(), prev = s;
  const fired = new Set(), order = [];
  const tickWith = inp => { const n = S.step(s, inp); for (const id of S.guidedHints(prev, n, fired)) { fired.add(id); order.push(id); } prev = s = n; };
  for (let i = 0; i < 30; i++) tickWith({ pour: false, target: 45 });
  while (S.levelOf(s) < 0.72) tickWith({ pour: true, target: S.levelOf(s) > 0.5 ? 0 : 45 });
  for (let i = 0; i < 2 * HZ; i++) tickWith({ pour: false, target: 0 });
  const before = S.total(s);
  for (let i = 0; i < HZ; i++) tickWith({ pour: true, target: 0 });     // early top-up
  assert.ok(S.total(s) > before + 0.05, 'the beer still flows');
  assert.deepEqual(order.slice(0, 3), ['nearStage1', 'settling', 'stillSurging']);
  assert.equal(fired.has('settled'), false, 'never announced settled: it was topped up first');
});

test('future parking: the state is plain data; a round-tripped state continues identically', () => {
  let a = S.policyPour({ wait: 0.001, topMax: 0 });
  const b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 5 * HZ; i++) { a = S.step(a, { pour: false, target: 0 }); }
  let c = b;
  for (let i = 0; i < 5 * HZ; i++) { c = S.step(c, { pour: false, target: 0 }); }
  assert.equal(json(a), json(c));
});

test('a touch-early top-up passes with a note, and the feedback does not claim it fully settled', () => {
  const s = S.policyPour({ wait: 5.25 }), r = S.evaluate(s), f = S.feedback(r);
  assert.ok(r.metrics.topUpShare > STOUT.settledShare && r.metrics.topUpShare <= STOUT.waitTol);
  assert.equal(Array.from(s.events).find(e => e.type === 'topUp').verdict, 'littleEarly');
  assert.equal(r.pass, true);
  assert.deepEqual(Array.from(r.notes), ['littleEarly']);
  assert.match(f.primary, /just before it had fully settled/);
  assert.doesNotMatch(f.primary, /waited for it to settle/);
  assert.match(f.secondary, /little surge was still there/);
  // A fully settled one carries no note.
  const clean = S.evaluate(S.policyPour({}));
  assert.deepEqual(Array.from(clean.notes), []);
  assert.match(S.feedback(clean).primary, /waited for it to settle/);
});

test('stage one: the preferred two-thirds to three-quarters is distinguished from the more forgiving passing band', () => {
  const wide = S.evaluate(S.policyPour({ stage1: 0.62, upAt: 0.4 }));
  assert.equal(wide.pass, true);
  assert.deepEqual(Array.from(wide.notes), ['stage1Wide']);
  assert.match(S.feedback(wide).secondary, /target is about two-thirds to three-quarters \(66–75%\)/);
  assert.deepEqual(Array.from(S.evaluate(S.policyPour({})).notes), []);
});

test('the pass wording describes the actual finish: a dome, or level with the rim', () => {
  assert.match(S.feedback(pour({})).primary, /finished with a slight dome/);
  const level = pour({ finish: 0.995 });
  assert.equal(level.pass, true);
  assert.match(S.feedback(level).primary, /finished level with the rim/);
});

test('the early-top-up foam is told as what happened in this pour, not as measured physics', () => {
  const f = S.feedback(pour({ wait: 0 })).primary;
  assert.match(f, /In this pour/);
  assert.doesNotMatch(f, /always|every time|nitrogen/i);
});

test('the early-top-up Watch comparison is short, starts after stage one, and shows a failing pour', () => {
  const { start, timeline } = S.EARLY;
  assert.ok(start.closedOnce && start.phase === 'settling', 'starts from a set-down glass');
  const r = S.runTimeline(timeline, STOUT, S.CONTROL, start);
  assert.equal(r.result.pass, false);
  assert.equal(r.result.primary, 'earlyTopUp');
  const len = timeline.at(-1).t - timeline[0].t;
  assert.ok(len < 10, `short (${len.toFixed(1)} s)`);
  assert.match(S.EARLY_STEPS[0], /what not to do/);
  assert.ok(r.result.metrics.finalHead > STOUT.headBand[1], 'too much head');
});
