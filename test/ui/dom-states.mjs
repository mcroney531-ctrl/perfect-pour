// Station DOM states at fixed points of a deterministic run (paused test
// clock, preset progress and Hefeweizen scenario), serialised as readable,
// indented markup: one element per line, attributes sorted, text on its own
// line. Shared by test/ui/dom-parity.test.mjs (compare with the committed
// fixtures) and `UPDATE_FIXTURES=1 node --test test/ui/dom-parity.test.mjs`
// (rewrite them after an intended change).
//
// Nothing is stripped: the runs are deterministic (the exact clock below makes
// animation frames land on the same sim ticks every run), so every attribute
// (geometry, aria-*, hidden, disabled, classes) and every text node is
// compared. The only normalisation is number formatting in long SVG
// geometry attributes, rounded to 0.1 so a fixture stays diffable.
import { openPage } from './harness.mjs';

const GEOMETRY = new Set(['d', 'points', 'transform', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'style', 'stroke-width', 'opacity']);

// Runs in the page.
function serialise(root, geometry) {
  const G = new Set(geometry);
  const round = v => v.replace(/-?\d+\.\d+/g, n => (Math.round(+n * 10) / 10).toString());
  const out = [];
  (function walk(node, depth) {
    const pad = '  '.repeat(depth);
    if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push(pad + JSON.stringify(t)); return; }
    if (node.nodeType !== 1 || node.tagName === 'SCRIPT') return;
    const attrs = [...node.attributes].map(a => [a.name, G.has(a.name) ? round(a.value) : a.value]).sort((a, b) => a[0] < b[0] ? -1 : 1);
    out.push(pad + '<' + node.tagName.toLowerCase() + attrs.map(([k, v]) => ` ${k}="${v}"`).join('') + '>');
    for (const c of node.childNodes) walk(c, depth + 1);
  })(root, 0);
  return out.join('\n') + '\n';
}

const SIZE = { width: 1280, height: 720 };
const RETURNING = seq => `(() => {
  const st = () => ({ status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null });
  localStorage.setItem('riverside.progress', JSON.stringify({ version: 1, stations: { pilsner: st(), hefeweizen: st(), stout: st() },
    seen: { landing: true, 'intro.pilsner': true, 'intro.hefeweizen': true } }));
  localStorage.setItem('riverside.hefe.scenario', '${JSON.stringify(seq)}');
})()`;

async function pour(h, at, stopAt, upEvery) {
  await h.page.keyboard.press('t'); await h.run(400);
  await h.page.keyboard.down(' ');
  for (let i = 0; i < 2000 && (await h.level()) < at; i++) await h.run(16);
  for (let i = 0; i < 9; i++) { await h.page.keyboard.press('ArrowUp'); await h.run(upEvery); }
  for (let i = 0; i < 2000 && (await h.level()) < stopAt; i++) await h.run(16);
  await h.page.keyboard.up(' '); await h.run(600);
  await h.page.keyboard.press('s'); await h.run(400);
}

// Each scenario: a page, then a list of [stateName, action] run in order.
function scenarios(base) {
  const app = (station, seq = { guided: 0, solo: 0 }) => ({
    url: `${base}/brewery.html#/${station}`, opts: { mobile: false, size: SIZE, reducedMotion: 'reduce', init: RETURNING(seq), exactClock: true }, root: '#stationHost'
  });
  const mode = m => h => h.page.click(`#modes [data-mode=${m}]`).then(() => h.run(300));
  const untilResult = async h => { for (let i = 0; i < 1200 && !(await h.page.isVisible('#result')); i++) await h.run(16); await h.run(200); };
  return {
    pilsner: { ...app('pilsner'), steps: [
      ['watch-start', h => h.run(300)],
      ['watch-mid', h => h.run(5000)],
      ['watch-result', untilResult],
      ['guided-idle', mode('guided')],
      ['guided-result', h => pour(h, 58, 95, 120)],
      ['solo-idle', mode('solo')]
    ] },
    hefeweizen: { ...app('hefeweizen'), steps: [
      ['watch-start', h => h.run(300)],
      ['watch-mid', h => h.run(5000)],
      ['watch-result', untilResult],
      ['watch-calm-mid', async h => { await h.page.evaluate(() => document.getElementById('calmer').click()); await h.run(5000); }],
      ['guided-idle', mode('guided')],
      ['guided-result', h => pour(h, 52, 94, 150)],
      ['solo-idle', mode('solo')]
    ] },
    legacy: { url: `${base}/index.html`, opts: { exactClock: true }, root: '#pp-root', steps: [
      ['watch-mid', h => h.run(5000)],
      ['guided-idle', mode('guided')]
    ] }
  };
}

// Everything the live region said, in order, and the level shown every
// 250 ms of page time: the speech batching/order and the frame progression,
// as plain text. Installed before the page's scripts run.
const RECORD = () => {
  window.__trace = [];
  const start = () => {
    const live = document.querySelector('#live');
    if (!live) return setTimeout(start, 5);
    new MutationObserver(() => { const t = live.textContent; if (t) window.__trace.push('say  ' + t); }).observe(live, { childList: true, characterData: true, subtree: true });
    let next = 0;
    (function sample() {
      const lv = document.querySelector('#levelText');
      if (lv && performance.now() >= next) { window.__trace.push(`t=${Math.round(performance.now())} ${lv.textContent}`); next += 250; }
      requestAnimationFrame(sample);
    })();
  };
  document.addEventListener('DOMContentLoaded', start);
};

// -> { states: { 'pilsner-watch-start': markup, ... }, traces: { pilsner: text }, errors }
//   only:    scenario names to run (pilsner, hefeweizen, legacy)
//   size:    override the viewport (screenshots at several sizes)
//   shotDir: also save a screenshot of every state there
export async function captureStates(browser, base, { only, size, shotDir } = {}) {
  const states = {}, traces = {}, errors = [];
  for (const [name, sc] of Object.entries(scenarios(base))) {
    if (only && !only.includes(name)) continue;
    const opts = { ...sc.opts, ...(size ? { size, mobile: false } : {}) };
    const init = opts.init;
    opts.init = `(${RECORD})();${init ? init : ''}`;
    const h = await openPage(browser, sc.url, opts);
    for (const [state, act] of sc.steps) {
      await act(h);
      states[`${name}-${state}`] = await h.page.evaluate(([sel, g, fn]) => (0, eval)('(' + fn + ')')(document.querySelector(sel), g),
        [sc.root, [...GEOMETRY], serialise.toString()]);
      if (shotDir) await h.page.screenshot({ path: `${shotDir}/${opts.size ? opts.size.width + 'x' + opts.size.height : 'default'}-${name}-${state}.png` });
    }
    traces[name] = (await h.page.evaluate(() => window.__trace)).join('\n') + '\n';
    errors.push(...h.errors.map(e => `${name}: ${e}`));
    await h.close();
  }
  return { states, traces, errors };
}
