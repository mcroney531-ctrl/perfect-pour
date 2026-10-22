// The station kit (js/station-kit.js), on its own: lifecycle, speech
// batching, captions, the fixed-step loop and the log store, with fake
// timers, frames and storage. The browser parity and lifecycle tests check
// the same behaviour inside both stations.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const timers = new Map(); let tid = 0, now = 0;
  const frames = new Map(); let fid = 0;
  const store = new Map();
  const ctx = vm.createContext({
    setTimeout: (fn, ms) => { timers.set(++tid, { fn, at: now + ms }); return tid; },
    clearTimeout: id => { timers.delete(id); },
    requestAnimationFrame: cb => { frames.set(++fid, cb); return fid; },
    cancelAnimationFrame: id => { frames.delete(id); },
    performance: { now: () => now },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { if (k === 'full') throw new Error('quota'); store.set(k, String(v)); } }
  });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'station-kit.js'), 'utf8'), ctx);
  const advance = ms => {          // run timers due within ms
    now += ms;
    for (const [id, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) if (t.at <= now) { timers.delete(id); t.fn(); }
  };
  const frame = ms => {            // advance time, then deliver one frame
    now += ms;
    const due = [...frames]; frames.clear();
    for (const [, cb] of due) cb(now);
  };
  return { Kit: ctx.RiversideStationKit, advance, frame, timers, frames, store };
}
const el = () => {
  const cls = new Set();
  return { textContent: '', classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), has: c => cls.has(c) } };
};

test('lifecycle: tracks listeners, removes them all once, and ends exactly once', () => {
  const { Kit } = load();
  const life = Kit.lifecycle(), added = [], removed = [];
  const target = { addEventListener: (...a) => added.push(a), removeEventListener: (...a) => removed.push(a) };
  const f = () => {};
  life.on(target, 'blur', f); life.on(target, 'keydown', f, true);
  assert.equal(added.length, 2);
  assert.equal(life.alive, true);
  assert.equal(life.end(), true);
  assert.equal(life.alive, false);
  assert.equal(life.end(), false, 'a second end is a no-op');
  life.dispose(); life.dispose();
  assert.deepEqual(removed.map(r => r[0]), ['blur', 'keydown'], 'each removed once, with its own options');
  assert.equal(removed[1][2], true);
});

test('speech: messages within 80 ms are spoken once, in order; the region empties first; cancel drops the queue', () => {
  const { Kit, advance } = load();
  const live = el(); live.textContent = 'old';
  const s = Kit.announcer(live);
  s.say('Guided mode.'); s.say('Tilt first.');
  assert.equal(live.textContent, '', 'emptied so a repeat is re-read');
  advance(79); assert.equal(live.textContent, '');
  advance(1); assert.equal(live.textContent, 'Guided mode. Tilt first.');
  s.say('Level 25%.'); advance(80);
  assert.equal(live.textContent, 'Level 25%.');
  s.say('Never said.'); s.cancel(); advance(200);
  assert.equal(live.textContent, '', 'cancelled: nothing spoken after unmount');
});

test('caption: writes only on change and sets the hint or verdict style', () => {
  const { Kit } = load();
  const c = el(); let writes = 0;
  const box = { get textContent() { return c.textContent; }, set textContent(v) { writes++; c.textContent = v; }, classList: c.classList };
  const set = Kit.caption(box);
  set('Hold to pour.', 'hint'); set('Hold to pour.', 'hint');
  assert.equal(writes, 1);
  assert.ok(box.classList.has('hint') && !box.classList.has('verdict'));
  set('Clean pour', 'verdict');
  assert.ok(!box.classList.has('hint') && box.classList.has('verdict'));
  set(null); assert.equal(c.textContent, '');
});

test('loop: fixed ticks however frames fall, at most 0.25 s caught up, one draw per frame, nothing after stop', () => {
  const { Kit, frame, frames } = load();
  let ticks = 0, draws = 0;
  const loop = Kit.loop(1 / 60, () => ticks++, () => draws++);
  loop.start();
  for (let i = 0; i < 60; i++) frame(1000 / 60);           // one second of steady frames
  assert.ok(Math.abs(ticks - 60) <= 1, `${ticks} ticks`);
  assert.equal(draws, 60);
  const t0 = ticks;
  frame(2000);                                              // a long stall: capped
  assert.equal(ticks - t0, 15, '0.25 s of ticks, not 2 s');
  loop.stop();
  assert.equal(frames.size, 0, 'pending frame cancelled');
  frame(1000);
  assert.equal(draws, 61, 'no draw after stop');
});

test('log store: its own key, capped, safe on bad data and a full disk', () => {
  const { Kit, store } = load();
  const log = Kit.logStore('k', 3);
  assert.equal(log.key, 'k');
  assert.equal(JSON.stringify(log.read()), '[]');
  assert.equal(log.write([1, 2, 3, 4, 5]), true);
  assert.equal(store.get('k'), '[3,4,5]', 'keeps the newest');
  store.set('k', '{bad');
  assert.equal(JSON.stringify(log.read()), '[]');
  assert.equal(Kit.logStore('full', 3).write([1]), false, 'storage full: false, no throw');
});
