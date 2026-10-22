// Station registry: what a station must declare to be registered, and the
// stations the app actually registers (in hub order).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Arrays made inside the vm context have another realm's prototype.
const plain = v => JSON.parse(JSON.stringify(v));
const src = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
function registry(extra = {}) {
  const ctx = vm.createContext({ ...extra });
  ctx.window = ctx;
  vm.runInContext(src('stations.js'), ctx);
  return ctx;
}
const META = { name: 'Test', sub: 'Test pour', glass: 'pils' };
const PLAYABLE = { ...META, intro: { label: 'l', title: 't', steps: [], goal: 'g' }, backdrop: { src: 'x.webp', provisional: false } };

test('a station without mount is registered as coming soon; with mount, as playable', () => {
  const R = registry().RiversideStations;
  R.register({ id: 'soon', contract: 1, meta: META });
  R.register({ id: 'ready', contract: 1, meta: PLAYABLE, mount: () => ({ unmount: () => ({ abandoned: false }) }) });
  assert.deepEqual(plain(R.list().map(s => [s.id, s.playable])), [['soon', false], ['ready', true]]);
  assert.equal(R.get('ready').meta.name, 'Test');
  assert.equal(R.get('nope'), null);
});

test('bad definitions are refused with a reason', () => {
  const R = registry().RiversideStations;
  R.register({ id: 'one', contract: 1, meta: META });
  const refuse = (def, re) => assert.throws(() => R.register(def), re);
  refuse({ id: 'one', contract: 1, meta: META }, /registered twice/);
  refuse({ id: 'Two', contract: 1, meta: META }, /lower-case/);
  refuse({ id: 'two', contract: 2, meta: META }, /contract must be 1/);
  refuse({ id: 'two', contract: 1, meta: { name: 'x' } }, /meta needs/);
  refuse({ id: 'two', contract: 1, meta: META, mount: 'no' }, /mount must be a function/);
  refuse({ id: 'two', contract: 1, meta: META, mount() {} }, /needs meta.intro and meta.backdrop/);
  assert.deepEqual(plain(R.list().map(s => s.id)), ['one']);
});

test('the app registers Pilsner (playable) first, then the upcoming stations, matching progress and hub anchors', () => {
  const ctx = registry({ PilsnerStation: { mount() {} } });
  vm.runInContext(src('stations/pilsner.js'), ctx);
  vm.runInContext(src('stations/upcoming.js'), ctx);
  const list = ctx.RiversideStations.list();
  assert.deepEqual(plain(list.map(s => [s.id, s.playable])), [['pilsner', true], ['hefeweizen', false], ['stout', false]]);
  const pil = list[0].meta;
  assert.equal(pil.name, 'Pilsner');
  assert.equal(pil.intro.goal, 'Your goal: tilt first, bring the glass upright gradually, and stop at the line with the right amount of foam.');
  assert.equal(pil.backdrop.src, 'assets/station/pilsner.webp');
  // Every station has a progress record and a place on the hub.
  const hub = vm.createContext({}); vm.runInContext(src('hub-scenes.js'), hub);
  const anchors = Object.keys(hub.RiversideHubScenes.SCENES.desktop.stations);
  const ids = /const IDS = (\[[^\]]*\])/.exec(src('progress.js'))[1];
  for (const s of list) {
    assert.ok(anchors.includes(s.id), `${s.id} has a hub anchor`);
    assert.ok(ids.includes(`'${s.id}'`), `${s.id} has a progress record`);
  }
});
