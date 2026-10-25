// The front door: the brewery is the site root (index.html). brewery.html
// stays as a redirect for shared links, keeping query and route; old root
// bookmarks to the standalone Pilsner (/?angle=…, /?glass=…, /?debug=1 with
// no route) go to pilsner.html. Saved progress carries over.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const SEEN = `localStorage.setItem('riverside.progress', JSON.stringify({ version: 1,
  stations: { pilsner: { status: 'certified', attempts: 3, passes: 1, abandoned: 0, lastPlayed: '2026-10-01T00:00:00.000Z', certifiedAt: '2026-10-01T00:00:00.000Z' },
    hefeweizen: { status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null }, stout: { status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null } },
  seen: { landing: true, 'intro.pilsner': true, 'intro.hefeweizen': true, 'intro.stout': true } }));`;
async function page(init = SEEN) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  if (init) await p.addInitScript(`if (!localStorage.getItem('riverside.progress')) { ${init} }`);
  return { p, ctx, errors };
}
const where = p => p.evaluate(() => ({ path: location.pathname, search: location.search, hash: location.hash }));
const settled = async p => { await p.waitForLoadState('load'); await p.waitForTimeout(300); };

test('the site root is the brewery, and saved progress carries over', async () => {
  const { p, ctx, errors } = await page();
  await p.goto(URL0 + '/'); await settled(p);
  assert.equal(await p.title(), 'The Bar · Riverside Brewing Co.');
  assert.equal(await p.evaluate(() => window.ppBrewery.view()), 'hub');
  assert.equal(await p.textContent('#chip-pilsner'), 'Replay', 'the certified Pilsner from before the move');
  assert.equal(await p.textContent('#hubCount'), '1');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('brewery.html redirects to the root, keeping the route and the query, and stays out of Back', async () => {
  for (const [from, want] of [
    ['/brewery.html#/stout', { path: '/', search: '', hash: '#/stout' }],
    ['/brewery.html#/hefeweizen', { path: '/', search: '', hash: '#/hefeweizen' }],
    ['/brewery.html#/pilsner', { path: '/', search: '', hash: '#/pilsner' }],
    ['/brewery.html#/welcome', { path: '/', search: '', hash: '#/welcome' }],
    ['/brewery.html', { path: '/', search: '', hash: '#/' }],
    ['/brewery.html?debug=1', { path: '/', search: '?debug=1', hash: '#/' }],
    ['/brewery.html?debug=1#/pilsner', { path: '/', search: '?debug=1', hash: '#/pilsner' }]
  ]) {
    const { p, ctx, errors } = await page();
    await p.goto(URL0 + '/front-door-start'); // a 404 page to come back to
    await p.goto(URL0 + from); await p.waitForURL(u => !u.pathname.endsWith('brewery.html')); await settled(p);
    assert.deepEqual(await where(p), want, from);
    const id = want.hash.slice(2);
    if (['stout', 'hefeweizen', 'pilsner'].includes(id)) assert.equal(await p.evaluate(() => window.ppBrewery.current()), id, `${from} opens the station`);
    else assert.ok(['hub', 'landing'].includes(await p.evaluate(() => window.ppBrewery.view())), `${from} stays in the brewery`);
    await p.goBack(); await p.waitForLoadState('load');
    assert.ok((await where(p)).path.endsWith('front-door-start'), `${from}: Back skips the redirect page`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('old root bookmarks to the standalone Pilsner go to pilsner.html with their options; routed links stay in the brewery', async () => {
  for (const q of ['?angle=staged', '?glass=b', '?debug=1', '?angle=slider&debug=1']) {
    const { p, ctx, errors } = await page();
    await p.goto(URL0 + '/' + q); await p.waitForURL(u => u.pathname.endsWith('pilsner.html')); await settled(p);
    assert.deepEqual(await where(p), { path: '/pilsner.html', search: q, hash: '' }, q);
    assert.ok(await p.$('#pp-root #pour'), `${q}: the standalone station`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  const { p, ctx } = await page();
  await p.goto(URL0 + '/pilsner.html?angle=staged'); await settled(p);
  assert.equal(await p.evaluate(() => document.querySelector('#pp-root #angleToggle') !== null || document.querySelector('#pp-root #pour') !== null), true);
  await p.goto(URL0 + '/?debug=1#/pilsner'); await settled(p);
  assert.deepEqual(await where(p), { path: '/', search: '?debug=1', hash: '#/pilsner' });
  assert.equal(await p.evaluate(() => window.ppBrewery.current()), 'pilsner');
  await p.goto(URL0 + '/?utm_source=x'); await settled(p);
  assert.equal((await where(p)).path, '/', 'other queries stay in the brewery');
  await ctx.close();
});
