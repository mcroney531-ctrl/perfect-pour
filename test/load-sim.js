// Lifts the <script id="sim"> block out of index.html and runs it in a fresh
// context, so the tests exercise the exact code the page ships rather than a
// copy that could drift from it.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function loadSim() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/<script id="sim">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no <script id="sim"> block in index.html');
  const ctx = vm.createContext({});
  vm.runInContext(m[1], ctx, { filename: 'index.html#sim' });
  return ctx.PourSim;
};
