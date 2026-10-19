// The approved M2 station treatment, applied from outside the station (the
// station itself is unchanged): warm grade + light wrap on the art, a faucet
// drop shadow, a contact shadow under the glass on the drip tray, and the
// subtle glass edge. Bands, labels, marks and the head gauge are never
// filtered. Classic script; publishes RiversideStationLook.
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const GRADE = '1.03 0.03 0 0 0  0 0.98 0.02 0 0  -0.02 0.03 0.84 0 0  0 0 0 1 0';
  const TRAY_Y = 340;          // scene units: the upright glass base rests at y 339

  function filter(id, { wrap, drop }) {
    let f = `<filter id="${id}" x="-25%" y="-25%" width="160%" height="160%" color-interpolation-filters="sRGB">` +
      `<feColorMatrix in="SourceGraphic" type="matrix" values="${GRADE}" result="c"/>`;
    const merge = [];
    if (drop) {
      f += '<feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="5" dy="9" result="so"/>' +
           '<feFlood flood-color="#030504" flood-opacity="0.7"/><feComposite in2="so" operator="in" result="s"/>';
      merge.push('s');
    }
    if (wrap) {
      f += '<feGaussianBlur in="SourceAlpha" stdDeviation="1.4"/><feOffset dy="-1.2" result="wo"/>' +
           '<feFlood flood-color="#ffb547" flood-opacity="0.35"/><feComposite in2="wo" operator="in" result="w"/>';
      merge.push('w');
    }
    merge.push('c');
    return f + '<feMerge>' + merge.map(m => `<feMergeNode in="${m}"/>`).join('') + '</feMerge></filter>';
  }

  function apply(host) {
    const scene = host.querySelector('#scene');
    if (!scene) return { stop() {} };
    host.classList.add('st-look');
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = filter('st-fx-tap', { wrap: true, drop: true }) + filter('st-fx-glass', { wrap: true, drop: false }) +
      filter('st-fx-beer', { wrap: false, drop: false }) +
      '<filter id="st-soft" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>' +
      '<linearGradient id="st-edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff1d6" stop-opacity="0.85"/>' +
      '<stop offset="0.5" stop-color="#ffe8c4" stop-opacity="0.45"/><stop offset="1" stop-color="#ffe0b0" stop-opacity="0.22"/></linearGradient>';
    scene.prepend(defs);
    const set = (sel, id) => scene.querySelectorAll(sel).forEach(el => el.setAttribute('filter', `url(#${id})`));
    set('#tap', 'st-fx-tap');
    set('#glassArt, #glassBackArt', 'st-fx-glass');
    set(':scope > g[clip-path], #stream, #streamCore, #splash, #spill', 'st-fx-beer');
    const contact = document.createElementNS(NS, 'ellipse');
    contact.setAttribute('fill', '#030504'); contact.setAttribute('filter', 'url(#st-soft)');
    scene.insertBefore(contact, scene.querySelector('#glassBack'));

    // The contact shadow follows the glass: it reads the transform the
    // renderer already wrote and never touches sim state.
    const glass = scene.querySelector('#glass');
    let raf = 0, last = '';
    (function tick() {
      raf = requestAnimationFrame(tick);
      const t = glass.getAttribute('transform') || '';
      if (t === last) return;
      last = t;
      const m = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(t);
      if (!m) return;
      const px = +m[1], py = +m[2], a = +m[3] * Math.PI / 180;
      const lift = Math.max(0, TRAY_Y - py), k = Math.max(0, 1 - lift / 160);
      contact.setAttribute('cx', (px + 0.35 * 227 * Math.sin(a)).toFixed(1));
      contact.setAttribute('cy', TRAY_Y + 1);
      contact.setAttribute('rx', (40 + lift * 0.12).toFixed(1));
      contact.setAttribute('ry', (4.5 + lift * 0.02).toFixed(1));
      contact.setAttribute('opacity', (0.8 * k).toFixed(3));
    })();
    return { stop() { cancelAnimationFrame(raf); host.classList.remove('st-look'); } };
  }

  global.RiversideStationLook = { apply };
})(window);
