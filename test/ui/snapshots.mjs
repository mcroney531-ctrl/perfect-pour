// Pixel snapshots at fixed clock times, for before/after parity checks:
//   node test/ui/snapshots.mjs <outDir>
import fs from 'node:fs';
import { loadPlaywright, startServer, openPage } from './harness.mjs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const { server, url } = await startServer();
const browser = await chromium.launch();
const shots = [
  ['watch-0100', '/', 100], ['watch-5000', '/', 5000], ['watch-9000', '/', 9000], ['watch-result', '/', 12000],
  ['staged-watch-7000', '/?angle=staged', 7000], ['glass-b-6000', '/?glass=b', 6000]
];
for (const [name, path, ms] of shots) {
  const h = await openPage(browser, url + path); await h.run(ms);
  await h.page.screenshot({ path: `${out}/${name}.png` }); await h.close();
}
for (const [name, mode] of [['guided-idle', 'guided'], ['solo-idle', 'solo']]) {
  const h = await openPage(browser, url + '/'); await h.page.tap(`#modes [data-mode=${mode}]`); await h.run(300);
  await h.page.screenshot({ path: `${out}/${name}.png` }); await h.close();
}
{ const h = await openPage(browser, url + '/?debug=1', { mobile: false }); await h.page.click('#debugToggle'); await h.run(300);
  await h.page.screenshot({ path: `${out}/desktop-debug.png` }); await h.close(); }
{ const h = await openPage(browser, url + '/', { size: { width: 844, height: 390 } }); await h.run(3000);
  await h.page.screenshot({ path: `${out}/landscape-3000.png` }); await h.close(); }
await browser.close(); server.close();
console.log('snapshots written to', out);
