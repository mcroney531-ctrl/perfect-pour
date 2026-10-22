// Pilsner station, registered with the app shell. A thin adapter: the
// station itself (js/pilsner-station.js), its simulation and its scoring are
// unchanged. The adapter adds the Pilsner-only presentation layers that sit
// outside the station (the approved look, the straighten cues and the
// pad-held marker), which read the Pilsner station's own markup and so belong
// with it rather than in the shell, and the folded Watch steps it shares with
// the Hefeweizen station (js/station-chrome.js).
// Classic script; needs PilsnerStation, RiversideStationChrome and RiversideStations.
(function () {
  'use strict';
  RiversideStations.register({
    id: 'pilsner',
    contract: 1,
    meta: {
      name: 'Pilsner', sub: 'Foundation pour', glass: 'pils',
      intro: { label: 'Pilsner station', title: 'Foundation pour',
        steps: ['<b>Watch</b> a demo pour.', '<b>Guided:</b> pour it yourself, with hints.', '<b>Solo:</b> pour it on your own.'],
        goal: 'Your goal: tilt first, bring the glass upright gradually, and stop at the line with the right amount of foam.' },
      backdrop: { src: 'assets/station/pilsner.webp', provisional: false }   // revision 2, approved
    },

    mount(host, ctx) {
      const station = PilsnerStation.mount(host, { onExit: ctx.onExit, onEvent: ctx.onEvent });
      const look = window.RiversideStationLook ? RiversideStationLook.apply(host) : null;
      const cues = window.RiversideStationCues ? RiversideStationCues.apply(host) : null;
      // Mark the station while the pad is held (the cue layer styles from this).
      let padObs = null;
      const padEl = host.querySelector('#pour'), ctlEl = host.querySelector('#controls');
      if (padEl && ctlEl) {
        padObs = new MutationObserver(() => ctlEl.classList.toggle('st-pouring', padEl.getAttribute('aria-pressed') === 'true'));
        padObs.observe(padEl, { attributes: true, attributeFilter: ['aria-pressed'] });
      }
      RiversideStationChrome.foldSteps(host);
      const exit = host.querySelector('#exitBtn');
      if (exit) exit.focus({ preventScroll: true });

      let done = null;
      return {
        unmount(reason) {
          if (done) return { abandoned: false };
          if (look) look.stop();
          if (cues) cues.stop();
          if (padObs) padObs.disconnect();
          done = station.unmount(reason);
          return done;
        }
      };
    }
  });
})();
