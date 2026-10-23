// Nitro Stout station (two-stage pour), registered with the app shell. The
// station is js/stout-station.js on its own sim (js/stout-sim.js); it shares
// the station kit, markup builder and pad controller with the other two.
// Classic script; needs StoutStation, RiversideStationChrome and RiversideStations.
(function () {
  'use strict';
  RiversideStations.register({
    id: 'stout',
    contract: 1,
    meta: {
      name: 'Nitro Stout', sub: 'Two-step pour', glass: 'stout',
      intro: { label: 'Nitro Stout station', title: 'Two-step pour',
        steps: ['<b>Watch</b> the two-stage pour, and what topping up too early does.', '<b>Guided:</b> pour it yourself; hints point at the settling beer.', '<b>Solo:</b> decide for yourself when it has settled.'],
        goal: 'Your goal: pour to about three-quarters, set it down, wait until the surge has settled and the head has separated, then top up upright to a slight dome.' },
      backdrop: { src: 'assets/station/stout-provisional.svg', provisional: true }   // functional layout first; art later (M5 method)
    },
    mount(host, ctx) {
      const station = StoutStation.mount(host, { onExit: ctx.onExit, onEvent: ctx.onEvent });
      RiversideStationChrome.foldSteps(host);
      const exit = host.querySelector('#exitBtn');
      if (exit) exit.focus({ preventScroll: true });
      return { unmount: reason => station.unmount(reason) };
    }
  });
})();
