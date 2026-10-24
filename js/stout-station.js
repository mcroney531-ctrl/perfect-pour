// Perfect Pour: the Nitro Stout station (two-stage pour). Renderer, Watch /
// Guided / Solo flow, result sheet and pour log for js/stout-sim.js.
// Presentation only: it reads sim state and feeds the sim the pad's input.
// The phases (stage one, set-down, settling, top-up) are the sim's, read
// from what the player does; nothing here blocks an early top-up.
//
// Built on the shared station kit (js/station-kit.js), markup builder
// (js/station-markup.js) and pad controller (js/station-input.js), so the
// hands meet the same pad, keys and buttons as at the other two taps.
//
//   const station = StoutStation.mount(hostElement, { onExit, onEvent });
//   station.unmount('navigate');   // -> { abandoned }
(function (global) {
  'use strict';

  // The station's stage: its own scene, art and overlays. The panel, result
  // sheet and live region around it come from the shared builder.
  const STAGE = `\
    <svg id="scene" viewBox="0 -24 340 424" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="sceneTitle sceneDesc">
      <title id="sceneTitle">Nonic pint under the stout tap.</title>
      <desc id="sceneDesc">Level, the settling surge and the head are announced as they change.</desc>
      <defs>
        <clipPath id="glassClip" clipPathUnits="userSpaceOnUse"><polygon id="clipPoly" points="0,0"/></clipPath>
        <linearGradient id="stoutGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2b1810"/><stop offset="1" stop-color="#140b07"/>
        </linearGradient>
        <linearGradient id="surgeGrad" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="10">
          <stop offset="0" stop-color="#b48e66"/><stop offset="1" stop-color="#6e4f36"/>
        </linearGradient>
        <pattern id="surgePat" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill="#e6d2b4" fill-opacity="0.55"/>
          <circle cx="5.5" cy="5" r="0.7" fill="#e6d2b4" fill-opacity="0.4"/>
        </pattern>
        <linearGradient id="headGrad" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="10">
          <stop offset="0" stop-color="#f6ecd6"/><stop offset="1" stop-color="#dcc6a0"/>
        </linearGradient>
        <pattern id="foamPat" width="9" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.5" fill="#e8d9bb"/>
          <circle cx="7" cy="6" r="1.1" fill="#ece0c6"/>
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
          <stop offset="0" stop-color="#1c1a18"/><stop offset="0.38" stop-color="#3b3632"/><stop offset="0.7" stop-color="#2a2623"/><stop offset="1" stop-color="#141210"/>
        </linearGradient>
        <radialGradient id="nozzleGlow">
          <stop offset="0" stop-color="#ffd877" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd877" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Tap: the shared faucet with a stout badge (provisional art; a stout
           faucet silhouette comes with the art pass). -->
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
          <rect id="tapBadge" x="204" y="-12.5" width="12" height="20" rx="3" fill="#15110e" stroke="#e7c983" stroke-width="1"/>
          <text id="tapLabel" x="210" y="0" text-anchor="middle" font-size="5.6" font-weight="800" stroke="none"
                transform="rotate(-90 210 -2.5)" style="fill:#e7c983; letter-spacing:0.04em">STOUT</text>
          <ellipse cx="210" cy="-20" rx="6.5" ry="2" fill="#3b3632" stroke-width="1.2"/>
        </g>
      </g>

      <!-- Where the glass is set down to settle (provisional). -->
      <rect id="setDownSpot" x="96" y="337" width="84" height="5" rx="2.5" fill="rgba(240,220,180,0.10)" stroke="rgba(240,220,180,0.22)" stroke-width="1"/>

      <g id="glassBack"><g id="glassBackArt"></g></g>

      <g clip-path="url(#glassClip)">
        <path id="headFill" fill="url(#headGrad)"/>
        <path id="headTex" fill="url(#foamPat)"/>
        <path id="surgeFill" fill="url(#surgeGrad)"/>
        <path id="surgeTex" fill="url(#surgePat)"/>
        <g id="cascade" fill="#efe0c4"></g>
        <path id="liquidFill" fill="url(#stoutGrad)"/>
        <path id="sepEdge" fill="none" stroke="#e2c99f" stroke-opacity="0.55" stroke-width="1.2"/>
      </g>
      <path id="stream" fill="none" stroke="#3a2416" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="streamCore" fill="none" stroke="#a98262" stroke-opacity="0.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="spill" fill="none" stroke="#e9dcc0" stroke-width="4" stroke-linecap="round"/>

      <g id="glass">
        <g id="glassArt"></g>
        <!-- Training marks (Watch and Guided; real glasses carry no such
             lines). Each is sketched (a faint dashed outline), active (filled,
             with a short pulse) while the beer is in it, and quiet after.
             SET DOWN: stage one's target, about two-thirds to three-quarters,
             until the glass is set down. RIM: the top-up's finish, from just
             under the rim to a slight dome, once stage one is down. -->
        <g id="setDownMark" data-state="sketch">
          <polygon id="setDownBand" fill="none" stroke="#9fdc8a" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="3 4"/>
          <text id="setDownLabel" font-size="8.5" font-weight="700" style="fill:#9fdc8a">SET DOWN</text>
        </g>
        <g id="rimMark" style="display:none" data-state="sketch">
          <polygon id="rimBand" fill="none" stroke="#9fdc8a" stroke-opacity="0.5" stroke-width="1" stroke-dasharray="3 4"/>
          <text id="rimLabel" font-size="8.5" font-weight="700" text-anchor="end" style="fill:#9fdc8a">RIM ▲</text>
          <text id="rimNote" font-size="7" text-anchor="end" style="fill:#9fdc8a">slight dome</text>
        </g>
      </g>

      <!-- Guided and Watch, while it settles: a bracket on the cloudy surge
           itself (no timer, no target). -->
      <g id="surgeCue" style="display:none">
        <path id="surgeCueLine" fill="none" stroke="#efe0c4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <text id="surgeCueText" font-size="9" font-weight="700" style="fill:#efe0c4">SURGE</text>
      </g>

      <g id="gauge">
        <text x="23" y="30" text-anchor="middle" font-size="10" font-weight="700">HEAD</text>
        <rect x="14" y="38" width="18" height="140" rx="3" fill="rgba(255,255,255,0.04)" stroke="#5c4a37" stroke-width="1.5"/>
        <rect id="gaugeBar" x="16" width="14" rx="2" fill="#efe3c8"/>
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
    brand: 'Nitro Stout',
    stage: STAGE,
    pourHelp: `Hold the button, or hold Space or Enter, to pour. Slide up on the button, or press the Up arrow, to bring the glass upright. Let go to close the tap and set the glass down; hold again to top it up. Turn on tap mode to start and stop with single presses. Use the glass switch, or the T key, to tilt the glass.`,
    // The optional comparison demo (what not to do).
    watchExtra: `      <button type="button" id="earlyDemo" aria-label="Early top-up: watch an example of what not to do">Early top-up</button>
`,
    transcriptNote: `Two pours with the same pad: stage one (tilt, pour, bring it upright, let go at about three-quarters), then set it down and let it settle, then hold again to top up upright to a slight dome. Read the beer: the cloudy surge sinks, the dark beer rises, and a clean line forms under the head. The settle is shortened for training.`,
    resultNote: `Training game: the two-stage steps follow published draught guidance; the settle time, the bands and the foam from an early top-up are game settings (see docs/nitro-behaviour.md).`
  });

  function mount(host, opts = {}) {
    const { STEP, STOUT, CONTROL, POLY, PROFILE, initState, step, canServe, evaluate, feedback,
      GHOST, GHOST_STEPS, EARLY, EARLY_STEPS, inputAt, HINTS, guidedHints, surfaceAt, levelOf, bands, surgeShare,
      isSettled, heightOf, VERDICT_TEXT, padTarget } = StoutSim;
    host.insertAdjacentHTML('beforeend', MARKUP);
    host.classList.add('pp-st', 'pp-st--stout');
    const emit = (type, detail) => { try { if (opts.onEvent) opts.onEvent(type, detail); } catch (_) { /* host's problem */ } };
    const $ = id => host.querySelector('#' + id);
    const Kit = RiversideStationKit;
    const life = Kit.lifecycle(), on = life.on;
    if (opts.onExit) {
      const brand = host.querySelector('.brand');
      brand.insertAdjacentHTML('afterend',
        `<button type="button" id="exitBtn" aria-label="${opts.exitLabel || 'Back to the bar'}">‹ ${opts.exitText || 'Bar'}<small>${opts.exitSub || 'Nitro Stout station'}</small></button>`);
      brand.hidden = true;
      $('exitBtn').addEventListener('click', () => opts.onExit());
    }
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const cfg = STOUT, ctl = CONTROL;
    const setText = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
    const setAttr = (el, k, v) => { v = String(v); if (el.getAttribute(k) !== v) el.setAttribute(k, v); };
    const pctOf = v => Math.round(v * 100);

    // ==== Renderer ===========================================================
    // Draws one sim state; holds no sim logic. Every layer's surface comes
    // from the sim's own geometry, so what is drawn is what is scored.
    const Renderer = (() => {
      const SVGNS = 'http://www.w3.org/2000/svg';
      const H = 210, base = 12, wall = 4;
      const G = { tapX: 210, nozzleY: 72, rimY: 340 - base - H };
      const SET_DOWN_DX = -72;               // the set-down spot, left of the tap (presentation only)
      const RIM = -(base + H);
      const INNER = POLY.map(([x, y]) => [x * H, -base - y * H]);
      const half = INNER.length / 2;
      const WALLS = [];
      for (let i = 0; i < half - 1; i++) WALLS.push([INNER[i], INNER[i + 1]]);
      for (let i = half; i < INNER.length - 1; i++) WALLS.push([INNER[i], INNER[i + 1]]);
      const halfAt = h => {
        const P = PROFILE, x = Math.min(1, h);
        let i = 0;
        while (i < P.length - 2 && x > P[i + 1][0]) i++;
        const f = (x - P[i][0]) / (P[i + 1][0] - P[i][0]);
        return (P[i][1] + (P[i + 1][1] - P[i][1]) * f) * H;
      };
      const yAt = h => -base - h * H;
      const GAUGE = { top: 38, bottom: 178, max: 0.3 };
      const gaugeY = h => GAUGE.bottom - Math.min(h, GAUGE.max) / GAUGE.max * (GAUGE.bottom - GAUGE.top);

      const E = {};
      ['clipPoly', 'headFill', 'headTex', 'surgeFill', 'surgeTex', 'cascade', 'liquidFill', 'sepEdge', 'stream', 'streamCore', 'spill',
       'glass', 'glassBack', 'glassBackArt', 'glassArt', 'tapGlow', 'handle', 'surgeGrad', 'headGrad',
       'setDownMark', 'setDownBand', 'setDownLabel', 'rimMark', 'rimBand', 'rimLabel', 'rimNote', 'surgeCue', 'surgeCueLine', 'surgeCueText',
       'gaugeBar', 'gaugeBarTex', 'gaugeBand', 'gaugeHi', 'gaugeLo', 'gaugeVal', 'gaugeState', 'levelText']
        .forEach(id => { E[id] = $(id); });

      // Glass art (provisional): the outer wall follows the measured cavity.
      const outer = side => PROFILE.map(([h, w]) => [side * (w * H + wall), yAt(h)]);
      const L = outer(-1), R = outer(1);
      const pts = a => a.map(p => p.map(v => v.toFixed(1)).join(',')).join(' L');
      const ring = `M${pts(L.slice().reverse())} L${-halfAt(0) - wall},-2 L${halfAt(0) + wall},-2 L${pts(R)} ` +
        `L${pts(INNER.slice(half).reverse())} L${pts(INNER.slice(0, half).reverse())} Z`;
      E.glassArt.innerHTML = `
        <path d="${ring}" fill="rgba(226,238,255,0.13)" stroke="rgba(238,246,255,0.92)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M${-halfAt(0) - wall - 3},0 L${halfAt(0) + wall + 3},0 L${halfAt(0) + wall},${-base + 1} L${-halfAt(0) - wall},${-base + 1} Z" fill="rgba(244,249,255,0.45)" stroke="rgba(238,246,255,0.92)" stroke-width="1.4"/>
        <line x1="${-halfAt(1) - wall}" y1="${RIM - 1}" x2="${halfAt(1) + wall}" y2="${RIM - 1}" stroke="rgba(255,255,255,0.8)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M${(-halfAt(0.3) + 6).toFixed(1)},${yAt(0.3).toFixed(1)} L${(-halfAt(0.75) + 6).toFixed(1)},${yAt(0.75).toFixed(1)}" stroke="rgba(255,255,255,0.22)" stroke-width="4" stroke-linecap="round"/>`;
      E.glassBackArt.innerHTML = `<polygon points="${INNER.map(p => p.join(',')).join(' ')}" fill="rgba(214,230,255,0.045)"/>`;

      // The cascade: fine bubbles drifting down through the surge band.
      const CASCADE = [];
      for (let i = 0; i < 40; i++) {
        const c = document.createElementNS(SVGNS, 'circle');
        E.cascade.appendChild(c);
        // Spread evenly in two dimensions (an R2 sequence), so the bubbles never line up.
        CASCADE.push({ el: c, x: ((0.5 + i * 0.7548777) % 1) * 2 - 1, phase: (0.5 + i * 0.5698403) % 1, speed: 0.25 + ((i * 7) % 10) / 30, r: 0.6 + (i % 3) * 0.35 });
      }

      let dx = 0;                            // eased glass offset: under the tap, or set down
      function geom(angle) {
        const a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        const u = angle / 45;
        const ax = G.tapX + 24 * u + dx, ay = G.rimY + 10 * u;
        const px = ax + RIM * s, py = ay - RIM * c;
        const w = (x, y) => [px + x * c - y * s, py + x * s + y * c];
        const origin = w(0, -base);
        // Above the rim (a dome of foam) the surface rises straight up.
        return { px, py, w, surfaceY: v => origin[1] - (v <= 1 ? surfaceAt(v, angle) : heightOf(v)) * H };
      }
      function surface(y, amp, phase, freq) {
        let d = '';
        for (let x = 0; x <= 340; x += 17) d += (x ? 'L' : 'M') + x + ',' + (y + amp * Math.sin(x * freq + phase)).toFixed(2);
        return d + 'L340,400L0,400Z';
      }
      const lineAt = (y, amp, phase) => { let d = ''; for (let x = 0; x <= 340; x += 17) d += (x ? 'L' : 'M') + x + ',' + (y + amp * Math.sin(x * 0.07 + phase)).toFixed(2); return d; };

      function render(s, view) {
        const calm = view.reducedMotion, t = s.elapsed;
        // Set down (settling, tap shut, not served yet): the glass rests
        // beside the tap. Back under the tap as soon as it pours.
        const want = view.setDown ? SET_DOWN_DX : 0;
        dx = s.flow > 0 || calm ? want : dx + (want - dx) * 0.18;
        if (Math.abs(dx - want) < 0.3) dx = want;
        const g = geom(s.angle);
        const screen = INNER.map(p => g.w(p[0], p[1]));
        // The clip includes room above the rim for a dome.
        const domeTop = g.w(0, RIM - cfg.domeMax * H - 2);
        const clip = screen.slice(0, 1).concat(screen).concat([screen[screen.length - 1]]);
        clip[0] = [screen[0][0], Math.min(screen[0][1], domeTop[1])];
        clip[clip.length - 1] = [screen[screen.length - 1][0], Math.min(screen[screen.length - 1][1], domeTop[1])];
        setAttr(E.clipPoly, 'points', clip.map(p => p.map(v => v.toFixed(2)).join(',')).join(' '));
        const glassT = `translate(${g.px.toFixed(2)} ${g.py.toFixed(2)}) rotate(${s.angle.toFixed(2)})`;
        setAttr(E.glass, 'transform', glassT);
        setAttr(E.glassBack, 'transform', glassT);

        const yL = g.surfaceY(s.liquid), yS = g.surfaceY(s.liquid + s.surge), yT = g.surfaceY(s.liquid + s.surge + s.head);
        const wob = calm ? 0 : 0.3 + 1.2 * s.flow;
        E.headFill.setAttribute('d', s.head > 0.001 ? surface(yT, 1.0, calm ? 0 : t * 1.1, 0.45) : '');
        E.headTex.setAttribute('d', s.head > 0.001 ? surface(yT, 1.0, calm ? 0 : t * 1.1, 0.45) : '');
        E.surgeFill.setAttribute('d', s.surge > 0.001 ? surface(yS, wob, t * 5, 0.07) : '');
        E.surgeTex.setAttribute('d', s.surge > 0.001 ? surface(yS, wob, t * 5, 0.07) : '');
        setAttr(E.surgeGrad, 'y1', yS.toFixed(1)); setAttr(E.surgeGrad, 'y2', Math.max(yS + 6, yL).toFixed(1));
        setAttr(E.headGrad, 'y1', yT.toFixed(1)); setAttr(E.headGrad, 'y2', Math.max(yT + 4, yS).toFixed(1));
        E.liquidFill.setAttribute('d', s.liquid > 0.001 ? surface(yL, calm ? 0 : 0.3, t * 3, 0.07) : '');
        // The separation line between dark beer and what is above it: crisp
        // once the surge is thin, which is what "settled" looks like.
        setAttr(E.sepEdge, 'd', s.liquid > 0.002 ? lineAt(yL, calm ? 0 : 0.3, t * 3) : '');
        setAttr(E.sepEdge, 'stroke-opacity', (0.25 + 0.6 * Math.max(0, 1 - (yL - yS) / 30)).toFixed(2));

        // Cascade bubbles drift down through the surge band; their number
        // follows how much surge is left.
        const band = yL - yS, show = Math.round(CASCADE.length * Math.min(1, surgeShare(s) * 2.2));
        CASCADE.forEach((b, i) => {
          if (i >= show || band < 3) { setAttr(b.el, 'r', 0); return; }
          const k = calm ? b.phase : (t * b.speed + b.phase) % 1;
          const yy = yS + k * band;
          const [lx] = g.w(-halfAt(0.6) + 3, 0), [rx] = g.w(halfAt(0.6) - 3, 0);
          b.el.setAttribute('cx', (lx + (rx - lx) * (b.x + 1) / 2).toFixed(1));
          b.el.setAttribute('cy', yy.toFixed(1));
          setAttr(b.el, 'r', b.r);
        });

        // Stream: from the nozzle down to the beer, or down a wall it meets.
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
          if (hit !== null && hit < yT) {
            const [A, B] = seg, k = Math.min(1, Math.max(0, (yT - A[1]) / (B[1] - A[1])));
            d = `M${nx},${ny} L${nx},${hit.toFixed(2)} L${(A[0] + k * (B[0] - A[0])).toFixed(2)},${(A[1] + k * (B[1] - A[1])).toFixed(2)}`;
          } else d = `M${nx},${ny} L${nx},${yT.toFixed(2)}`;
          E.stream.setAttribute('d', d); setAttr(E.stream, 'stroke-width', (1.5 + 4 * s.flow).toFixed(2));
          E.streamCore.setAttribute('d', d); setAttr(E.streamCore, 'stroke-width', (0.5 + 1.2 * s.flow).toFixed(2));
        } else { setAttr(E.stream, 'd', ''); setAttr(E.streamCore, 'd', ''); }
        if (s.spill > 0) {
          const lw = g.w(-halfAt(1) - wall, RIM - 2), rw = g.w(halfAt(1) + wall, RIM - 2);
          const lip = rw[1] >= lw[1] ? rw : lw, dir = lip === rw ? 1 : -1;
          E.spill.setAttribute('d', `M${lip[0].toFixed(1)},${lip[1].toFixed(1)} q${3 * dir},4 ${2 * dir},40`);
        } else setAttr(E.spill, 'd', '');
        setAttr(E.handle, 'transform', `rotate(${(-30 * s.flow).toFixed(1)} 210 24)`);
        setAttr(E.tapGlow, 'opacity', (0.8 * s.flow).toFixed(2));

        // Training marks (view.setDownMark / view.rimMark: null, 'sketch',
        // 'active' or 'past'; the pulse is CSS on data-state="active").
        const markLook = (g, band, texts, state) => {
          g.style.display = state ? '' : 'none';
          if (!state) return false;
          const on = state === 'active';
          setAttr(g, 'data-state', state);
          setAttr(band, 'fill', on ? 'rgba(159,220,138,0.24)' : 'none');
          setAttr(band, 'stroke-opacity', on ? 1 : 0.5);
          setAttr(band, 'stroke-width', on ? 1.6 : 1);
          setAttr(band, 'stroke-dasharray', on ? '6 2' : '3 4');
          texts.forEach(t => setAttr(t, 'opacity', on ? 1 : 0.6));
          return true;
        };
        const zone = (band, h0, h1) => setAttr(band, 'points', `${-halfAt(h0)},${yAt(h0)} ${halfAt(h0)},${yAt(h0)} ${halfAt(h1)},${yAt(h1)} ${-halfAt(h1)},${yAt(h1)}`);
        if (markLook(E.setDownMark, E.setDownBand, [E.setDownLabel], view.coach ? view.setDownMark : null)) {
          const [m0, m1] = cfg.stage1Preferred;
          zone(E.setDownBand, m0, m1);
          setAttr(E.setDownLabel, 'x', (halfAt(m1) + wall + 4).toFixed(1)); setAttr(E.setDownLabel, 'y', ((yAt(m0) + yAt(m1)) / 2 + 3).toFixed(1));
        }
        if (markLook(E.rimMark, E.rimBand, [E.rimLabel, E.rimNote], view.coach ? view.rimMark : null)) {
          // Above the rim the band follows the dome's height (yAt is linear in
          // height; halfAt holds the rim's width there).
          const [f0, f1] = cfg.finishBand, lx = (-halfAt(1) - wall - 4).toFixed(1);
          zone(E.rimBand, f0, f1);
          setAttr(E.rimLabel, 'x', lx); setAttr(E.rimLabel, 'y', ((yAt(f0) + yAt(f1)) / 2 + 1).toFixed(1));
          setAttr(E.rimNote, 'x', lx); setAttr(E.rimNote, 'y', ((yAt(f0) + yAt(f1)) / 2 + 9).toFixed(1));
        }

        // The surge bracket: beside the glass, over the cloudy band, while
        // it settles (Watch and Guided). Lights up with the "Settled" hint.
        const cueOn = view.coach && s.closedOnce && s.flow === 0 && band >= 2;
        E.surgeCue.style.display = cueOn ? '' : 'none';
        if (cueOn) {
          const x = Math.max(...screen.map(p => p[0])) + 8;
          setAttr(E.surgeCueLine, 'd', `M${(x - 4).toFixed(1)},${yS.toFixed(1)} h4 V${yL.toFixed(1)} h-4`);
          setAttr(E.surgeCueText, 'x', (x + 5).toFixed(1)); setAttr(E.surgeCueText, 'y', ((yS + yL) / 2 + 3).toFixed(1));
          setAttr(E.surgeCueLine, 'stroke', view.pulse ? '#ffd877' : '#efe0c4');
          setAttr(E.surgeCueLine, 'stroke-width', view.pulse ? 3 : 1.6);
          E.surgeCueText.style.fill = view.pulse ? '#ffd877' : '#efe0c4';
        }

        const b = bands(s), head = b.head, [h0, h1] = cfg.headBand, gy = gaugeY(head);
        setAttr(E.gaugeBar, 'y', gy.toFixed(2)); setAttr(E.gaugeBar, 'height', (GAUGE.bottom - gy).toFixed(2));
        setAttr(E.gaugeBarTex, 'y', gy.toFixed(2)); setAttr(E.gaugeBarTex, 'height', (GAUGE.bottom - gy).toFixed(2));
        setAttr(E.gaugeBand, 'y', gaugeY(h1)); setAttr(E.gaugeBand, 'height', gaugeY(h0) - gaugeY(h1));
        setAttr(E.gaugeHi, 'y', gaugeY(h1) + 3); setText(E.gaugeHi, pctOf(h1) + '%');
        setAttr(E.gaugeLo, 'y', gaugeY(h0) + 3); setText(E.gaugeLo, pctOf(h0) + '%');
        setText(E.gaugeVal, pctOf(head) + '%');
        // Judging the head against the band only means something once the
        // pour is served; until then it is still forming (copy only: the
        // value and the scoring are unchanged).
        setText(E.gaugeState, !view.finished ? (s.opened ? 'forming' : '')
          : head < h0 ? 'below band' : head > h1 ? 'above band' : 'in band');
        setText(E.levelText, `Level ${pctOf(levelOf(s))}%`);
        return { surgePx: band, dx };
      }
      return { render, halfAt };
    })();

    // ==== State ==============================================================
    let mode = 'watch', demo = 'full';
    let sim = initState();
    let served = null;
    const ghost = { pour: false, stepIndex: -1 };
    let hintsFired = new Set(), said = new Set(), pulseUntil = -1, soloFailStreak = 0;
    let straightenVia = null;

    const pourBtn = $('pour'), toggle = $('angleToggle');
    const locked = () => served !== null || mode === 'watch';
    const pourWanted = () => served === null && (mode === 'watch' ? ghost.pour : (input.pointer || input.key || input.latch));
    const timeline = () => (demo === 'early' ? EARLY.timeline : GHOST);
    const noteStraighten = via => { if (sim.opened && !straightenVia && input.target < cfg.tiltThreshold) straightenVia = via; };

    // ==== Input ==============================================================
    // The shared pad and keys. The sim decides what a press means (stage one
    // or a top-up); nothing here stops an early top-up.
    const Pad = RiversideStationInput.pad({
      pad: pourBtn, tapModeBox: $('tapMode'), toggle, ctl, padTarget, on, locked,
      watching: () => mode === 'watch', serve: () => serve(), restart: () => restart(),
      onStraighten: via => noteStraighten(via)
    });
    const { input, setTarget } = Pad, stopPour = Pad.stop;
    toggle.addEventListener('click', () => {
      if (locked()) return;
      setTarget(input.target >= ctl.tiltAngle / 2 ? 0 : ctl.tiltAngle);
      noteStraighten('button');
    });

    // ==== Speech and captions ================================================
    const speech = Kit.announcer($('live'));
    const announce = speech.say, setCaption = Kit.caption($('caption'));

    // ==== Modes ==============================================================
    const MODE_LABEL = { watch: 'Watch', guided: 'Guided', solo: 'Solo' };
    const transcript = $('transcript');
    function fillTranscript() {
      transcript.textContent = '';
      (demo === 'early' ? EARLY_STEPS : GHOST_STEPS).forEach(text => {
        const li = document.createElement('li');
        li.textContent = text;
        transcript.appendChild(li);
      });
      setText($('earlyDemo'), demo === 'early' ? 'Full pour again' : 'Early top-up');
      // The visible label is short to fit sideways phones; the name says what it plays.
      setAttr($('earlyDemo'), 'aria-label', demo === 'early' ? 'Full pour again: watch the full two-stage demo'
        : 'Early top-up: watch an example of what not to do');
    }

    function setMode(m) {
      if (mode !== 'watch' && sim.opened && !served) Log.record(sim, null, false, 'modeChange');
      mode = m;
      demo = 'full';
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
      announce(`${MODE_LABEL[m]} mode.` + (watching ? ' A demo of the two-stage pour is playing.' : ''));
    }
    host.querySelectorAll('#modes button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('replay').addEventListener('click', () => { restart(); $('replay').focus(); });
    $('earlyDemo').addEventListener('click', () => {
      demo = demo === 'early' ? 'full' : 'early';
      fillTranscript();
      restart();
      announce(demo === 'early' ? 'An example of what not to do is playing: topping up too early.' : 'The full two-stage pour is playing.');
      $('earlyDemo').focus();
    });
    $('skip').addEventListener('click', () => setMode('guided'));

    const OPENING = {
      watch: '',
      guided: 'Guided: stage one to the SET DOWN band, let go, and watch the beer settle before you top up.',
      solo: 'Solo: no hints. Two pours; you decide when the beer has settled.'
    };

    function restart(quiet) {
      stopPour();
      if (mode !== 'watch' && sim.opened && !served && quiet !== true) Log.record(sim, null, false, 'restart');
      sim = mode === 'watch' && demo === 'early' ? JSON.parse(JSON.stringify(EARLY.start)) : initState();
      served = null;
      ghost.pour = false; ghost.stepIndex = -1;
      hintsFired = new Set(); said = new Set(); pulseUntil = -1;
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
      if (mode !== 'watch') { Log.record(sim, r, true, 'served'); emit('served', { mode, pass: r.pass }); }
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
      const m = r.metrics, p = r.procedure, demoMode = mode === 'watch';
      const [h0, h1] = cfg.headBand, [f0, f1] = cfg.finishBand, [s0, s1] = cfg.stage1Band, [q0, q1] = cfg.stage1Preferred;
      const title = demoMode ? (r.pass ? 'Demo pour: clean' : 'Example: topped up too early')
        : r.pass ? 'Clean pour' : r.techniqueOk ? 'Good technique. Adjust the pour.' : 'Technique to fix';
      setText($('resultTitle'), title);
      setCaption(title);
      const tech = $('checksTech'), ul = $('checks');
      tech.textContent = ''; ul.textContent = '';
      chip(tech, p.tilted, 'Tilted first', m.startAngle === null ? 'never opened' : `opened at ${Math.round(m.startAngle)}°`);
      chip(tech, p.stage1 && p.upright1, 'Stage one',
        m.stage1Level === null ? 'never set down' : `set down at ${pctOf(m.stage1Level)}%, ${Math.round(m.stage1CloseAngle)}°`,
        `aim ${pctOf(q0)}–${pctOf(q1)}% upright (passes ${pctOf(s0)}–${pctOf(s1)}%)`);
      chip(tech, p.waited, 'Let it settle',
        m.topUpShare === null ? 'never topped up' : `${pctOf(m.topUpShare)}% surge left at top-up`,
        m.topUpShare === null ? null : m.topUpShare <= cfg.settledShare ? 'settled' : p.waited ? 'a touch early, within tolerance' : 'too early');
      chip(tech, p.uprightTopUp, 'Upright top-up', m.topUpMaxAngle === null ? 'no top-up' : `up to ${Math.round(m.topUpMaxAngle)}°`);
      chip(ul, r.checks.head, `${pctOf(m.finalHead)}%`, `Head: ${r.checks.head ? 'in range' : m.finalHead > h1 ? 'too big' : 'too thin'}`, `aim ${pctOf(h0)}–${pctOf(h1)}%`);
      chip(ul, r.checks.finish, `${pctOf(m.finalLevel)}%`,
        `Finish: ${r.checks.finish ? (m.finalLevel > 1.0025 ? 'slight dome' : 'level with the rim') : m.finalLevel > f1 ? 'too tall' : 'short'}`,
        `aim ${pctOf(f0)}–${pctOf(f1)}%`);
      chip(ul, r.checks.waste, `${pctOf(m.waste)}%`, `Spill: ${r.checks.waste ? 'in range' : 'too much'}`, `max ${pctOf(cfg.wasteTol)}%`);
      drawDebrief(sim, r);
      setText($('fbPrimary'), text.primary);
      $('fbSecondary').hidden = !text.secondary;
      setText($('fbSecondary'), text.secondary ? (r.pass ? 'Note: ' : 'Also: ') + text.secondary : '');
      const suggest = mode === 'solo' && !r.pass && soloFailStreak >= 3;
      $('suggest').hidden = !suggest;
      setText($('suggest'), suggest ? `${soloFailStreak} misses in a row. Guided mode points out the settling surge, if you want it.` : '');
      const again = () => { restart(); pourBtn.focus(); };
      let actions;
      if (demoMode) actions = [['Try it guided', () => setMode('guided')], ['Watch again', () => setMode('watch')]];
      else if (mode === 'guided') actions = r.pass
        ? [['Try solo', () => setMode('solo')], ['Pour again', again]]
        : [['Try again', again], ['Watch again', () => setMode('watch')]];
      else actions = r.pass
        ? [['Pour again', again], ['Watch again', () => setMode('watch')]]
        : [['Try again', again], ['Watch again', () => setMode('watch')], ['Guided again', () => setMode('guided')]];
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
      announce(`${title}. ${text.primary}${text.secondary ? ' ' + text.secondary : ''}`);
      box.children[primaryIndex].focus({ preventScroll: true });
    }

    // The debrief: the glass with stage one's target and where this pour set
    // down, and the two decisions in words.
    function drawDebrief(st, r) {
      const svg = $('debriefGlass'), m = r.metrics, [q0, q1] = cfg.stage1Preferred;
      const top = 14, bot = 142, hgt = bot - top, cx = 50;
      const y = h => bot - h * hgt, hw = h => Renderer.halfAt(h) * hgt / 210;
      const sideAt = (h0, h1, sgn) => { const out = []; for (let i = 0; i <= 8; i++) { const h = h0 + (h1 - h0) * i / 8; out.push(`${(cx + sgn * hw(h)).toFixed(1)},${y(h).toFixed(1)}`); } return out; };
      const band = (h0, h1, fill, stroke, dash) =>
        `<polygon points="${[...sideAt(h0, h1, -1), ...sideAt(h0, h1, 1).reverse()].join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-dasharray="${dash}"/>`;
      const tick = (lv, color) => lv === null ? '' : `<line x1="${cx + hw(lv) + 2}" x2="${cx + hw(lv) + 12}" y1="${y(lv)}" y2="${y(lv)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
      svg.innerHTML =
        `<polygon points="${[...sideAt(0, 1, -1), ...sideAt(0, 1, 1).reverse()].join(' ')}" fill="rgba(210,228,255,0.06)" stroke="rgba(230,240,255,0.8)" stroke-width="2"/>` +
        band(q0, q1, 'rgba(159,220,138,0.25)', '#9fdc8a', '1 2') +
        tick(m.stage1Level, '#9fdc8a') + tick(Math.min(1.04, m.finalLevel), '#f6eedf');
      const parts = [];
      parts.push(m.stage1Level === null ? 'Stage one was never set down.'
        : `Stage one: set down at <b>${pctOf(m.stage1Level)}%</b> (target ${pctOf(q0)}–${pctOf(q1)}%).`);
      if (m.topUpShare !== null) parts.push(`Topped up after <b>${m.settleWaitS.toFixed(0)} s</b>, with <b>${pctOf(m.topUpShare)}%</b> of the beer still surging` +
        (m.topUpShare <= cfg.settledShare ? ': it had settled.' : r.procedure.waited ? ': a touch early.' : ': too early.'));
      else if (m.stage1Level !== null) parts.push('Never topped up.');
      if (m.topUpShare !== null) parts.push(`Finished at <b>${pctOf(m.finalLevel)}%</b>, head <b>${pctOf(m.finalHead)}%</b>.`);
      $('debriefText').innerHTML = parts.join(' ');
    }

    // ---- Watch ----
    function ghostTick() {
      const inp = inputAt(timeline(), sim.tick);
      if (inp.serve) { serve(true); return false; }
      ghost.pour = inp.pour;
      setTarget(inp.target);
      if (inp.stepIndex !== ghost.stepIndex && inp.caption) {
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
      if (mode === 'guided') coachTick(prev);
      describeTick(prev);
      markTick(prev);
    }

    // Guided only: verdicts on what the player just did, then hints that
    // warn, never block. A verdict and a hint in the same tick share the
    // caption (verdict first), so neither hides the other. The "Settled" hint
    // lights the surge bracket for a moment.
    const VERDICT_KEY = { setDown: 'stage1', topUp: 'topUp', stop: 'stop' };
    function coachTick(prev) {
      const lines = [];
      let hint = false;
      for (const e of sim.events.slice(prev.events.length)) {
        lines.push(VERDICT_TEXT[VERDICT_KEY[e.type]][e.verdict]);
        if (!(e.verdict === 'inBand' || e.verdict === 'settled' || e.verdict === 'finish')) hint = true;
      }
      for (const id of guidedHints(prev, sim, hintsFired, cfg)) {
        hintsFired.add(id);
        lines.push(HINTS[id]);
        hint = true;
        if (id === 'settled') pulseUntil = sim.elapsed + 3;
        if (id === 'tiltedTopUp') pourBtn.classList.add('cue');
      }
      if (sim.angle <= cfg.straightenThreshold || sim.flow === 0) pourBtn.classList.remove('cue');
      if (!lines.length) return;
      setCaption(lines.join(' '), hint ? 'hint' : 'verdict');
      lines.forEach(t => announce(t));
    }
    // The training marks' state, read from the beer (Watch and Guided draw
    // them). Stage one's preferred range and the finish band are the sim's.
    function setDownMarkState(s) {
      if (s.closedOnce) return null;
      const lv = levelOf(s), [q0, q1] = cfg.stage1Preferred;
      return lv > q1 ? 'past' : lv >= q0 ? 'active' : 'sketch';
    }
    function rimMarkState(s) {
      if (!s.closedOnce) return null;
      const lv = levelOf(s), [f0, f1] = cfg.finishBand;
      if (lv > f1) return 'past';
      if (lv >= f0) return s.phase === 'topUp' ? 'active' : 'past';
      return 'sketch';
    }
    // Watch and Guided: say it when a mark lights, once per pour.
    function markTick(prev) {
      if (mode === 'solo') return;
      const say = (key, text) => { if (!said.has(key)) { said.add(key); announce(text); } };
      if (setDownMarkState(sim) === 'active' && setDownMarkState(prev) !== 'active') say('markDown', 'In the SET DOWN range.');
      if (rimMarkState(sim) === 'active' && rimMarkState(prev) !== 'active') say('markRim', 'At the rim: let go at a slight dome.');
    }
    // Every mode: what the beer is doing, in words (the spoken equivalent of
    // what the glass shows; it describes the beer, it does not coach).
    function describeTick(prev) {
      const say = (key, text) => { if (!said.has(key)) { said.add(key); announce(text); } };
      const level = levelOf(sim);
      if (sim.phase === 'stage1') for (const q of [0.25, 0.5]) if (level >= q) say('l' + q, `Level ${q * 100}%.`);
      if (sim.closedOnce && !prev.closedOnce) say('down', `Set down at ${pctOf(sim.stage1Level)}%. The beer is surging.`);
      if (sim.closedOnce && sim.topUpTick === null) {
        if (surgeShare(sim) <= 0.2) say('thin', 'The surge is thinning.');
        if (isSettled(sim, cfg)) say('settled', 'The head has separated from the dark beer.');
      }
      if (sim.phase === 'topUp' && prev.phase !== 'topUp') say('top', 'Topping up.');
    }

    // ==== UI sync ============================================================
    function syncUI() {
      const pouring = pourWanted();
      const toppingUp = sim.closedOnce;
      setAttr(pourBtn, 'aria-pressed', pouring);
      setAttr(pourBtn, 'aria-disabled', locked());
      setText($('pourText'), mode === 'watch' && !served ? (pouring ? 'Demo: pouring…' : 'Demo') :
        locked() ? 'Locked' : pouring ? (Pad.tapMode() || input.latch ? 'Tap to stop' : toppingUp ? 'Topping up…' : 'Pouring…')
          : toppingUp ? (Pad.tapMode() ? 'Tap to top up' : 'Hold to top up') : (Pad.tapMode() ? 'Tap to pour' : 'Hold to pour'));
      setText($('pourSub'), mode === 'watch' ? 'watch the thumb'
        : pouring ? (toppingUp ? 'Glass upright. Let go at a slight dome.' : 'Keep holding. Slide up slowly to bring the glass upright.')
        : toppingUp ? 'glass upright, faucet fully open' : 'then slide up slowly to straighten');
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
    const Log = (() => {
      const KEY = 'perfectPour.log.stout.v1', CAP = 2000;
      const session = Math.random().toString(36).slice(2, 8);
      let attempt = 0;
      const r4 = v => (v === null || v === undefined ? null : Math.round(v * 10000) / 10000);
      const { read, write } = Kit.logStore(KEY, CAP);
      function record(state, result, wasServed, endedBy) {
        attempt++;
        const m = evaluate(state, cfg).metrics;
        const list = read();
        list.push({
          station: 'stout', v: 1, session, attempt, at: new Date().toISOString(), mode, straightenVia,
          served: wasServed, endedBy: endedBy || null, phase: state.phase,
          pass: result ? result.pass : null, techniqueOk: result ? result.techniqueOk : null, pourOk: result ? result.pourOk : null,
          primary: result ? result.primary : null, secondary: result ? result.secondary : null, notes: result ? [...result.notes] : null,
          procedure: result ? Object.assign({}, result.procedure) : null, checks: result ? Object.assign({}, result.checks) : null,
          startAngle: r4(m.startAngle), stage1Level: r4(m.stage1Level), stage1CloseAngle: r4(m.stage1CloseAngle),
          topUpShare: r4(m.topUpShare), settleWaitS: r4(m.settleWaitS), readyAfterS: r4(m.readyAfterS), topUpMaxAngle: r4(m.topUpMaxAngle),
          finalLevel: r4(m.finalLevel), finalHead: r4(m.finalHead), waste: r4(m.waste), elapsed: r4(m.elapsed),
          hints: mode === 'guided' ? [...hintsFired] : null,
          events: state.events.map(e => ({ type: e.type, level: r4(e.level), share: r4(e.share), verdict: e.verdict, t: r4(e.tick / 60) })),
          config: JSON.parse(JSON.stringify(cfg))
        });
        write(list);
      }
      return { read, record, key: KEY };
    })();

    // ==== Loop ===============================================================
    const Loop = Kit.loop(STEP, tick, () => {
      const coach = mode !== 'solo';
      Renderer.render(sim, { reducedMotion: motionQuery.matches, coach,
        setDownMark: coach ? setDownMarkState(sim) : null, rimMark: coach ? rimMarkState(sim) : null,
        setDown: sim.closedOnce && sim.flow === 0 && !sim.pouring && served === null,
        finished: served !== null,
        pulse: mode === 'guided' && sim.elapsed < pulseUntil });
      syncUI();
    });

    // ==== Unmount ============================================================
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

  global.StoutStation = { mount };
})(window);
