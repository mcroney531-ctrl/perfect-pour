// Straighten-gesture cues for the Pilsner station inside the brewery app.
// Presentation only: it reads what the station already shows (mode, whether
// the pad is held, the glass angle, the level) and draws a cue on the pad.
// It never sends input, and the station, simulation and scoring are
// unchanged. Classic script; publishes RiversideStationCues.
//   Watch:  rising chevrons beside the demo thumb while it slides the glass up.
//   Guided: "Keep holding · slide up slowly" when the beer reaches the BRING UP
//           band and the glass hasn't started coming up; gone once it does.
//   Solo:   nothing (independent recall).
(function (global) {
  'use strict';
  const BRING_UP = 50;          // % full: start of the BRING UP band (the sourced half-full)
  const TILTED = 35;            // degrees: the glass counts as tilted
  const STARTED = 5;            // degrees below the pour's steepest angle = straightening began

  function apply(host) {
    const pad = host.querySelector('#pour');
    if (!pad) return { stop() {} };
    pad.insertAdjacentHTML('beforeend',
      '<span class="st-cue" aria-hidden="true"><span class="st-cue__chev">⌃⌃⌃</span>' +
      '<span class="st-cue__text">Keep holding · slide up slowly</span></span>');
    const cue = pad.querySelector('.st-cue');
    // The visual cue is aria-hidden; its spoken equivalent goes to a polite
    // live region once per pour, at the same moment.
    host.insertAdjacentHTML('beforeend', '<div class="sr-only st-cue-live" aria-live="polite" aria-atomic="true"></div>');
    const live = host.querySelector('.st-cue-live');
    let spoken = false;
    const glass = host.querySelector('#glass'), levelEl = host.querySelector('#levelText');
    let raf = 0, steepest = 0, shown = '';

    function read() {
      const m = /rotate\(([-\d.]+)\)/.exec(glass.getAttribute('transform') || '');
      const cur = host.querySelector('#modes [aria-current="true"]');
      return {
        mode: cur ? cur.dataset.mode : '',
        held: pad.getAttribute('aria-pressed') === 'true',
        angle: m ? +m[1] : 0,
        level: parseInt((levelEl.textContent || '0').replace(/\D/g, ''), 10) || 0
      };
    }
    function show(kind) {
      if (kind === shown) return;
      shown = kind;
      if (kind === 'guided' && !spoken) {
        spoken = true;
        live.textContent = 'The beer is at the BRING UP band. Keep holding and bring the glass up slowly: slide up on the pad, or press the Up arrow.';
      }
      cue.className = 'st-cue' + (kind ? ' is-on st-cue--' + kind : '');
    }
    (function tick() {
      raf = requestAnimationFrame(tick);
      const s = read();
      if (!s.held || s.level < 3) steepest = 0;
      if (s.level < 3) { spoken = false; live.textContent = ''; }
      if (s.held) steepest = Math.max(steepest, s.angle);
      const tilted = steepest >= TILTED, begun = tilted && s.angle <= steepest - STARTED;
      if (s.mode === 'watch') show(s.held && begun && s.angle > 15 ? 'watch' : '');
      else if (s.mode === 'guided') show(s.held && tilted && !begun && s.level >= BRING_UP ? 'guided' : '');
      else show('');
    })();
    return { stop() { cancelAnimationFrame(raf); cue.remove(); live.remove(); } };
  }

  global.RiversideStationCues = { apply };
})(window);
