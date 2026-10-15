// Runs js/sim.js (the exact file the page loads) in a fresh context, so the
// tests exercise the shipped code rather than a copy that could drift from it.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function loadSim() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'sim.js'), 'utf8');
  const ctx = vm.createContext({});
  vm.runInContext(src, ctx, { filename: 'js/sim.js' });
  return ctx.PourSim;
};
