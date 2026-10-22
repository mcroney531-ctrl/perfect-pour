// Hefeweizen simulation: geometry, determinism, the calibrated straighten
// window, verdicts that never contradict the result, the adaptation the
// station teaches (no single straighten point passes every pour), the
// visible foam cue, the known-bad pours and their feedback.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'hefe-sim.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(SRC, ctx, { filename: 'js/hefe-sim.js' });
const H = ctx.HefeSim;
const { HEFE, STEP } = H;
const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
// Sweeps: liveliness every 0.05 across the whole range (between the table's
// rows and on them), straighten points every 1% of the glass.
const Ls = []; for (let L = 0.85; L <= 1.2501; L += 0.05) Ls.push(+L.toFixed(3));
const ats = []; for (let at = 0.10; at <= 0.9001; at += 0.01) ats.push(+at.toFixed(2));
const pour = (L, at, o) => H.evaluate(H.policyPour(L, at, o));

test('its own module: nothing shared with the protected Pilsner sim', () => {
  assert.doesNotMatch(SRC, /PourSim\s*[.[]/, 'does not use PourSim');
  assert.equal(ctx.PourSim, undefined);
});

test('geometry: upright volume and height invert; tilting holds less; the surface matches upright', () => {
  for (let h = 0; h <= 1.0001; h += 0.05) assert.ok(close(H.heightOf(H.volumeOf(h)), Math.min(1, h), 1e-6), `h ${h}`);
  assert.ok(close(H.capacity(0), 1));
  let prev = 1;
  for (let a = 5; a <= 60; a += 5) { const c = H.capacity(a); assert.ok(c < prev, `capacity falls at ${a}°`); prev = c; }
  for (const v of [0.2, 0.5, 0.9]) assert.ok(close(H.surfaceAt(v, 0), H.heightOf(v), 1e-6));
  // The outline is a weizen vase: bulb, waist, flare, rim turning in.
  const w = Object.fromEntries(H.PROFILE.map(([y, x]) => [y, x]));
  assert.ok(w[0.16] > w[0.3] && w[0.3] < w[0.86] && w[1] < w[0.86]);
});

test('deterministic: the same seed or liveliness gives bit-identical pours; seeds spread over the range', () => {
  assert.equal(H.liveliness(7), H.liveliness(7));
  const a = H.policyPour(1.1, 0.6), b = H.policyPour(1.1, 0.6);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(H.initState({ seed: 7 }).live, H.liveliness(7));
  const labels = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const L = H.liveliness(seed);
    assert.ok(L >= HEFE.liveRange[0] && L <= HEFE.liveRange[1]);
    labels.add(H.liveLabel(L));
  }
  assert.deepEqual([...labels].sort(), ['calm', 'lively', 'typical']);
});

test('Watch demo: a lively pour that waits past half full, passes mid-band, and straightens inside its window', () => {
  const r = H.runTimeline();
  assert.equal(r.result.pass, true);
  const m = r.result.metrics, [b0, b1] = HEFE.headBand, [w0, w1] = H.straightenWindow(H.GHOST_LIVE);
  assert.equal(m.liveLabel, 'lively');
  assert.ok(m.finalHead > b0 + 0.02 && m.finalHead < b1 - 0.02, `head ${m.finalHead} well inside the band`);
  assert.ok(m.straightenBegan >= w0 && m.straightenBegan <= w1, 'straightens inside its window');
  assert.ok(m.straightenBegan > 0.55, 'visibly later than the Pilsner habit');
  const ts = Array.from(H.GHOST, k => k.t);
  assert.ok(ts.every((t, i) => i === 0 || t >= ts[i - 1]), 'keyframes in order');
  // The "past half full" caption comes once the beer really is past half.
  const k = H.GHOST.find(x => x.caption && /Past half full/.test(x.caption));
  let s = H.initState({ live: H.GHOST_LIVE });
  for (let t = 0; t < H.tickOf(k.t); t++) { const i = H.inputAt(H.GHOST, t); s = H.step(s, { pour: i.pour, target: i.target }); }
  assert.ok(H.levelOf(s) >= 0.5);
});

