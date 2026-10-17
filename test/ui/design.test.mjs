// M2 design pages: the component sheet and the compositing harness. The
// harness dresses the live game from outside, so these also check that the
// game inside it still pours exactly as on its own page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const gameFrame = h => h.page.frames().find(f => f.url().includes('/index.html'));

test('component sheet loads with its fonts and no errors', async () => {
  const h = await openPage(browser, URL0 + '/design/components.html', { mobile: false });
  await h.run(300);
  assert.ok(await h.page.evaluate(() => document.fonts.check('700 20px "Barlow Condensed"')));
  // Coming-soon stations are visible but not playable.
  assert.equal(await h.page.locator('[aria-disabled="true"]').count() >= 2, true);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('composite: the live game runs over the backdrop, unmodified, and the demo still passes', async () => {
  const h = await openPage(browser, URL0 + '/design/composite.html?embed=1&fx=original&bg=temp');
  await h.run(300);
  const f = gameFrame(h);
  assert.ok(f, 'game iframe loaded');
  assert.equal(await f.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgba(0, 0, 0, 0)');
  assert.match(await h.page.evaluate(() => getComputedStyle(document.getElementById('bg')).backgroundImage), /temp-pilsner\.svg/);
  assert.equal(await f.locator('#tap[filter]').count(), 0, 'original = no treatment');
  await h.run(12000);
  assert.equal(await f.locator('#resultTitle').textContent(), 'Demo pour: clean');
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('composite treatments: art is filtered, training overlays never are, shadow follows the glass', async () => {
  const h = await openPage(browser, URL0 + '/design/composite.html?embed=1&fx=all&zones=1');
  await h.run(3000);
  const f = gameFrame(h);
  for (const sel of ['#tap', '#glassArt', '#scene > g[clip-path]', '#stream'])
    assert.ok(await f.locator(sel).getAttribute('filter'), sel + ' treated');
  for (const sel of ['#glass', '#zoneBand', '#bringMark', '#gauge', '#actMarks'])
    assert.equal(await f.locator(sel).getAttribute('filter'), null, sel + ' untouched');
  const tilted = await f.evaluate(() => +document.getElementById('pp-contact').getAttribute('cx'));
  await h.run(7000);
  const upright = await f.evaluate(() => +document.getElementById('pp-contact').getAttribute('cx'));
  assert.ok(Math.abs(upright - 210) < 1 && tilted < 180, `shadow under the glass (${tilted} -> ${upright})`);
  assert.ok(await h.page.locator('#zones rect').count() >= 4, 'reserved zones drawn');
  // Switching treatment live removes every filter again.
  await h.page.evaluate(() => { const r = document.querySelector('[name=fx][value=original]'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); });
  assert.equal(await f.locator('[filter^="url(#pp-fx"]').count(), 0);
  assert.deepEqual(h.errors, []);
  await h.close();
});

test('composite focus and glass edge: backdrop-only blur/dim/vignette, edge restyle leaves the game pouring', async () => {
  const h = await openPage(browser, URL0 + '/design/composite.html?embed=1&blur=3&dim=20&vig=50&edge=subtle');
  await h.run(300);
  const f = gameFrame(h);
  const bgFilter = await h.page.evaluate(() => getComputedStyle(document.getElementById('bg')).filter);
  assert.match(bgFilter, /blur\(3px\).*brightness\(0\.8\)/);
  assert.equal(await h.page.evaluate(() => getComputedStyle(document.getElementById('game')).filter), 'none', 'game layer never blurred');
  assert.match(await f.evaluate(() => getComputedStyle(document.querySelector('#glassArt > path')).stroke), /url\(.*pp-edge/);
  await h.run(12000);
  assert.equal(await f.locator('#resultTitle').textContent(), 'Demo pour: clean');
  assert.deepEqual(h.errors, []);
  await h.close();
});
