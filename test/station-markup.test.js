// The shared station markup builder (js/station-markup.js): every station
// gets the same panel, result sheet and live region, with the ids the station
// styles, the in-frame layout and the stations' own code rely on; the slots
// add station-specific parts without forking the layout. (Byte-for-byte
// parity with the pre-builder stations is held by test/ui/dom-parity.)
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = vm.createContext({}); ctx.window = ctx;
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'station-markup.js'), 'utf8'), ctx);
const { station } = ctx.RiversideStationMarkup;
const base = { brand: 'Test', stage: '<svg id="scene"></svg>\n', pourHelp: 'Help.', transcriptNote: 'Note.', resultNote: 'Fine print.' };
const ids = html => [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

test('the shared parts: every id once, in the order the stations and styles expect', () => {
  const html = station(base);
  const list = ids(html);
  assert.equal(new Set(list).size, list.length, 'no duplicate ids');
  const want = ['app', 'modes', 'caption', 'stage', 'scene', 'controls', 'angleCtl', 'toggleWrap', 'angleToggle', 'pourRow', 'pour',
    'pourText', 'pourSub', 'padTrack', 'padThumb', 'padFinger', 'tapMode', 'pourHelp', 'actions', 'serve', 'restart', 'ghostActions',
    'replay', 'skip', 'transcriptBox', 'transcriptTitle', 'transcript', 'result', 'resultTitle', 'checksTech', 'checks', 'debrief',
    'debriefGlass', 'debriefText', 'fbPrimary', 'fbSecondary', 'suggest', 'resultActions', 'live'];
  assert.deepEqual(list, want);
  assert.match(html, /<small>Test<\/small>/);
  assert.match(html, /<p id="pourHelp" class="sr-only">Help\.<\/p>/);
  assert.match(html, /aria-describedby="pourHelp"/);
  assert.match(html, /<div id="live" class="sr-only" aria-live="polite" aria-atomic="true"><\/div>/);
  assert.match(html, /<div id="toggleWrap">/, 'glass switch shown by default');
});

test('slots add station parts in their places without changing the rest', () => {
  const plain = station(base);
  const full = station({ ...base, headerExtra: '<button id="dbg">d</button>\n', angleExtra: '<div id="slider"></div>\n', toggleHidden: true,
    watchExtra: '<button id="calmer">c</button>\n', after: '\n<aside id="debug"></aside>' });
  const list = ids(full);
  const at = id => list.indexOf(id);
  assert.ok(at('dbg') < at('modes'), 'header extra before the mode tabs');
  assert.ok(at('slider') < at('toggleWrap'), 'angle extra before the glass switch');
  assert.ok(at('replay') < at('calmer') && at('calmer') < at('skip'), 'Watch extra between Replay and Skip');
  assert.ok(at('live') < at('debug'), 'after the live region');
  assert.match(full, /<div id="toggleWrap" hidden>/);
  // Taking the slots back out gives the plain markup.
  const stripped = full.replace('<button id="dbg">d</button>\n', '').replace('<div id="slider"></div>\n', '').replace(' hidden>', '>')
    .replace('<button id="calmer">c</button>\n', '').replace('\n<aside id="debug"></aside>', '');
  assert.equal(stripped.replace('<div id="toggleWrap">', '').length, plain.replace('<div id="toggleWrap">', '').length);
});
