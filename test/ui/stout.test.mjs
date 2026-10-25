// The Nitro Stout station in the brewery app: three playable stations on the
// hub, the Watch demo and the early-top-up comparison, Guided coaching that
// points at the settling beer (and warns, never blocks), Solo with no
// coaching where an early top-up is possible and costly, certification,
// logging and navigation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const APP = () => URL0 + '/brewery.html';
const seed = (status = {}) => `(() => {
  if (localStorage.getItem('riverside.progress')) return;
  const st = s => ({ status: s, attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1,
    stations: { pilsner: st('${status.pilsner || 'new'}'), hefeweizen: st('${status.hefeweizen || 'new'}'), stout: st('${status.stout || 'new'}') },
    seen: { landing: true, 'intro.pilsner': true, 'intro.hefeweizen': true, 'intro.stout': true } }));
})()`;
const open = (url, opts = {}) => openPage(browser, url, { reducedMotion: 'reduce', mobile: false, size: { width: 1280, height: 720 }, exactClock: true, ...opts });
const settle = async (h, ms = 200) => { await h.run(0); await h.page.evaluate(() => 0); await h.run(16); await h.run(ms); };
const chip = (h, id) => h.text('#chip-' + id);
const progress = h => h.page.evaluate(() => JSON.parse(localStorage.getItem('riverside.progress')));
const stoutLog = h => h.page.evaluate(() => JSON.parse(localStorage.getItem('perfectPour.log.stout.v1') || '[]'));
const shown = (h, id) => h.page.evaluate(i => { const e = document.getElementById(i); return !!e && e.style.display !== 'none'; }, id);
const mode = async (h, m) => { await h.page.click(`#modes [data-mode=${m}]`); await h.run(200); };

// Stage one: tilt, pour, bring upright from `upAt`% (nine Up presses), let go at `stopAt`%.
async function stageOne(h, { upAt = 50, stopAt = 72, watch } = {}) {
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 2000 && (await h.level()) < upAt; i++) { await h.run(16); if (watch) await watch(); }
  for (let i = 0; i < 9; i++) { await h.page.keyboard.press('ArrowUp'); await h.run(150); if (watch) await watch(); }
  for (let i = 0; i < 2000 && (await h.level()) < stopAt; i++) { await h.run(16); if (watch) await watch(); }
  await h.page.keyboard.up(' ');
}
// Wait `ms` with the tap shut (calling watch each 100 ms), then top up to `stopAt`%.
async function waitAndTopUp(h, ms, { stopAt = 101, watch } = {}) {
  for (let t = 0; t < ms; t += 100) { await h.run(100); if (watch) await watch(); }
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 2000 && (await h.level()) < stopAt; i++) { await h.run(16); if (watch) await watch(); }
  await h.page.keyboard.up(' '); await h.run(600);
}
const serve = async h => { await h.page.keyboard.press('s'); await h.run(400); };

test('hub: three playable stations; Final Rush says "coming soon" (not "locked") once all three are certified', async () => {
  const h = await open(APP(), { init: seed() });
  await h.run(200);
  assert.equal(await chip(h, 'stout'), 'Start');
  assert.equal(await h.page.getAttribute('[data-station=stout]', 'aria-disabled'), null);
  assert.match(await h.text('#rushChip'), /Locked/);
  await h.close();
  const all = await open(APP(), { init: seed({ pilsner: 'certified', hefeweizen: 'certified', stout: 'certified' }) });
  await all.run(200);
  assert.equal(await all.text('#hubCount'), '3');
  assert.equal(await all.text('#hubLede'), 'Pilsner, Hefeweizen and Nitro Stout certified.');
  assert.match(await all.text('#rushChip'), /Coming soon/);
  assert.equal(await all.text('[data-station=stout] .hub__seal .seal__station'), 'NITRO STOUT STATION');
  await all.page.click('#rushBtn', { force: true }); await all.run(100);
  assert.match(await all.text('#hubNotice'), /Final Rush is coming soon/);
  assert.deepEqual(all.errors, []);
  await all.close();
});

