// Station chrome shared by the stations inside the brewery app (extracted
// when the Hefeweizen station became the second user; rule of two). Panel
// only: it never touches a station's stage, sim or scoring.
// Classic script; publishes RiversideStationChrome.
(function (global) {
  'use strict';
  // Watch: the caption carries the current step; the full step list and the
  // explanation fold away behind a toggle.
  function foldSteps(host) {
    const tbox = host.querySelector('#transcriptBox');
    if (!tbox) return;
    tbox.classList.add('is-folded');
    tbox.insertAdjacentHTML('afterbegin', '<button type="button" class="st-steps-toggle" aria-expanded="false" aria-controls="transcript">Show all steps</button>');
    const tg = tbox.querySelector('.st-steps-toggle');
    tg.addEventListener('click', () => {
      const open = tbox.classList.toggle('is-folded') === false;
      tg.setAttribute('aria-expanded', String(open));
      tg.textContent = open ? 'Hide steps' : 'Show all steps';
    });
  }
  global.RiversideStationChrome = { foldSteps };
})(window);
