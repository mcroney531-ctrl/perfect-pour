// Station registry: the one place the app shell learns which stations exist.
// Each station module registers itself; the shell builds the hub, intro and
// station screen from what is registered and never names a beer itself.
// Contract (docs/architecture-multi-station.md §3; slice 1 subset):
//   register({ id, contract: 1, meta, mount? })
//     meta:  { name, sub, glass, intro?, backdrop? }
//     mount(host, { onExit, onEvent }) -> { unmount(reason) -> { abandoned } }
//   A station without mount is shown on the hub as coming soon.
// Classic script; publishes RiversideStations.
(function (global) {
  'use strict';
  const CONTRACT = 1;
  const list = [], byId = {};

  function check(def) {
    const bad = msg => { throw new Error(`Station ${def && def.id ? `"${def.id}"` : '(no id)'}: ${msg}`); };
    if (!def || typeof def.id !== 'string' || !/^[a-z][a-z-]*$/.test(def.id)) bad('id must be lower-case letters');
    if (byId[def.id]) bad('registered twice');
    if (def.contract !== CONTRACT) bad(`contract must be ${CONTRACT}`);
    const m = def.meta;
    if (!m || typeof m.name !== 'string' || typeof m.sub !== 'string' || typeof m.glass !== 'string') bad('meta needs name, sub and glass');
    if (def.mount !== undefined && typeof def.mount !== 'function') bad('mount must be a function');
    if (def.mount && !(m.intro && m.backdrop)) bad('a playable station needs meta.intro and meta.backdrop');
  }

  function register(def) {
    check(def);
    const s = Object.freeze(Object.assign({}, def, { playable: typeof def.mount === 'function' }));
    list.push(s);
    byId[s.id] = s;
    return s;
  }

  global.RiversideStations = {
    CONTRACT, register,
    get: id => byId[id] || null,
    list: () => list.slice()        // in registration order, which is hub order
  };
})(typeof window !== 'undefined' ? window : globalThis);