test('Watch: the two-stage demo passes, the glass is set down to settle, and the early-top-up comparison is short and clearly a "what not to do"', async () => {
  const init = `(() => { const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
    localStorage.setItem('riverside.progress', JSON.stringify({ version: 1, stations: { pilsner: st(), hefeweizen: st(), stout: st() }, seen: { landing: true } })); })()`;
  const h = await open(APP(), { init });
  await h.run(200);
  await h.page.click('[data-station=stout]'); await settle(h, 300);
  assert.equal(await h.text('#introTitle'), 'Two-step pour');
  await h.page.click('#introBegin'); await settle(h, 300);
  assert.equal(await h.page.evaluate(() => window.ppBrewery.current()), 'stout');
  let setDownX = null, sawSurge = false;
  for (let i = 0; i < 1800 && !(await h.page.isVisible('#result')); i++) {
    await h.run(16);
    if (/Watch the cloudy surge/.test(await h.text('#caption'))) {
      setDownX = await h.page.evaluate(() => +/translate\(([-\d.]+)/.exec(document.getElementById('glass').getAttribute('transform'))[1]);
      if (await shown(h, 'surgeCue')) sawSurge = true;
    }
  }
  assert.ok(setDownX !== null && setDownX < 180, `set down beside the tap (x ${setDownX})`);
  assert.ok(sawSurge, 'the settling surge is pointed out in Watch');
  assert.equal(await h.text('#resultTitle'), 'Demo pour: clean');
  // The comparison: a short visible label, a name that says what it plays.
  assert.equal(await h.text('#earlyDemo'), 'Early top-up');
  assert.equal(await h.page.getAttribute('#earlyDemo', 'aria-label'), 'Early top-up: watch an example of what not to do');
  await h.page.evaluate(() => document.getElementById('earlyDemo').click()); await h.run(100);
  assert.equal(await h.text('#earlyDemo'), 'Full pour again');
  assert.equal(await h.page.getAttribute('#earlyDemo', 'aria-label'), 'Full pour again: watch the full two-stage demo');
  assert.match(await h.text('#caption'), /what not to do/);
  let ms = 0;
  for (; ms < 15000 && !(await h.page.isVisible('#result')); ms += 16) await h.run(16);
  assert.ok(ms < 9000, `short (${ms} ms)`);
  assert.equal(await h.text('#resultTitle'), 'Example: topped up too early');
  assert.match(await h.text('#fbPrimary'), /still surging/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided: a good two-stage pour — set-down mark, the surge pointed out while it settles, one "Settled" hint — passes without certifying', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'guided');
  assert.ok(await shown(h, 'setDownMark'), 'stage one target shown');
  const captions = [];
  const watch = async () => { const c = await h.text('#caption'); if (captions.at(-1) !== c) captions.push(c); };
  await stageOne(h, { watch });
  let surgeSeen = false, pulse = false, markGone = false;
  await waitAndTopUp(h, 12000, { watch: async () => {
    await watch();
    if (await shown(h, 'surgeCue')) surgeSeen = true;
    if ((await h.page.getAttribute('#surgeCueLine', 'stroke')) === '#ffd877') pulse = true;
    if (!(await shown(h, 'setDownMark'))) markGone = true;
  } });
  assert.ok(surgeSeen && pulse && markGone, 'surge bracket, pulse on "Settled", mark gone after set-down');
  assert.ok(captions.some(c => /Nearly three-quarters/.test(c)));
  assert.ok(captions.some(c => /Set it down at a good level/.test(c)), 'set-down verdict');
  assert.equal(captions.filter(c => /^Settled:/.test(c)).length, 1, 'one readiness hint');
  assert.ok(captions.some(c => /Topped up once it had settled/.test(c)));
  await serve(h);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.match(await h.text('#fbPrimary'), /^Clean two-stage pour/);
  assert.equal((await progress(h)).stations.stout.status, 'inProgress', 'Guided never certifies');
  const log = (await stoutLog(h)).at(-1);
  assert.equal(log.station, 'stout'); assert.equal(log.pass, true);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided: topping up early is warned about but not blocked; the pour fails with the surge explained', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'guided');
  await stageOne(h);
  const captions = [];
  const before = await h.level();
  await waitAndTopUp(h, 2000, { watch: async () => { const c = await h.text('#caption'); if (captions.at(-1) !== c) captions.push(c); } });
  assert.ok(captions.some(c => /Still surging/.test(c)), 'warned');
  assert.ok((await h.level()) > before + 20, 'the beer still flowed: nothing blocked the top-up');
  await serve(h);
  assert.notEqual(await h.text('#resultTitle'), 'Clean pour');
  assert.match(await h.text('#fbPrimary'), /still surging/);
  assert.match(await h.text('#debriefText'), /too early/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Solo: no marks, bracket or hints; an early top-up is allowed and fails; a patient pour passes and certifies once', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'solo');
  let coached = false;
  const watch = async () => {
    if (await shown(h, 'setDownMark') || await shown(h, 'surgeCue')) coached = true;
    if (/Nearly|Settled:|Still surging|Let it settle/.test(await h.text('#caption'))) coached = true;
  };
  await stageOne(h, { watch });
  await waitAndTopUp(h, 1500, { watch });
  await serve(h);
  assert.equal(coached, false, 'no coaching in Solo');
  assert.match(await h.text('#fbPrimary'), /still surging/);
  assert.equal((await progress(h)).stations.stout.status, 'inProgress');
  await h.page.keyboard.press('r'); await h.run(300);
  await stageOne(h, { watch });
  await waitAndTopUp(h, 12000, { watch });
  await serve(h);
  assert.equal(coached, false);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.equal(await h.page.locator('.st-cert').count(), 1);
  assert.equal(await h.text('.st-cert__seal .seal__station'), 'NITRO STOUT STATION');
  assert.equal((await progress(h)).stations.stout.status, 'certified');
  const logs = (await stoutLog(h)).filter(l => l.mode === 'solo');
  assert.deepEqual(logs.map(l => [l.primary, l.events.find(e => e.type === 'topUp').verdict]), [['earlyTopUp', 'early'], ['pass', 'settled']]);
  await h.page.click('#exitBtn'); await settle(h, 300);
  assert.equal(await chip(h, 'stout'), 'Replay');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('leaving while it settles abandons the pour, ungraded and logged once', async () => {
  const h = await open(APP(), { init: seed() });
  await h.run(200);
  await h.page.click('[data-station=stout]'); await settle(h, 300);
  await mode(h, 'guided');
  await stageOne(h);
  await h.run(2000);
  await h.page.goBack(); await settle(h, 300);
  assert.match(await h.text('#hubNotice'), /Return to Nitro Stout/);
  const p = await progress(h);
  assert.equal(p.stations.stout.abandoned, 1); assert.equal(p.stations.stout.attempts, 0);
  const logs = await stoutLog(h);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].endedBy, 'navigate'); assert.equal(logs[0].pass, null); assert.equal(logs[0].phase, 'settling');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('phone held sideways: the Nitro pad, Serve, Restart, modes and both Watch buttons are reachable without scrolling', async () => {
  for (const size of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const h = await open(APP() + '#/stout', { init: seed(), size });
    await h.run(300);
    const inFrame = sel => h.page.evaluate(s => {
      const f = document.getElementById('app-root').getBoundingClientRect(), b = document.querySelector(s).getBoundingClientRect();
      return b.width > 0 && b.top >= f.top - 1 && b.bottom <= f.bottom + 1 && b.left >= f.left - 1 && b.right <= f.right + 1;
    }, sel);
    for (const s of ['#replay', '#earlyDemo', '#skip', '#modes [data-mode=solo]', '#exitBtn']) assert.ok(await inFrame(s), `${size.width}: ${s}`);
    await mode(h, 'solo');
    for (const s of ['#pour', '#serve', '#restart', '#angleToggle']) assert.ok(await inFrame(s), `${size.width}: ${s}`);
    assert.deepEqual(h.errors, []);
    await h.close();
  }
});

test('HEAD gauge: neutral while the pour is unfinished ("forming", never "below band"), judged against the band only after Serve', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'solo');
  const states = new Set();
  const watch = async () => { states.add(await h.text('#gaugeState')); };
  await watch();
  assert.equal(await h.text('#gaugeState'), '', 'nothing to say before the tap opens');
  await stageOne(h, { watch });
  await waitAndTopUp(h, 12000, { watch });
  assert.deepEqual([...states].filter(Boolean), ['forming'], `only "forming" before Serve (${[...states]})`);
  const head = await h.text('#gaugeVal');
  await serve(h);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.equal(await h.text('#gaugeState'), 'in band', 'judged once served');
  assert.equal(await h.text('#gaugeVal'), head, 'the value itself is unchanged by serving');
  await h.page.keyboard.press('r'); await h.run(300);
  assert.equal(await h.text('#gaugeState'), '', 'a restart clears it');
  assert.deepEqual(h.errors, []);
  await h.close();
});

// ---- Training marks: SET DOWN, and the dome finish ----------------------------
const markState = (h, id) => h.page.evaluate(i => { const g = document.getElementById(i); return g.style.display === 'none' ? 'hidden' : g.dataset.state; }, id);

test('Guided SET DOWN: sketched, lit (with a pulse) in 66–75%, gone once set down', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'guided');
  assert.equal(await markState(h, 'setDownMark'), 'sketch');
  assert.equal(await markState(h, 'domeMark'), 'hidden', 'no finish guide before the top-up');
  const down = [], spoken = new Set();
  await stageOne(h, { upAt: 50, stopAt: 72, watch: async () => {
    const d = await markState(h, 'setDownMark'); if (down.at(-1) !== d) down.push(d);
    spoken.add(await h.text('#live'));
  } });
  await h.run(1000);
  assert.equal(await markState(h, 'setDownMark'), 'hidden');
  assert.deepEqual(down, ['sketch', 'active']);
  assert.match([...spoken].join(' | '), /In the SET DOWN range\./);
  const css = await h.page.evaluate(() => [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch (_) { return []; } }).join('\n'));
  assert.match(css, /pp-st--stout #setDownMark\[data-state="active"\] #setDownBand/);
  assert.match(css, /pp-st--stout #domeMark\[data-state="active"\] #domeArc/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided dome finish: target, near, then STOP from 98.5% (never sooner), clearing to TOO FULL past 103.5%; reduced motion keeps the green STOP', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'guided');
  await stageOne(h);
  for (let t = 0; t < 12000; t += 100) await h.run(100);
  const seen = [], captions = new Set(), spoken = new Set(), pads = new Set();
  let stopShownBelow = null;
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 2000 && (await h.level()) < 105; i++) {
    await h.run(16);
    const st = await markState(h, 'domeMark'), lv = await h.level(), label = await h.text('#domeLabel');
    if (seen.at(-1)?.[0] !== st) seen.push([st, lv]);
    if (label === 'STOP' && lv < 98) stopShownBelow = lv;
    if (st === 'over') assert.equal(label, 'LET GO', 'still pouring past the crown: LET GO, not yet TOO FULL');
    captions.add(await h.text('#caption')); spoken.add(await h.text('#live')); pads.add(await h.text('#pourSub'));
    if (st === 'active' && !(await h.page.evaluate(() => window.__checkedActive))) {
      // Reduced motion (as in these tests): no animation, the state still reads: green, filled, STOP.
      const look = await h.page.evaluate(() => { const a = document.getElementById('domeArc'); window.__checkedActive = true;
        return { stroke: a.getAttribute('stroke'), fill: a.getAttribute('fill'), anim: getComputedStyle(a).animationName }; });
      assert.equal(look.stroke, '#9fdc8a'); assert.notEqual(look.fill, 'none'); assert.equal(look.anim, 'none');
      assert.equal(label, 'STOP');
    }
  }
  await h.page.keyboard.up(' '); await h.run(800);
  assert.equal(stopShownBelow, null, 'STOP never shows below 98%');
  assert.deepEqual(seen.map(([st]) => st), ['target', 'near', 'active', 'over'], JSON.stringify(seen));
  const at = Object.fromEntries(seen);
  assert.ok(at.near >= 94 && at.near <= 95, `near at ${at.near}%`);
  assert.ok(at.active >= 98 && at.active <= 99, `STOP at ${at.active}%`);
  assert.ok(at.over >= 103 && at.over <= 104, `TOO FULL at ${at.over}%`);
  const c = [...captions].join(' | ');
  assert.match(c, /Almost there\. Let the foam just crown the rim\./);
  assert.match(c, /STOP: release the pad\./);
  assert.match(c, /Past the crown: let go now\./);
  const p = [...pads].join(' | ');
  for (const t of ['Glass upright. Finish at the brim.', 'Let the foam just crown the rim.', 'STOP: release the pad.', 'Past the crown: let go now.']) assert.ok(p.includes(t), t);
  const said = [...spoken].join(' | ');
  assert.match(said, /Almost there\./); assert.match(said, /Stop\./); assert.match(said, /Let go now\./);
  assert.ok(![...captions].some(x => /Nearly there: let go as the head/.test(x)), 'the old rim hint is replaced by the dome cues');
  assert.equal(await h.text('#domeLabel'), 'TOO FULL', 'an overfilled pour never looks successful');
  assert.notEqual(await h.page.getAttribute('#domeArc', 'stroke'), '#9fdc8a');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided dome finish: stopping short says how to recover; holding again re-arms the cues and a brim finish passes', async () => {
  const h = await open(APP() + '#/stout', { init: seed() });
  await h.run(300); await mode(h, 'guided');
  await stageOne(h);
  const caps = new Set();
  await waitAndTopUp(h, 12000, { stopAt: 96, watch: async () => caps.add(await h.text('#caption')) });
  assert.equal(await h.text('#caption'), 'Not quite full. Hold again to finish at the brim.');
  assert.equal(await markState(h, 'domeMark'), 'target', 'still the target');
  const again = new Set();
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 2000 && (await h.level()) < 100; i++) { await h.run(16); again.add(await h.text('#caption')); }
  await h.page.keyboard.up(' '); await h.run(800);
  assert.ok([...again].some(x => /STOP: release the pad\./.test(x)), 'the STOP cue shows again on the second top-up');
  await serve(h);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Watch: the demo tops up "to the brim" and lights the dome STOP; Solo shows and says nothing of the marks', async () => {
  const w = await open(APP() + '#/stout', { init: seed() });
  await w.run(300);
  const states = new Set(), caps = new Set();
  for (let i = 0; i < 1800 && !(await w.page.isVisible('#result')); i++) {
    await w.run(16);
    states.add(await markState(w, 'domeMark')); caps.add(await w.text('#caption'));
  }
  assert.ok(states.has('active'), 'the demo reaches the STOP crown');
  assert.ok(caps.has('Top up to the brim, glass upright, faucet fully open.'));
  assert.ok(caps.has('Stop when the foam just crowns the rim, then serve.'));
  assert.equal(await w.text('#resultTitle'), 'Demo pour: clean');
  await w.close();
  const s = await open(APP() + '#/stout', { init: seed() });
  await s.run(300); await mode(s, 'solo');
  let seen = false; const spoken = new Set();
  const look = async () => {
    if ((await markState(s, 'setDownMark')) !== 'hidden' || (await markState(s, 'domeMark')) !== 'hidden') seen = true;
    spoken.add(await s.text('#live'));
  };
  await stageOne(s, { watch: look });
  await waitAndTopUp(s, 12000, { watch: look });
  assert.equal(seen, false, 'no marks in Solo');
  assert.doesNotMatch([...spoken].join(' | '), /SET DOWN range|Almost there|Stop\.|Let go now/);
  assert.doesNotMatch(await s.text('#pourSub'), /brim|crown|STOP/);
  assert.deepEqual(s.errors, []);
  await s.close();
});

