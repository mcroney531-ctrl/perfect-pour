// The Hefeweizen station (Foam Control) in the brewery app: hub guidance for
// two playable stations, the two Watch demos, foam-led Guided coaching (no
// target band), seeded Solo pours that a restart cannot reroll, debrief copy,
// certification, logging and lifecycle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const APP = () => URL0 + '/brewery.html';
const st = (status = 'new') => ({ status, attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
// A returning learner who has seen both intros; `seq` presets which pour
// comes next in each mode (riverside.hefe.scenario).
const seed = ({ pilsner = 'new', hefeweizen = 'new', seq = null } = {}) => `(() => {
  if (localStorage.getItem('riverside.progress')) return;
  const st = s => ({ status: s, attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1,
    stations: { pilsner: st('${pilsner}'), hefeweizen: st('${hefeweizen}'), stout: st('new') },
    seen: { landing: true, 'intro.pilsner': true, 'intro.hefeweizen': true } }));
  ${seq ? `localStorage.setItem('riverside.hefe.scenario', '${JSON.stringify(seq)}');` : ''}
})()`;
const open = (url, opts = {}) => openPage(browser, url, { reducedMotion: 'reduce', mobile: false, size: { width: 1280, height: 720 }, ...opts });
const settle = async (h, ms = 200) => { await h.run(0); await h.page.evaluate(() => 0); await h.run(16); await h.run(ms); };
const chip = (h, id) => h.text('#chip-' + id);
const progress = h => h.page.evaluate(() => JSON.parse(localStorage.getItem('riverside.progress')));
const hefeLog = h => h.page.evaluate(() => JSON.parse(localStorage.getItem('perfectPour.log.hefe.v1') || '[]'));
const seqNow = h => h.page.evaluate(() => JSON.parse(localStorage.getItem('riverside.hefe.scenario') || 'null'));
// The first pour index in `mode` whose scenario has this label.
const findN = (h, mode, label) => h.page.evaluate(([m, l]) => { for (let n = 0; n < 200; n++) if (HefeSim.scenario(m, n).label === l) return n; return -1; }, [mode, label]);
const foamCue = h => h.page.evaluate(() => {
  const g = document.getElementById('foamCue');
  return g && g.style.display !== 'none' ? document.getElementById('foamCueLine').getAttribute('stroke') : null;
});

// Tilt, hold to pour, start bringing the glass up at `at`% full (nine Up
// presses over ~1.3 s), let go at `stopAt`%.
async function pour(h, { at = 55, stopAt = 94, watch } = {}) {
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 2000 && (await h.level()) < at; i++) { await h.run(16); if (watch) await watch(); }
  for (let i = 0; i < 9; i++) { await h.page.keyboard.press('ArrowUp'); await h.run(150); if (watch) await watch(); }
  for (let i = 0; i < 2000 && (await h.level()) < stopAt; i++) await h.run(16);
  await h.page.keyboard.up(' '); await h.run(600);
}
const mode = async (h, m) => { await h.page.click(`#modes [data-mode=${m}]`); await h.run(200); };
const serve = async h => { await h.page.keyboard.press('s'); await h.run(400); };

test('hub: Pilsner is recommended first, Hefeweizen is open; guidance follows progress', async () => {
  const h = await open(APP(), { init: seed() });
  await h.run(200);
  assert.equal(await chip(h, 'pilsner'), 'Start here');
  assert.equal(await chip(h, 'hefeweizen'), 'Start');
  assert.match(await h.text('#status-hefeweizen'), /^Not started\.$/);
  assert.equal(await h.page.getAttribute('[data-station=hefeweizen]', 'aria-disabled'), null);
  assert.equal(await h.text('[data-station=hefeweizen] .hub__sub'), 'Foam Control');
  assert.equal(await h.text('#hubLede'), 'Your first shift. Start at the Pilsner station.');
  assert.equal(await h.page.locator('.hub__ring--new').count(), 1, 'only one station breathes "start here"');
  await h.close();

  const c = await open(APP(), { init: seed({ pilsner: 'certified' }) });
  await c.run(200);
  assert.equal(await chip(c, 'hefeweizen'), 'Start here');
  assert.match(await c.text('#status-hefeweizen'), /Recommended next/);
  assert.equal(await c.text('#hubLede'), 'Pilsner certified. Next: the Hefeweizen station.');
  await c.close();

  const b = await open(APP(), { init: seed({ pilsner: 'certified', hefeweizen: 'certified' }) });
  await b.run(200);
  assert.equal(await b.text('#hubCount'), '2');
  assert.equal(await b.text('#hubLede'), 'Pilsner and Hefeweizen certified. Next: the Nitro Stout station.');
  assert.match(await b.text('#rushChip'), /Locked/, 'Final Rush still needs all three');
  assert.deepEqual(b.errors, []);
  await b.close();
});

test('first visit: the Hefeweizen intro, then Watch plays the lively demo to a clean pour that waits past half full', async () => {
  const init = `(() => { const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
    localStorage.setItem('riverside.progress', JSON.stringify({ version: 1, stations: { pilsner: st(), hefeweizen: st(), stout: st() }, seen: { landing: true } })); })()`;
  const h = await open(APP(), { init });
  await h.run(200);
  await h.page.click('[data-station=hefeweizen]'); await settle(h, 300);
  assert.equal(await h.text('#introTitle'), 'Foam Control');
  assert.match(await h.text('#introGoal'), /read the foam/);
  await h.page.click('#introBegin'); await settle(h, 300);
  assert.equal(await h.page.evaluate(() => window.ppBrewery.current()), 'hefeweizen');
  assert.equal(await h.page.title(), 'Hefeweizen station · Riverside Brewing Co.');
  assert.equal(await h.page.locator('.st-steps-toggle').count(), 1, 'Watch steps fold away, as at the Pilsner');
  assert.equal(await h.page.locator('#bringMark, #bringBand').count(), 0, 'no BRING UP band on this glass');
  let pastHalf = null, sawFoam = false;
  for (let i = 0; i < 900 && !(await h.page.isVisible('#result')); i++) {
    await h.run(16);
    if (pastHalf === null && /Past half full/.test(await h.text('#caption'))) pastHalf = await h.level();
    if (await foamCue(h)) sawFoam = true;
  }
  assert.ok(pastHalf >= 50, `"past half full" caption at ${pastHalf}%`);
  assert.ok(sawFoam, 'the foam is pointed out during the demo');
  assert.equal(await h.text('#resultTitle'), 'Demo pour: clean');
  assert.match(await h.text('#fbPrimary'), /built foam fast/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Watch a calmer pour: the comparison demo starts up sooner, with less foam, and passes; it is optional', async () => {
  const h = await open(APP() + '#/hefeweizen', { init: seed() });
  await h.run(300);
  assert.equal(await h.text('#calmer'), 'Watch a calmer pour');
  await h.page.click('#calmer'); await h.run(100);
  assert.equal(await h.text('#calmer'), 'Watch the foamy pour again');
  assert.ok(!(await h.page.textContent('#transcript')).includes('Past half full'));
  for (let i = 0; i < 900 && !(await h.page.isVisible('#result')); i++) await h.run(16);
  assert.equal(await h.text('#resultTitle'), 'Demo pour: clean');
  assert.match(await h.text('#fbPrimary'), /built foam slowly/);
  const began = +(/about (\d+)% full/.exec(await h.text('#fbPrimary'))[1]);
  assert.ok(began < 50, `calm demo starts up at ${began}%`);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided: the first pour is typical; the foam is pointed out, no foam hint; a mid-glass bring-up passes', async () => {
  const h = await open(APP() + '#/hefeweizen', { init: seed() });
  await h.run(300);
  await mode(h, 'guided');
  const captions = new Set(); let cue = false;
  await pour(h, { at: 52, watch: async () => { captions.add(await h.text('#caption')); if (await foamCue(h)) cue = true; } });
  assert.ok(cue, 'foam bracket shown in Guided while tilted');
  assert.ok(![...captions].some(c => /Foam is building/.test(c)), 'no foam hint on a typical pour');
  await serve(h);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.match(await h.text('#fbPrimary'), /built a moderate amount of foam/);
  assert.match(await h.text('#debriefText'), /Good range for this pour/);
  const log = (await hefeLog(h)).at(-1);
  assert.equal(log.station, 'hefeweizen');
  assert.equal(log.mode, 'guided');
  assert.deepEqual(log.scenario, { n: 0, seed: null, live: 1, label: 'typical' });
  assert.equal(log.pass, true);
  assert.equal((await progress(h)).stations.hefeweizen.status, 'inProgress', 'Guided never certifies');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided, lively pour: "foam is building fast" at the habit point, the foam is highlighted; coming up at half fails with foam feedback', async () => {
  const probe = await open(APP() + '#/hefeweizen', { init: seed() });
  await probe.run(200);
  const n = await findN(probe, 'guided', 'lively');
  await probe.close();
  assert.ok(n > 0);
  const h = await open(APP() + '#/hefeweizen', { init: seed({ seq: { guided: n, solo: 0 } }) });
  await h.run(300);
  await mode(h, 'guided');
  let hintAt = null, pulse = false;
  await pour(h, { at: 50, watch: async () => {
    if (hintAt === null && /Foam is building fast/.test(await h.text('#caption'))) hintAt = await h.level();
    if ((await foamCue(h)) === '#ffd877') pulse = true;
  } });
  assert.ok(hintAt >= 44 && hintAt <= 52, `hint at ${hintAt}%`);
  assert.ok(pulse, 'the foam bracket lights up with the hint');
  await serve(h);
  assert.notEqual(await h.text('#resultTitle'), 'Clean pour');
  const fb = await h.text('#fbPrimary');
  assert.match(fb, /built foam fast/);
  assert.match(fb, /stay tilted a little longer/);
  assert.doesNotMatch(fb, /usual/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Solo: calm and lively pours only, no coaching; adapting passes and certifies once; the Pilsner habit fails a lively pour', async () => {
  const h = await open(APP() + '#/hefeweizen', { init: seed({ seq: { guided: 1, solo: 0 } }) });
  await h.run(300);
  const sc = await h.page.evaluate(() => [0, 1, 2].map(n => HefeSim.scenario('solo', n)));
  assert.ok(sc.every(s => s.label === 'calm' || s.label === 'lively'));
  await mode(h, 'solo');
  const lively = sc.findIndex(s => s.label === 'lively');
  assert.equal(lively, 0, 'pour 0 is lively (fixed by its seed)');
  // Pilsner habit on the lively pour: fails, with foam feedback; no coaching shown.
  let coached = false;
  await pour(h, { at: 55, watch: async () => { if (await foamCue(h)) coached = true; if (/Foam is building/.test(await h.text('#caption'))) coached = true; } });
  assert.equal(coached, false, 'no foam bracket or hints in Solo');
  await serve(h);
  assert.notEqual(await h.text('#resultTitle'), 'Clean pour');
  assert.match(await h.text('#fbPrimary'), /built foam fast/);
  assert.equal((await progress(h)).stations.hefeweizen.status, 'inProgress');
  // Next pour: a calm one (pour 1). Coming up early, adapted to the calm foam: passes and certifies.
  assert.equal(sc[1].label, 'calm');
  await h.page.keyboard.press('r'); await h.run(300);
  await pour(h, { at: 36 });
  await serve(h);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.match(await h.text('#fbPrimary'), /built foam slowly/);
  assert.equal(await h.page.locator('.st-cert').count(), 1);
  assert.match(await h.text('.st-cert__title'), /Hefeweizen station complete/);
  // The seal artwork itself names the station (it once said PILSNER STATION for every station).
  assert.equal(await h.text('.st-cert__seal .seal__station'), 'HEFEWEIZEN STATION');
  assert.ok(await h.page.isVisible('.st-cert__seal .seal__station'));
  const p = await progress(h);
  assert.equal(p.stations.hefeweizen.status, 'certified');
  assert.equal(p.stations.pilsner.status, 'new', 'Pilsner untouched');
  const logs = (await hefeLog(h)).filter(l => l.mode === 'solo');
  assert.deepEqual(logs.map(l => [l.scenario.n, l.scenario.label, l.pass]), [[0, 'lively', false], [1, 'calm', true]]);
  // Back at the hub: certified, persists.
  await h.page.click('#exitBtn'); await settle(h, 300);
  assert.equal(await chip(h, 'hefeweizen'), 'Replay');
  assert.equal(await h.text('[data-station=hefeweizen] .hub__seal .seal__station'), 'HEFEWEIZEN STATION');
  assert.ok(await h.page.isVisible('[data-station=hefeweizen] .hub__seal'));
  assert.equal(await h.page.isVisible('[data-station=pilsner] .hub__seal'), false, 'Pilsner not certified: no seal');
  await h.page.reload(); await h.run(300);
  assert.equal(await chip(h, 'hefeweizen'), 'Replay');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('no rerolls: restarting, switching modes or leaving replays the same pour; only a served pour moves on', async () => {
  const h = await open(APP(), { init: seed({ seq: { guided: 0, solo: 2 } }) });
  await h.run(200);
  await h.page.click('[data-station=hefeweizen]'); await settle(h, 300);
  await mode(h, 'solo');
  const startPour = async () => { await h.page.keyboard.press('t'); await h.run(400); await h.page.keyboard.down(' '); await h.run(1500); await h.page.keyboard.up(' '); await h.run(300); };
  await startPour();
  await h.page.keyboard.press('r'); await h.run(200);                    // restart
  await startPour();
  await mode(h, 'guided'); await mode(h, 'solo');                         // switch away and back
  await startPour();
  await h.page.goBack(); await settle(h, 300);                            // leave mid-pour: abandoned
  assert.match(await h.text('#hubNotice'), /Return to Hefeweizen/);
  await h.page.click('[data-station=hefeweizen]'); await settle(h, 300);
  await mode(h, 'solo');
  await pour(h, { at: 50 });
  await serve(h);
  const logs = (await hefeLog(h)).filter(l => l.mode === 'solo');
  assert.deepEqual(logs.map(l => [l.endedBy, l.scenario.n]),
    [['restart', 2], ['modeChange', 2], ['navigate', 2], ['served', 2]], 'every attempt was the same pour');
  assert.equal(new Set(logs.map(l => l.scenario.live)).size, 1);
  assert.deepEqual(await seqNow(h), { guided: 0, solo: 3 }, 'the served pour moved Solo on, Guided untouched');
  const p = await progress(h);
  assert.equal(p.stations.hefeweizen.abandoned, 1);
  assert.equal(p.stations.hefeweizen.attempts, 1);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('both stations log their own identity', async () => {
  const h = await open(APP() + '#/pilsner', { init: seed() });
  await h.run(300);
  await mode(h, 'guided');
  await pour(h, { at: 58, stopAt: 95 });
  await serve(h);
  const pl = await h.page.evaluate(() => JSON.parse(localStorage.getItem('perfectPour.log.v2.3') || '[]').at(-1));
  assert.equal(pl.station, 'pilsner');
  assert.equal(pl.served, true);
  await h.close();
});

test('phone held sideways: the Hefeweizen pad, Serve, Restart, modes and the demo buttons are all reachable without scrolling', async () => {
  for (const size of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const h = await open(APP() + '#/hefeweizen', { init: seed(), size });
    await h.run(300);
    const inFrame = sel => h.page.evaluate(s => {
      const f = document.getElementById('app-root').getBoundingClientRect(), b = document.querySelector(s).getBoundingClientRect();
      return b.width > 0 && b.top >= f.top - 1 && b.bottom <= f.bottom + 1 && b.left >= f.left - 1 && b.right <= f.right + 1;
    }, sel);
    for (const s of ['#replay', '#calmer', '#skip', '#modes [data-mode=solo]', '#exitBtn']) assert.ok(await inFrame(s), `${size.width}: ${s}`);
    await mode(h, 'solo');
    for (const s of ['#pour', '#serve', '#restart', '#angleToggle']) assert.ok(await inFrame(s), `${size.width}: ${s}`);
    assert.deepEqual(h.errors, []);
    await h.close();
  }
});
