// Pad and keyboard behaviour, for both stations: what the shared input
// controller (docs/shared-station-ui.md, step 3) must keep exactly. Written
// against the stations before the extraction and run unchanged after it.
// Pilsner runs on the legacy page (where ?angle= picks its control variant);
// Hefeweizen in the app.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPlaywright, startServer, openPage } from './harness.mjs';

const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

const RETURNING = `(() => {
  const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1, stations: { pilsner: st(), hefeweizen: st(), stout: st() },
    seen: { landing: true, 'intro.pilsner': true, 'intro.hefeweizen': true, 'intro.stout': true } }));
})()`;
const STATIONS = {
  pilsner: q => openPage(browser, `${URL0}/index.html${q || ''}`, { mobile: false, size: { width: 1280, height: 800 }, exactClock: true }),
  hefeweizen: () => openPage(browser, `${URL0}/brewery.html#/hefeweizen`, { mobile: false, size: { width: 1280, height: 720 }, reducedMotion: 'reduce', exactClock: true, init: RETURNING }),
  stout: () => openPage(browser, `${URL0}/brewery.html#/stout`, { mobile: false, size: { width: 1280, height: 720 }, reducedMotion: 'reduce', exactClock: true, init: RETURNING })
};
const angle = h => h.page.evaluate(() => +/rotate\(([-\d.]+)\)/.exec(document.getElementById('glass').getAttribute('transform'))[1]);
const pressed = h => h.page.getAttribute('#pour', 'aria-pressed');
const guided = async h => { await h.page.click('#modes [data-mode=guided]'); await h.run(200); };
const padAt = async (h, fy = 0.6) => { const b = await h.page.locator('#pour').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height * fy }; };

for (const [name, open] of Object.entries(STATIONS)) {
  test(`${name}: pad drag — hold pours, an 8 px dead zone, 70 px of slide per 45°, release stops`, async () => {
    const h = await open();
    await h.run(300); await guided(h);
    await h.page.keyboard.press('t'); await h.run(400);
    assert.equal(await angle(h), 45);
    const p = await padAt(h);
    await h.page.mouse.move(p.x, p.y); await h.page.mouse.down(); await h.run(200);
    assert.equal(await pressed(h), 'true', 'pouring while held');
    await h.page.mouse.move(p.x, p.y - 8); await h.run(300);
    assert.equal(await angle(h), 45, 'within the dead zone the glass holds');
    await h.page.mouse.move(p.x, p.y - (8 + 35)); await h.run(400);
    assert.ok(Math.abs((await angle(h)) - 22.5) < 0.6, `half the travel, half the angle (${await angle(h)})`);
    await h.page.mouse.move(p.x, p.y - (8 + 35)); await h.run(400);
    assert.ok(Math.abs((await angle(h)) - 22.5) < 0.6, 'a still thumb holds the angle');
    await h.page.mouse.move(p.x, p.y - 200); await h.run(400);
    assert.equal(await angle(h), 0, 'clamped at upright');
    await h.page.mouse.up(); await h.run(300);
    assert.equal(await pressed(h), 'false', 'released: tap closed');
    assert.deepEqual(h.errors, []);
    await h.close();
  });

  test(`${name}: releasing the pointer away from the pad stops the pour`, async () => {
    const h = await open();
    await h.run(300); await guided(h);
    await h.page.keyboard.press('t'); await h.run(400);
    const p = await padAt(h);
    await h.page.mouse.move(p.x, p.y); await h.page.mouse.down(); await h.run(300);
    await h.page.mouse.move(5, 5, { steps: 4 }); await h.run(100);
    assert.equal(await pressed(h), 'true', 'captured: still pouring when the pointer leaves');
    await h.page.mouse.up(); await h.run(300);
    assert.equal(await pressed(h), 'false');
    await h.close();
  });

  test(`${name}: tap mode and assistive-tech clicks toggle the pour; a click ending a hold does not latch it`, async () => {
    const h = await open();
    await h.run(300); await guided(h);
    await h.page.keyboard.press('t'); await h.run(400);
    // A click with no pointer activity in the last second (assistive tech):
    // toggles. (The mode tab was just clicked with the pointer, so wait.)
    await h.run(1100);
    await h.page.evaluate(() => document.getElementById('pour').click()); await h.run(300);
    assert.equal(await pressed(h), 'true', 'AT click opens');
    await h.page.evaluate(() => document.getElementById('pour').click()); await h.run(300);
    assert.equal(await pressed(h), 'false', 'AT click closes');
    // A held pointer, released: the click that follows must not latch.
    const p = await padAt(h);
    await h.page.mouse.move(p.x, p.y); await h.page.mouse.down(); await h.run(600); await h.page.mouse.up(); await h.run(300);
    assert.equal(await pressed(h), 'false', 'no latch after a hold');
    // Tap mode: one tap starts, another stops; a drag does not toggle.
    await h.page.check('#tapMode'); await h.run(100);
    await h.page.mouse.click(p.x, p.y); await h.run(300);
    assert.equal(await pressed(h), 'true', 'tap starts');
    await h.page.mouse.click(p.x, p.y); await h.run(300);
    assert.equal(await pressed(h), 'false', 'tap stops');
    await h.page.mouse.move(p.x, p.y); await h.page.mouse.down(); await h.page.mouse.move(p.x, p.y - 30); await h.page.mouse.up(); await h.run(300);
    assert.equal(await pressed(h), 'false', 'a drag is not a tap');
    await h.page.uncheck('#tapMode'); await h.run(100);
    assert.deepEqual(h.errors, []);
    await h.close();
  });

  test(`${name}: keys — Space and Enter hold, repeats and modifiers ignored, arrows 5° each, Space on another button is that button's`, async () => {
    const h = await open();
    await h.run(300); await guided(h);
    await h.page.keyboard.press('t'); await h.run(400);
    assert.equal(await angle(h), 45, 'T tilts');
    await h.page.keyboard.down(' '); await h.run(300);
    assert.equal(await pressed(h), 'true');
    await h.page.keyboard.up(' '); await h.run(300);
    assert.equal(await pressed(h), 'false');
    await h.page.keyboard.down('Enter'); await h.run(300);
    assert.equal(await pressed(h), 'true', 'Enter pours too');
    await h.page.keyboard.up('Enter'); await h.run(300);
    await h.page.keyboard.down('Control'); await h.page.keyboard.press(' '); await h.page.keyboard.up('Control'); await h.run(200);
    assert.equal(await pressed(h), 'false', 'Ctrl+Space ignored');
    // Arrows: Up and Left bring the glass up 5°, Down and Right tip it 5°.
    for (const [k, want] of [['ArrowUp', 40], ['ArrowLeft', 35], ['ArrowDown', 40], ['ArrowRight', 45]]) {
      await h.page.keyboard.press(k); await h.run(400);
      assert.equal(await angle(h), want, k);
    }
    // Space with focus on another button activates that button, never the tap.
    await h.page.focus('#restart');
    await h.page.keyboard.down(' '); await h.run(300);
    assert.equal(await pressed(h), 'false', 'Space on Restart does not pour');
    await h.page.keyboard.up(' '); await h.run(200);
    assert.deepEqual(h.errors, []);
    await h.close();
  });

  test(`${name}: Watch locks the pad and keys; a pointer click on a button drops its focus`, async () => {
    const h = await open();
    await h.run(300);
    assert.equal(await h.page.getAttribute('#pour', 'aria-disabled'), 'true');
    // Let the demo finish (the glass stops moving), then try the controls.
    for (let i = 0; i < 2000 && !(await h.page.isVisible('#result')); i++) await h.run(16);
    const before = await angle(h);
    for (const k of ['ArrowRight', 'ArrowUp', 't']) { await h.page.keyboard.press(k); await h.run(300); }
    assert.equal(await angle(h), before, 'arrows and T do nothing in Watch');
    await h.page.keyboard.down(' '); await h.run(300);
    assert.equal(await pressed(h), 'false', 'Space does not pour in Watch');
    await h.page.keyboard.up(' ');
    // Pointer click on a button: focus dropped so Space pours rather than re-pressing it.
    await guided(h);
    assert.notEqual(await h.page.evaluate(() => document.activeElement.dataset.mode), 'guided', 'focus left the clicked tab');
    await h.page.keyboard.press('t'); await h.run(400);
    await h.page.keyboard.down(' '); await h.run(300);
    assert.equal(await pressed(h), 'true');
    await h.page.keyboard.up(' ');
    await h.close();
  });
}