test('the straighten window is held to the sim: starting anywhere inside it passes, for every liveliness and bring-up speed', () => {
  for (const L of Ls) {
    const [w0, w1] = H.straightenWindow(L);
    assert.ok(w1 - w0 >= 0.09, `window at ${L} is usable`);
    let inside = 0;
    for (const rampS of [1.5, 2.2, 3]) for (let at = 0.1; at <= 0.9; at += rampS === 2.2 ? 0.01 : 0.02) {
      const s = H.policyPour(L, at, { rampS }), b = s.straightenBegan;
      if (b === null || b < w0 || b > w1) continue;
      inside++;
      assert.equal(H.evaluate(s).pass, true, `L ${L}, ${rampS} s, began at ${b.toFixed(3)}`);
    }
    assert.ok(inside >= 12, `L ${L}: the window was exercised (${inside})`);
  }
});

test('verdicts never contradict the result: in range passes; early or late fails', () => {
  for (const L of Ls) for (const at of ats) {
    const s = H.policyPour(L, at), r = H.evaluate(s);
    const v = s.events.find(e => e.type === 'straighten');
    if (!v) continue;
    if (v.verdict === 'inRange') assert.equal(r.pass, true, `L ${L} at ${at}: in range but failed (${r.primary})`);
    if (v.verdict === 'early' || v.verdict === 'late') assert.equal(r.pass, false, `L ${L} at ${at}: ${v.verdict} but passed`);
  }
});

test('adaptation is real: no single straighten point passes every pour; the Pilsner habit fails lively pours', () => {
  for (const at of ats) assert.ok(Ls.some(L => !pour(L, at).pass), `straightening at ${at} cannot pass everything`);
  // The Pilsner window is 50-67% full; a learner on that habit:
  for (const at of [0.5, 0.55]) {
    const lively = pour(1.2, at);
    assert.equal(lively.pass, false); assert.equal(lively.primary, 'early', 'lively: head too big from coming up early');
    assert.equal(pour(1.0, at).pass, true, 'a typical pour still passes');
  }
  // ...and at the late end of it, fails calm pours (head too small).
  for (const at of [0.6, 0.65]) assert.equal(pour(0.85, at).primary, 'stayedTilted');
});

test('the cue is visible: foam already on the beer at half full grows with liveliness, lively at least 2.5x calm', () => {
  const head = L => H.policyPour(L, 0.5).headAtStraighten;
  let prev = 0;
  for (const L of Ls) { const h = head(L); assert.ok(h > prev); prev = h; }
  assert.ok(head(1.25) >= 2.5 * head(0.85), `${head(1.25)} vs ${head(0.85)}`);
});

test('a slower or quicker bring-up still passes in the middle of the window', () => {
  for (const L of [0.85, 1, 1.25]) for (const rampS of [1.5, 3]) {
    const [w0, w1] = H.straightenWindow(L);
    assert.equal(pour(L, (w0 + w1) / 2, { rampS }).pass, true, `L ${L}, ${rampS} s`);
  }
});

