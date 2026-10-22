// Saved progress: older or damaged saves are repaired, never wiped.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'progress.js'), 'utf8');
function load(saved) {
  const store = new Map(saved === undefined ? [] : [['riverside.progress', typeof saved === 'string' ? saved : JSON.stringify(saved)]]);
  const ctx = vm.createContext({ localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) } });
  ctx.window = ctx;
  vm.runInContext(SRC, ctx);
  return { P: ctx.RiversideProgress, stored: () => JSON.parse(store.get('riverside.progress')), raw: () => store.get('riverside.progress') };
}
const rec = (status, extra = {}) => ({ status, attempts: 3, passes: 1, abandoned: 1, lastPlayed: '2026-10-01T00:00:00.000Z', ...extra });

test('a v1 save missing a station keeps everything else; the missing one starts new', () => {
  const { P, stored } = load({ version: 1, stations: { pilsner: rec('certified', { certifiedAt: 'x' }), hefeweizen: rec('inProgress') },
    seen: { landing: true, 'intro.pilsner': true } });
  assert.equal(P.station('pilsner').status, 'certified');
  assert.equal(P.station('pilsner').attempts, 3);
  assert.equal(P.station('hefeweizen').status, 'inProgress');
  assert.deepEqual({ ...P.station('stout') }, { status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  assert.equal(P.certifiedCount(), 1);
  assert.ok(P.seen('landing') && P.seen('intro.pilsner'));
  P.markEntered('stout');
  const s = stored();
  assert.equal(s.stations.pilsner.certifiedAt, 'x');
  assert.equal(s.stations.stout.status, 'inProgress');
});

test('a damaged station record is reset alone; bad counts default; unknown keys are kept', () => {
  const { P, stored } = load({ version: 1, stations: { pilsner: rec('certified'), hefeweizen: { status: 'banana' }, stout: rec('inProgress', { attempts: -2, passes: 'x' }), extra: { keep: 1 } },
    seen: { landing: true }, finalRush: { done: true } });
  assert.equal(P.station('pilsner').status, 'certified');
  assert.equal(P.station('hefeweizen').status, 'new');
  assert.equal(P.station('stout').attempts, 0);
  assert.equal(P.station('stout').passes, 0);
  assert.equal(P.station('stout').abandoned, 1);
  P.recordServed('pilsner', true);
  const s = stored();
  assert.deepEqual(s.stations.extra, { keep: 1 });
  assert.deepEqual(s.finalRush, { done: true });
  assert.equal(s.stations.pilsner.attempts, 4);
});

test('unreadable, wrong-version or shapeless data starts fresh; nothing saved is not written', () => {
  for (const bad of ['{not json', { version: 0, stations: {} }, { version: 1 }, { version: 1, stations: [] }, 'null']) {
    const { P } = load(bad);
    assert.equal(P.station('pilsner').status, 'new');
    assert.equal(P.seen('landing'), false);
  }
});

test('data from a newer version is read as fresh and never overwritten', () => {
  const NEWER = JSON.stringify({ version: 99, stations: {}, future: true });
  const { P, raw } = load(NEWER);
  P.markEntered('pilsner'); P.markSeen('landing');
  assert.equal(raw(), NEWER);
});
