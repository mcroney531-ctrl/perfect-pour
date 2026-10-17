// Hub scene layout: the pure mapping from plate pixels to the screen.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'hub-scenes.js'), 'utf8'), ctx);
const { SCENES, pickScene, layoutScene } = ctx.RiversideHubScenes;

const ROOM = { top: 96, bottom: 56, side: 12 };
const RUSH = { h: 92 };
const cardFor = vw => ({ w: Math.min(0.42 * vw, 190), h: 96 });
const SIZES = [[320, 568], [360, 740], [375, 667], [390, 844], [412, 915], [768, 1024], [1024, 768], [1440, 900], [1920, 1080], [2560, 1080]];

test('portrait screens use the portrait plate, wide screens the desktop plate', () => {
  assert.equal(pickScene(390, 844), 'portrait');
  assert.equal(pickScene(768, 1024), 'portrait');
  assert.equal(pickScene(1024, 768), 'desktop');
  assert.equal(pickScene(1440, 900), 'desktop');
});

test('anchors map linearly: screen = offset + plate * scale', () => {
  const sc = SCENES.portrait, L = layoutScene(sc, 390, 844, ROOM, cardFor(390), RUSH);
  for (const [id, [x, y]] of Object.entries(sc.anchors)) {
    assert.ok(Math.abs(L.points[id][0] - (L.ox + x * L.s)) < 1e-9, id);
    assert.ok(Math.abs(L.points[id][1] - (L.oy + y * L.s)) < 1e-9, id);
  }
});

for (const [vw, vh] of SIZES) {
  test(`${vw}x${vh}: every station and its card fit on screen`, () => {
    const sc = SCENES[pickScene(vw, vh)], card = cardFor(vw), L = layoutScene(sc, vw, vh, ROOM, card, RUSH);
    for (const [id, [x, y]] of Object.entries(L.points)) {
      const top = id === 'finalRush' ? y - RUSH.h / 2 : y - card.h;
      const bottom = id === 'finalRush' ? y + RUSH.h / 2 : y;
      assert.ok(x - card.w / 2 >= ROOM.side - 0.5 && x + card.w / 2 <= vw - ROOM.side + 0.5, `${id} x ${x.toFixed(1)}`);
      assert.ok(top >= ROOM.top - 0.5, `${id} top ${top.toFixed(1)} under the header`);
      assert.ok(bottom <= vh - ROOM.bottom + 0.5, `${id} bottom ${bottom.toFixed(1)}`);
    }
  });
}

test('common phones and desktops are fully covered by the plate (no bare edges)', () => {
  for (const [vw, vh] of [[360, 740], [390, 844], [412, 915], [768, 1024], [1440, 900], [1920, 1080]]) {
    const L = layoutScene(SCENES[pickScene(vw, vh)], vw, vh, ROOM, cardFor(vw), RUSH);
    assert.ok(L.covers, `${vw}x${vh} covered`);
  }
});

test('a cramped screen shrinks the plate instead of losing a station', () => {
  const L = layoutScene(SCENES.portrait, 320, 640, ROOM, cardFor(320), RUSH);
  assert.equal(L.height, 640, 'still fits without scrolling');
  const ys = Object.values(L.points).map(p => p[1]);
  assert.ok(Math.min(...ys) - 96 >= ROOM.top - 0.5 && Math.max(...ys) + RUSH.h / 2 <= 640 - ROOM.bottom + 0.5);
});

test('below a minimum size the hub scrolls rather than stacking cards on each other', () => {
  const sc = SCENES.portrait, L = layoutScene(sc, 320, 480, ROOM, cardFor(320), RUSH);
  assert.ok(L.height > 480, `scrolls (${L.height.toFixed(0)} px tall)`);
  const gap = L.points.pilsner[1] - L.points.hefeweizen[1];
  assert.ok(gap >= 96 + 8 - 1e-6, `back card clears the foreground cards (${gap.toFixed(1)})`);
  assert.ok(L.points.finalRush[1] + RUSH.h / 2 <= L.height - ROOM.bottom + 0.5);
});
