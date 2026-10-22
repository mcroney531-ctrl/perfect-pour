// Before/after screenshots of both stations and the legacy page, at fixed
// points of a deterministic run (the states in test/ui/dom-states.mjs), at
// 1280x720 and 844x390. With the exact test clock, identical code gives
// identical pixels, so any difference is real.
//   node tools/station-parity.mjs shoot <dir>            # screenshots of the current tree
//   node tools/station-parity.mjs compare <dirA> <dirB>   # report which differ, and where
// Run `shoot` from a checkout of the old commit (git worktree) and from the
// new one, then `compare`.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, a, b] = process.argv.slice(2);

// Minimal PNG reader (8-bit RGB/RGBA, non-interlaced: what Chromium writes).
function readPng(file) {
  const buf = fs.readFileSync(file);
  let p = 8, w = 0, h = 0, ch = 4; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ch = data[9] === 6 ? 4 : 3; }
    if (type === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= ch ? px[y * stride + x - ch] : 0, up = y ? px[(y - 1) * stride + x] : 0, ul = x >= ch && y ? px[(y - 1) * stride + x - ch] : 0;
      const pa = Math.abs(up - ul), pb = Math.abs(left - ul), pc = Math.abs(left + up - 2 * ul);
      const pred = [0, left, up, (left + up) >> 1, pa <= pb && pa <= pc ? left : pb <= pc ? up : ul][f];
      px[y * stride + x] = (row[x] + pred) & 255;
    }
  }
  return { w, h, ch, px };
}

if (cmd === 'shoot') {
  const { loadPlaywright, startServer } = await import(pathToFileURL(path.join(ROOT, 'test/ui/harness.mjs')));
  const { captureStates } = await import(pathToFileURL(path.join(ROOT, 'test/ui/dom-states.mjs')));
  process.chdir(ROOT);
  fs.mkdirSync(a, { recursive: true });
  const { chromium } = loadPlaywright();
  const { server, url } = await startServer();
  const browser = await chromium.launch();
  for (const size of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
    const { errors } = await captureStates(browser, url, { size, shotDir: path.resolve(a) });
    if (errors.length) console.log('page errors:', errors);
  }
  await browser.close(); server.close();
  console.log(`${fs.readdirSync(a).length} screenshots in ${a}`);
} else if (cmd === 'compare') {
  const NOISE_PX = 60, NOISE_DELTA = 64;
  let diff = 0;
  for (const f of fs.readdirSync(a).filter(f => f.endsWith('.png')).sort()) {
    if (!fs.existsSync(path.join(b, f))) { console.log(`${f}: missing in ${b}`); diff++; continue; }
    const A = readPng(path.join(a, f)), B = readPng(path.join(b, f));
    if (A.w !== B.w || A.h !== B.h) { console.log(`${f}: size differs`); diff++; continue; }
    // Chromium's rasteriser is not bit-exact between runs: identical DOM can
    // differ by a few edge pixels. Those are counted apart as noise (at most
    // NOISE_PX pixels, none off by more than NOISE_DELTA per channel); anything
    // bigger is a real difference.
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0, worst = 0;
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
      const i = (y * A.w + x) * A.ch, j = (y * B.w + x) * B.ch;
      const d = Math.max(Math.abs(A.px[i] - B.px[j]), Math.abs(A.px[i + 1] - B.px[j + 1]), Math.abs(A.px[i + 2] - B.px[j + 2]));
      if (d) { n++; worst = Math.max(worst, d); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    const noise = n && n <= NOISE_PX && worst <= NOISE_DELTA;
    console.log(!n ? `${f}: identical` : `${f}: ${n} px differ (max ${worst}/255) in (${x0},${y0})-(${x1},${y1})${noise ? ' (rasteriser noise)' : ''}`);
    if (n && !noise) diff++;
  }
  console.log(diff ? `${diff} differ` : 'no real differences');
  process.exitCode = diff ? 1 : 0;
} else {
  console.log('usage: node tools/station-parity.mjs shoot <dir> | compare <dirA> <dirB>');
}
