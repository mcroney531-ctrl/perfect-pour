// Stations not built yet: registered for the hub (name, card label, glass)
// with no mount, so they show as coming soon. Each moves to its own module
// when it is built (docs/implementation-plan.md).
// Classic script; needs RiversideStations.
(function () {
  'use strict';
  RiversideStations.register({ id: 'hefeweizen', contract: 1,
    meta: { name: 'Hefeweizen', sub: 'Transfer pour', glass: 'hefe' } });
  RiversideStations.register({ id: 'stout', contract: 1,
    meta: { name: 'Nitro Stout', sub: 'Two-step pour', glass: 'stout' } });
})();
