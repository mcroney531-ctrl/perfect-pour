// Parity safety net for the shared-station-kit refactor
// (docs/shared-station-ui.md): the stations' DOM at fixed points of a
// deterministic run, what the live region said and in what order, and the
// level shown every 250 ms, for Pilsner and Hefeweizen in the app and for the
// legacy standalone page (index.html). Compared exactly with the committed
// fixtures in test/ui/fixtures/.
//   UPDATE_FIXTURES=1 node --test test/ui/dom-parity.test.mjs   # after an intended change
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlaywright, startServer } from './harness.mjs';
import { captureStates } from './dom-states.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const UPDATE = process.env.UPDATE_FIXTURES === '1';
const { chromium } = loadPlaywright();
let browser, server, URL0;
test.before(async () => { ({ server, url: URL0 } = await startServer()); browser = await chromium.launch(); });
test.after(async () => { await browser?.close(); server?.close(); });

// A readable failure: the first differing line with three lines either side.
function same(name, actual) {
  const file = path.join(DIR, name);
  if (UPDATE || !fs.existsSync(file)) { fs.writeFileSync(file, actual); if (!UPDATE) assert.fail(`${name}: fixture was missing and has been written; commit it`); return; }
  const want = fs.readFileSync(file, 'utf8');
  if (want === actual) return;
  const a = actual.split('\n'), w = want.split('\n');
  let i = 0; while (i < a.length && a[i] === w[i]) i++;
  const ctx = (lines, mark) => lines.slice(Math.max(0, i - 3), i + 4).map((l, k) => `${Math.max(0, i - 3) + k === i ? mark : ' '} ${l}`).join('\n');
  assert.fail(`${name} differs at line ${i + 1}\n--- fixture\n${ctx(w, '-')}\n+++ now\n${ctx(a, '+')}`);
}

for (const station of ['pilsner', 'hefeweizen', 'legacy']) {
  test(`parity: ${station} DOM states, speech and progression match the fixtures`, async () => {
    const { states, traces, errors } = await captureStates(browser, URL0, { only: [station] });
    assert.deepEqual(errors, []);
    assert.ok(Object.keys(states).length >= 2);
    for (const [name, markup] of Object.entries(states)) same(`${name}.html`, markup);
    same(`${station}-trace.txt`, traces[station]);
  });
}