test('pilsner variants: the v1 slider (?angle=slider) and switch (?angle=toggle), and staged ArrowUp', async () => {
  const s = await STATIONS.pilsner('?angle=slider');
  await s.run(300); await guided(s);
  assert.equal(await s.page.isVisible('#angleSlider'), true);
  await s.page.locator('#angleSlider').fill('30'); await s.run(400);
  assert.equal(await angle(s), 30, 'slider sets the angle');
  await s.page.keyboard.press('ArrowDown'); await s.run(400);
  assert.equal(await angle(s), 25, 'slider: Down lowers the value');
  await s.page.keyboard.press('ArrowRight'); await s.run(400);
  assert.equal(await angle(s), 30, 'slider: Right raises it');
  await s.page.keyboard.press('t'); await s.run(300);
  assert.equal(await angle(s), 30, 'slider: T does nothing');
  await s.close();

  const t = await STATIONS.pilsner('?angle=toggle');
  await t.run(300); await guided(t);
  await t.page.keyboard.press('t'); await t.run(600);
  assert.equal(await angle(t), 45, 'switch: T tilts');
  await t.page.keyboard.press('ArrowUp'); await t.run(400);
  assert.equal(await angle(t), 45, 'switch: arrows do nothing');
  await t.page.keyboard.press('t'); await t.run(600);
  assert.equal(await angle(t), 0, 'switch: T levels');
  await t.close();

  const g = await STATIONS.pilsner('?angle=staged');
  await g.run(300); await guided(g);
  await g.page.keyboard.press('t'); await g.run(400);
  await g.page.keyboard.down(' '); await g.run(1500);
  await g.page.keyboard.press('ArrowUp'); await g.run(200);
  const mid = await angle(g);
  assert.ok(mid < 45 && mid > 30, `staged: ArrowUp starts the fixed-rate straighten (${mid})`);
  await g.run(3000);
  assert.equal(await angle(g), 0, 'and it runs to upright');
  await g.page.keyboard.press('ArrowDown'); await g.run(300);
  assert.equal(await angle(g), 0, 'staged: other arrows do nothing');
  await g.page.keyboard.up(' ');
  assert.deepEqual(g.errors, []);
  await g.close();
});
