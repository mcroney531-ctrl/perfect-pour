// Station lifecycle and logging, for both stations (and the legacy page):
// the behaviour the shared station kit must keep exactly
// (docs/shared-station-ui.md). Written against the stations before the
// extraction, and run unchanged after it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const LOG = { pilsner: 'perfectPour.log.v2.3', hefeweizen: 'perfectPour.log.hefe.v1', stout: 'perfectPour.log.stout.v1' };
const RETURNING = `(() => {
  const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1, stations: { pilsner: st(), hefeweizen: st(), stout: st() },
    seen: { landing: true, 'intro.pilsner': true, 'intro.hefeweizen': true, 'intro.stout': true } }));
})()`;
// Counts live window/document listeners, animation frames and timers (with
// when each timer was set), installed before the page's scripts.
const INSTRUMENT = `(() => {
  const live = new Map(); window.__pp = { live, raf: 0, timers: new Map(), seq: 0 };
  for (const t of [window, document]) {
    const add = t.addEventListener.bind(t), rem = t.removeEventListener.bind(t);
    const key = (type, o) => (t === window ? 'w' : 'd') + ':' + type + ':' + (typeof o === 'object' ? !!o.capture : !!o);
    t.addEventListener = (type, fn, o) => { live.set(fn, (live.get(fn) || new Set()).add(key(type, o))); add(type, fn, o); };
    t.removeEventListener = (type, fn, o) => { const s = live.get(fn); if (s) { s.delete(key(type, o)); if (!s.size) live.delete(fn); } rem(type, fn, o); };
  }
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { window.__pp.raf++; return raf(cb); };
  const st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window);
  window.setTimeout = (fn, ms, ...a) => { const id = st(() => { window.__pp.timers.delete(id); fn(...a); }, ms); window.__pp.timers.set(id, ++window.__pp.seq); return id; };
  window.clearTimeout = id => { window.__pp.timers.delete(id); ct(id); };
})()`;
const listeners = h => h.page.evaluate(() => [...window.__pp.live.values()].reduce((n, s) => n + s.size, 0));
const pressed = h => h.page.getAttribute('#pour', 'aria-pressed');
const app = (station, extra = '') => openPage(browser, `${URL0}/brewery.html#/${station}`,
  { mobile: false, size: { width: 1280, height: 720 }, reducedMotion: 'reduce', exactClock: true, init: RETURNING + ';' + extra });
async function startPour(h) {
  await h.page.click('#modes [data-mode=guided]'); await h.run(200);
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' '); await h.run(1500);
  assert.equal(await pressed(h), 'true');
}