test('phone held sideways: the dome label fits in the frame and clear of the HEAD gauge, under the tap and at the set-down spot', async () => {
  for (const size of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
    const h = await open(APP() + '#/stout', { init: seed(), size });
    await h.run(300); await mode(h, 'guided');
    await stageOne(h);
    const check = async where => {
      const r = await h.page.evaluate(() => {
        const f = document.getElementById('app-root').getBoundingClientRect(), l = document.getElementById('domeLabel').getBoundingClientRect();
        const g = ['gaugeHi', 'gaugeLo', 'gaugeVal', 'gaugeState', 'levelText'].map(id => document.getElementById(id).getBoundingClientRect());
        const hit = g.some(b => b.width && !(l.right < b.left || l.left > b.right || l.bottom < b.top || l.top > b.bottom));
        return { inside: l.left >= f.left && l.right <= f.right && l.top >= f.top, hit, w: l.width };
      });
      assert.ok(r.w > 0 && r.inside, `${size.width} ${where}: label in frame`);
      assert.ok(!r.hit, `${size.width} ${where}: label clear of the gauge`);
    };
    await waitAndTopUp(h, 12000, { stopAt: 99 });                  // in range, released: done (no label) ...
    await h.page.keyboard.down(' '); for (let i = 0; i < 3; i++) await h.run(16);
    await check('under the tap');
    await h.page.keyboard.up(' '); await h.close();
    const k = await open(APP() + '#/stout', { init: seed(), size });
    await k.run(300); await mode(k, 'guided');
    await stageOne(k);
    await (async () => { for (let t = 0; t < 12000; t += 100) await k.run(100); await k.page.keyboard.down(' ');
      for (let i = 0; i < 2000 && (await k.level()) < 95; i++) await k.run(16); await k.page.keyboard.up(' '); await k.run(1500); })();
    const r = await k.page.evaluate(() => {
      const f = document.getElementById('app-root').getBoundingClientRect(), l = document.getElementById('domeLabel').getBoundingClientRect();
      const g = ['gaugeHi', 'gaugeLo', 'gaugeVal', 'gaugeState', 'levelText'].map(id => document.getElementById(id).getBoundingClientRect());
      return { inside: l.left >= f.left && l.right <= f.right, hit: g.some(b => b.width && !(l.right < b.left || l.left > b.right || l.bottom < b.top || l.top > b.bottom)), text: document.getElementById('domeLabel').textContent };
    });
    assert.equal(r.text, 'TO THE BRIM', 'short: the target is back');
    assert.ok(r.inside && !r.hit, `${size.width} set-down spot: label in frame and clear of the gauge`);
    assert.deepEqual(k.errors, []);
    await k.close();
  }
});
