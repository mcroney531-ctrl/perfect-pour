// Brewery hub scenes: the environment plates and where each station sits in
// them. Coordinates are in the plate's own pixels, so tuning an anchor never
// depends on a screen size. layoutScene() maps them to the screen. It is
// pure, so it is unit-tested in Node (test/hub-layout.test.js).
// Classic script; publishes RiversideHubScenes.
(function (global) {
  'use strict';

  // Portrait and desktop are separate camera compositions of the same bar,
  // each with its own anchor map. `provisional` plates are labelled on screen
  // and are not production art. Swap `src` (and `provisional`) when the real
  // plates arrive; re-tune the anchors to the new art if it moved.
  const SCENES = {
    portrait: {
      src: 'assets/hub/hub-portrait-provisional.svg', provisional: true,
      width: 1170, height: 2532,
      anchors: {                        // the counter point each station marker sits on
        pilsner: [330, 1560],           // near-left foreground tap
        hefeweizen: [585, 1170],        // back counter, centre
        stout: [840, 1560],             // near-right foreground tap
        finalRush: [585, 2060]          // centre aisle medallion
      },
      focus: [585, 1560]                // kept nearest the screen centre when cropping
    },
    desktop: {
      src: 'assets/hub/hub-desktop-provisional.svg', provisional: true,
      width: 1920, height: 1080,
      anchors: {
        pilsner: [600, 650],
        hefeweizen: [960, 480],
        stout: [1320, 650],
        finalRush: [960, 905]
      },
      focus: [960, 640]
    }
  };

  // Desktop composition from square-ish and wider; portrait otherwise.
  const pickScene = (vw, vh) => (vw / vh >= 1 ? 'desktop' : 'portrait');

  // Fit a plate to a viewport like object-fit: cover, around `focus`, but never
  // at the cost of a station: every anchor plus the room its card needs stays
  // on screen. If cover can't manage that (short or narrow screens), the plate
  // is scaled down and the uncovered edge shows the page background. It never
  // shrinks so far that the back station's card would sit on the foreground
  // cards; below that the hub scrolls instead (`height` > the viewport).
  //   room: { top, bottom, side }       screen px reserved (header, notice, margins)
  //   card: { w, h }                    station card size, drawn above its anchor
  //   rush: { h }                       Final Rush marker height, centred on its anchor
  function layoutScene(scene, vw, vh, room, card, rush) {
    const pts = Object.values(scene.anchors);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = card.w / 2, padTop = room.top + card.h, padBottom = room.bottom + rush.h / 2;
    const cover = Math.max(vw / scene.width, vh / scene.height);
    const fitX = (vw - 2 * room.side - 2 * padX) / Math.max(1, maxX - minX);
    const fitY = (vh - padTop - padBottom) / Math.max(1, maxY - minY);
    const A = scene.anchors;
    const minScale = Math.max(
      (card.h + 8) / Math.max(1, Math.min(A.pilsner[1], A.stout[1]) - A.hefeweizen[1]),
      (rush.h / 2 + 8) / Math.max(1, A.finalRush[1] - Math.max(A.pilsner[1], A.stout[1])));
    const s = Math.max(0.01, Math.min(fitX, Math.max(minScale, Math.min(cover, fitY))));
    const height = Math.max(vh, padTop + (maxY - minY) * s + padBottom);

    function axis(len, view, lo, hi, padLo, padHi, focus, safe) {
      const size = len * s;
      let o = size >= view ? view / 2 - focus * s : (view - size) / 2;
      if (size >= view) o = Math.min(0, Math.max(view - size, o));          // keep it covering
      const reqLo = safe + padLo - lo * s, reqHi = view - safe - padHi - hi * s;
      // Stations win over cover. (When they exactly fill the screen the two
      // bounds meet, give or take rounding.)
      o = reqLo <= reqHi + 1e-6 ? Math.min(reqHi, Math.max(reqLo, o)) : (reqLo + reqHi) / 2;
      return o;
    }
    const ox = axis(scene.width, vw, minX, maxX, padX, padX, scene.focus[0], room.side);
    const oy = axis(scene.height, height, minY, maxY, padTop, padBottom, scene.focus[1], 0);
    const points = {};
    for (const [id, [x, y]] of Object.entries(scene.anchors)) points[id] = [ox + x * s, oy + y * s];
    return { s, ox, oy, points, height, covers: scene.width * s >= vw - 0.5 && scene.height * s >= height - 0.5 };
  }

  global.RiversideHubScenes = { SCENES, pickScene, layoutScene };
})(typeof window !== 'undefined' ? window : globalThis);
