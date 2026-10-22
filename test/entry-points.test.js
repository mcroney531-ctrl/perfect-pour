// Both entry points (the brewery app and the legacy standalone Pilsner page)
// load every script a script needs, before it. Classic scripts have no
// imports, so this is the only thing standing between a shared helper and a
// page that breaks at load.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const scripts = page => [...fs.readFileSync(path.join(ROOT, page), 'utf8').matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
// What each script uses from another at load or mount time.
const NEEDS = {
  'js/pilsner-station.js': ['js/sim.js', 'js/station-kit.js', 'js/station-markup.js'],
  'js/hefe-station.js': ['js/hefe-sim.js', 'js/station-kit.js', 'js/station-markup.js'],
  'js/stations/pilsner.js': ['js/stations.js', 'js/pilsner-station.js', 'js/station-chrome.js', 'js/station-look.js', 'js/station-cues.js'],
  'js/stations/hefeweizen.js': ['js/stations.js', 'js/hefe-station.js', 'js/station-chrome.js'],
  'js/stations/upcoming.js': ['js/stations.js'],
  'js/brewery.js': ['js/progress.js', 'js/hub-scenes.js', 'js/stations.js', 'js/stations/pilsner.js', 'js/stations/hefeweizen.js', 'js/stations/upcoming.js']
};

for (const page of ['brewery.html', 'index.html']) {
  test(`${page}: every script's dependencies load before it`, () => {
    const list = scripts(page);
    for (const [i, s] of list.entries()) {
      assert.ok(fs.existsSync(path.join(ROOT, s)), `${page}: ${s} exists`);
      for (const dep of NEEDS[s] || []) {
        const at = list.indexOf(dep);
        assert.ok(at !== -1 && at < i, `${page}: ${dep} must load before ${s}`);
      }
    }
  });
}

test('the legacy page is still the standalone Pilsner station', () => {
  assert.deepEqual(scripts('index.html'), ['js/sim.js', 'js/station-kit.js', 'js/station-markup.js', 'js/pilsner-station.js']);
});
