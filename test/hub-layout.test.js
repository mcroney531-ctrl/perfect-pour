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
const fit = (vw, vh, scene = SCENES.desktop) => layoutScene(scene, vw, vh, ROOM, { w: 176, h: 82 }, { w: 230, h: 90 });

test('one composition: every window gets the landscape plate', () => {
  for (const [w, h] of [[390, 844], [1024, 768], [1920, 1080]]) assert.equal(pickScene(w, h), 'desktop');
  assert.deepEqual(Object.keys(SCENES), ['desktop']);
});

test('points map linearly: screen = offset + plate * scale', () => {
  const sc = SCENES.desktop, L = fit(1280, 720, sc);
  for (const [id, p] of Object.entries(sc.stations)) {
    assert.ok(Math.abs(L.points[id][0] - (L.ox + p.at[0] * L.s)) < 1e-9, id);
    assert.ok(Math.abs(L.points[id][1] - (L.oy + p.at[1] * L.s)) < 1e-9, id);
  }
});

// The app is a 16:9 frame, so layouts only ever see 16:9 boxes (sizes below
// are frames: desktop, Storyline's default, and phones held sideways).
const FRAMES = [[1920, 1080], [1280, 720], [960, 540], [693, 390], [667, 375]];
const uiFor = vw => Math.min(1.75, Math.max(0.7, vw / 1280));
const fitFrame = (vw, vh) => {
  const ui = uiFor(vw);
  return layoutScene(SCENES.desktop, vw, vh, { ...ROOM, top: 96 * ui + 8 }, { w: 176 * ui, h: 82 * ui }, { w: 230 * ui, h: 90 * ui });
};

for (const [vw, vh] of FRAMES) {
  test(`${vw}x${vh} frame: rings and cards inside, below the header, never overlapping, art fills the frame`, () => {
    const L = fitFrame(vw, vh), top = 96 * uiFor(vw) + 8;
    assert.ok(L.covers, 'the plate fills the frame');
    assert.equal(L.height, vh, 'no scrolling');
    for (const [id, [x]] of Object.entries(L.points))
      assert.ok(x - ROOM.ring / 2 >= ROOM.edge - 0.5 && x + ROOM.ring / 2 <= vw - ROOM.edge + 0.5, `${id} ring x ${x.toFixed(1)}`);
    const boxes = Object.entries(L.cards).map(([id, c]) => ({ id, l: c.cx - c.w / 2, r: c.cx + c.w / 2, t: c.top, b: c.top + c.h }));
    for (const c of boxes) {
      assert.ok(c.l >= ROOM.side - 0.5 && c.r <= vw - ROOM.side + 0.5, `${c.id} inside the width`);
      assert.ok(c.t >= top - 0.5, `${c.id} top ${c.t.toFixed(1)} under the header`);
      assert.ok(c.b <= L.height - ROOM.bottom + 0.5, `${c.id} bottom ${c.b.toFixed(1)}`);
    }
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const apart = a.r + SEP - 0.5 <= b.l || b.r + SEP - 0.5 <= a.l || a.b + SEP - 0.5 <= b.t || b.b + SEP - 0.5 <= a.t;
      assert.ok(apart, `${a.id} and ${b.id} overlap`);
    }
  });
}

test('at 1280x720 the plate is drawn at its native ratio, filling the frame', () => {
  const L = fitFrame(1280, 720);
  assert.ok(Math.abs(L.s - 1280 / 1672) < 0.01 && L.covers);
});
