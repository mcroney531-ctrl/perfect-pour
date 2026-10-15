// Browser regression suite for the Pilsner station. It pins behaviour the
// player can see, so refactors (M1 and later) can prove nothing changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

// A touch pour on the default (continuous) control: tilt, hold, slide up
// slowly at `at`% full, let go at `stop`% full.
async function touchPour(h, { at = 56, stop = 95, slow = true } = {}) {
  await h.page.tap('#angleToggle'); await h.run(400);
  const { x, y } = await h.padCenter();
  await h.touch('touchStart', [{ x, y }]);
  await h.until(at);
  const steps = slow ? 20 : 3;
  for (let i = 1; i <= steps; i++) { await h.touch('touchMove', [{ x, y: y - 80 * i / steps }]); await h.run(slow ? 80 : 16); }
  await h.until(stop);
  await h.touch('touchEnd', []);
  await h.run(600);
}

test('loads cleanly in Watch mode and the demo pours a clean pilsner', async () => {
  const h = await openPage(browser, URL0 + '/');
  assert.equal(await h.page.getAttribute('#modes [data-mode=watch]', 'aria-current'), 'true');
  await h.run(12000);
  assert.equal(await h.text('#resultTitle'), 'Demo pour: clean');
  assert.match(await h.text('#debriefText'), /Brought up gradually/);
  assert.match(await h.text('#debriefText'), /in the zone/);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Guided: a slow touch pour passes, with live action feedback', async () => {
  const h = await openPage(browser, URL0 + '/');
  await h.page.tap('#modes [data-mode=guided]'); await h.run(100);
  await h.page.tap('#angleToggle'); await h.run(400);
  const { x, y } = await h.padCenter();
  await h.touch('touchStart', [{ x, y }]);
  await h.until(56);
  for (let i = 1; i <= 20; i++) { await h.touch('touchMove', [{ x, y: y - 4 * i }]); await h.run(80); }
  assert.match(await h.text('#caption'), /Started straightening in range\. Keep it steady\./);
  assert.match(await h.text('#pourSub'), /Keep holding\. Slide up slowly/);
  await h.until(95);
  await h.touch('touchEnd', []); await h.run(600);
  await h.page.tap('#serve'); await h.run(300);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('Solo: no BRING UP band and no live verdicts; debrief explains afterwards; releasing at the line passes', async () => {
  const h = await openPage(browser, URL0 + '/');
  await h.page.tap('#modes [data-mode=solo]'); await h.run(100);
  await touchPour(h, { at: 56, stop: 95 });
  assert.equal(await h.page.evaluate(() => document.getElementById('bringMark').style.display), 'none');
  assert.match(await h.text('#caption'), /^Solo: no hints/);
  await h.page.tap('#serve'); await h.run(300);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  assert.match(await h.text('#debriefText'), /You stopped at 9[5-7]%.*in the zone/);
  await h.close();
});

test('a snap straighten is labelled "all at once" but can still pass', async () => {
  const h = await openPage(browser, URL0 + '/');
  await h.page.tap('#modes [data-mode=solo]'); await h.run(100);
  await touchPour(h, { at: 56, stop: 95, slow: false });
  await h.page.tap('#serve'); await h.run(300);
  assert.match(await h.text('#debriefText'), /Brought up all at once/);
  await h.close();
});

test('the result sheet sits above the pour pad (nothing shows through)', async () => {
  const h = await openPage(browser, URL0 + '/');
  await h.run(12000);
  const hits = await h.page.evaluate(() => {
    const r = document.getElementById('result').getBoundingClientRect(); let n = 0;
    for (let x = r.left + 5; x < r.right; x += 10) for (let y = r.top + 5; y < r.bottom; y += 10) {
      const el = document.elementFromPoint(x, y); if (el && el.closest('#pour')) n++; }
    return n; });
  assert.equal(hits, 0);
  await h.close();
});

test('keyboard: T tilts, Space pours, ArrowUp straightens, S serves', async () => {
  const h = await openPage(browser, URL0 + '/', { mobile: false });
  await h.page.click('#modes [data-mode=solo]'); await h.run(100);
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' ');
  await h.until(56);
  for (let i = 0; i < 9; i++) { await h.page.keyboard.press('ArrowUp'); await h.run(150); }
  await h.until(95);
  await h.page.keyboard.up(' '); await h.run(600);
  await h.page.keyboard.press('s'); await h.run(300);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  await h.close();
});

test('losing focus closes the tap', async () => {
  const h = await openPage(browser, URL0 + '/', { mobile: false });
  await h.page.click('#modes [data-mode=solo]'); await h.run(100);
  await h.page.keyboard.down(' '); await h.run(500);
  assert.equal(await h.page.getAttribute('#pour', 'aria-pressed'), 'true');
  await h.page.evaluate(() => window.dispatchEvent(new Event('blur'))); await h.run(100);
  assert.equal(await h.page.getAttribute('#pour', 'aria-pressed'), 'false');
  await h.page.keyboard.up(' ');
  await h.close();
});

test('tap mode: one tap starts the pour, another stops it', async () => {
  const h = await openPage(browser, URL0 + '/');
  await h.page.tap('#modes [data-mode=guided]'); await h.run(100);
  await h.page.check('#tapMode');
  await h.page.tap('#pour'); await h.run(1000);
  assert.equal(await h.page.getAttribute('#pour', 'aria-pressed'), 'true');
  await h.page.tap('#pour'); await h.run(400);
  assert.equal(await h.page.getAttribute('#pour', 'aria-pressed'), 'false');
  await h.close();
});

test('staged control (?angle=staged) still works: one swipe straightens', async () => {
  const h = await openPage(browser, URL0 + '/?angle=staged');
  await h.page.tap('#modes [data-mode=solo]'); await h.run(100);
  await h.page.tap('#angleToggle'); await h.run(400);
  const { x, y } = await h.padCenter(0.5);
  await h.touch('touchStart', [{ x, y }]);
  await h.until(56);
  for (let d = 10; d <= 50; d += 10) { await h.touch('touchMove', [{ x, y: y - d }]); await h.run(16); }
  await h.until(94);
  await h.touch('touchEnd', []); await h.run(600);
  await h.page.tap('#serve'); await h.run(300);
  assert.equal(await h.text('#resultTitle'), 'Clean pour');
  await h.close();
});

test('each served pour is logged to localStorage', async () => {
  const h = await openPage(browser, URL0 + '/');
  await h.page.tap('#modes [data-mode=solo]'); await h.run(100);
  await touchPour(h);
  await h.page.tap('#serve'); await h.run(300);
  const log = await h.page.evaluate(() => JSON.parse(localStorage.getItem('perfectPour.log.v2.3') || '[]'));
  assert.equal(log.length, 1);
  assert.equal(log[0].served, true);
  assert.equal(log[0].variant, 'continuous');
  assert.ok(log[0].events.some(e => e.type === 'stop'));
  await h.close();
});

test('debug panel opens and its ghost check passes', async () => {
  const h = await openPage(browser, URL0 + '/?debug=1', { mobile: false });
  await h.page.click('#debugToggle'); await h.run(100);
  await h.page.click('#dbgGhost'); await h.run(100);
  assert.match(await h.text('#dbgGhostOut'), /continuous: PASS/);
  await h.close();
});

test('glass treatments and frozen versions still load', async () => {
  for (const p of ['/?glass=b', '/?glass=old', '/v1/', '/v2/', '/v2.1/', '/v2.2/']) {
    const h = await openPage(browser, URL0 + p);
    await h.run(500);
    assert.deepEqual(h.errors, [], p);
    await h.close();
  }
});
