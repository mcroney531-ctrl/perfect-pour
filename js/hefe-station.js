// Perfect Pour: the Hefeweizen station (Foam Control). Renderer, input,
// Watch/Guided/Solo flow, result sheet and pour log for js/hefe-sim.js.
// Presentation and input only: it reads sim state and feeds the sim input.
//
// Its own module, not a mode of the Pilsner station (the Pilsner station is
// protected). It reuses the Pilsner station's markup structure and element
// ids on purpose, so the shared station styles (css/pilsner-station.css and
// the in-frame layout in css/brewery.css) apply unchanged, and the hands meet
// the same pad, keys and buttons. What differs is the beer: a curved weizen
// glass, foam that varies from pour to pour, two Watch demos, coaching that
// points at the foam (no target band on the glass), and seeded pours that a
// restart replays rather than rerolls.
//
//   const station = HefeStation.mount(hostElement, { onExit, onEvent });
//   station.unmount('navigate');   // -> { abandoned }
(function (global) {
  'use strict';

  // The station's stage: its own scene, art and overlays. The panel, result
  // sheet and live region around it come from the shared builder
  // (js/station-markup.js), filled with this station's slots.
  const STAGE = `\
    <svg id="scene" viewBox="0 -24 340 424" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="sceneTitle sceneDesc">
      <title id="sceneTitle">Weizen glass under the tap.</title>
      <desc id="sceneDesc">Level, head and foam are announced as you pour.</desc>
      <defs>
        <clipPath id="glassClip" clipPathUnits="userSpaceOnUse"><polygon id="clipPoly" points="0,0"/></clipPath>
        <linearGradient id="beerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f6cf6e"/>
          <stop offset="0.55" stop-color="#e9a843"/>
          <stop offset="1" stop-color="#cf8a2c"/>
        </linearGradient>
        <pattern id="foamPat" width="9" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.7" fill="#efe3c6"/>
          <circle cx="7" cy="6" r="1.2" fill="#f2e8d0"/>
        </pattern>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#f6eedf" stroke-width="1.4"/>
        </pattern>
        <linearGradient id="metalH" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f3ead9"/><stop offset="0.45" stop-color="#cdc2ae"/><stop offset="1" stop-color="#857b6c"/>
        </linearGradient>
        <linearGradient id="metalV" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#8a8072"/><stop offset="0.3" stop-color="#efe5d2"/><stop offset="0.62" stop-color="#cbbfab"/><stop offset="1" stop-color="#7d7466"/>
        </linearGradient>
        <linearGradient id="handleWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#2e1a0d"/><stop offset="0.38" stop-color="#6e4325"/><stop offset="0.7" stop-color="#57331b"/><stop offset="1" stop-color="#2a170b"/>
        </linearGradient>
        <radialGradient id="nozzleGlow">
          <stop offset="0" stop-color="#ffd877" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd877" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="foamGrad" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="10">
          <stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#f1e4c4"/>
        </linearGradient>
      </defs>

      <!-- Tap: the same faucet as the Pilsner station, with its own badge. -->
      <g id="tap" stroke="#24170d" stroke-width="1.6" stroke-linejoin="round">
        <rect id="tapShank" x="224" y="28" width="130" height="17" rx="8.5" fill="url(#metalH)"/>
        <path d="M232,32 L340,32" stroke="#fffaf0" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>
        <rect id="tapNut" x="219" y="23" width="12" height="27" rx="3" fill="url(#metalV)"/>
        <path id="tapBody" d="M195,31 Q195,22 204,22 L216,22 Q225,22 225,31 L225,49 Q225,57 218,59 L216,62 L204,62 L202,59 Q195,57 195,49 Z" fill="url(#metalV)"/>
        <path d="M200,30 L200,50" stroke="#fffaf0" stroke-opacity="0.7" stroke-width="2.2" stroke-linecap="round"/>
        <path id="tapSpout" d="M203.5,61 L216.5,61 L214.5,70 Q210,73.5 205.5,70 Z" fill="url(#metalV)"/>
        <ellipse cx="210" cy="71" rx="3.4" ry="1.4" fill="#120b06" stroke="none"/>
        <circle id="tapGlow" cx="210" cy="74" r="7" fill="url(#nozzleGlow)" stroke="none" opacity="0"/>
        <g id="handle">
          <rect x="206" y="12" width="8" height="12" rx="2" fill="url(#metalV)"/>
          <path id="tapHandle" d="M203.5,13 L201,-11 Q201,-20 210,-21 Q219,-20 219,-11 L216.5,13 Z" fill="url(#handleWood)"/>
          <rect id="tapBadge" x="204" y="-12.5" width="12" height="20" rx="3" fill="#c98a2c" stroke="#f2d9a6" stroke-width="1"/>
          <text id="tapLabel" x="210" y="0" text-anchor="middle" font-size="6.5" font-weight="800" stroke="none"
                transform="rotate(-90 210 -2.5)" style="fill:#2a1a0c; letter-spacing:0.04em">HEFE</text>
          <ellipse cx="210" cy="-20" rx="6.5" ry="2" fill="#8a5a33" stroke-width="1.2"/>
        </g>
      </g>

      <g id="glassBack"><g id="glassBackArt"></g></g>

      <g clip-path="url(#glassClip)">
        <path id="foamFill" fill="url(#foamGrad)"/>
        <path id="foamTex" fill="url(#foamPat)"/>
        <path id="beerFill" fill="url(#beerGrad)"/>
        <path id="beerEdge" fill="none" stroke="#9a5d17" stroke-opacity="0.75" stroke-width="1.6"/>
        <g id="bubbles" fill="#fff6d2" fill-opacity="0.7"></g>
      </g>
      <path id="stream" fill="none" stroke="#eaa72c" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="streamCore" fill="none" stroke="#fde6a0" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="splash" fill="#fbf4e2"></g>
      <path id="spill" fill="none" stroke="#fbf4e2" stroke-width="4" stroke-linecap="round"/>

      <g id="glass">
        <g id="glassArt"></g>
        <polygon id="zoneBand" fill="url(#hatch)" fill-opacity="0.45" stroke="#f6eedf" stroke-width="0.8" stroke-dasharray="2 2"/>
        <line id="fillLine" stroke="#f6eedf" stroke-width="1.6" stroke-dasharray="5 3"/>
        <text id="fillLabel" font-size="10" font-weight="700" text-anchor="end">LINE</text>
        <text id="stopLabel" font-size="9" font-weight="700" style="fill:#f6eedf">STOP</text>
        <g id="actMarks">
          <g id="markStraighten" style="display:none">
            <line id="markStraightenLine" stroke="#9fdc8a" stroke-width="3" stroke-linecap="round"/>
            <text id="markStraightenText" font-size="8.5" font-weight="700" style="fill:#9fdc8a"></text>
          </g>
          <g id="markStop" style="display:none">
            <line id="markStopLine" stroke="#f6eedf" stroke-width="3" stroke-linecap="round"/>
            <text id="markStopText" font-size="8.5" font-weight="700" style="fill:#f6eedf"></text>
          </g>
        </g>
      </g>

      <!-- Coaching points at the beer itself, not at a target: a bracket on
           the foam that is already on the beer. Watch and Guided only. -->
      <g id="foamCue" style="display:none">
        <path id="foamCueLine" fill="none" stroke="#fffaf0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <text id="foamCueText" font-size="9" font-weight="700" style="fill:#fffaf0">FOAM</text>
      </g>

      <g id="gauge">
        <text x="23" y="30" text-anchor="middle" font-size="10" font-weight="700">HEAD</text>
        <rect x="14" y="38" width="18" height="140" rx="3" fill="rgba(255,255,255,0.04)" stroke="#5c4a37" stroke-width="1.5"/>
        <rect id="gaugeBar" x="16" width="14" rx="2" fill="#fbf4e2"/>
        <rect id="gaugeBarTex" x="16" width="14" fill="url(#foamPat)"/>
        <rect id="gaugeBand" x="10" width="26" fill="url(#hatch)" fill-opacity="0.55" stroke="#f6eedf" stroke-width="1.2"/>
        <text id="gaugeHi" x="40" font-size="9"></text>
        <text id="gaugeLo" x="40" font-size="9"></text>
        <text id="gaugeVal" x="10" y="196" font-size="12" font-weight="700" style="fill:#f6eedf"></text>
        <text id="gaugeState" x="10" y="209" font-size="9"></text>
      </g>
      <text id="levelText" x="10" y="228" font-size="11"></text>
    </svg>
`;
  const MARKUP = RiversideStationMarkup.station({
    brand: 'Hefeweizen',
    stage: STAGE,
    pourHelp: `Hold the button, or hold Space or Enter, to pour. Slide up on the button, or press the Up arrow, to bring the glass upright. Turn on tap mode to start and stop with single presses. Use the glass switch, or the T key, to tilt the glass.`,
    // The optional comparison demo.
    watchExtra: `      <button type="button" id="calmer">Watch a calmer pour</button>
`,
    transcriptNote: `Same pad as the Pilsner: keep holding, slide up to bring the glass up, let go at the <b>LINE</b>. There is no BRING UP band here: watch the foam already on the beer while the glass is tilted. Lots of foam, stay tilted longer; little foam, come up sooner. How lively each pour is varies in this training game.`,
    resultNote: `Training game: the steps follow common draught-service guidance; the foam variation, bands and windows are game settings (see docs/hefeweizen-behaviour.md).`
  });

  // Which pour comes next, per mode, kept on this device so leaving and
  // coming back (or restarting) replays the same pour; only a served pour
  // moves on. (Station-owned, like the pour log.)
  const SEQ_KEY = 'riverside.hefe.scenario';
  function readSeq() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(SEQ_KEY)); } catch (_) { d = null; }
    const n = v => (Number.isInteger(v) && v >= 0 ? v : 0);
    return { guided: n(d && d.guided), solo: n(d && d.solo) };
  }

  function mount(host, opts = {}) {
    const { STEP, HEFE, CONTROL, POLY, PROFILE, initState, step, canServe, evaluate, feedback, scenario,
      GHOST, GHOST_STEPS, GHOST_LIVE, GHOST_CALM, GHOST_CALM_STEPS, GHOST_CALM_LIVE, inputAt, HINTS, guidedHints,
      surfaceAt, levelOf, headOf, VERDICT_TEXT, fillZone, padTarget, straightenWindow } = HefeSim;
    host.insertAdjacentHTML('beforeend', MARKUP);
    host.classList.add('pp-st');
    const emit = (type, detail) => { try { if (opts.onEvent) opts.onEvent(type, detail); } catch (_) { /* host's problem */ } };
    const $ = id => host.querySelector('#' + id);
    // Tracked window/document listeners and the alive flag (js/station-kit.js).
    const Kit = RiversideStationKit;
    const life = Kit.lifecycle(), on = life.on;
    if (opts.onExit) {
      const brand = host.querySelector('.brand');
      brand.insertAdjacentHTML('afterend',
        `<button type="button" id="exitBtn" aria-label="${opts.exitLabel || 'Back to the bar'}">‹ ${opts.exitText || 'Bar'}<small>${opts.exitSub || 'Hefeweizen station'}</small></button>`);
      brand.hidden = true;
      $('exitBtn').addEventListener('click', () => opts.onExit());
    }
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const cfg = HEFE, ctl = CONTROL;
    const setText = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
    const setAttr = (el, k, v) => { v = String(v); if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
    const pctOf = v => Math.round(v * 100);

    // ==== Renderer ===========================================================
    // Draws one sim state; holds no sim logic. The beer surface comes from
    // the sim's own geometry (surfaceAt), so the level drawn is the level
    // scored, at any tilt.
    const Renderer = (() => {
      const SVGNS = 'http://www.w3.org/2000/svg';
      const H = 235, base = 12, wall = 4;
      const G = { tapX: 210, nozzleY: 72, rimY: 340 - base - H };   // base rests on the drip tray (y 340), as the Pilsner's
      const RIM = -(base + H);
      const INNER = POLY.map(([x, y]) => [x * H, -base - y * H]);
      const half = INNER.length / 2;
      // Wall segments (both sides), for the stream to run down.
      const WALLS = [];
      for (let i = 0; i < half - 1; i++) WALLS.push([INNER[i], INNER[i + 1]]);
      for (let i = half; i < INNER.length - 1; i++) WALLS.push([INNER[i], INNER[i + 1]]);
      const halfAt = h => {
        const P = PROFILE;
        let i = 0;
        while (i < P.length - 2 && h > P[i + 1][0]) i++;
        const f = (h - P[i][0]) / (P[i + 1][0] - P[i][0]);
        return (P[i][1] + (P[i + 1][1] - P[i][1]) * f) * H;
      };
      const yAt = h => -base - h * H;
      const GAUGE = { top: 38, bottom: 178, max: 0.3 };
      const gaugeY = h => GAUGE.bottom - Math.min(h, GAUGE.max) / GAUGE.max * (GAUGE.bottom - GAUGE.top);
      const MARK_WORD = {
        straighten: { inRange: 'good timing', littleEarly: 'a little early', early: 'early', littleLate: 'a little late', late: 'late' },
        stop: { inZone: 'in zone', short: 'short', over: 'over' }
      };

      const E = {};
      ['clipPoly', 'foamFill', 'foamTex', 'beerFill', 'beerEdge', 'bubbles', 'stream', 'streamCore', 'splash', 'spill', 'glass',
       'glassBack', 'glassBackArt', 'glassArt', 'tapGlow', 'foamGrad', 'zoneBand', 'fillLine', 'fillLabel', 'handle',
       'gaugeBar', 'gaugeBarTex', 'gaugeBand', 'gaugeHi', 'gaugeLo', 'gaugeVal', 'gaugeState', 'levelText', 'stopLabel',
       'markStraighten', 'markStraightenLine', 'markStraightenText', 'markStop', 'markStopLine', 'markStopText',
       'foamCue', 'foamCueLine', 'foamCueText']
        .forEach(id => { E[id] = $(id); });

      // Glass art (provisional): the outer wall follows the same cavity the
      // sim measures, a wall's width out, on a short foot.
      const outer = side => PROFILE.map(([h, w]) => [side * (w * H + wall), yAt(h)]);
      const L = outer(-1), R = outer(1);
      const pts = a => a.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L');
      const ring = `M${pts(L.slice().reverse())} L${-halfAt(0) - wall},-2 L${halfAt(0) + wall},-2 L${pts(R)} ` +
        `L${pts(INNER.slice(half).reverse())} L${pts(INNER.slice(0, half).reverse())} Z`;
      const cavity = INNER.map(p => p.join(',')).join(' ');
      E.glassArt.innerHTML = `
        <path d="${ring}" fill="rgba(226,238,255,0.13)" stroke="rgba(238,246,255,0.92)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M${-halfAt(0) - wall - 3},0 L${halfAt(0) + wall + 3},0 L${halfAt(0) + wall},${-base + 1} L${-halfAt(0) - wall},${-base + 1} Z" fill="rgba(244,249,255,0.45)" stroke="rgba(238,246,255,0.92)" stroke-width="1.4"/>
        <line x1="${-halfAt(1) - wall}" y1="${RIM - 1}" x2="${halfAt(1) + wall}" y2="${RIM - 1}" stroke="rgba(255,255,255,0.8)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M${(-halfAt(0.62) + 6).toFixed(1)},${yAt(0.62).toFixed(1)} L${(-halfAt(0.9) + 7).toFixed(1)},${yAt(0.9).toFixed(1)}" stroke="rgba(255,255,255,0.26)" stroke-width="4" stroke-linecap="round"/>`;
      E.glassBackArt.innerHTML = `<polygon points="${cavity}" fill="rgba(214,230,255,0.045)"/>`;

      const bubbles = [];
      for (let i = 0; i < 14; i++) {
        const c = document.createElementNS(SVGNS, 'circle');
        E.bubbles.appendChild(c);
        bubbles.push({ el: c, x: -16 + ((i * 37) % 33), speed: 0.3 + ((i * 7) % 10) / 22, phase: (i * 0.137) % 1, r: 0.9 + (i % 3) * 0.45 });
      }
      const splash = [];
      for (let i = 0; i < 5; i++) {
        const c = document.createElementNS(SVGNS, 'circle');
        E.splash.appendChild(c);
        splash.push(c);
      }

      function geom(angle) {
        const a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        const u = angle / 45;
        const ax = G.tapX + 24 * u, ay = G.rimY + 10 * u;
        const px = ax + RIM * s, py = ay - RIM * c;
        const w = (x, y) => [px + x * c - y * s, py + x * s + y * c];
        const origin = w(0, -base);
        return { px, py, w, surfaceY: v => origin[1] - surfaceAt(v, angle) * H };
      }
      function surface(y, amp, phase, freq) {
        let d = '';
        for (let x = 0; x <= 340; x += 17) d += (x ? 'L' : 'M') + x + ',' + (y + amp * Math.sin(x * freq + phase)).toFixed(2);
        return d + 'L340,400L0,400Z';
      }

      function render(s, view) {
        const calm = view.reducedMotion, t = s.elapsed;
        const g = geom(s.angle);
        const tot = s.fill + s.foam;
        const screen = INNER.map(p => g.w(p[0], p[1]));
        setAttr(E.clipPoly, 'points', screen.map(p => p.map(v => v.toFixed(2)).join(',')).join(' '));
        const glassT = `translate(${g.px.toFixed(2)} ${g.py.toFixed(2)}) rotate(${s.angle.toFixed(2)})`;
        setAttr(E.glass, 'transform', glassT);
        setAttr(E.glassBack, 'transform', glassT);

        const yBeer = g.surfaceY(s.fill), yTop = g.surfaceY(tot);
        const wobble = calm ? 0 : 0.4 + 1.2 * s.flow * (0.3 + s.foamShare);
        E.beerFill.setAttribute('d', s.fill > 0.002 ? surface(yBeer, wobble, t * 7, 0.07) : '');
        const foamD = s.foam > 0.002 ? surface(yTop, 1.3, calm ? 0 : t * 1.2, 0.45) : '';
        E.foamFill.setAttribute('d', foamD);
        E.foamTex.setAttribute('d', foamD);
        setAttr(E.foamGrad, 'y1', yTop.toFixed(1)); setAttr(E.foamGrad, 'y2', Math.max(yTop + 4, yBeer).toFixed(1));
        // A darker line where beer meets foam, so the two read apart even when
        // the foam is thin.
        let edge = '';
        if (s.fill > 0.002 && s.foam > 0.002) for (let x = 0; x <= 340; x += 17) {
          edge += (x ? 'L' : 'M') + x + ',' + (yBeer + wobble * Math.sin(x * 0.07 + t * 7)).toFixed(2);
        }
        setAttr(E.beerEdge, 'd', edge);

        const bubblesOn = !calm && s.fill > 0.05;
        for (const b of bubbles) {
          if (!bubblesOn) { setAttr(b.el, 'r', 0); continue; }
          const [bx, by] = g.w(b.x, -base - 3);
          const travel = by - yBeer - 3;
          if (travel < 8) { setAttr(b.el, 'r', 0); continue; }
          const k = (t * b.speed + b.phase) % 1;
          b.el.setAttribute('cx', (bx + Math.sin(t * 3 + b.phase * 9) * 0.8).toFixed(2));
          b.el.setAttribute('cy', (by - k * travel).toFixed(2));
          setAttr(b.el, 'r', b.r);
        }

        // Stream: straight down; if it meets a wall above the surface it runs
        // down that wall.
        let impact = null;
        if (s.flow > 0.01) {
          const nx = G.tapX, ny = G.nozzleY;
          const rl = screen[0], rr = screen[screen.length - 1];
          const rimYAt = rl[0] === rr[0] ? rl[1] : rl[1] + (nx - rl[0]) / (rr[0] - rl[0]) * (rr[1] - rl[1]);
          let hit = null, seg = null;
          for (const [a, b] of WALLS) {
            const A = g.w(a[0], a[1]), B = g.w(b[0], b[1]);
            if ((nx - A[0]) * (nx - B[0]) > 0 || A[0] === B[0]) continue;
            const y = A[1] + (nx - A[0]) / (B[0] - A[0]) * (B[1] - A[1]);
            if (y > rimYAt + 1 && (hit === null || y < hit)) { hit = y; seg = [A, B]; }
          }
          let d;
          if (hit !== null && hit < yTop) {
            const [A, B] = seg;
            const k = Math.min(1, Math.max(0, (yTop - A[1]) / (B[1] - A[1])));
            const ex = A[0] + k * (B[0] - A[0]), ey = A[1] + k * (B[1] - A[1]);
            d = `M${nx},${ny} L${nx},${hit.toFixed(2)} L${ex.toFixed(2)},${ey.toFixed(2)}`;
            impact = { x: ex, y: ey, direct: false };
          } else {
            d = `M${nx},${ny} L${nx},${yTop.toFixed(2)}`;
            impact = { x: nx, y: yTop, direct: true };
          }
          E.stream.setAttribute('d', d);
          setAttr(E.stream, 'stroke-width', (1.5 + 4 * s.flow).toFixed(2));
          E.streamCore.setAttribute('d', d);
          setAttr(E.streamCore, 'stroke-width', (0.5 + 1.3 * s.flow).toFixed(2));
        } else {
          setAttr(E.stream, 'd', ''); setAttr(E.streamCore, 'd', '');
        }
        const agit = impact && s.fill > 0.01 ? s.flow * s.foamShare * (impact.direct ? 1.6 : 0.9) : 0;
        splash.forEach((c, i) => {
          if (agit < 0.05) { setAttr(c, 'r', 0); return; }
          const jx = calm ? 0 : Math.sin(t * 17 + i * 2.1) * 2;
          c.setAttribute('cx', (impact.x + (i - 2) * 4 + jx).toFixed(2));
          c.setAttribute('cy', (impact.y - 1 - (i % 2) * 2).toFixed(2));
          c.setAttribute('r', (1.2 + 2.6 * Math.min(1, agit) * (1 - Math.abs(i - 2) / 3)).toFixed(2));
        });
        if (s.spill > 0) {
          const lw = g.w(-halfAt(1) - wall, RIM - 2), rw = g.w(halfAt(1) + wall, RIM - 2);
          const lip = rw[1] >= lw[1] ? rw : lw, dir = lip === rw ? 1 : -1;
          E.spill.setAttribute('d', `M${lip[0].toFixed(1)},${lip[1].toFixed(1)} q${3 * dir},4 ${2 * dir},40`);
        } else setAttr(E.spill, 'd', '');

        // Fill line and zone, printed on the glass (the same heights scored).
        const zl = cfg.fillLine, [z0, z1] = fillZone(cfg);
        setAttr(E.zoneBand, 'points', `${-halfAt(z0)},${yAt(z0)} ${halfAt(z0)},${yAt(z0)} ${halfAt(z1)},${yAt(z1)} ${-halfAt(z1)},${yAt(z1)}`);
        setAttr(E.fillLine, 'x1', -halfAt(zl)); setAttr(E.fillLine, 'x2', halfAt(zl));
        setAttr(E.fillLine, 'y1', yAt(zl)); setAttr(E.fillLine, 'y2', yAt(zl));
        setAttr(E.fillLabel, 'x', -halfAt(zl) - wall - 4); setAttr(E.fillLabel, 'y', yAt(zl) + 4);
        setAttr(E.handle, 'transform', `rotate(${(-30 * s.flow).toFixed(1)} 210 24)`);
        setAttr(E.tapGlow, 'opacity', (0.8 * s.flow).toFixed(2));

        // Action marks (Watch and Guided): where the player started bringing
        // the glass up, and where the tap closed.
        const mark = (g2, line, text, ev, word) => {
          if (!ev) { g2.style.display = 'none'; return; }
          g2.style.display = '';
          const y = yAt(ev.level), x = halfAt(ev.level) + wall;
          setAttr(line, 'x1', x - 2); setAttr(line, 'x2', x + 8); setAttr(line, 'y1', y.toFixed(1)); setAttr(line, 'y2', y.toFixed(1));
          setAttr(text, 'x', (x + 11).toFixed(1)); setAttr(text, 'y', (y + 3).toFixed(1));
          setText(text, word);
        };
        const evs = view.marks || [];
        const st = evs.find(e => e.type === 'straighten'), sp = evs.filter(e => e.type === 'stop').at(-1);
        mark(E.markStraighten, E.markStraightenLine, E.markStraightenText, st, st && MARK_WORD.straighten[st.verdict]);
        mark(E.markStop, E.markStopLine, E.markStopText, sp, sp && MARK_WORD.stop[sp.verdict]);
        E.stopLabel.style.display = view.coach && !sp ? '' : 'none';
        setAttr(E.stopLabel, 'x', (halfAt(zl) + wall + 4).toFixed(1)); setAttr(E.stopLabel, 'y', (yAt(zl) + 3).toFixed(1));

        // Foam bracket: beside the glass, from the top of the foam down to the
        // beer, while the glass is tilted and pouring (Watch and Guided).
        const thick = yBeer - yTop;
        const cueOn = view.coach && s.flow > 0 && s.angle > cfg.straightenThreshold && thick >= 3;
        E.foamCue.style.display = cueOn ? '' : 'none';
        if (cueOn) {
          // Just outside the wall where the foam meets it.
          const wallX = y => {
            let x = -Infinity;
            for (let i = 0; i < screen.length; i++) {
              const a = screen[i], b = screen[(i + 1) % screen.length];
              if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) x = Math.max(x, a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
            }
            return x;
          };
          const x = Math.max(wallX(yTop), wallX(yBeer)) + wall + 6;
          setAttr(E.foamCueLine, 'd', `M${(x - 4).toFixed(1)},${yTop.toFixed(1)} h4 V${yBeer.toFixed(1)} h-4`);
          setAttr(E.foamCueText, 'x', (x + 5).toFixed(1)); setAttr(E.foamCueText, 'y', ((yTop + yBeer) / 2 + 3).toFixed(1));
          setAttr(E.foamCueLine, 'stroke-width', view.foamPulse ? 3 : 1.6);
          setAttr(E.foamCueLine, 'stroke', view.foamPulse ? '#ffd877' : '#fffaf0');
          E.foamCueText.style.fill = view.foamPulse ? '#ffd877' : '#fffaf0';
        }

        const head = headOf(s), [b0, b1] = cfg.headBand, gy = gaugeY(head);
        setAttr(E.gaugeBar, 'y', gy.toFixed(2)); setAttr(E.gaugeBar, 'height', (GAUGE.bottom - gy).toFixed(2));
        setAttr(E.gaugeBarTex, 'y', gy.toFixed(2)); setAttr(E.gaugeBarTex, 'height', (GAUGE.bottom - gy).toFixed(2));
        setAttr(E.gaugeBand, 'y', gaugeY(b1)); setAttr(E.gaugeBand, 'height', gaugeY(b0) - gaugeY(b1));
        setAttr(E.gaugeHi, 'y', gaugeY(b1) + 3); setText(E.gaugeHi, pctOf(b1) + '%');
        setAttr(E.gaugeLo, 'y', gaugeY(b0) + 3); setText(E.gaugeLo, pctOf(b0) + '%');
        setText(E.gaugeVal, pctOf(head) + '%');
        setText(E.gaugeState, head < b0 ? 'below band' : head > b1 ? 'above band' : 'in band');
        setText(E.levelText, `Level ${pctOf(levelOf(s))}%`);
      }
      return { render, halfAt };
    })();

    // ==== State ==============================================================
    const input = { pointer: false, key: false, latch: false, target: 0 };
    let activePointer = null, drag = null, tapMode = false;
    let mode = 'watch', demo = 'lively';
    let seq = readSeq();
    let sc = null;                       // this pour's scenario (Guided / Solo)
    let sim = initState({ live: GHOST_LIVE });
    let served = null;
    const ghost = { pour: false, stepIndex: -1 };
    let hintsFired = new Set(), milestones = new Set(), foamPulseUntil = -1, soloFailStreak = 0;
    let straightenVia = null;

    const pourBtn = $('pour'), toggle = $('angleToggle');
    const locked = () => served !== null || mode === 'watch';
    const pourWanted = () => served === null && (mode === 'watch' ? ghost.pour : (input.pointer || input.key || input.latch));
    const timeline = () => (demo === 'calm' ? GHOST_CALM : GHOST);

    function stopPour() {
      input.pointer = input.key = input.latch = false;
      drag = null;
      if (activePointer !== null) {
        try { pourBtn.releasePointerCapture(activePointer); } catch (_) { /* already gone */ }
        activePointer = null;
      }
    }
    const setTarget = v => { input.target = Math.max(0, Math.min(ctl.maxAngle, Math.round(v * 10) / 10)); };
    const noteStraighten = via => { if (sim.opened && !straightenVia && input.target < cfg.tiltThreshold) straightenVia = via; };

    // ==== Input (the Pilsner's continuous pad, same feel) =====================
    pourBtn.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (locked()) return;
      activePointer = e.pointerId;
      try { pourBtn.setPointerCapture(e.pointerId); } catch (_) { /* pointer already released */ }
      drag = { y0: e.clientY, angle0: input.target, moved: false };
      if (!tapMode) input.pointer = true;
    });
    pourBtn.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== activePointer || locked()) return;
      const dy = drag.y0 - e.clientY;
      if (Math.abs(dy) > ctl.padDead) drag.moved = true;
      if (drag.moved) { setTarget(padTarget(drag.angle0, dy, ctl)); noteStraighten('slide'); }
    });
    const endPointer = e => {
      if (e.pointerId !== activePointer) return;
      if (tapMode && drag && !drag.moved && e.type === 'pointerup' && !locked()) input.latch = !input.latch;
      input.pointer = false;
      activePointer = null;
      drag = null;
    };
    pourBtn.addEventListener('pointerup', endPointer);
    pourBtn.addEventListener('pointercancel', endPointer);
    pourBtn.addEventListener('lostpointercapture', endPointer);
    pourBtn.addEventListener('contextmenu', e => e.preventDefault());
    let lastPointerAt = -Infinity;
    const notePointer = () => { lastPointerAt = performance.now(); };
    on(document, 'pointerdown', notePointer, true);
    on(document, 'pointerup', notePointer, true);
    const fromPointer = () => performance.now() - lastPointerAt < 1000;
    pourBtn.addEventListener('click', () => { if (!fromPointer() && !locked()) input.latch = !input.latch; });
    $('tapMode').addEventListener('change', e => { tapMode = e.target.checked; stopPour(); });
    toggle.addEventListener('click', () => {
      if (locked()) return;
      setTarget(input.target >= ctl.tiltAngle / 2 ? 0 : ctl.tiltAngle);
      noteStraighten('button');
    });

    const isTyping = el => el && (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable ||
      (el.tagName === 'INPUT' && el.type !== 'range' && el.type !== 'checkbox'));
    const isOtherControl = el => el && el !== pourBtn &&
      (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY' || (el.tagName === 'INPUT' && el.type === 'checkbox'));
    on(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (isTyping(el)) return;
      const k = e.key;
      if (k === ' ' || k === 'Enter') {
        if (isOtherControl(el)) return;
        e.preventDefault();
        if (e.repeat || locked()) return;
        if (tapMode) input.latch = !input.latch; else input.key = true;
      } else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'ArrowRight' || k === 'ArrowUp') {
        e.preventDefault();
        if (locked()) return;
        setTarget(input.target + (k === 'ArrowUp' || k === 'ArrowLeft' ? -5 : 5));
        noteStraighten('key');
      } else if (k === 't' || k === 'T') {
        e.preventDefault();
        if (!locked()) toggle.click();
      } else if ((k === 's' || k === 'S') && mode !== 'watch') {
        e.preventDefault(); serve();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault(); restart();
      }
    });
    on(document, 'click', e => {
      const b = e.target.closest && e.target.closest('button');
      if (b && b !== pourBtn && fromPointer()) setTimeout(() => { if (document.activeElement === b) b.blur(); }, 0);
    });
    on(window, 'keyup', e => {
      if ((e.key === ' ' || e.key === 'Enter') && input.key) { input.key = false; e.preventDefault(); }
    });
    on(window, 'blur', stopPour);
    on(window, 'pagehide', stopPour);
    on(document, 'visibilitychange', () => { if (document.hidden) stopPour(); });

    // ==== Speech and captions ================================================
    // Live-region speech batched over 80 ms, and the caption line (js/station-kit.js).
    const speech = Kit.announcer($('live'));
    const announce = speech.say, setCaption = Kit.caption($('caption'));

    // ==== Modes ==============================================================
    const MODE_LABEL = { watch: 'Watch', guided: 'Guided', solo: 'Solo' };
    const transcript = $('transcript');
    function fillTranscript() {
      transcript.textContent = '';
      (demo === 'calm' ? GHOST_CALM_STEPS : GHOST_STEPS).forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        transcript.appendChild(li);
      });
      setText($('calmer'), demo === 'calm' ? 'Watch the foamy pour again' : 'Watch a calmer pour');
    }

    function setMode(m) {
      if (mode !== 'watch' && sim.opened && !served) Log.record(sim, null, false, 'modeChange');
      mode = m;
      demo = 'lively';
      host.querySelectorAll('#modes button').forEach(b => {
        if (b.dataset.mode === m) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      const watching = m === 'watch';
      $('actions').hidden = watching;
      $('ghostActions').hidden = !watching;
      $('transcriptBox').hidden = !watching;
      $('controls').classList.toggle('demo', watching);
      fillTranscript();
      restart(true);
      announce(`${MODE_LABEL[m]} mode.` + (watching ? ' A demo pour is playing: a lively pour.' : ''));
    }
    host.querySelectorAll('#modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('replay').addEventListener('click', () => { restart(); $('replay').focus(); });
    $('calmer').addEventListener('click', () => {
      demo = demo === 'calm' ? 'lively' : 'calm';
      fillTranscript();
      restart();
      announce(demo === 'calm' ? 'A calmer pour is playing.' : 'The lively pour is playing.');
      $('calmer').focus();
    });
    $('skip').addEventListener('click', () => setMode('guided'));

    const OPENING = {
      watch: '',
      guided: 'Guided: same routine as the Pilsner. Watch how fast the foam builds while the glass is tilted, and time your bring-up to it.',
      solo: 'Solo: no hints. Read the foam, and serve when it looks right.'
    };

    function restart(quiet) {
      stopPour();
      if (mode !== 'watch' && sim.opened && !served && quiet !== true) Log.record(sim, null, false, 'restart');
      sc = mode === 'watch' ? null : scenario(mode, seq[mode]);
      sim = initState({ live: sc ? sc.live : demo === 'calm' ? GHOST_CALM_LIVE : GHOST_LIVE });
      served = null;
      ghost.pour = false; ghost.stepIndex = -1;
      hintsFired = new Set(); milestones = new Set(); foamPulseUntil = -1;
      straightenVia = null;
      setTarget(0);
      setCaption(OPENING[mode]);
      pourBtn.classList.remove('cue');
      const focusWasInSheet = $('result').contains(document.activeElement);
      $('result').hidden = true;
      if (focusWasInSheet) (mode === 'watch' ? $('replay') : pourBtn).focus({ preventScroll: true });
      [...transcript.children].forEach(li => li.removeAttribute('aria-current'));
    }

    function serve(fromGhost) {
      if (served || !canServe(sim) || (mode === 'watch' && !fromGhost)) return;
      stopPour();
      pourBtn.classList.remove('cue');
      const r = evaluate(sim, cfg);
      served = { result: r, text: feedback(r, cfg) };
      if (mode === 'solo') soloFailStreak = r.pass ? 0 : soloFailStreak + 1;
      if (mode !== 'watch') {
        Log.record(sim, r, true, 'served');
        // A completed pour moves this mode on to its next pour.
        seq[mode]++;
        try { localStorage.setItem(SEQ_KEY, JSON.stringify(seq)); } catch (_) { /* this visit only */ }
        emit('served', { mode, pass: r.pass });
      }
      showResult(r, served.text);
    }
    $('serve').addEventListener('click', () => serve(false));
    $('restart').addEventListener('click', () => restart());

    // ---- Result sheet ----
    function chip(ul, ok, big, line1, line2) {
      const li = document.createElement('li');
      li.className = ok ? 'ok' : 'miss';
      const b = document.createElement('b');
      b.textContent = `${ok ? '✓' : '✗'} ${big}`;
      li.append(b, line1);
      if (line2) li.append(document.createElement('br'), line2);
      ul.appendChild(li);
    }
    function showResult(r, text) {
      const m = r.metrics, [b0, b1] = cfg.headBand, demoMode = mode === 'watch';
      const title = r.pass ? (demoMode ? 'Demo pour: clean' : 'Clean pour')
        : r.techniqueOk ? 'Good technique. Adjust to the foam.' : 'Technique to fix';
      setText($('resultTitle'), title);
      setCaption(title);
      const tech = $('checksTech'), ul = $('checks');
      tech.textContent = ''; ul.textContent = '';
      chip(tech, r.procedure.tilted, 'Tilted first', m.startAngle === null ? 'never opened' : `opened at ${Math.round(m.startAngle)}°`);
      chip(tech, r.procedure.upright, 'Finished upright', m.closeAngle === null ? 'tap never closed' : `closed at ${Math.round(m.closeAngle)}°`);
      chip(ul, r.checks.head, `${pctOf(m.finalHead)}%`, `Head: ${r.checks.head ? 'in range' : m.finalHead > b1 ? 'too big' : 'too small'}`, `aim ${pctOf(b0)}–${pctOf(b1)}%`);
      chip(ul, r.checks.total, `${pctOf(m.finalLevel)}%`,
        `Level: ${r.checks.total ? 'in range' : m.finalLevel > fillZone(cfg)[1] ? 'too high' : 'too low'}`,
        `aim ${pctOf(fillZone(cfg)[0])}–${pctOf(fillZone(cfg)[1])}%`);
      chip(ul, r.checks.waste, `${pctOf(m.waste)}%`, `Spill: ${r.checks.waste ? 'in range' : 'too much'}`, `max ${pctOf(cfg.wasteTol)}%`);
      drawDebrief(sim, r);
      setText($('fbPrimary'), text.primary);
      $('fbSecondary').hidden = !text.secondary;
      setText($('fbSecondary'), text.secondary ? 'Also: ' + text.secondary : '');
      const suggest = mode === 'solo' && !r.pass && soloFailStreak >= 3;
      $('suggest').hidden = !suggest;
      setText($('suggest'), suggest ? `${soloFailStreak} misses in a row. Guided mode points out the foam, if you want it.` : '');
      const again = () => { restart(); pourBtn.focus(); };
      let actions;
      if (demoMode) actions = [['Try it guided', () => setMode('guided')], ['Watch again', () => setMode('watch')]];
      else if (mode === 'guided') actions = r.pass
        ? [['Try solo', () => setMode('solo')], ['Next pour', again]]
        : [['Next pour', again], ['Watch again', () => setMode('watch')]];
      else actions = r.pass
        ? [['Next pour', again], ['Watch again', () => setMode('watch')]]
        : [['Next pour', again], ['Watch again', () => setMode('watch')], ['Guided again', () => setMode('guided')]];
      const primaryIndex = suggest ? 2 : 0;
      const box = $('resultActions');
      box.textContent = '';
      actions.forEach(([label, fn], i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        if (i === primaryIndex) b.className = 'primary';
        b.addEventListener('click', fn);
        box.appendChild(b);
      });
      $('result').hidden = false;
      announce(`${title}. ${text.primary}${text.secondary ? ' Also: ' + text.secondary : ''}`);
      box.children[primaryIndex].focus({ preventScroll: true });
    }

    // The debrief: the glass again, after the pour. Here (and only here) the
    // good range for this pour is shown, next to where the player acted and
    // how much foam was on the beer at that moment.
    const MARK_PLAIN = {
      straighten: { inRange: 'good timing for this pour', littleEarly: 'a little early for this pour', early: 'early for this pour', littleLate: 'a little late for this pour', late: 'late for this pour' },
      stop: { inZone: 'in the zone', short: 'short', over: 'over the line' }
    };
    function drawDebrief(st, r) {
      const svg = $('debriefGlass'), m = r.metrics;
      const [w0, w1] = straightenWindow(st.live), [z0, zl] = fillZone(cfg);   // the feedback line below names the foam
      const top = 8, bot = 142, hgt = bot - top, cx = 50;
      const y = h => bot - h * hgt, hw = h => Renderer.halfAt(h) * hgt / 235;
      const sideAt = (h0, h1, sgn) => { const out = []; for (let i = 0; i <= 8; i++) { const h = h0 + (h1 - h0) * i / 8; out.push(`${(cx + sgn * hw(h)).toFixed(1)},${y(h).toFixed(1)}`); } return out; };
      const band = (h0, h1, fill, stroke, dash) =>
        `<polygon points="${[...sideAt(h0, h1, -1), ...sideAt(h0, h1, 1).reverse()].join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-dasharray="${dash}"/>`;
      const evs = st.events, sEv = evs.find(e => e.type === 'straighten'), pEv = evs.filter(e => e.type === 'stop').at(-1);
      const tick = (ev, color) => ev ? `<line x1="${cx + hw(ev.level) + 2}" x2="${cx + hw(ev.level) + 12}" y1="${y(ev.level)}" y2="${y(ev.level)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` : '';
      svg.innerHTML =
        `<polygon points="${[...sideAt(0, 1, -1), ...sideAt(0, 1, 1).reverse()].join(' ')}" fill="rgba(210,228,255,0.06)" stroke="rgba(230,240,255,0.8)" stroke-width="2"/>` +
        band(w0, w1, 'rgba(159,220,138,0.25)', '#9fdc8a', '1 2') +
        band(z0, zl, 'rgba(246,238,223,0.18)', '#f6eedf', '3 2') +
        tick(sEv, '#9fdc8a') + tick(pEv, '#f6eedf');
      const parts = [];
      if (sEv) {
        parts.push(`Started up at <b>${pctOf(sEv.level)}%</b>, with foam <b>${pctOf(m.headAtStraighten)}%</b> of the glass.`);
        parts.push(`Good range for this pour: ${pctOf(w0)}–${pctOf(w1)}%: ${MARK_PLAIN.straighten[sEv.verdict]}.`);
      } else parts.push('You never started bringing the glass up while pouring.');
      if (pEv) parts.push(`Stopped at <b>${pctOf(pEv.level)}%</b>: ${MARK_PLAIN.stop[pEv.verdict]}.`);
      $('debriefText').innerHTML = parts.join(' ');
    }

    // ---- Watch ----
    function ghostTick() {
      const inp = inputAt(timeline(), sim.tick);
      if (inp.serve) { serve(true); return false; }
      ghost.pour = inp.pour;
      setTarget(inp.target);
      if (inp.stepIndex !== ghost.stepIndex) {
        ghost.stepIndex = inp.stepIndex;
        setCaption(inp.caption);
        announce(inp.caption);
        [...transcript.children].forEach((li, i) => {
          if (i === inp.stepIndex) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        });
      }
      return true;
    }

    function tick() {
      if (served) return;
      if (mode === 'watch' && !ghostTick()) return;
      const prev = sim;
      sim = step(sim, { pour: pourWanted(), target: input.target }, STEP, cfg, ctl);
      if (mode === 'guided') guidedTick(prev);
      if (sim.events.length > prev.events.length) actionTick(sim.events.slice(prev.events.length));
      milestoneTick();
    }

    // Guided coaching points at the foam: the foam hints light up the bracket
    // on the beer's foam for a few seconds. The calibrated window stays
    // hidden; it only decides when a hint is due and what the verdict says.
    function guidedTick(prev) {
      for (const id of guidedHints(prev, sim, hintsFired, cfg)) {
        hintsFired.add(id);
        setCaption(HINTS[id], 'hint');
        announce(HINTS[id]);
        if (id === 'foamFast' || id === 'foamSlow') foamPulseUntil = sim.elapsed + 3;
        if (id === 'straighten' || id === 'spillWarn') pourBtn.classList.add('cue');
      }
      if (sim.angle < cfg.tiltThreshold || sim.flow === 0) pourBtn.classList.remove('cue');
    }
    function actionTick(newEvents) {
      if (mode !== 'guided') return;
      for (const e of newEvents) {
        let text = VERDICT_TEXT[e.type][e.verdict];
        if (e.type === 'straighten' && sim.angle > cfg.straightenThreshold) text += ' Keep it steady.';
        setCaption(text, e.verdict === 'inRange' || e.verdict === 'inZone' ? 'verdict' : 'hint');
        announce(text);
      }
    }
    function milestoneTick() {
      const level = levelOf(sim);
      for (const q of [0.25, 0.5, 0.75]) {
        if (level >= q && !milestones.has(q)) {
          milestones.add(q);
          // While tilted, say how much foam is on the beer: the cue in words.
          const foam = sim.angle > cfg.straightenThreshold && sim.flow > 0 ? ` Foam ${pctOf(headOf(sim))}% of the glass.` : '';
          announce(`Level ${q * 100}%.${foam}`);
        }
      }
      const head = headOf(sim), [b0, b1] = cfg.headBand;
      if (!milestones.has('head') && level > 0.6 && head >= b0 && head <= b1 && sim.angle <= cfg.straightenThreshold) {
        milestones.add('head');
        announce(`Head in band, ${pctOf(head)}%.`);
      }
    }

    // ==== UI sync ============================================================
    function syncUI() {
      const pouring = pourWanted();
      setAttr(pourBtn, 'aria-pressed', pouring);
      setAttr(pourBtn, 'aria-disabled', locked());
      setText($('pourText'), mode === 'watch' && !served ? (pouring ? 'Demo: pouring…' : 'Demo') :
        locked() ? 'Locked' : pouring ? (tapMode || input.latch ? 'Tap to stop' : 'Pouring…') : (tapMode ? 'Tap to pour' : 'Hold to pour'));
      setText($('pourSub'), mode === 'watch' ? 'watch the thumb'
        : pouring ? 'Keep holding. Slide up slowly to bring the glass upright.' : 'then slide up slowly to straighten');
      const finger = $('padFinger');
      const showFinger = mode === 'watch' && !served && pouring;
      finger.hidden = !showFinger;
      if (showFinger) finger.style.top = (22 + 56 * Math.min(1, sim.angle / ctl.tiltAngle)).toFixed(1) + '%';
      $('serve').disabled = locked() || !canServe(sim);
      $('padThumb').style.top = (100 * Math.min(1, sim.angle / ctl.maxAngle)).toFixed(1) + '%';
      setAttr(toggle, 'aria-checked', input.target >= ctl.tiltAngle / 2);
      setAttr(toggle, 'aria-disabled', locked());
    }

    // ==== Pour log ===========================================================
    // One entry per pour, served or abandoned, tagged with the station and the
    // scenario (seed and liveliness) so any pour can be replayed.
    const Log = (() => {
      const KEY = 'perfectPour.log.hefe.v1', CAP = 2000;
      const session = Math.random().toString(36).slice(2, 8);
      let attempt = 0;
      const r4 = v => (v === null || v === undefined ? null : Math.round(v * 10000) / 10000);
      const { read, write } = Kit.logStore(KEY, CAP);    // the capped localStorage list; entries are built here
      function record(state, result, wasServed, endedBy) {
        attempt++;
        const m = evaluate(state, cfg).metrics;
        const list = read();
        list.push({
          station: 'hefeweizen', v: 1, session, attempt, at: new Date().toISOString(), mode, straightenVia,
          scenario: sc ? { n: sc.n, seed: sc.seed, live: r4(sc.live), label: sc.label } : null,
          served: wasServed, endedBy: endedBy || null,
          pass: result ? result.pass : null, techniqueOk: result ? result.techniqueOk : null, pourOk: result ? result.pourOk : null,
          primary: result ? result.primary : null, secondary: result ? result.secondary : null,
          procedure: result ? Object.assign({}, result.procedure) : null, checks: result ? Object.assign({}, result.checks) : null,
          window: m.window.map(r4), startAngle: r4(m.startAngle), straightenBegan: r4(m.straightenBegan),
          headAtStraighten: r4(m.headAtStraighten), closeAngle: r4(m.closeAngle), uprightPour: r4(m.uprightPour),
          finalLevel: r4(m.finalLevel), finalHead: r4(m.finalHead), waste: r4(m.waste), tiltWaste: r4(m.tiltWaste),
          pourDuration: r4(m.pourDuration), hints: mode === 'guided' ? [...hintsFired] : null,
          events: state.events.map(e => ({ type: e.type, level: r4(e.level), verdict: e.verdict, t: r4(e.tick / 60) })),
          config: JSON.parse(JSON.stringify(cfg))
        });
        write(list);
      }
      return { read, record, key: KEY };
    })();

    // ==== Loop ===============================================================
    // Fixed 60 Hz sim ticks, then one draw per frame (js/station-kit.js).
    const Loop = Kit.loop(STEP, tick, () => {
      const coach = mode !== 'solo';
      Renderer.render(sim, { reducedMotion: motionQuery.matches, coach, marks: coach ? sim.events : null,
        foamPulse: mode === 'guided' && sim.elapsed < foamPulseUntil });
      syncUI();
    });

    // ==== Unmount ============================================================
    // As the Pilsner station: loop stopped, timers cleared, tap closed, every
    // window and document listener removed, markup gone; a pour left unserved
    // is abandoned (logged, never graded) and the host is told.
    function unmount(reason) {
      if (!life.end()) return { abandoned: false };
      Loop.stop();
      speech.cancel();
      stopPour();
      const abandoned = mode !== 'watch' && sim.opened && !served;
      if (abandoned) {
        Log.record(sim, null, false, reason || 'navigate');
        emit('abandoned', { mode, reason: reason || 'navigate' });
      }
      life.dispose();
      host.textContent = '';
      host.classList.remove('pp-st');
      return { abandoned };
    }

    setMode('watch');
    Loop.start();
    return { unmount };
  }

  global.HefeStation = { mount };
})(window);
