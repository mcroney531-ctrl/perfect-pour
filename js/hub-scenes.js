// Brewery hub scenes: the environment plates and where each station sits in
// them. Coordinates are in the plate's own pixels, so tuning a station never
// depends on a screen size. layoutScene() maps them to the screen and places
// the cards. It is pure, so it is unit-tested in Node (test/hub-layout.test.js).
// Classic script; publishes RiversideHubScenes.
(function (global) {
  'use strict';

  // Portrait and desktop are separate camera compositions of the same bar,
  // each with its own station map:
  //   at:    the point the station's ring sits on (the tap's drip tray, or the
  //          floor medallion for Final Rush)
  //   card:  'above' or 'below' the ring;  lift: extra plate px between ring
  //          and card (clears a tap tower);  dx: plate px to slide the card
  //          sideways (clears the sign). Cards are kept on screen regardless.
  // `provisional` plates are labelled on screen and are not production art.
  const SCENES = {
    portrait: {
      src: 'assets/hub/hub-portrait.webp', provisional: false,
      width: 1170, height: 2532,
      stations: {
        pilsner: { at: [115, 1095], card: 'below', lift: 40 },              // near-left tap
        hefeweizen: { at: [587, 935], card: 'above', lift: 250, dx: 170 },  // back counter, card above the tower, right of the sign
        stout: { at: [1065, 1095], card: 'below', lift: 40 },               // near-right tap
        finalRush: { at: [584, 1772] }                                      // floor medallion, centre aisle
      },
      focus: [585, 1300]                // kept nearest the screen centre when cropping
    },
    desktop: {
      // Candidate 1 (1672 x 941), installed for critique only: labelled
      // provisional. The generated template is assets/hub/hub-desktop-provisional.svg.
      src: 'assets/hub/hub-desktop-candidate1.webp', provisional: true,
      width: 1672, height: 941,
      stations: {
        pilsner: { at: [240, 445], card: 'above' },
        hefeweizen: { at: [835, 378], card: 'below' },   // above would cover the sign
        stout: { at: [1445, 445], card: 'above' },
        finalRush: { at: [837, 718] }
      },
      focus: [836, 470]
    }
  };

  // Desktop composition from square-ish and wider; portrait otherwise.
  const pickScene = (vw, vh) => (vw / vh >= 1 ? 'desktop' : 'portrait');

  const GAP = 12;        // screen px between a ring and its card
  const SEP = 8;         // minimum screen px between any two cards

  // Fit a plate to a viewport like object-fit: cover, around `focus`, but never
  // at the cost of a station: every ring and card stays on screen and no two
  // cards touch. If cover can't manage that (short or narrow screens), the
  // plate is scaled down and the uncovered edge shows the page background;
  // below the size where cards would collide, the hub scrolls instead
  // (`height` > the viewport).
  //   room: { top, bottom, side, edge, ring }  header/notice space, card and ring margins, ring width
  //   card: { w, h }                            station card size
  //   rush: { w, h }                            Final Rush marker size, centred on its point
  function layoutScene(scene, vw, vh, room, card, rush) {
    const st = scene.stations, ids = Object.keys(st);
    const ringHalf = room.ring / 2, ringV = room.ring * 0.15;

    // A station's box in plate-origin screen px at scale s (before offsets).
    function box(id, s) {
      const p = st[id], x = (p.at[0] + (p.dx || 0)) * s, y = p.at[1] * s;
      if (id === 'finalRush') return { x: x - rush.w / 2, w: rush.w, top: y - rush.h / 2, bottom: y + rush.h / 2 };
      const lift = (p.lift || 0) * s + GAP;
      return p.card === 'below'
        ? { x: x - card.w / 2, w: card.w, top: y - ringV, bottom: y + lift + card.h }
        : { x: x - card.w / 2, w: card.w, top: y - lift - card.h, bottom: y + ringV };
    }
    const span = s => { const b = ids.map(id => box(id, s)); return { top: Math.min(...b.map(v => v.top)), bottom: Math.max(...b.map(v => v.bottom)) }; };
    function clear(s) {          // no two cards overlap where they share columns
      const b = ids.map(id => box(id, s));
      for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
        const sideBySide = b[i].x + b[i].w + SEP <= b[j].x || b[j].x + b[j].w + SEP <= b[i].x;
        const stacked = b[i].bottom + SEP <= b[j].top || b[j].bottom + SEP <= b[i].top;
        if (!sideBySide && !stacked) return false;
      }
      return true;
    }
    // Largest s in [lo, hi] for which ok(s) holds (ok true at lo), or smallest
    // for which it holds (ok true at hi); both monotone here.
    const largest = (ok, lo, hi) => { for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ok(m)) lo = m; else hi = m; } return lo; };
    const smallest = (ok, lo, hi) => { for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; } return hi; };

    const xs = ids.map(id => st[id].at[0]), minX = Math.min(...xs), maxX = Math.max(...xs);
    const cover = Math.max(vw / scene.width, vh / scene.height);
    const fitX = (vw - 2 * room.edge - room.ring) / Math.max(1, maxX - minX);
    const availY = vh - room.top - room.bottom;
    const fitY = span(0.0001).bottom - span(0.0001).top > availY ? 0.0001
      : largest(s => span(s).bottom - span(s).top <= availY, 0.0001, Math.max(cover, 0.0002));
    const minScale = clear(cover * 4) ? smallest(clear, 0.0001, cover * 4) : cover;
    const s = Math.max(0.0001, Math.min(fitX, Math.max(minScale, Math.min(cover, fitY))));
    const sp = span(s);
    const height = Math.max(vh, room.top + (sp.bottom - sp.top) + room.bottom);

    function axis(len, view, reqLo, reqHi, focus) {
      const size = len * s;
      let o = size >= view ? Math.min(0, Math.max(view - size, view / 2 - focus * s)) : (view - size) / 2;
      // Stations win over cover. (When they exactly fill the screen the two
      // bounds meet, give or take rounding.)
      return reqLo <= reqHi + 1e-6 ? Math.min(reqHi, Math.max(reqLo, o)) : (reqLo + reqHi) / 2;
    }
    const ox = axis(scene.width, vw, room.edge + ringHalf - minX * s, vw - room.edge - ringHalf - maxX * s, scene.focus[0]);
    const oy = axis(scene.height, height, room.top - sp.top, height - room.bottom - sp.bottom, scene.focus[1]);

    // Final positions: rings on their points; cards from their boxes, pushed
    // inside the side margins and apart from a neighbour at the same height.
    const points = {}, cards = {};
    for (const id of ids) {
      points[id] = [ox + st[id].at[0] * s, oy + st[id].at[1] * s];
      const b = box(id, s), half = b.w / 2;
      const cx = Math.min(vw - room.side - half, Math.max(room.side + half, ox + b.x + half));
      const below = id !== 'finalRush' && st[id].card === 'below';
      cards[id] = { cx, top: oy + (below ? b.bottom - card.h : b.top), w: b.w, h: id === 'finalRush' ? rush.h : card.h };
    }
    const sorted = ids.filter(id => id !== 'finalRush').sort((a, b) => cards[a].cx - cards[b].cx);
    for (let i = 1; i < sorted.length; i++) {
      const a = cards[sorted[i - 1]], b = cards[sorted[i]];
      const sameRow = !(a.top + a.h + SEP <= b.top || b.top + b.h + SEP <= a.top);
      const need = (a.w + b.w) / 2 + SEP - (b.cx - a.cx);
      if (sameRow && need > 0) { a.cx = Math.max(room.side + a.w / 2, a.cx - need / 2); b.cx = Math.min(vw - room.side - b.w / 2, b.cx + need / 2); }
    }
    return { s, ox, oy, points, cards, height,
      covers: scene.width * s >= vw - 0.5 && scene.height * s >= height - 0.5 };
  }

  global.RiversideHubScenes = { SCENES, pickScene, layoutScene, GAP, SEP };
})(typeof window !== 'undefined' ? window : globalThis);
