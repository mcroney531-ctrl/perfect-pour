// Hefeweizen station (Foam Control), registered with the app shell. The
// station is js/hefe-station.js on its own sim (js/hefe-sim.js); nothing is
// shared with the Pilsner station but the contract and the station styles.
// Classic script; needs HefeStation and RiversideStations.
(function () {
  'use strict';
  RiversideStations.register({
    id: 'hefeweizen',
    contract: 1,
    meta: {
      name: 'Hefeweizen', sub: 'Foam Control', glass: 'hefe',
      intro: { label: 'Hefeweizen station', title: 'Foam Control',
        steps: ['<b>Watch</b> a foamy pour, and a calmer one to compare.', '<b>Guided:</b> pour it yourself; hints point at the foam.', '<b>Solo:</b> read the foam on your own.'],
        goal: 'Your goal: the same routine as the Pilsner, but read the foam. When it builds fast, stay tilted longer; when it builds slowly, bring the glass up sooner.' },
      backdrop: { src: 'assets/station/hefeweizen-provisional.svg', provisional: true }   // functional layout first; art later (M5 method)
    },
    mount(host, ctx) {
      const station = HefeStation.mount(host, { onExit: ctx.onExit, onEvent: ctx.onEvent });
      RiversideStationChrome.foldSteps(host);
      const exit = host.querySelector('#exitBtn');
      if (exit) exit.focus({ preventScroll: true });
      return { unmount: reason => station.unmount(reason) };
    }
  });
})();
