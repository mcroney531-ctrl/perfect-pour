// Browser test harness: a tiny static server for the repo plus Playwright with
// a controllable clock, so pours run deterministically and fast (no
// wall-clock waits, no flakiness from a slow machine).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);

export function loadPlaywright() {
  try { return require('playwright'); } catch (_) {
    // Fall back to a global install (CI images often ship one).
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };

export function startServer() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

// One fresh page per test: phone-sized, touch-capable, fake clock.
export async function openPage(browser, url, { mobile = true, size, init } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: size || { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: size || { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  if (init) await page.addInitScript(init);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  // Paused clock: time only moves when a test calls run(), so every frame is
  // reproducible (an installed-but-running clock still leaks page-load time).
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'));
  await page.goto(url);
  await page.clock.runFor(50);
  const cdp = mobile ? await ctx.newCDPSession(page) : null;
  const h = {
    page, ctx, errors, cdp,
    run: ms => page.clock.runFor(ms),
    level: () => page.evaluate(() => parseInt(document.getElementById('levelText').textContent.replace(/\D/g, ''), 10)),
    // Advance in small steps until the shown level reaches n (or give up).
    async until(n, stepMs = 16, maxMs = 20000) {
      for (let t = 0; t < maxMs; t += stepMs) { if ((await h.level()) >= n) return; await h.run(stepMs); }
      throw new Error(`level never reached ${n}`);
    },
    padCenter: async (fy = 0.75) => { const b = await page.locator('#pour').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height * fy }; },
    touch: (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts }),
    text: sel => page.locator(sel).textContent(),
    close: () => ctx.close()
  };
  return h;
}
