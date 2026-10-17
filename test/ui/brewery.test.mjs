// M3: the brewery hub, navigation between it and the Pilsner station,
// progress states, back navigation, and the interrupted-pour rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const APP = () => URL0 + '/brewery.html';
// Most hub tests are about a returning learner: landing and intro already
// seen, and reduced motion so stations open without the camera push. The M4
// tests at the end cover first visits and the push itself.
const RETURNING = () => {
  if (localStorage.getItem('riverside.progress')) return;
  const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1,
    stations: { pilsner: st(), hefeweizen: st(), stout: st() }, seen: { landing: true, 'intro.pilsner': true } }));
};
const _openPage = openPage;
const openApp = (b, url, opts = {}) => _openPage(b, url, { reducedMotion: 'reduce', mobile: false, size: { width: 1280, height: 720 }, ...opts,
  init: opts.init === undefined ? RETURNING : opts.init });
const chip = (h, id) => h.text('#chip-' + id);
// With the paused clock, hashchange is delivered after run() returns, so
// navigation needs a beat before time is advanced.
const settle = async (h, ms = 200) => { await h.run(0); await h.page.evaluate(() => 0); await h.run(16); await h.run(ms); };
const progress = h => h.page.evaluate(() => JSON.parse(localStorage.getItem('riverside.progress')));
const hubVisible = h => h.page.evaluate(() => !document.getElementById('hub').hidden);
const lastLog = h => h.page.evaluate(() => { const l = JSON.parse(localStorage.getItem('perfectPour.log.v2.3') || '[]'); return l[l.length - 1] || null; });