test('known-bad pours fail for the right reason', () => {
  const run = (fn, live = 1) => {
    let s = H.initState({ live });
    for (let tick = 0; tick < 40 * 60; tick++) { const inp = fn(tick / 60, s); if (!inp) break; s = H.step(s, inp); }
    return H.evaluate(s);
  };
  // Opened upright.
  assert.equal(run((t, s) => H.levelOf(s) < 0.935 ? { pour: true, target: 0 } : (s.flow ? { pour: false, target: 0 } : null)).primary, 'upright');
  // Never straightened: spills over the lip while tilted, never finishes upright.
  const tilted = run((t, s) => t < 14 ? { pour: t > 0.5, target: 45 } : null);
  assert.equal(tilted.pass, false);
  assert.ok(tilted.causes.includes('notUpright') && tilted.causes.includes('tiltSpill'));
  // Flick upright at the last instant and let go: not finished upright.
  const flick = run((t, s) => {
    if (t < 0.5) return { pour: false, target: 45 };
    if (H.levelOf(s) >= 0.8) s.up = true;
    if (s.up && s.angle <= 15) return s.flow ? { pour: false, target: 0 } : null;
    return { pour: true, target: s.up ? 0 : 45 };
  });
  assert.equal(flick.procedure.upright, false);
  assert.ok(flick.causes.includes('notUpright'));
  // Overpour, and stopping short.
  const over = run((t, s) => {
    if (t < 0.5) return { pour: false, target: 45 };
    if (H.levelOf(s) >= 0.5 && s.t0 === undefined) s.t0 = t;
    if (s.t0 !== undefined && s.full === undefined && H.levelOf(s) >= 0.95) s.full = t;
    const target = s.t0 === undefined ? 45 : Math.max(0, 45 * (1 - (t - s.t0) / 2.2));
    if (s.full !== undefined && t > s.full + 2) return s.flow ? { pour: false, target } : null;
    return { pour: true, target };
  });
  assert.equal(over.causes.includes('overflow'), true, 'kept pouring 2 s past the line: overflow');
  assert.equal(pour(1, 0.5, { stopAt: 0.85 }).causes.includes('short'), true);
});

test('the head holds once the tap is shut, so Serve timing cannot change the verdict', () => {
  let s = H.policyPour(1, 0.5);
  const before = H.evaluate(s);
  for (let i = 0; i < 600; i++) s = H.step(s, { pour: false, target: 0 });
  assert.equal(JSON.stringify(H.evaluate(s)), JSON.stringify(before));
});

test('feedback names the foam and the adaptation, and every cause has copy', () => {
  const early = H.feedback(pour(1.2, 0.45));
  assert.match(early.primary, /foamed more than usual/);
  assert.match(early.primary, /stay tilted a little longer/);
  const late = H.feedback(pour(0.85, 0.6));
  assert.match(late.primary, /foamed less than usual/);
  assert.match(late.primary, /come up a little sooner/);
  assert.match(H.feedback(pour(1, 0.5)).primary, /^Clean pour\./);
  const m = pour(1, 0.5).metrics;
  for (const k of Object.keys(H.COPY)) assert.equal(typeof H.COPY[k](m, HEFE), 'string', k);
  // No external standard is claimed: the copy never states a fixed
  // straighten percentage as the rule for wheat beer.
  for (const fn of Object.values(H.COPY)) assert.doesNotMatch(fn(m, HEFE), /always|standard|rule/i);
});

test('Guided hints react to this pour: wait on a lively one, come up sooner on a calm one, nothing extra on a typical one', () => {
  const hints = L => {
    let s = H.initState({ live: L }), prev = s;
    const fired = new Set(), order = [];
    for (let tick = 0; tick < 30 * 60; tick++) {
      const tilt = tick < 30 ? 0 : 45, level = H.levelOf(s);
      s = H.step(s, { pour: tick >= 30 && level < 0.935, target: level > 0.8 ? 0 : tilt });
      for (const id of H.guidedHints(prev, s, fired)) { fired.add(id); order.push([id, +H.levelOf(s).toFixed(2)]); }
      prev = s;
      if (s.opened && s.flow === 0) break;
    }
    return order;
  };
  const lively = hints(1.2), calm = hints(0.88), typical = hints(1.0);
  const at = (list, id) => (list.find(x => x[0] === id) || [])[1];
  assert.ok(at(lively, 'foamFast') >= 0.45 && at(lively, 'foamFast') < 0.55, 'lively: reminder at the habitual half-full point');
  assert.equal(at(lively, 'foamSlow'), undefined);
  assert.ok(at(calm, 'foamSlow') >= H.straightenWindow(0.88)[0] - 0.01, 'calm: nudge once its band is reached');
  assert.equal(at(calm, 'foamFast'), undefined);
  assert.equal(at(typical, 'foamFast'), undefined); assert.equal(at(typical, 'foamSlow'), undefined);
  for (const list of [lively, calm, typical]) assert.ok(at(list, 'straighten') > 0, 'backup hint once past the band');
});
