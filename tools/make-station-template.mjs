// Measures the live Pilsner station in the 16:9 frame and writes the backdrop
// template for the artist, plus a provisional backdrop from the same numbers:
//   node tools/make-station-template.mjs
// Everything is in 2560 x 1440 plate pixels (the frame at 1920 x 1080, x 4/3).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlaywright, startServer } from '../test/ui/harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'design/station-templates');
fs.mkdirSync(OUT, { recursive: true });
const K = 2560 / 1920;

// Scene-unit regions (the station SVG's own coordinates): measured from the
// renderer over the Watch demo, plus margins for a 60-degree tilt.
const SCENE = {
  faucet: [172, -28, 340, 86],          // tap body, handle at full open, spout
  mount: [338, 0, 372, 345],            // the shank leaves the scene at x 340: the art's mounting column
  sweep: [20, 84, 288, 350],            // every glass position, tilted to upright
  tray: [130, 339, 290, 352],           // drip-tray surface under the upright glass (base at y 339)
  gauge: [4, 18, 66, 236]               // head gauge and its labels
};

const SEEN = () => { const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1, stations: { pilsner: st(), hefeweizen: st(), stout: st() }, seen: { landing: true, 'intro.pilsner': true } })); };

const { chromium } = loadPlaywright();
const { server, url } = await startServer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: K, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.addInitScript(SEEN);
await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
await page.goto(url + '/#/pilsner');
await page.clock.runFor(300);

const zones = await page.evaluate(SCENE => {
  const f = document.getElementById('app-root').getBoundingClientRect();
  const m = document.getElementById('scene').getScreenCTM();
  const pt = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(m); return [p.x - f.left, p.y - f.top]; };
  const rect = ([x0, y0, x1, y1]) => { const a = pt(x0, y0), b = pt(x1, y1); return [a[0], a[1], b[0], b[1]]; };
  const dom = id => { const b = document.getElementById(id).getBoundingClientRect(); return [b.left - f.left, b.top - f.top, b.right - f.left, b.bottom - f.top]; };
  const out = {};
  for (const k of Object.keys(SCENE)) out[k] = rect(SCENE[k]);
  out.nozzle = pt(210, 72); out.uprightBase = pt(210, 339);
  out.caption = dom('caption'); out.controls = dom('controls');
  out.header = [0, 0, f.width, Math.max(dom('exitBtn')[3], document.getElementById('modes').getBoundingClientRect().bottom - f.top) + 8];
  return out;
}, SCENE);
const P = v => Math.round(v * K);
const plate = {};
for (const [k, v] of Object.entries(zones)) plate[k] = v.map(P);
plate.mount[0] = plate.faucet[2] - 4;               // the column starts where the visible shank ends
plate.panel = [Math.min(plate.caption[0], plate.controls[0]) - 24, plate.header[3], 2560, 1440];
fs.writeFileSync(path.join(OUT, 'pilsner-zones.json'), JSON.stringify({ size: [2560, 1440], note: 'plate pixels (x0, y0, x1, y1) / points (x, y)', ...plate }, null, 2) + '\n');