const INSTRUMENT = () => {
  const live = new Map(); window.__pp = { live, raf: 0 };
  for (const t of [window, document]) {
    const add = t.addEventListener.bind(t), rem = t.removeEventListener.bind(t);
    const key = (type, o) => `${t === window ? 'w' : 'd'}:${type}:${typeof o === 'object' ? !!o.capture : !!o}`;
    t.addEventListener = (type, fn, o) => { live.set(fn, (live.get(fn) || new Set()).add(key(type, o))); add(type, fn, o); };
    t.removeEventListener = (type, fn, o) => { const s = live.get(fn); if (s) { s.delete(key(type, o)); if (!s.size) live.delete(fn); } rem(type, fn, o); };
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { window.__pp.raf++; return raf(cb); };
};
const listeners = h => h.page.evaluate(() => [...window.__pp.live.values()].reduce((n, s) => n + s.size, 0));

test('hub: Pilsner is the place to start, the others are visible but not playable, Final Rush is locked', async () => {
  const h = await openApp(browser, APP());
  await h.run(200);
  assert.equal(await h.page.title(), 'The Bar · Riverside Brewing Co.');
  assert.equal(await chip(h, 'pilsner'), 'Start here');
  assert.equal(await chip(h, 'hefeweizen'), 'Coming soon');
  assert.equal(await chip(h, 'stout'), 'Coming soon');
  for (const id of ['hefeweizen', 'stout'])
    assert.equal(await h.page.getAttribute(`[data-station=${id}]`, 'aria-disabled'), 'true');
  assert.equal(await h.page.getAttribute('[data-station=pilsner]', 'aria-disabled'), null);
  assert.equal(await h.page.getAttribute('#rushBtn', 'aria-disabled'), 'true');
  assert.match(await h.text('#rushChip'), /Locked/);
  assert.equal(await h.text('#hubCount'), '0');
  // Coming soon and locked do nothing but say so.
  await h.page.click('[data-station=hefeweizen]', { force: true }); await h.run(100);
  assert.ok(await hubVisible(h));
  assert.match(await h.text('#hubNotice'), /Hefeweizen is coming soon/);
  await h.page.click('#rushBtn', { force: true }); await h.run(100);
  assert.match(await h.text('#hubNotice'), /Final Rush unlocks/);
  assert.equal(await h.page.evaluate(() => location.hash), '');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('deep links: a coming-soon station falls back to the hub; the Pilsner opens directly', async () => {
  const h = await openApp(browser, APP() + '#/stout');
  await h.run(200);
  assert.ok(await hubVisible(h));
  assert.equal(await h.page.evaluate(() => location.hash), '#/');
  assert.match(await h.text('#hubNotice'), /Nitro Stout is coming soon/);
  await h.close();
  const d = await openApp(browser, APP() + '#/pilsner');
  await d.run(200);
  assert.equal(await d.page.evaluate(() => window.ppBrewery.current()), 'pilsner');
  // Opened directly, "Back to the bar" replaces the entry instead of leaving the app.
  await d.page.click('#exitBtn'); await settle(d, 200);
  assert.ok(await hubVisible(d));
  assert.deepEqual(d.errors, []);
  await d.close();
});

test('open the Pilsner, come back: In progress is saved, focus returns, nothing leaks', async () => {
  const h = await openApp(browser, APP(), { init: `(${RETURNING})();(${INSTRUMENT})();` });
  await h.run(200);
  const atHub = await listeners(h);
  await h.page.click('[data-station=pilsner]'); await settle(h, 300);
  assert.ok(!(await hubVisible(h)));
  assert.equal(await h.page.evaluate(() => location.hash), '#/pilsner');
  assert.equal(await h.page.evaluate(() => document.activeElement.id), 'exitBtn');
  assert.equal(await h.page.title(), 'Pilsner station · Riverside Brewing Co.');
  const p = await progress(h);
  assert.equal(p.version, 1);
  assert.equal(p.stations.pilsner.status, 'inProgress');
  await h.page.click('#exitBtn'); await settle(h, 300);
  assert.ok(await hubVisible(h));
  assert.equal(await h.page.evaluate(() => location.hash), '', 'stepped back in history, not forward');
  assert.equal(await chip(h, 'pilsner'), 'Continue');
  assert.match(await h.text('#status-pilsner'), /In progress/);
  assert.equal(await h.page.evaluate(() => document.activeElement.dataset.station), 'pilsner');
  assert.equal(await h.page.evaluate(() => document.getElementById('stationHost').childElementCount), 0);
  assert.equal(await listeners(h), atHub, 'station listeners all removed');
  const raf = await h.page.evaluate(() => window.__pp.raf);
  await h.run(1000);
  assert.equal(await h.page.evaluate(() => window.__pp.raf), raf, 'no animation loop left running');
  // Progress survives a reload.
  await h.page.reload(); await h.run(200);
  assert.equal(await chip(h, 'pilsner'), 'Continue');
  assert.equal(await h.page.evaluate(() => document.querySelector('.hub__ring[data-ring=pilsner]').className), 'hub__ring hub__ring--progress');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('browser back mid-pour: tap closes, attempt abandoned and logged, ungraded; return starts fresh', async () => {
  const h = await openApp(browser, APP(), { mobile: false });
  await h.run(200);
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  await h.page.click('#modes [data-mode=guided]'); await h.run(100);
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' '); await h.run(2500);
  assert.equal(await h.page.getAttribute('#pour', 'aria-pressed'), 'true', 'pouring');
  const levelBefore = parseInt((await h.text('#levelText')).replace(/\D/g, ''), 10);
  assert.ok(levelBefore > 5);
  await h.page.goBack(); await settle(h, 300);
  await h.page.keyboard.up(' ');
  assert.ok(await hubVisible(h));
  assert.equal(await h.text('#hubNotice'), 'Pour stopped. Attempt not scored. Return to Pilsner to try again.');
  const log = await lastLog(h);
  assert.equal(log.served, false);
  assert.equal(log.endedBy, 'navigate');
  assert.equal(log.pass, null, 'never graded');
  assert.equal(log.mode, 'guided');
  const p = await progress(h);
  assert.equal(p.stations.pilsner.abandoned, 1);
  assert.equal(p.stations.pilsner.attempts, 0);
  assert.equal(p.stations.pilsner.status, 'inProgress', 'still In progress, not reset or certified');
  // Back in: a fresh attempt, empty glass, demo first.
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  assert.equal(await h.page.getAttribute('#modes [data-mode=watch]', 'aria-current'), 'true');
  assert.match(await h.text('#levelText'), /\b0%/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('leaving between pours abandons nothing; a served pour counts as an attempt', async () => {
  const h = await openApp(browser, APP(), { mobile: false });
  await h.run(200);
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  // Watching the demo is not an attempt.
  await h.run(3000);
  await h.page.click('#exitBtn'); await settle(h, 200);
  assert.equal(await h.text('#hubNotice'), '');
  let p = await progress(h);
  assert.equal(p.stations.pilsner.abandoned, 0);
  // A Solo pour, served.
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  await h.page.click('#modes [data-mode=solo]'); await h.run(100);
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 1000 && parseInt((await h.text('#levelText')).replace(/\D/g, ''), 10) < 55; i++) await h.run(16);
  for (let i = 0; i < 9; i++) { await h.page.keyboard.press('ArrowUp'); await h.run(120); }
  for (let i = 0; i < 1000 && parseInt((await h.text('#levelText')).replace(/\D/g, ''), 10) < 95; i++) await h.run(16);
  await h.page.keyboard.up(' '); await h.run(600);
  await h.page.keyboard.press('s'); await h.run(300);
  assert.ok(!(await h.page.isHidden('#result')), 'served');
  await h.page.click('#exitBtn'); await settle(h, 200);
  p = await progress(h);
  assert.equal(p.stations.pilsner.attempts, 1);
  assert.equal(p.stations.pilsner.abandoned, 0, 'a served pour is not abandoned on leaving');
  assert.equal((await lastLog(h)).endedBy, 'served');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('progress storage: unreadable data starts fresh; data from a newer version is never overwritten', async () => {
  // Fresh start means a first visit again: the landing, then the hub.
  const bad = await openApp(browser, APP(), { init: () => localStorage.setItem('riverside.progress', '{not json') });
  await bad.run(200);
  assert.equal(await bad.page.evaluate(() => window.ppBrewery.view()), 'landing');
  await bad.page.click('#startBtn'); await settle(bad, 200);
  assert.equal(await chip(bad, 'pilsner'), 'Start here');
  assert.deepEqual(bad.errors, []);
  await bad.close();
  const NEWER = JSON.stringify({ version: 99, stations: {}, future: true });
  const nw = await openApp(browser, APP(), { init: `localStorage.setItem('riverside.progress', ${JSON.stringify(NEWER)})` });
  await nw.run(200);
  await nw.page.click('#startBtn'); await settle(nw, 200);
  await nw.page.click('[data-station=pilsner]'); await settle(nw, 200);
  await nw.page.click('#introBegin'); await settle(nw, 200);
  assert.equal(await nw.page.evaluate(() => localStorage.getItem('riverside.progress')), NEWER);
  await nw.close();
});

// ---- Hub scene: one 16:9 frame, anchoring, layout ----
// Coordinates are taken relative to the frame (#app-root), which is
// letterboxed inside windows of other shapes.
const geometry = h => h.page.evaluate(() => {
  const f = document.getElementById('app-root').getBoundingClientRect();
  const r = el => { const b = el.getBoundingClientRect(); return { x: b.left - f.left, y: b.top - f.top, w: b.width, h: b.height }; };
  const hub = document.getElementById('hub');
  return {
    frame: { x: f.left, y: f.top, w: f.width, h: f.height },
    scene: hub.dataset.scene, L: window.ppBrewery.layout(), vw: hub.clientWidth, vh: hub.clientHeight,
    scrollW: hub.scrollWidth, docScrollW: document.documentElement.scrollWidth,
    plate: r(document.getElementById('hubPlate')),
    rings: Object.fromEntries([...document.querySelectorAll('.hub__ring')].map(e => [e.dataset.ring, r(e)])),
    boxes: [...document.querySelectorAll('.hub__card, #rushBtn')].map(e => ({ id: e.dataset.station || e.id, ...r(e) })),
    header: r(document.getElementById('hubTop'))
  };
});
const overlap = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

for (const [w, hgt, mobile] of [[1280, 720], [1920, 1080], [1440, 900], [1024, 768], [2560, 1080], [844, 390, true], [667, 375, true]]) {
  test(`hub in a ${w}x${hgt} window: 16:9 frame, hotspots on their anchors, nothing clipped or overlapping`, async () => {
    const h = await openApp(browser, APP(), { size: { width: w, height: hgt }, mobile: !!mobile });
    await h.run(300);
    const g = await geometry(h);
    assert.ok(Math.abs(g.frame.w / g.frame.h - 16 / 9) < 0.01, `frame is 16:9 (${g.frame.w}x${g.frame.h})`);
    assert.ok(Math.abs(g.frame.w - Math.min(w, hgt * 16 / 9)) < 1, 'frame fills the window as far as 16:9 allows');
    assert.ok(Math.abs(g.frame.x - (w - g.frame.w) / 2) < 1 && Math.abs(g.frame.y - (hgt - g.frame.h) / 2) < 1, 'frame centred');
    assert.equal(g.scene, 'desktop');
    // The plate is drawn exactly where the layout says, so anchors line up with the art.
    assert.ok(Math.abs(g.plate.x - g.L.ox) < 1 && Math.abs(g.plate.y - g.L.oy) < 1, 'plate offset');
    for (const [id, ring] of Object.entries(g.rings)) {
      const [ax, ay] = g.L.points[id];
      assert.ok(Math.abs(ring.x + ring.w / 2 - ax) < 1 && Math.abs(ring.y + ring.h / 2 - ay) < 1, `${id} ring on its anchor`);
    }
    for (const b of g.boxes) {
      assert.ok(b.x >= 0 && b.x + b.w <= g.vw + 0.5, `${b.id} inside the frame`);
      assert.ok(b.y >= g.header.y + g.header.h - 1, `${b.id} below the header`);
      assert.ok(b.h >= (g.L.ui < 1 ? 42 : 44), `${b.id} touch target (${b.h.toFixed(1)} px)`);
    }
    for (let i = 0; i < g.boxes.length; i++) for (let j = i + 1; j < g.boxes.length; j++)
      assert.ok(!overlap(g.boxes[i], g.boxes[j]), `${g.boxes[i].id} and ${g.boxes[j].id} overlap`);
    assert.ok(g.scrollW <= g.vw + 1 && g.docScrollW <= w + 1, 'no horizontal scroll');
    assert.deepEqual(h.errors, []);
    await h.close();
  });
}

test('resizing the window keeps the 16:9 frame and the hotspots follow', async () => {
  const h = await openApp(browser, APP(), { size: { width: 1280, height: 720 } });
  await h.run(200);
  await h.page.setViewportSize({ width: 1024, height: 768 });
  // Resize events reach the page on the browser's schedule, not the paused
  // test clock: wait (bounded) for the new layout instead of assuming a delay.
  for (let i = 0; i < 40 && Math.abs((await geometry(h)).vw - 1024) > 1; i++) { await h.page.waitForTimeout(25); await h.run(16); }
  await settle(h, 100);
  const g = await geometry(h);
  assert.ok(Math.abs(g.frame.w - 1024) < 1 && Math.abs(g.frame.h - 576) < 1, 'letterboxed 1024x576');
  const ring = g.rings.pilsner, [ax, ay] = g.L.points.pilsner;
  assert.ok(Math.abs(ring.x + ring.w / 2 - ax) < 1 && Math.abs(ring.y + ring.h / 2 - ay) < 1);
  await h.close();
});

test('upright phone: a dismissable "turn sideways" prompt over the letterboxed frame', async () => {
  const h = await openApp(browser, APP(), { size: { width: 390, height: 844 }, mobile: true });
  await h.run(200);
  assert.equal(await h.page.isVisible('#rotatePrompt'), true);
  assert.equal(await h.text('#rotateTitle'), 'Turn your phone sideways');
  const g = await geometry(h);
  assert.ok(Math.abs(g.frame.w - 390) < 1 && Math.abs(g.frame.h - 219.4) < 1, 'still a 16:9 frame');
  await h.page.tap('#rotateDismiss'); await h.run(50);
  assert.equal(await h.page.isVisible('#rotatePrompt'), false);
  await h.close();
  // Desktop windows never see it, even narrow ones.
  const d = await openApp(browser, APP(), { size: { width: 500, height: 800 } });
  await d.run(200);
  assert.equal(await d.page.isVisible('#rotatePrompt'), false);
  await d.close();
});

test('real art loads unlabelled, the UI scales with the frame; missing art is flagged and the hub still works', async () => {
  for (const [w, hgt, ui] of [[1280, 720, 1], [1920, 1080, 1.5], [844, 390, 0.7]]) {
    const d = await openApp(browser, APP(), { size: { width: w, height: hgt }, mobile: w < 1000 });
    await d.run(200);
    assert.equal(await d.page.isVisible('#hubProvisional'), false);
    assert.match(await d.page.getAttribute('#hubPlate', 'src'), /hub-desktop\.webp$/);
    const L = await d.page.evaluate(() => window.ppBrewery.layout());
    assert.ok(Math.abs(L.ui - ui) < 1e-3, `ui scale ${L.ui} at ${w}x${hgt}`);
    const cardW = await d.page.evaluate(() => document.querySelector('[data-station=pilsner]').getBoundingClientRect().width);
    assert.ok(Math.abs(cardW - 176 * ui) < 2, `card ${cardW.toFixed(1)} px wide`);
    if (w === 1280) {
      let size = null;
      for (let i = 0; i < 60 && !size; i++) {
        size = await d.page.evaluate(() => { const im = document.getElementById('hubPlate'); return im.complete && im.naturalWidth ? [im.naturalWidth, im.naturalHeight] : null; });
        if (!size) await d.page.waitForTimeout(100);
      }
      assert.deepEqual(size, [1672, 941]);
    }
    await d.close();
  }
  const b = await openApp(browser, APP());
  await b.page.route('**/assets/hub/**', r => r.abort());
  await b.page.reload(); await b.run(300);
  assert.equal(await b.page.evaluate(() => document.getElementById('hub').classList.contains('hub--noart')), true);
  assert.equal(await b.text('#hubProvisional'), 'Hub art failed to load');
  await b.page.click('[data-station=pilsner]'); await settle(b, 200);
  assert.equal(await b.page.evaluate(() => window.ppBrewery.current()), 'pilsner');
  await b.close();
});

test('truthful hub: nothing certified, no rejected slogan, coming-soon cards offer no Start', async () => {
  const h = await openApp(browser, APP());
  await h.run(200);
  const text = await h.page.evaluate(() => document.body.innerText);
  assert.doesNotMatch(text, /good beer|better people/i);
  assert.doesNotMatch(text, /✓|Replay/, 'no certified station shown');
  assert.equal(await h.text('#hubCount'), '0');
  assert.equal(await h.page.locator('.hub__action--certified, .hub__ring--certified').count(), 0);
  for (const id of ['hefeweizen', 'stout']) {
    assert.equal(await chip(h, id), 'Coming soon');
    assert.doesNotMatch(await h.text(`[data-station=${id}]`), /Start|Continue/);
  }
  for (const f of ['assets/hub/hub-desktop-provisional.svg']) {
    const svg = await h.page.evaluate(async u => (await fetch(u)).text(), f);
    assert.doesNotMatch(svg, /good beer|better people/i, f);
  }
  await h.close();
});

// ---- M4: landing, first visit vs returning, station intro, camera push ----
const view = h => h.page.evaluate(() => window.ppBrewery.view());

test('first visit: landing, Start Training to the hub; a returning learner skips the landing', async () => {
  const h = await openApp(browser, APP(), { init: null, size: { width: 1280, height: 720 }, mobile: false });
  await h.run(200);
  assert.equal(await view(h), 'landing');
  assert.equal(await h.page.title(), 'Perfect Pour · Riverside Brewing Co.');
  assert.equal(await h.page.isVisible('#landProvisional'), true, 'stand-in art is labelled');
  await h.page.click('#startBtn'); await settle(h, 200);
  assert.equal(await view(h), 'hub');
  assert.equal(await h.page.evaluate(() => location.hash), '#/');
  assert.equal((await progress(h)).seen.landing, true);
  await h.page.reload(); await h.run(200);
  assert.equal(await view(h), 'hub', 'returning learner goes straight to the hub');
  // The landing can still be reached on purpose.
  await h.page.evaluate(() => { location.hash = '#/welcome'; }); await settle(h, 200);
  assert.equal(await view(h), 'landing');
  await h.page.click('#startBtn'); await settle(h, 200);
  assert.equal(await view(h), 'hub');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('station intro: shown on the first visit only, Begin opens the station; leaving from it abandons nothing', async () => {
  const h = await openApp(browser, APP(), { init: null, mobile: false, size: { width: 1280, height: 720 } });
  await h.run(200);
  await h.page.click('#startBtn'); await settle(h, 200);
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  assert.equal(await view(h), 'intro');
  assert.equal(await h.page.evaluate(() => document.activeElement.id), 'introBegin');
  assert.equal((await progress(h)).stations.pilsner.status, 'inProgress', 'entering the station starts training');
  // Back out from the intro: nothing to abandon, and it shows again next time.
  await h.page.goBack(); await settle(h, 200);
  assert.equal(await view(h), 'hub');
  assert.equal(await h.text('#hubNotice'), '');
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  assert.equal(await view(h), 'intro');
  await h.page.click('#introBegin'); await settle(h, 200);
  assert.equal(await view(h), 'station');
  assert.equal(await h.page.evaluate(() => document.activeElement.id), 'exitBtn');
  await h.page.click('#exitBtn'); await settle(h, 200);
  await h.page.click('[data-station=pilsner]'); await settle(h, 200);
  assert.equal(await view(h), 'station', 'second visit goes straight in');
  assert.equal((await progress(h)).stations.pilsner.abandoned, 0);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('camera push: the hub zooms toward the station for ~0.65 s before it opens', async () => {
  const h = await openApp(browser, APP(), { reducedMotion: 'no-preference', mobile: false, size: { width: 1280, height: 720 } });
  await h.run(200);
  await h.page.click('[data-station=pilsner]'); await h.run(0); await h.page.evaluate(() => 0);
  await h.run(300);
  assert.equal(await view(h), 'pushing');
  assert.equal(await h.page.evaluate(() => document.getElementById('hub').classList.contains('is-pushing')), true);
  assert.equal(await h.page.evaluate(() => window.ppBrewery.current()), null, 'not mounted mid-push');
  const origin = await h.page.evaluate(() => document.getElementById('hubCanvas').style.transformOrigin);
  const [ax, ay] = await h.page.evaluate(() => window.ppBrewery.layout().points.pilsner);
  assert.equal(origin, `${ax.toFixed(1)}px ${ay.toFixed(1)}px`, 'zooms toward the Pilsner station');
  await h.run(400);
  assert.equal(await view(h), 'station');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('camera push is cancellable: back mid-push returns to an intact hub and nothing opens later', async () => {
  const h = await openApp(browser, APP(), { reducedMotion: 'no-preference', mobile: false, size: { width: 1280, height: 720 } });
  await h.run(200);
  await h.page.click('[data-station=pilsner]'); await h.run(0); await h.page.evaluate(() => 0);
  await h.run(200);
  assert.equal(await view(h), 'pushing');
  await h.page.goBack(); await settle(h, 100);
  assert.equal(await view(h), 'hub');
  assert.equal(await h.page.evaluate(() => document.getElementById('hub').classList.contains('is-pushing')), false);
  await h.run(1500);
  assert.equal(await view(h), 'hub', 'the cancelled push never completes');
  assert.equal(await h.page.evaluate(() => window.ppBrewery.current()), null);
  assert.equal((await progress(h)).stations.pilsner.status, 'new', 'not entered, so not started');
  // The hub still works normally afterwards.
  await h.page.click('[data-station=pilsner]'); await h.run(0); await h.page.evaluate(() => 0); await h.run(800);
  assert.equal(await view(h), 'station');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('reduced motion: no camera push, the station opens at once', async () => {
  const h = await openApp(browser, APP(), { mobile: false, size: { width: 1280, height: 720 } });
  await h.run(200);
  await h.page.click('[data-station=pilsner]'); await settle(h, 16);
  assert.equal(await view(h), 'station');
  assert.equal(await h.page.evaluate(() => document.getElementById('hub').classList.contains('is-pushing')), false);
  await h.close();
});
