// Hub scene layout: the pure mapping from plate pixels to the screen, and the
// card placement that goes with it.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'hub-scenes.js'), 'utf8'), ctx);
const { SCENES, pickScene, layoutScene, SEP } = ctx.RiversideHubScenes;

const ROOM = { top: 110, bottom: 52, side: 12, edge: 4, ring: 44 };
const cardFor = vw => ({ w: Math.min(0.42 * vw, 190), h: 104 });
const rushFor = vw => ({ w: Math.min(0.72 * vw, 290), h: 100 });
const fit = (vw, vh, scene = SCENES[pickScene(vw, vh)]) => layoutScene(scene, vw, vh, ROOM, cardFor(vw), rushFor(vw));
const SIZES = [[320, 568], [360, 740], [375, 667], [390, 844], [412, 915], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [2560, 1080]];

test('portrait screens use the portrait plate, wide screens the desktop plate', () => {
  assert.equal(pickScene(390, 844), 'portrait');
  assert.equal(pickScene(768, 1024), 'portrait');
  assert.equal(pickScene(1024, 768), 'desktop');
  assert.equal(pickScene(1440, 900), 'desktop');
});

test('points map linearly: screen = offset + plate * scale', () => {
  const sc = SCENES.portrait, L = fit(390, 844, sc);
  for (const [id, p] of Object.entries(sc.stations)) {
    assert.ok(Math.abs(L.points[id][0] - (L.ox + p.at[0] * L.s)) < 1e-9, id);
    assert.ok(Math.abs(L.points[id][1] - (L.oy + p.at[1] * L.s)) < 1e-9, id);
  }
});

test('the portrait art is shown 1:3 on a 390x844 phone (its native ratio)', () => {
  const L = fit(390, 844, SCENES.portrait);
  assert.ok(Math.abs(L.s - 1 / 3) < 1e-6 && L.covers && L.height === 844);
});

for (const [vw, vh] of SIZES) {
  test(`${vw}x${vh}: rings and cards on screen, below the header, never overlapping`, () => {
    const L = fit(vw, vh);
    for (const [id, [x]] of Object.entries(L.points))
      assert.ok(x - ROOM.ring / 2 >= ROOM.edge - 0.5 && x + ROOM.ring / 2 <= vw - ROOM.edge + 0.5, `${id} ring x ${x.toFixed(1)}`);
    const boxes = Object.entries(L.cards).map(([id, c]) => ({ id, l: c.cx - c.w / 2, r: c.cx + c.w / 2, t: c.top, b: c.top + c.h }));
    for (const c of boxes) {
      assert.ok(c.l >= ROOM.side - 0.5 && c.r <= vw - ROOM.side + 0.5, `${c.id} inside the width`);
      assert.ok(c.t >= ROOM.top - 0.5, `${c.id} top ${c.t.toFixed(1)} under the header`);
      assert.ok(c.b <= L.height - ROOM.bottom + 0.5, `${c.id} bottom ${c.b.toFixed(1)}`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const apart = a.r + SEP - 0.5 <= b.l || b.r + SEP - 0.5 <= a.l || a.b + SEP - 0.5 <= b.t || b.b + SEP - 0.5 <= a.t;
      assert.ok(apart, `${a.id} and ${b.id} overlap`);
    }
  });
}

test('common phones and desktops are fully covered by the plate (no bare edges)', () => {
  for (const [vw, vh] of [[360, 740], [390, 844], [412, 915], [1440, 900], [1920, 1080]])
    assert.ok(fit(vw, vh).covers, `${vw}x${vh} covered`);
});

test('portrait tablet: the phone-shaped plate leaves only a thin edge (known gap until a tablet composition)', () => {
  const L = fit(768, 1024), bare = (768 - 1170 * L.s) / 2;
  assert.ok(bare > 0 && bare < 16, `bare edge ${bare.toFixed(1)} px each side`);
});

test('a small phone scrolls a little rather than stacking cards on each other', () => {
  const L = fit(320, 568);
  assert.ok(L.height > 568 && L.height < 700, `scrolls a little (${L.height.toFixed(0)} px tall)`);
});