const LABELS = {
  faucet: ['LIVE FAUCET: no tap hardware here', '#ff9b85'],
  mount: ['SHANK MOUNT: wall/tower edge from here right', '#f7d27a'],
  sweep: ['GLASS SWEEP (tilted to upright): keep calm, low contrast', '#f0bd4a'],
  tray: ['DRIP TRAY SURFACE (glass rests here)', '#5fcf8a'],
  gauge: ['HEAD GAUGE: calm, dark', '#59a9ff'],
  panel: ['CONTROLS PANEL: dark, even', '#dfe4e6'],
  header: ['HEADER: back button, modes', '#dfe4e6']
};
function overlay(withFill) {
  const box = (k, [x0, y0, x1, y1]) => { const [label, c] = LABELS[k];
    return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${c}" fill-opacity="${withFill ? 0.1 : 0.04}" stroke="${c}" stroke-width="4" stroke-dasharray="18 12"/>
      <text x="${x0 + 12}" y="${k === 'tray' ? y1 + 40 : y0 + 36}" fill="${c}" font-size="28" font-weight="700" font-family="Arial">${label}</text>`; };
  const [nx, ny] = plate.nozzle, [bx, by] = plate.uprightBase;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:99;pointer-events:none">
    ${Object.keys(LABELS).map(k => box(k, plate[k])).join('')}
    <circle cx="${nx}" cy="${ny}" r="10" fill="#ff9b85"/><text x="${nx + 18}" y="${ny + 10}" fill="#ff9b85" font-size="26" font-family="Arial" font-weight="700">nozzle (${nx}, ${ny})</text>
    <path d="M${bx - 120} ${by}H${bx + 120}" stroke="#5fcf8a" stroke-width="4"/><text x="${bx + 130}" y="${by + 10}" fill="#5fcf8a" font-size="26" font-family="Arial" font-weight="700">upright base (${bx}, ${by})</text>
    <text x="40" y="1405" fill="#ffffff" fill-opacity="0.6" font-size="26" font-family="Arial" font-weight="700">PILSNER STATION BACKDROP TEMPLATE · 2560 x 1440 · measured from the live layout</text></svg>`;
}
async function shot(name, ms) {
  await page.clock.runFor(ms);
  await page.evaluate(svg => { document.getElementById('pp-zones')?.remove(); document.body.insertAdjacentHTML('beforeend', svg.replace('<svg ', '<svg id="pp-zones" ')); }, overlay(false));
  await page.screenshot({ path: path.join(OUT, name) });
}
await shot('pilsner-template-tilted.png', 2700);     // Watch demo, mid-pour at 45 degrees
await shot('pilsner-template-upright.png', 7000);    // the finish, glass upright on the tray

// Zones only, on a blank frame.
await page.setContent(`<body style="margin:0;background:#151b1d">${overlay(true)}</body>`);
await page.screenshot({ path: path.join(OUT, 'pilsner-template-zones.png') });
await browser.close(); server.close();

// Provisional backdrop drawn from the same numbers (labelled in the app).
const [tx0, ty] = [plate.sweep[0] - 140, plate.tray[1]];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440">
  <!-- PROVISIONAL Pilsner station backdrop, generated by tools/make-station-template.mjs. Not art. -->
  <defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151b1d"/><stop offset="1" stop-color="#0e1513"/></linearGradient>
  <linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f2a1b"/><stop offset="1" stop-color="#1e140c"/></linearGradient>
  <radialGradient id="g" cx="${(plate.nozzle[0] / 2560).toFixed(3)}" cy="0.1" r="0.6"><stop offset="0" stop-color="#ffb547" stop-opacity="0.14"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient></defs>
  <rect width="2560" height="1440" fill="url(#w)"/><rect width="2560" height="1440" fill="url(#g)"/>
  <rect x="${plate.mount[0]}" y="0" width="${plate.mount[2] - plate.mount[0] + 60}" height="${ty}" fill="#232b2e"/>
  <rect x="${plate.mount[0]}" y="0" width="6" height="${ty}" fill="#4a5458"/>
  <rect x="0" y="${ty}" width="2560" height="${1440 - ty}" fill="url(#c)"/>
  <path d="M0 ${ty + 1}H2560" stroke="#a87a4e" stroke-opacity="0.6" stroke-width="3"/>
  <rect x="${plate.tray[0]}" y="${ty - 4}" width="${plate.tray[2] - plate.tray[0]}" height="${plate.tray[3] - plate.tray[1] + 10}" rx="6" fill="#5c6468"/>
</svg>
`;
fs.mkdirSync(path.join(ROOT, 'assets/station'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets/station/pilsner-provisional.svg'), svg);
console.log(JSON.stringify(plate));