for (const station of ['pilsner', 'hefeweizen', 'stout']) {
  test(`${station}: the tap closes on window blur, page hide and a hidden tab`, async () => {
    const triggers = {
      blur: () => window.dispatchEvent(new Event('blur')),
      pagehide: () => window.dispatchEvent(new Event('pagehide')),
      hidden: () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); }
    };
    for (const [name, fn] of Object.entries(triggers)) {
      const h = await app(station);
      await h.run(300);
      await startPour(h);
      await h.page.evaluate(fn); await h.run(400);
      assert.equal(await pressed(h), 'false', `${name}: tap closed`);
      const lv = await h.level(); await h.run(1000);
      assert.equal(await h.level(), lv, `${name}: no more beer`);
      await h.page.keyboard.up(' ');
      assert.deepEqual(h.errors, []);
      await h.close();
    }
  });

  test(`${station}: unmount mid-pour abandons once, is safe to repeat, and leaves no listener, frame, timer or announcement behind`, async () => {
    const h = await app(station, INSTRUMENT);
    await h.run(300);
    // Mount directly, as the contract test does, to hold the handle.
    await h.page.evaluate(() => { window.location.hash = '#/'; });
    await h.run(300);
    const atHub = await listeners(h);
    const seqAtMount = await h.page.evaluate(sid => {
      document.getElementById('hub').hidden = true;
      const host = document.createElement('div'); host.id = 'lcHost';
      document.getElementById('app-root').appendChild(host);
      window.__ev = [];
      window.__h = RiversideStations.get(sid).mount(host, { onExit() {}, onEvent: (t, d) => window.__ev.push([t, d]) });
      return window.__pp.seq;
    }, station);
    await h.run(200);
    await h.page.click('#lcHost #modes [data-mode=guided]'); await h.run(200);
    await h.page.keyboard.press('t'); await h.run(400);
    await h.page.keyboard.down(' '); await h.run(1500);
    const logBefore = await h.page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]').length, LOG[station]);
    // An announcement is queued (mode change) and the station unmounted
    // before it flushes: it must be dropped with the timer.
    await h.page.evaluate(() => document.querySelector('#lcHost #modes [data-mode=solo]').click());
    const first = await h.page.evaluate(() => window.__h.unmount('lifecycle'));
    await h.page.keyboard.up(' ');
    // A mode change logs the pour it interrupts (endedBy modeChange), so the
    // solo pour that replaced it is unopened: nothing to abandon.
    assert.deepEqual(first, { abandoned: false });
    const left = await h.page.evaluate(seq => [...window.__pp.timers.values()].filter(s => s > seq).length, seqAtMount);
    assert.equal(left, 0, 'no station timer left pending');
    assert.deepEqual(await h.page.evaluate(() => window.__h.unmount('again')), { abandoned: false }, 'second unmount is a no-op');
    const logs = await h.page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LOG[station]);
    assert.equal(logs.length, logBefore + 1, 'the interrupted pour logged once');
    assert.equal(logs.at(-1).endedBy, 'modeChange');
    assert.deepEqual(await h.page.evaluate(() => window.__ev), [], 'no abandoned event for an unopened pour');
    assert.equal(await h.page.evaluate(() => document.getElementById('lcHost').childElementCount), 0);
    assert.equal(await listeners(h), atHub, 'listeners back to the hub count');
    const raf = await h.page.evaluate(() => window.__pp.raf);
    await h.run(1000);
    assert.equal(await h.page.evaluate(() => window.__pp.raf), raf, 'no animation loop');
    // And an opened pour: abandoned exactly once, logged once, ungraded.
    await h.page.evaluate(sid => {
      window.__ev = [];
      window.__h = RiversideStations.get(sid).mount(document.getElementById('lcHost'), { onExit() {}, onEvent: (t, d) => window.__ev.push([t, d]) });
    }, station);
    await h.run(200);
    await h.page.click('#lcHost #modes [data-mode=guided]'); await h.run(200);
    await h.page.keyboard.press('t'); await h.run(400);
    await h.page.keyboard.down(' '); await h.run(1500);
    assert.deepEqual(await h.page.evaluate(() => window.__h.unmount('lifecycle')), { abandoned: true });
    assert.deepEqual(await h.page.evaluate(() => window.__h.unmount('lifecycle')), { abandoned: false });
    await h.page.keyboard.up(' ');
    assert.deepEqual(await h.page.evaluate(() => window.__ev), [['abandoned', { mode: 'guided', reason: 'lifecycle' }]]);
    const after = await h.page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LOG[station]);
    assert.equal(after.length, logs.length + 1);
    assert.equal(after.at(-1).endedBy, 'lifecycle');
    assert.equal(after.at(-1).pass, null, 'never graded');
    assert.equal(await listeners(h), atHub);
    assert.deepEqual(h.errors, []);
    await h.close();
  });

  test(`${station}: log keeps its key, fields, cap and attempt numbering`, async () => {
    // A full log: 2000 old entries. One served pour must drop the oldest.
    const fill = `localStorage.setItem('${LOG[station]}', JSON.stringify(Array.from({ length: 2000 }, (_, i) => ({ old: i }))));`;
    const h = await app(station, fill);
    await h.run(300);
    await h.page.click('#modes [data-mode=guided]'); await h.run(200);
    await h.page.keyboard.press('t'); await h.run(400);
    await h.page.keyboard.down(' ');
    for (let i = 0; i < 2000 && (await h.level()) < 55; i++) await h.run(16);
    for (let i = 0; i < 9; i++) { await h.page.keyboard.press('ArrowUp'); await h.run(130); }
    if (station === 'stout') {
      // Stage one to about 72%, set down, let it settle, top up to the rim.
      for (let i = 0; i < 2000 && (await h.level()) < 72; i++) await h.run(16);
      await h.page.keyboard.up(' '); await h.run(12000);
      await h.page.keyboard.down(' ');
      for (let i = 0; i < 2000 && (await h.level()) < 101; i++) await h.run(16);
    } else {
      for (let i = 0; i < 2000 && (await h.level()) < 94; i++) await h.run(16);
    }
    await h.page.keyboard.up(' '); await h.run(600);
    await h.page.keyboard.press('s'); await h.run(400);
    await h.page.keyboard.press('r'); await h.run(200);          // a second pour, abandoned by restart
    await h.page.keyboard.press('t'); await h.run(400);
    await h.page.keyboard.down(' '); await h.run(800); await h.page.keyboard.up(' '); await h.run(300);
    await h.page.keyboard.press('r'); await h.run(200);
    const logs = await h.page.evaluate(k => JSON.parse(localStorage.getItem(k)), LOG[station]);
    assert.equal(logs.length, 2000, 'capped at 2000');
    assert.equal(logs[0].old, 2, 'the two oldest dropped');
    const [served, restarted] = logs.slice(-2);
    assert.equal(served.attempt, 1); assert.equal(restarted.attempt, 2);
    assert.equal(served.session, restarted.session);
    assert.equal(served.endedBy, 'served'); assert.equal(restarted.endedBy, 'restart');
    assert.equal(served.station, station);
    // The field list (names only; values vary) against a fixture.
    const shape = e => Object.keys(e).sort().map(k => e[k] && typeof e[k] === 'object' && !Array.isArray(e[k])
      ? `${k}{${Object.keys(e[k]).sort().join(',')}}` : k).join('\n') + '\n';
    for (const [kind, e] of [['served', served], ['restart', restarted]]) {
      const file = path.join(FIX, `${station}-log-${kind}.txt`), now = shape(e);
      if (UPDATE || !fs.existsSync(file)) fs.writeFileSync(file, now);
      else assert.equal(now, fs.readFileSync(file, 'utf8'), `${station} ${kind} log fields`);
    }
    assert.deepEqual(h.errors, []);
    await h.close();
  });
}

test('legacy page: unmount closes the tap and leaves nothing behind; its log is the Pilsner log', async () => {
  const h = await openPage(browser, URL0 + '/index.html', { exactClock: true, init: INSTRUMENT });
  await h.run(300);
  await h.page.tap('#modes [data-mode=guided]'); await h.run(200);
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' '); await h.run(1500);
  assert.equal(await pressed(h), 'true');
  const r = await h.page.evaluate(() => window.ppStation.unmount('lifecycle'));
  await h.page.keyboard.up(' ');
  assert.deepEqual(r, { abandoned: true });
  assert.deepEqual(await h.page.evaluate(() => window.ppStation.unmount('again')), { abandoned: false });
  const log = await h.page.evaluate(() => JSON.parse(localStorage.getItem('perfectPour.log.v2.3')).at(-1));
  assert.equal(log.endedBy, 'lifecycle'); assert.equal(log.station, 'pilsner');
  assert.equal(await h.page.evaluate(() => document.getElementById('pp-root').childElementCount), 0);
  const raf = await h.page.evaluate(() => window.__pp.raf);
  await h.run(1000);
  assert.equal(await h.page.evaluate(() => window.__pp.raf), raf);
  assert.deepEqual(h.errors, []);
  await h.close();
});
