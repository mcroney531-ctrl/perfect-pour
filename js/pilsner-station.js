// Perfect Pour: the Pilsner station (renderer, input, Watch/Guided/Solo flow,
// result sheet, pour log, debug panel). Presentation and input only: it reads
// sim state and feeds the sim input; it never changes fill, foam or waste.
//
//   const station = PilsnerStation.mount(hostElement, { search: '?angle=staged' });
//   station.unmount();
//
// Markup comes from <template id="pp-pilsner-station"> in index.html.
(function (global) {
  'use strict';

  // The station's markup. Lives here (not in a <template> on one page) so any
  // page can mount the station; styles are in css/pilsner-station.css.
  const MARKUP = `
<div id="app">
  <header>
    <div class="brand">Perfect Pour<small>Pilsner · v2.3</small></div>
    <button type="button" id="debugToggle" aria-expanded="false" aria-controls="debug" aria-label="Debug panel" hidden>⚙</button>
    <nav id="modes" aria-label="Mode">
      <button type="button" data-mode="watch">Watch</button>
      <button type="button" data-mode="guided">Guided</button>
      <button type="button" data-mode="solo">Solo</button>
    </nav>
  </header>

  <p id="caption"></p>

  <div id="stage">
    <svg id="scene" viewBox="0 -24 340 424" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="sceneTitle sceneDesc">
      <title id="sceneTitle">Pilsner glass under the tap.</title>
      <desc id="sceneDesc">Level and head are announced as you pour.</desc>
      <defs>
        <clipPath id="glassClip" clipPathUnits="userSpaceOnUse"><polygon id="clipPoly" points="0,0"/></clipPath>
        <linearGradient id="beerGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f7c948"/>
          <stop offset="0.6" stop-color="#e7a526"/>
          <stop offset="1" stop-color="#c9811a"/>
        </linearGradient>
        <pattern id="foamPat" width="9" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.7" fill="#e9dcbd"/>
          <circle cx="7" cy="6" r="1.2" fill="#ece1c6"/>
        </pattern>
        <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="#f6eedf" stroke-width="1.4"/>
        </pattern>
        <!-- Faucet materials: warm brushed metal, not cold chrome. -->
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
        <!-- Foam shading for the candidate glasses; y1/y2 follow the head each frame. -->
        <linearGradient id="foamGrad" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="0" y2="10">
          <stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#ecdcb8"/>
        </linearGradient>
      </defs>

      <!-- Tap: illustrated brewery faucet in named parts (shank, nut, body,
           spout, handle with a swappable badge). The handle follows sim
           flow, so the 150 ms ramp is visible; the nozzle glows while the
           tap is open. Stream starts at the nozzle, (210, 72). -->
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
          <rect id="tapBadge" x="204" y="-12.5" width="12" height="20" rx="3" fill="#a5392b" stroke="#f2d9a6" stroke-width="1"/>
          <text id="tapLabel" x="210" y="0" text-anchor="middle" font-size="6.5" font-weight="800" stroke="none"
                transform="rotate(-90 210 -2.5)" style="fill:#f8e6c0; letter-spacing:0.04em">PILS</text>
          <ellipse cx="210" cy="-20" rx="6.5" ry="2" fill="#8a5a33" stroke-width="1.2"/>
        </g>
      </g>

      <!-- Glass art that sits behind the beer (back wall), same transform as #glass. -->
      <g id="glassBack"><g id="glassBackArt"></g></g>

      <g clip-path="url(#glassClip)">
        <path id="foamFill" fill="#fbf4e2"/>
        <path id="foamTex" fill="url(#foamPat)"/>
        <path id="beerFill" fill="url(#beerGrad)"/>
        <path id="beerShine" fill="none" stroke="#fff0bf" stroke-opacity="0.6" stroke-width="1.3"/>
        <g id="bubbles" fill="#fff6d2" fill-opacity="0.7"></g>
      </g>
      <path id="stream" fill="none" stroke="#eaa72c" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="streamCore" fill="none" stroke="#fde6a0" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"/>
      <g id="splash" fill="#fbf4e2"></g>
      <path id="spill" fill="none" stroke="#fbf4e2" stroke-width="4" stroke-linecap="round"/>

      <g id="glass">
        <!-- Glass artwork. Swapped by the glass treatment (?glass=a|b); the
             training overlays below always draw on top of it. -->
        <g id="glassArt">
          <path id="glassBody" fill="rgba(210,228,255,0.07)" stroke="rgba(230,240,255,0.8)" stroke-width="2.5" stroke-linejoin="round"/>
          <path id="glassInner" fill="none" stroke="rgba(230,240,255,0.35)" stroke-width="1"/>
          <path d="M-33,-205 L-21,-34" stroke="rgba(255,255,255,0.22)" stroke-width="3" stroke-linecap="round"/>
        </g>
        <!-- Target zone: hatched band plus a dashed line plus a label, so it
             does not rely on colour (spec §6). -->
        <polygon id="zoneBand" fill="url(#hatch)" fill-opacity="0.45" stroke="#f6eedf" stroke-width="0.8" stroke-dasharray="2 2"/>
        <line id="fillLine" stroke="#f6eedf" stroke-width="1.6" stroke-dasharray="5 3"/>
        <text id="fillLabel" font-size="10" font-weight="700" text-anchor="end">LINE</text>
        <text id="stopLabel" font-size="9" font-weight="700" style="fill:#f6eedf">STOP</text>
        <!-- Training mark only: real glassware has no such line. Shown in Watch
             and Guided so the learner links "about half to two-thirds" to what
             they see; gone in Solo, where they judge it by eye. -->
        <g id="bringMark">
          <polygon id="bringBand" fill="rgba(159,220,138,0.18)" stroke="#9fdc8a" stroke-width="1.4" stroke-dasharray="1 2.5"/>
          <text id="bringLabel" font-size="9" font-weight="700" style="fill:#9fdc8a">▲ BRING UP</text>
        </g>
        <!-- Where the player acted, drawn at the level they acted at. Watch and
             Guided only; Solo sees the same marks in the debrief instead. -->
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

      <!-- Head gauge: the head band is a thickness, not a place on the glass,
           so it gets its own scale. Top-left is the one corner the glass never
           reaches at any tilt. -->
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
  </div>

  <section id="controls" aria-label="Pour controls">
    <div id="angleCtl">
      <div id="sliderWrap">
        <div class="ctl-head"><label for="angleSlider">Glass angle</label><output id="angleOut" for="angleSlider">0°</output></div>
        <input type="range" id="angleSlider" min="0" max="60" step="1" value="0" aria-valuetext="0 degrees, upright">
        <div class="ticks" aria-hidden="true"><span style="left:0">Upright 0°</span><span style="left:75%">45°</span><span style="left:100%;transform:translateX(-100%)">60°</span></div>
      </div>
      <div id="toggleWrap" hidden>
        <button type="button" id="angleToggle" role="switch" aria-checked="false" aria-label="Tilt the glass to 45 degrees">
          <span class="opt opt-up" aria-hidden="true">Upright</span>
          <span class="opt opt-tilt" aria-hidden="true">Tilted ~45°</span>
        </button>
      </div>
    </div>

    <div id="pourRow">
      <button type="button" id="pour" aria-pressed="false" aria-describedby="pourHelp">
        <span class="padText"><span id="pourText">Hold to pour</span><span class="sub" id="pourSub"></span></span>
        <span id="padTrack" aria-hidden="true"><span id="padThumb"></span></span>
        <span id="padFinger" aria-hidden="true" hidden></span>
      </button>
      <label class="tapmode"><input type="checkbox" id="tapMode"><span>Tap to start/stop pouring</span></label>
    </div>
    <p id="pourHelp" class="sr-only">Hold the button, or hold Space or Enter, to pour. Turn on tap mode to start and stop with single presses. Use the glass switch, or the T key, to tilt the glass and to bring it upright.</p>

    <div id="actions">
      <button type="button" id="serve" disabled>Serve<kbd>S</kbd></button>
      <button type="button" id="restart">Restart<kbd>R</kbd></button>
    </div>

    <div id="ghostActions" hidden>
      <button type="button" id="replay">Replay</button>
      <button type="button" id="skip">Skip to Guided</button>
    </div>
    <div id="transcriptBox" hidden>
      <span id="transcriptTitle">Steps in this demo</span>
      <ol id="transcript" aria-labelledby="transcriptTitle"></ol>
      <p class="fineprint">Two bands on the training glass: <b>BRING UP</b> (start bringing the glass upright when the beer gets there) and <b>LINE</b> (stop). BRING UP is a training mark that real glasses don't have; on the job, judge it by eye: about half to two-thirds full. Keep holding the pad the whole time: slide up and the glass comes up; stop sliding and it holds its angle while the beer keeps flowing.</p>
    </div>
  </section>
</div>

<section id="result" aria-labelledby="resultTitle" hidden>
  <h2 id="resultTitle"></h2>
  <h3 class="chk-head">Technique</h3>
  <ul id="checksTech" class="checks two"></ul>
  <h3 class="chk-head">The pour</h3>
  <ul id="checks" class="checks"></ul>
  <div id="debrief">
    <svg id="debriefGlass" viewBox="0 0 120 150" aria-hidden="true"></svg>
    <p id="debriefText"></p>
  </div>
  <p id="fbPrimary"></p>
  <p id="fbSecondary" hidden></p>
  <p id="suggest" hidden></p>
  <p class="fineprint">Prototype: the steps follow common beer-service guidance (see docs/pour-procedure.md); the exact numbers are placeholders, not yet checked first-hand.</p>
  <div id="resultActions"></div>
</section>

<div id="live" class="sr-only" aria-live="polite" aria-atomic="true"></div>

<aside id="debug" aria-label="Debug panel" hidden>
  <div class="warn">verified: false · all constants are placeholders</div>
  <h3>Angle control</h3>
  <select id="dbgVariant" aria-label="Angle control variant">
    <option value="staged">A: staged (swipe up to straighten)</option>
    <option value="continuous">B: continuous (slide to tilt)</option>
    <option value="slider">v1 fallback: slider</option>
    <option value="toggle">v1 fallback: switch only</option>
  </select>
  <h3>Live state</h3>
  <pre id="dbgState"></pre>
  <h3>Pilsner constants</h3>
  <div class="grid" id="dbgCfg"></div>
  <h3>Control feel</h3>
  <div class="grid" id="dbgCtl"></div>
  <button type="button" id="dbgReset">Reset constants</button>
  <button type="button" id="dbgGhost">Run ghost check</button>
  <pre id="dbgGhostOut"></pre>
  <h3>Pour log</h3>
  <div id="dbgLogCount"></div>
  <button type="button" id="dbgDownload">Download JSON</button>
  <button type="button" id="dbgCopy">Copy JSON</button>
  <button type="button" id="dbgClear">Clear log</button>
</aside>
`;

  function mount(host, opts = {}) {
    const { STEP, PILSNER, CONTROL, GLASS, initState, step, total, canServe, evaluate, feedback,
      GHOST, GHOST_STEPS, inputAt, HINTS, guidedHints, surfaceAt, zoneAt, levelOf, headOf, VERDICT_TEXT,
      fillZone, padTarget, bringUpStyle } = PourSim;
    // Mount: clone the station's markup into the host element. Every lookup
    // is scoped to the host, and everything registered outside it (window and
    // document listeners, the animation loop, timers) is tracked so unmount()
    // can take it all back out.
    const tpl = opts.template && document.getElementById(opts.template);
    if (tpl) host.appendChild(tpl.content.cloneNode(true));
    else host.insertAdjacentHTML('beforeend', MARKUP);
    host.classList.add('pp-st');
    // Host hooks (the brewery shell): onEvent('served' | 'abandoned', detail)
    // and onExit(), which adds a back button in place of the brand.
    const emit = (type, detail) => { try { if (opts.onEvent) opts.onEvent(type, detail); } catch (_) { /* host's problem */ } };
    const $ = id => host.querySelector('#' + id);
    const params = new URLSearchParams(opts.search ?? location.search);
    let alive = true, rafId = 0;
    const disposers = [];
    const on = (target, type, fn, options) => {
      target.addEventListener(type, fn, options);
      disposers.push(() => target.removeEventListener(type, fn, options));
    };
    if (opts.onExit) {
      const brand = host.querySelector('.brand');
      brand.insertAdjacentHTML('afterend',
        `<button type="button" id="exitBtn" aria-label="${opts.exitLabel || 'Back to the bar'}">‹ ${opts.exitText || 'Bar'}<small>${opts.exitSub || 'Pilsner station'}</small></button>`);
      brand.hidden = true;
      $('exitBtn').addEventListener('click', () => opts.onExit());
    }
    const DEBUG = params.get('debug') === '1';
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const cfg = PILSNER, ctl = CONTROL;
    const VARIANTS = ['staged', 'continuous', 'slider', 'toggle'];
    // Continuous (B) is the default since v2.3; ?angle=staged keeps A for comparison.
    let variant = VARIANTS.includes(params.get('angle')) ? params.get('angle') : 'continuous';
    // Glass treatment: A (refined) is the default since it was chosen in review.
    // ?glass=b shows the warm-craft candidate, ?glass=old the prototype glass.
    const GLASS_SKIN = params.get('glass') || 'a';

    const setText = (el, v) => { if (el._t !== v) { el._t = v; el.textContent = v; } };
    const setAttr = (el, k, v) => { v = String(v); if (el.getAttribute(k) !== v) el.setAttribute(k, v); };

    // ==== Renderer ===========================================================
    // render(state, view) draws one sim state and holds no sim logic. It draws
    // the true angle: the beer surface comes from the sim's own geometry
    // (surfaceAt), so the level you see is the level that is scored, at any
    // tilt. (v1 drew the glass at 3/4 of the angle to hide that mismatch.)
    const Renderer = (() => {
      const SVGNS = 'http://www.w3.org/2000/svg';
      const H = 215, base = 12, wall = 4;
      const in0 = GLASS.hw0 * H, in1 = GLASS.hw1 * H;
      const G = { tapX: 210, nozzleY: 72, rimY: 112 };
      const RIM = -(base + H);
      const INNER = [[-in1, RIM], [-in0, -base], [in0, -base], [in1, RIM]];
      const WALLS = [[INNER[0], INNER[1]], [INNER[3], INNER[2]]];
      const halfAt = h => in0 + (in1 - in0) * h;
      const yAt = h => -base - h * H;
      const GAUGE = { top: 38, bottom: 178, max: 0.25 };
      const gaugeY = h => GAUGE.bottom - Math.min(h, GAUGE.max) / GAUGE.max * (GAUGE.bottom - GAUGE.top);
      // Short on-glass words for each verdict (the caption carries the full sentence).
      const MARK_WORD = {
        straighten: { inRange: 'in range', littleEarly: 'a little early', early: 'early', littleLate: 'a little late', late: 'late' },
        stop: { inZone: 'in zone', short: 'short', over: 'over' }
      };

      const E = {};
      ['clipPoly', 'foamFill', 'foamTex', 'beerFill', 'beerShine', 'bubbles', 'stream', 'streamCore', 'splash', 'spill', 'glass',
       'glassBack', 'glassBackArt', 'glassArt', 'tapGlow', 'foamGrad',
       'glassBody', 'glassInner', 'zoneBand', 'fillLine', 'fillLabel', 'handle', 'gaugeBar', 'gaugeBarTex',
       'gaugeBand', 'gaugeHi', 'gaugeLo', 'gaugeVal', 'gaugeState', 'levelText',
       'stopLabel', 'bringMark', 'bringBand', 'bringLabel',
       'markStraighten', 'markStraightenLine', 'markStraightenText', 'markStop', 'markStopLine', 'markStopText']
        .forEach(id => { E[id] = $(id); });

      E.glassBody.setAttribute('d',
        `M${-in1 - wall},${RIM - 2} L${-in0 - wall},-10 Q${-in0 - wall - 1},-4 -34,-2 L-34,0 L34,0 L34,-2 ` +
        `Q${in0 + wall + 1},-4 ${in0 + wall},-10 L${in1 + wall},${RIM - 2} L${in1},${RIM} ` +
        `L${in0},${-base} L${-in0},${-base} L${-in1},${RIM} Z`);
      E.glassInner.setAttribute('d', `M${-in1},${RIM} L${in1},${RIM}`);

      // ---- Glass treatments (art only) ---------------------------------------
      // Every treatment draws around the SAME inner cavity the sim measures
      // (INNER / GLASS), so beer, foam, bands and scoring are identical across
      // them; only walls, rim, base and light change. A curvier, more classic
      // pilsner silhouette would need the sim's glass shape changed too, so it
      // is not attempted here.
      const RING = E.glassBody.getAttribute('d');
      const hpt = (h, side, inset) => `${(side * (halfAt(h) - inset)).toFixed(1)},${yAt(h).toFixed(1)}`;
      // A highlight stripe hugging one wall between two heights.
      const stripe = (side, h0, h1, i0, i1) =>
        `${hpt(h0, side, i0)} ${hpt(h1, side, i0)} ${hpt(h1, side, i1)} ${hpt(h0, side, i1)}`;
      const cavity = INNER.map(p => p.join(',')).join(' ');
      const foot = `M${-in0 - wall},${-base + 1} L${in0 + wall},${-base + 1} L${in0 + wall + 2},-3 Q${in0 + wall + 3},0 ${in0 + wall - 1},0 ` +
        `L${-in0 - wall + 1},0 Q${-in0 - wall - 3},0 ${-in0 - wall - 2},-3 Z`;
      const SKINS = {
        // A: refined. Clear, crisp, cool-neutral glass with restrained light.
        a: {
          back: `<polygon points="${cavity}" fill="rgba(214,230,255,0.045)"/>`,
          front: `
            <defs><linearGradient id="gA_base" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#f4f9ff" stop-opacity="0.32"/><stop offset="1" stop-color="#f4f9ff" stop-opacity="0.62"/>
            </linearGradient></defs>
            <path d="${RING}" fill="rgba(226,238,255,0.13)" stroke="rgba(238,246,255,0.92)" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="${foot}" fill="url(#gA_base)" stroke="rgba(238,246,255,0.92)" stroke-width="1.4"/>
            <ellipse cx="0" cy="${-base + 4}" rx="${(in0 - 5).toFixed(1)}" ry="1.8" fill="rgba(255,255,255,0.32)"/>
            <line x1="${-in1 - wall}" y1="${RIM - 1}" x2="${in1 + wall}" y2="${RIM - 1}" stroke="rgba(255,255,255,0.8)" stroke-width="2.4" stroke-linecap="round"/>
            <polygon points="${stripe(-1, 0.07, 0.93, 5, 9)}" fill="rgba(255,255,255,0.24)"/>
            <polygon points="${stripe(1, 0.55, 0.86, 3, 5)}" fill="rgba(255,255,255,0.14)"/>`
        },
        // B: warm craft. Thicker, warmer glass with an illustrated outline,
        // a beaded rim, a heavy amber base and a little condensation.
        b: {
          back: `<polygon points="${cavity}" fill="rgba(255,214,150,0.05)"/>`,
          front: `
            <defs>
              <linearGradient id="gB_wall" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#ffe2aa" stop-opacity="0.42"/><stop offset="0.14" stop-color="#ffecc8" stop-opacity="0.07"/>
                <stop offset="0.86" stop-color="#ffecc8" stop-opacity="0.07"/><stop offset="1" stop-color="#ffe2aa" stop-opacity="0.36"/>
              </linearGradient>
              <linearGradient id="gB_base" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#ffd690" stop-opacity="0.18"/><stop offset="1" stop-color="#f5bf6e" stop-opacity="0.6"/>
              </linearGradient>
              <linearGradient id="gB_glint" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#fff6dc" stop-opacity="0"/><stop offset="0.5" stop-color="#fff6dc" stop-opacity="0.45"/>
                <stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="${RING}" fill="none" stroke="#21150c" stroke-width="3.6" stroke-linejoin="round"/>
            <path d="${RING}" fill="url(#gB_wall)" stroke="#f5ddb0" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="${foot}" fill="url(#gB_base)" stroke="#f5ddb0" stroke-width="1.4"/>
            <ellipse cx="0" cy="${-base + 4.5}" rx="${(in0 - 3).toFixed(1)}" ry="2.2" fill="rgba(255,240,205,0.42)"/>
            <rect x="${-in1 - wall - 0.5}" y="${RIM - 3.5}" width="${2 * (in1 + wall + 0.5)}" height="4" rx="2"
                  fill="#fbeccb" fill-opacity="0.85" stroke="#21150c" stroke-width="1"/>
            <polygon points="${stripe(-1, 0.08, 0.9, 4, 13)}" fill="url(#gB_glint)"/>
            <path d="M${(halfAt(0.86) - 6).toFixed(1)},${yAt(0.86).toFixed(1)} L${(halfAt(0.94) - 6.5).toFixed(1)},${yAt(0.94).toFixed(1)}"
                  stroke="#fff6dc" stroke-opacity="0.6" stroke-width="1.6" stroke-linecap="round"/>
            ${[[-1, 0.18, 4], [-1, 0.27, 7], [-1, 0.41, 3.5], [-1, 0.52, 6], [1, 0.22, 5], [1, 0.33, 3.5], [1, 0.46, 6.5], [1, 0.58, 4]]
              .map(([side, h, inset], i) => `<circle cx="${(side * (halfAt(h) - inset)).toFixed(1)}" cy="${yAt(h).toFixed(1)}" r="${(0.9 + (i % 3) * 0.35).toFixed(2)}" fill="rgba(255,250,235,0.3)"/>`).join('')}`
        }
      };
      const skin = SKINS[GLASS_SKIN] || null;
      if (skin) {
        E.glassArt.innerHTML = skin.front;
        E.glassBackArt.innerHTML = skin.back;
        E.foamFill.setAttribute('fill', 'url(#foamGrad)');
      }

      const bubbles = [];
      for (let i = 0; i < 14; i++) {
        const c = document.createElementNS(SVGNS, 'circle');
        E.bubbles.appendChild(c);
        bubbles.push({ el: c, x: -18 + ((i * 37) % 37), speed: 0.3 + ((i * 7) % 10) / 22, phase: (i * 0.137) % 1, r: 0.9 + (i % 3) * 0.45 });
      }
      const splash = [];
      for (let i = 0; i < 5; i++) {
        const c = document.createElementNS(SVGNS, 'circle');
        E.splash.appendChild(c);
        splash.push(c);
      }

      function geom(angle) {
        const a = angle * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
        // The rim drifts toward the tap as the glass tilts, the way a hand keeps
        // the opening under the spout so the stream lands on the lower wall.
        const u = angle / 45;
        const ax = G.tapX + 24 * u, ay = G.rimY + 10 * u;
        const px = ax + RIM * s, py = ay - RIM * c;
        const w = (x, y) => [px + x * c - y * s, py + x * s + y * c];
        const origin = w(0, -base);
        return { px, py, w, surfaceY: v => origin[1] - surfaceAt(v, angle) * H };
      }

      function surface(y, amp, phase, freq) {
        let d = '';
        for (let x = 0; x <= 340; x += 17) {
          d += (x ? 'L' : 'M') + x + ',' + (y + amp * Math.sin(x * freq + phase)).toFixed(2);
        }
        return d + 'L340,400L0,400Z';
      }

      function render(s, view) {
        const calm = view.reducedMotion;
        const t = s.elapsed;
        const g = geom(s.angle);
        const tot = s.fill + s.foam;

        setAttr(E.clipPoly, 'points', INNER.map(p => g.w(p[0], p[1]).map(v => v.toFixed(2)).join(',')).join(' '));
        const glassT = `translate(${g.px.toFixed(2)} ${g.py.toFixed(2)}) rotate(${s.angle.toFixed(2)})`;
        setAttr(E.glass, 'transform', glassT);
        setAttr(E.glassBack, 'transform', glassT);

        const yBeer = g.surfaceY(s.fill), yTop = g.surfaceY(tot);
        const wobble = calm ? 0 : 0.4 + 1.6 * s.flow * s.turb;
        E.beerFill.setAttribute('d', s.fill > 0.002 ? surface(yBeer, wobble, t * 7, 0.07) : '');
        const foamD = s.foam > 0.002 ? surface(yTop, 1.3, calm ? 0 : t * 1.2, 0.45) : '';
        E.foamFill.setAttribute('d', foamD);
        E.foamTex.setAttribute('d', foamD);
        if (skin) {
          // Creamier head: light at the top, warmer where it meets the beer, and
          // a bright line along the beer's surface so the two read apart.
          setAttr(E.foamGrad, 'y1', yTop.toFixed(1)); setAttr(E.foamGrad, 'y2', Math.max(yTop + 4, yBeer).toFixed(1));
          let line = '';
          if (s.fill > 0.002) for (let x = 0; x <= 340; x += 17) {
            line += (x ? 'L' : 'M') + x + ',' + (yBeer + wobble * Math.sin(x * 0.07 + t * 7)).toFixed(2);
          }
          setAttr(E.beerShine, 'd', line);
        }

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
        // down that wall -- the visible difference between tilted and upright.
        let impact = null;
        if (s.flow > 0.01) {
          const nx = G.tapX, ny = G.nozzleY;
          const L = g.w(-in1, RIM), R = g.w(in1, RIM);
          const rimYAt = L[0] === R[0] ? L[1] : L[1] + (nx - L[0]) / (R[0] - L[0]) * (R[1] - L[1]);
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
          setAttr(E.stream, 'd', '');
          setAttr(E.streamCore, 'd', '');
        }

        const agit = impact && s.fill > 0.01 ? s.flow * s.turb * (impact.direct ? 1 : 0.5) : 0;
        splash.forEach((c, i) => {
          if (agit < 0.05) { setAttr(c, 'r', 0); return; }
          const jx = calm ? 0 : Math.sin(t * 17 + i * 2.1) * 2;
          c.setAttribute('cx', (impact.x + (i - 2) * 4 + jx).toFixed(2));
          c.setAttribute('cy', (impact.y - 1 - (i % 2) * 2).toFixed(2));
          c.setAttribute('r', (1.2 + 2.6 * agit * (1 - Math.abs(i - 2) / 3)).toFixed(2));
        });

        // Spill runs down the outside from whichever lip is lower.
        if (s.spill > 0) {
          const L = g.w(-in1 - wall, RIM - 2), R = g.w(in1 + wall, RIM - 2);
          const lip = R[1] >= L[1] ? R : L, dir = lip === R ? 1 : -1;
          E.spill.setAttribute('d', `M${lip[0].toFixed(1)},${lip[1].toFixed(1)} q${3 * dir},4 ${2 * dir},40`);
        } else setAttr(E.spill, 'd', '');

        // Fill line, printed on the glass so it tilts with it. Heights here are
        // the same upright heights evaluate() scores against.
        // The LINE is drawn mid-band: the passing zone sits either side of it.
        const zl = cfg.fillLine, [z0, z1] = fillZone(cfg);
        setAttr(E.zoneBand, 'points',
          `${-halfAt(z0)},${yAt(z0)} ${halfAt(z0)},${yAt(z0)} ${halfAt(z1)},${yAt(z1)} ${-halfAt(z1)},${yAt(z1)}`);
        setAttr(E.fillLine, 'x1', -halfAt(zl)); setAttr(E.fillLine, 'x2', halfAt(zl));
        setAttr(E.fillLine, 'y1', yAt(zl)); setAttr(E.fillLine, 'y2', yAt(zl));
        setAttr(E.fillLabel, 'x', -halfAt(zl) - wall - 4); setAttr(E.fillLabel, 'y', yAt(zl) + 4);

        setAttr(E.handle, 'transform', `rotate(${(-30 * s.flow).toFixed(1)} 210 24)`);
        setAttr(E.tapGlow, 'opacity', (0.8 * s.flow).toFixed(2));

        // BRING UP training mark: the sourced half-to-two-thirds range, printed
        // on the glass. Watch and Guided only.
        E.bringMark.style.display = view.showMark ? '' : 'none';
        if (view.showMark) {
          const [m0, m1] = cfg.straightenWindow;
          setAttr(E.bringBand, 'points',
            `${-halfAt(m0)},${yAt(m0)} ${halfAt(m0)},${yAt(m0)} ${halfAt(m1)},${yAt(m1)} ${-halfAt(m1)},${yAt(m1)}`);
          setAttr(E.bringLabel, 'x', (halfAt(m1) + wall + 4).toFixed(1));
          setAttr(E.bringLabel, 'y', ((yAt(m0) + yAt(m1)) / 2 + 3).toFixed(1));
        }

        // Action marks: a tick on the glass wall at the level where the player
        // started straightening, and where the tap fully closed (latest stop).
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
        // Keep the band labels clear of the marks once a mark is drawn.
        E.bringLabel.style.display = st ? 'none' : '';
        E.stopLabel.style.display = view.showMark && !sp ? '' : 'none';
        setAttr(E.stopLabel, 'x', (halfAt(zl) + wall + 4).toFixed(1)); setAttr(E.stopLabel, 'y', (yAt(zl) + 3).toFixed(1));

        // Head gauge, in the same upright head height that is scored.
        const head = headOf(s);
        const [b0, b1] = cfg.headBand;
        const gy = gaugeY(head);
        setAttr(E.gaugeBar, 'y', gy.toFixed(2)); setAttr(E.gaugeBar, 'height', (GAUGE.bottom - gy).toFixed(2));
        setAttr(E.gaugeBarTex, 'y', gy.toFixed(2)); setAttr(E.gaugeBarTex, 'height', (GAUGE.bottom - gy).toFixed(2));
        setAttr(E.gaugeBand, 'y', gaugeY(b1)); setAttr(E.gaugeBand, 'height', gaugeY(b0) - gaugeY(b1));
        setAttr(E.gaugeHi, 'y', gaugeY(b1) + 3); setText(E.gaugeHi, Math.round(b1 * 100) + '%');
        setAttr(E.gaugeLo, 'y', gaugeY(b0) + 3); setText(E.gaugeLo, Math.round(b0 * 100) + '%');
        setText(E.gaugeVal, Math.round(head * 100) + '%');
        setText(E.gaugeState, head < b0 ? 'below band' : head > b1 ? 'above band' : 'in band');
        setText(E.levelText, `Level ${Math.round(levelOf(s) * 100)}%`);
      }

      return { render };
    })();

    // ==== Input ==============================================================
    // Pour flags stay separate (pointer, key, latch) so releasing one never
    // cancels another mid-pour. `straighten` is the staged request; the sim
    // ignores it until the tap has opened.
    const input = { pointer: false, key: false, latch: false, target: 0, straighten: false };
    let straightenVia = null;           // logged: which input started straightening
    let activePointer = null, drag = null;
    let tapMode = false;
    let sim = initState();
    let served = null;
    let mode = 'watch';
    const ghost = { pour: false, stepIndex: -1 };
    let hintsFired = new Set();
    let milestones = new Set();
    let soloFailStreak = 0;

    const pourBtn = $('pour'), slider = $('angleSlider'), toggle = $('angleToggle');
    const locked = () => served !== null || mode === 'watch';
    const pourWanted = () => served === null &&
      (mode === 'watch' ? ghost.pour : (input.pointer || input.key || input.latch));
    const usesPad = () => variant === 'staged' || variant === 'continuous';

    function stopPour() {
      input.pointer = input.key = input.latch = false;
      drag = null;
      if (activePointer !== null) {
        try { pourBtn.releasePointerCapture(activePointer); } catch (_) { /* already gone */ }
        activePointer = null;
      }
    }

    function setTarget(v) {
      input.target = Math.max(0, Math.min(ctl.maxAngle, Math.round(v * 10) / 10));
    }
    function requestStraighten(via) {
      if (locked() || !sim.opened || sim.assist || input.straighten) return;
      input.straighten = true;
      straightenVia = via;
    }

    // Pad gestures. Thumb movement is measured from where it landed, with a
    // dead zone, so resting a thumb does not nudge the glass.
    const SWIPE = 28;
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
      const dy = drag.y0 - e.clientY;                      // up is positive
      if (Math.abs(dy) > ctl.padDead) drag.moved = true;
      if (variant === 'staged') {
        if (dy > SWIPE) requestStraighten('swipe');
      } else if (variant === 'continuous' && drag.moved) {
        setTarget(padTarget(drag.angle0, dy, ctl));
        if (sim.opened && !straightenVia && input.target < cfg.tiltThreshold) straightenVia = 'slide';
      }
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

    // A click with no pointer press just before it came from assistive tech;
    // those cannot hold, so it toggles. Pointerup counts as pointer activity
    // too, or the click ending a long hold would latch the tap open.
    let lastPointerAt = -Infinity;
    const notePointer = () => { lastPointerAt = performance.now(); };
    on(document, 'pointerdown', notePointer, true);
    on(document, 'pointerup', notePointer, true);
    const fromPointer = () => performance.now() - lastPointerAt < 1000;
    pourBtn.addEventListener('click', () => { if (!fromPointer() && !locked()) input.latch = !input.latch; });

    $('tapMode').addEventListener('change', e => { tapMode = e.target.checked; stopPour(); });

    slider.addEventListener('input', () => { if (!locked()) setTarget(+slider.value); });

    // The glass switch. Before the pour it tilts or levels the glass. During a
    // staged pour it is the button version of the swipe; during a continuous
    // pour it snaps the glass (the v1 behaviour, kept as a fallback).
    toggle.addEventListener('click', () => {
      if (locked()) return;
      if (variant === 'staged' && sim.opened) { requestStraighten('button'); return; }
      setTarget(input.target >= ctl.tiltAngle / 2 ? 0 : ctl.tiltAngle);
      if (sim.opened && !straightenVia && input.target === 0) straightenVia = 'button';
    });

    function setVariant(v) {
      variant = VARIANTS.includes(v) ? v : 'continuous';
      $('sliderWrap').hidden = variant !== 'slider';
      $('toggleWrap').hidden = variant === 'slider';
      // The thumb track only earns its place where the thumb sets the angle.
      $('padTrack').hidden = variant !== 'continuous';
      if (variant === 'toggle') setTarget(input.target >= ctl.tiltAngle / 2 ? ctl.tiltAngle : 0);
      if (DEBUG) $('dbgVariant').value = variant;
    }

    const isTyping = el => el && (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable ||
      (el.tagName === 'INPUT' && el.type !== 'range' && el.type !== 'checkbox'));
    const isOtherControl = el => el && el !== pourBtn &&
      (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY' || (el.tagName === 'INPUT' && el.type === 'checkbox'));

    on(window, 'keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement;
      if (isTyping(el)) return;
      const k = e.key;
      const arrow = k === 'ArrowLeft' || k === 'ArrowDown' || k === 'ArrowRight' || k === 'ArrowUp';
      if (k === ' ' || k === 'Enter') {
        if (isOtherControl(el)) return;
        e.preventDefault();
        if (e.repeat || locked()) return;
        if (tapMode) input.latch = !input.latch; else input.key = true;
      } else if (arrow && (variant === 'slider' || variant === 'continuous')) {
        // Up straightens, matching the pad's slide-up.
        e.preventDefault();
        if (locked()) return;
        // Continuous: Up/Left straighten, matching the pad's slide-up.
        // v1 slider: Left/Down lower the value, as any range input does.
        const lower = variant === 'continuous' ? (k === 'ArrowUp' || k === 'ArrowLeft') : (k === 'ArrowDown' || k === 'ArrowLeft');
        setTarget(input.target + (lower ? -5 : 5));
        if (sim.opened && !straightenVia && input.target < cfg.tiltThreshold) straightenVia = 'key';
      } else if (arrow && variant === 'staged' && k === 'ArrowUp') {
        e.preventDefault();
        requestStraighten('key');
      } else if (k === 't' || k === 'T') {
        if (variant === 'slider') return;
        e.preventDefault();
        if (!locked()) toggle.click();
      } else if ((k === 's' || k === 'S') && mode !== 'watch') {
        e.preventDefault(); serve();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault(); restart();
      }
    });

    // Pointer clicks drop focus, so Space pours rather than re-pressing the
    // button just clicked; keyboard activation keeps focus where it was.
    on(document, 'click', e => {
      const b = e.target.closest && e.target.closest('button');
      if (b && b !== pourBtn && fromPointer() && !b.closest('#debug')) setTimeout(() => {
        if (document.activeElement === b) b.blur();
      }, 0);
    });

    on(window, 'keyup', e => {
      if ((e.key === ' ' || e.key === 'Enter') && input.key) { input.key = false; e.preventDefault(); }
    });

    // Never leave the tap open behind the player's back.
    on(window, 'blur', stopPour);
    on(window, 'pagehide', stopPour);
    on(document, 'visibilitychange', () => { if (document.hidden) stopPour(); });

    // ==== Speech and captions ================================================
    const live = $('live');
    let pending = [], flushTimer = null;
    function announce(msg) {
      pending.push(msg);
      if (flushTimer) return;
      live.textContent = '';
      flushTimer = setTimeout(() => {
        live.textContent = pending.join(' ');
        pending = []; flushTimer = null;
      }, 80);
    }
    function setCaption(text, kind) {
      setText($('caption'), text || '');
      $('caption').classList.toggle('hint', kind === 'hint');
      $('caption').classList.toggle('verdict', kind === 'verdict');
    }

    // ==== Modes ==============================================================
    const MODE_LABEL = { watch: 'Watch', guided: 'Guided', solo: 'Solo' };
    const transcript = $('transcript');
    GHOST_STEPS.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      transcript.appendChild(li);
    });

    function setMode(m) {
      if (mode !== 'watch' && sim.opened && !served) Log.record(sim, null, false, 'modeChange');
      sim = initState();
      mode = m;
      host.querySelectorAll('#modes button').forEach(b => {
        if (b.dataset.mode === m) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      const watching = m === 'watch';
      $('actions').hidden = watching;
      $('ghostActions').hidden = !watching;
      $('transcriptBox').hidden = !watching;
      $('controls').classList.toggle('demo', watching);
      restart();
      announce(`${MODE_LABEL[m]} mode.` + (watching ? ' A demo pour is playing.' : ''));
    }
    host.querySelectorAll('#modes button').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('replay').addEventListener('click', () => { restart(); $('replay').focus(); });
    $('skip').addEventListener('click', () => setMode('guided'));

    const OPENING = {
      watch: '',
      guided: 'Guided: tilt the glass, then hold the pad to pour. Hints show up here.',
      solo: 'Solo: no hints. Serve when it looks right.'
    };

    function restart() {
      stopPour();
      if (mode !== 'watch' && sim.opened && !served) Log.record(sim, null, false, 'restart');
      sim = initState();
      served = null;
      ghost.pour = false;
      ghost.stepIndex = -1;
      hintsFired = new Set();
      milestones = new Set();
      input.straighten = false;
      straightenVia = null;
      setTarget(0);
      setCaption(OPENING[mode]);
      $('angleCtl').classList.remove('pulse');
      pourBtn.classList.remove('cue');
      const focusWasInSheet = $('result').contains(document.activeElement);
      $('result').hidden = true;
      if (focusWasInSheet) (mode === 'watch' ? $('replay') : pourBtn).focus({ preventScroll: true });
      [...transcript.children].forEach(li => li.removeAttribute('aria-current'));
    }

    function serve(fromGhost) {
      if (served || !canServe(sim) || (mode === 'watch' && !fromGhost)) return;
      stopPour();
      $('angleCtl').classList.remove('pulse');
      pourBtn.classList.remove('cue');
      const r = evaluate(sim, cfg);
      served = { result: r, text: feedback(r, cfg) };
      if (mode === 'solo') soloFailStreak = r.pass ? 0 : soloFailStreak + 1;
      if (mode !== 'watch') { Log.record(sim, r, true, 'served'); emit('served', { mode, pass: r.pass }); }
      showResult(r, served.text);
    }
    $('serve').addEventListener('click', () => serve(false));
    $('restart').addEventListener('click', restart);

    // ---- Result sheet ----
    const pctOf = v => Math.round(v * 100);
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
      const m = r.metrics;
      const [b0, b1] = cfg.headBand;
      const demo = mode === 'watch';
      // Technique is named first: it is what the training is for. Right
      // technique with a slightly-off pour is a near miss, not a plain fail.
      const title = r.pass ? (demo ? 'Demo pour: clean' : 'Clean pour')
        : r.techniqueOk ? 'Good technique. Adjust the pour.' : 'Technique to fix';
      setText($('resultTitle'), title);
      setCaption(title);

      const tech = $('checksTech'), ul = $('checks');
      tech.textContent = ''; ul.textContent = '';
      chip(tech, r.procedure.tilted, 'Tilted first',
        m.startAngle === null ? 'never opened' : `opened at ${Math.round(m.startAngle)}°`);
      chip(tech, r.procedure.upright, 'Finished upright',
        m.closeAngle === null ? 'tap never closed' : `closed at ${Math.round(m.closeAngle)}°`);
      chip(ul, r.checks.head, `${pctOf(m.finalHead)}%`, `Head: ${r.checks.head ? 'in range' : m.finalHead > b1 ? 'too big' : 'too small'}`,
        `aim ${pctOf(b0)}–${pctOf(b1)}%`);
      chip(ul, r.checks.total, `${pctOf(m.finalLevel)}%`,
        `Level: ${r.checks.total ? 'in range' : m.finalLevel > fillZone(cfg)[1] ? 'too high' : 'too low'}`,
        `aim ${pctOf(fillZone(cfg)[0])}–${pctOf(fillZone(cfg)[1])}%`);
      chip(ul, r.checks.waste, `${pctOf(m.waste)}%`, `Spill: ${r.checks.waste ? 'in range' : 'too much'}`, `max ${pctOf(cfg.wasteTol)}%`);

      drawDebrief(sim);
      setText($('fbPrimary'), text.primary);
      $('fbSecondary').hidden = !text.secondary;
      setText($('fbSecondary'), text.secondary ? 'Also: ' + text.secondary : '');
      const suggest = mode === 'solo' && !r.pass && soloFailStreak >= 3;
      $('suggest').hidden = !suggest;
      setText($('suggest'), suggest ? `${soloFailStreak} misses in a row. Guided mode shows hints and the angle zone, if you want them.` : '');

      const again = () => { restart(); pourBtn.focus(); };
      let actions;
      if (demo) actions = [['Try it guided', () => setMode('guided')], ['Watch again', () => setMode('watch')]];
      else if (mode === 'guided') actions = r.pass
        ? [['Try solo', () => setMode('solo')], ['Pour again', again]]
        : [['Try again', again], ['Watch again', () => setMode('watch')]];
      else actions = r.pass
        ? [['Pour again', again], ['Watch again', () => setMode('watch')]]
        : [['Try again', again], ['Watch again', () => setMode('watch')], ['Guided again', () => setMode('guided')]];
      const primaryIndex = suggest ? 2 : 0;
      const host = $('resultActions');
      host.textContent = '';
      actions.forEach(([label, fn], i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        if (i === primaryIndex) b.className = 'primary';
        b.addEventListener('click', fn);
        host.appendChild(b);
      });

      $('result').hidden = false;
      announce(`${title}. ${text.primary}${text.secondary ? ' Also: ' + text.secondary : ''}`);
      host.children[primaryIndex].focus({ preventScroll: true });
    }

    // The debrief: the training glass again, with both bands and where this
    // pour acted. This is how Solo gets its timing feedback -- after the pour.
    function drawDebrief(st) {
      const svg = $('debriefGlass');
      const [w0, w1] = cfg.straightenWindow, [z0, zl] = fillZone(cfg);
      const top = 10, bot = 140, hgt = bot - top, cx = 50, hb = 14, ht = 24;
      const y = h => bot - h * hgt, hw = h => hb + (ht - hb) * h;
      const band = (h0, h1, fill, stroke, dash) =>
        `<polygon points="${cx - hw(h0)},${y(h0)} ${cx + hw(h0)},${y(h0)} ${cx + hw(h1)},${y(h1)} ${cx - hw(h1)},${y(h1)}" fill="${fill}" stroke="${stroke}" stroke-width="1" stroke-dasharray="${dash}"/>`;
      const evs = st.events, sEv = evs.find(e => e.type === 'straighten'), pEv = evs.filter(e => e.type === 'stop').at(-1);
      const tick = (ev, color) => ev ? `<line x1="${cx + hw(ev.level) + 2}" x2="${cx + hw(ev.level) + 12}" y1="${y(ev.level)}" y2="${y(ev.level)}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>` : '';
      svg.innerHTML =
        `<polygon points="${cx - ht},${top} ${cx - hb},${bot} ${cx + hb},${bot} ${cx + ht},${top}" fill="rgba(210,228,255,0.06)" stroke="rgba(230,240,255,0.8)" stroke-width="2"/>` +
        band(w0, w1, 'rgba(159,220,138,0.25)', '#9fdc8a', '1 2') +
        band(z0, zl, 'rgba(246,238,223,0.18)', '#f6eedf', '3 2') +
        tick(sEv, '#9fdc8a') + tick(pEv, '#f6eedf');
      const parts = [];
      parts.push(sEv
        ? `You started bringing it up at <b>${pctOf(sEv.level)}%</b> (BRING UP band ${pctOf(w0)}–${pctOf(w1)}%): ${MARK_PLAIN.straighten[sEv.verdict]}.`
        : 'You never started bringing the glass up while pouring.');
      // How the glass came up: information only, never scored.
      const m = evaluate(st, cfg).metrics, style = bringUpStyle(m.bringUpSeconds);
      if (style) parts.push(style === 'gradual'
        ? `Brought up gradually (${m.bringUpSeconds.toFixed(1)} s).`
        : `Brought up all at once (${m.bringUpSeconds.toFixed(1)} s); try sliding up more slowly.`);
      if (pEv) parts.push(`You stopped at <b>${pctOf(pEv.level)}%</b> (around the LINE, ${pctOf(z0)}–${pctOf(zl)}%): ${MARK_PLAIN.stop[pEv.verdict]}.`);
      $('debriefText').innerHTML = parts.join(' ');
    }
    const MARK_PLAIN = {
      straighten: { inRange: 'in range', littleEarly: 'a little early', early: 'early', littleLate: 'a little late', late: 'late' },
      stop: { inZone: 'in the zone', short: 'short', over: 'over the line' }
    };

    // ---- Ghost ----
    // The demo drives the same inputs a player would, including the
    // straighten request, so each variant's controls visibly do the work.
    function ghostTick() {
      const inp = inputAt(GHOST, sim.tick);
      if (inp.serve) { serve(true); return false; }
      ghost.pour = inp.pour;
      if (variant === 'toggle') setTarget(inp.straighten ? 0 : inp.target >= ctl.tiltAngle / 2 ? ctl.tiltAngle : 0);
      else setTarget(inp.target);
      input.straighten = inp.straighten;
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
      sim = step(sim, { pour: pourWanted(), target: input.target, straighten: input.straighten, variant }, STEP, cfg, ctl);
      // Keep the control's target in step with an assisted move, so a later
      // drag or switch press starts from where the glass really is.
      if (sim.assist) input.target = Math.round(sim.angle * 10) / 10;
      if (mode === 'guided') guidedTick(prev);
      if (sim.events.length > prev.events.length) actionTick(sim.events.slice(prev.events.length));
      milestoneTick();
    }

    function guidedTick(prev) {
      for (const id of guidedHints(prev, sim, hintsFired, cfg)) {
        hintsFired.add(id);
        setCaption(HINTS[id], 'hint');
        announce(HINTS[id]);
        if (id === 'straighten' || id === 'spillWarn') {
          (usesPad() ? pourBtn : $('angleCtl')).classList.add(usesPad() ? 'cue' : 'pulse');
        }
      }
      if (sim.angle < cfg.tiltThreshold || sim.flow === 0) {
        $('angleCtl').classList.remove('pulse');
        pourBtn.classList.remove('cue');
      }
    }

    // Feedback on the action just taken, in Guided only. It names that action
    // ("Started straightening in range"), never the whole pour.
    function actionTick(newEvents) {
      if (mode !== 'guided') return;
      for (const e of newEvents) {
        let text = VERDICT_TEXT[e.type][e.verdict];
        // Continuous: the glass is still on its way up -- say how to finish the move.
        if (e.type === 'straighten' && variant === 'continuous' && sim.angle > cfg.straightenThreshold) text += ' Keep it steady.';
        const good = e.verdict === 'inRange' || e.verdict === 'inZone';
        setCaption(text, good ? 'verdict' : 'hint');
        announce(text);
      }
    }

    function milestoneTick() {
      const level = levelOf(sim);
      for (const q of [0.25, 0.5, 0.75]) {
        if (level >= q && !milestones.has(q)) { milestones.add(q); announce(`Level ${q * 100}%.`); }
      }
      const head = headOf(sim), [b0, b1] = cfg.headBand;
      if (!milestones.has('head') && level > 0.5 && head >= b0 && head <= b1) {
        milestones.add('head');
        announce(`Head in band, ${pctOf(head)}%.`);
      }
    }

    // ==== UI sync ============================================================
    function valueText(deg) {
      const d = Math.round(deg);
      if (d >= cfg.tiltThreshold) return `${d} degrees, tilted`;
      if (d <= cfg.straightenThreshold) return `${d} degrees, upright`;
      return `${d} degrees, partly tilted`;
    }

    const SUB = {
      staged: 'Swipe up to straighten',
      continuous: 'then slide up slowly to straighten',
      slider: 'or hold Space / Enter',
      toggle: 'or hold Space / Enter'
    };

    function syncUI() {
      const pouring = pourWanted();
      setAttr(pourBtn, 'aria-pressed', pouring);
      setAttr(pourBtn, 'aria-disabled', locked());
      setText($('pourText'), mode === 'watch' && !served ? (pouring ? 'Demo: pouring…' : 'Demo') :
        locked() ? 'Locked' : pouring ? (tapMode || input.latch ? 'Tap to stop' : 'Pouring…') :
        (tapMode ? 'Tap to pour' : 'Hold to pour'));
      setText($('pourSub'), mode === 'watch' ? (variant === 'staged' && sim.assist ? 'Straightening…' : 'watch the thumb')
        : variant === 'staged' && sim.assist ? 'Straightening…'
        : variant === 'continuous' && pouring ? 'Keep holding. Slide up slowly to bring the glass upright.'
        : SUB[variant]);
      // Demo thumb: in Watch it rests on the pad while the tap is open and
      // slides with the glass (low = tilted, high = upright), over the same
      // distance a real thumb travels. Holding still holds the angle.
      const finger = $('padFinger');
      const showFinger = mode === 'watch' && !served && pouring && variant === 'continuous';
      finger.hidden = !showFinger;
      if (showFinger) finger.style.top = (22 + 56 * Math.min(1, sim.angle / ctl.tiltAngle)).toFixed(1) + '%';
      $('serve').disabled = locked() || !canServe(sim);
      slider.disabled = locked();

      // Pad track: top is upright, bottom is the steepest tilt.
      $('padThumb').style.top = (100 * Math.min(1, sim.angle / ctl.maxAngle)).toFixed(1) + '%';

      if (+slider.value !== Math.round(input.target)) slider.value = Math.round(input.target);
      setAttr(slider, 'aria-valuetext', valueText(input.target));
      setText($('angleOut'), Math.round(input.target) + '°');
      const tiltedNow = variant === 'staged' && sim.assist ? false : input.target >= ctl.tiltAngle / 2;
      setAttr(toggle, 'aria-checked', tiltedNow);
      const toggleDead = locked() || (variant === 'staged' && sim.assist);
      setAttr(toggle, 'aria-disabled', toggleDead);
      setAttr(toggle, 'aria-label', variant === 'staged' && sim.opened && !sim.assist
        ? 'Straighten the glass' : 'Tilt the glass to about 45 degrees');
    }

    // ==== Metrics log ========================================================
    // One entry per pour, served or abandoned. v2 has its own key so its data
    // never mixes with the v1 baseline's.
    const Log = (() => {
      const KEY = 'perfectPour.log.v2.3', CAP = 2000;
      const session = Math.random().toString(36).slice(2, 8);
      let attempt = 0;
      const r4 = v => v === null || v === undefined ? null : Math.round(v * 1e4) / 1e4;
      function read() {
        try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (_) { return []; }
      }
      function write(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP))); return true; } catch (_) { return false; }
      }
      function record(state, result, wasServed, endedBy) {
        attempt++;
        const m = evaluate(state, cfg).metrics;
        const entry = {
          station: 'pilsner', v: 2.3, session, attempt, at: new Date().toISOString(),
          mode, variant, tapMode, straightenVia,
          orientation: innerWidth > innerHeight ? 'landscape' : 'portrait',
          served: wasServed,
          endedBy: endedBy || null,      // served | restart | modeChange | navigate (left the station)
          pass: result ? result.pass : null,
          techniqueOk: result ? result.techniqueOk : null,
          pourOk: result ? result.pourOk : null,
          primary: result ? result.primary : null,
          secondary: result ? result.secondary : null,
          procedure: result ? Object.assign({}, result.procedure) : null,
          checks: result ? Object.assign({}, result.checks) : null,
          startAngle: r4(m.startAngle), straightenBegan: r4(m.straightenBegan), straightenFill: r4(m.straightenFill),
          closeAngle: r4(m.closeAngle), uprightPour: r4(m.uprightPour),
          finalLevel: r4(m.finalLevel), finalHead: r4(m.finalHead),
          finalFill: r4(m.finalFill), finalFoam: r4(m.finalFoam), waste: r4(m.waste), tiltWaste: r4(m.tiltWaste),
          pourDuration: r4(m.pourDuration), zoneShare: r4(m.zoneShare),
          bringUpSeconds: r4(m.bringUpSeconds), bringUpStyle: bringUpStyle(m.bringUpSeconds),
          hints: mode === 'guided' ? [...hintsFired] : null,
          events: state.events.map(e => ({ type: e.type, level: r4(e.level), verdict: e.verdict, t: r4(e.tick / 60) })),
          config: Object.assign(JSON.parse(JSON.stringify(cfg)), { control: Object.assign({}, ctl) })
        };
        const list = read();
        list.push(entry);
        write(list);
      }
      return { read, record, clear: () => write([]), key: KEY };
    })();

    // ==== Debug panel (?debug=1) =============================================
    const Debug = (() => {
      if (!DEBUG) return { update() {} };
      const panel = $('debug'), btn = $('debugToggle');
      btn.hidden = false;
      btn.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        btn.setAttribute('aria-expanded', String(!panel.hidden));
      });
      $('dbgVariant').addEventListener('change', e => { setVariant(e.target.value); restart(); });

      const DEFAULTS = JSON.parse(JSON.stringify({ cfg, ctl }));
      function fields(obj, host) {
        host.textContent = '';
        for (const key of Object.keys(obj)) {
          const v = obj[key];
          const parts = Array.isArray(v) ? v.map((_, i) => [key + '[' + i + ']', i]) : typeof v === 'number' ? [[key, null]] : [];
          for (const [label, i] of parts) {
            const lab = document.createElement('label');
            lab.textContent = label;
            const inp = document.createElement('input');
            inp.type = 'number'; inp.step = 'any';
            inp.value = i === null ? v : v[i];
            inp.addEventListener('input', () => {
              const n = parseFloat(inp.value);
              if (!Number.isFinite(n)) return;
              if (i === null) obj[key] = n; else obj[key][i] = n;
            });
            lab.htmlFor = inp.id = 'dbg-' + host.id + '-' + label.replace(/\W/g, '_');
            host.append(lab, inp);
          }
        }
      }
      const build = () => { fields(cfg, $('dbgCfg')); fields(ctl, $('dbgCtl')); };
      build();
      $('dbgReset').addEventListener('click', () => {
        for (const [k, v] of Object.entries(DEFAULTS.cfg)) cfg[k] = Array.isArray(v) ? v.slice() : v;
        Object.assign(ctl, DEFAULTS.ctl);
        build();
      });
      $('dbgDownload').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(Log.read(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `perfect-pour-v2-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      $('dbgCopy').addEventListener('click', async () => {
        const json = JSON.stringify(Log.read(), null, 2);
        try { await navigator.clipboard.writeText(json); setText($('dbgGhostOut'), 'Log copied.'); }
        catch (_) { setText($('dbgGhostOut'), json); }
      });
      $('dbgClear').addEventListener('click', () => {
        if (confirm('Delete every logged pour on this device?')) Log.clear();
      });
      $('dbgGhost').addEventListener('click', () => {
        const out = ['continuous', 'staged'].map(v => {
          const r = PourSim.runTimeline(GHOST, v, cfg, ctl);
          return `${v}: ${r.result.pass ? 'PASS' : 'FAIL ' + r.result.primary}  head ${headOf(r.state).toFixed(3)}  ` +
            `level ${levelOf(r.state).toFixed(3)}  began ${r.state.straightenBegan === null ? '-' : r.state.straightenBegan.toFixed(2)}`;
        });
        setText($('dbgGhostOut'), out.join('\n'));
      });

      const f = v => v === null ? 'null' : typeof v === 'number' ? v.toFixed(3) : String(v);
      let lastCount = -1, countAt = 0;
      function update() {
        if (panel.hidden) return;
        if (performance.now() - countAt > 500) {
          countAt = performance.now();
          const n = Log.read().length;
          if (n !== lastCount) { lastCount = n; setText($('dbgLogCount'), `${n} pours logged (${Log.key})`); }
        }
        const z = zoneAt(sim, cfg, ctl);
        setText($('dbgState'),
          `mode ${mode}  variant ${variant}  tapMode ${tapMode}\n` +
          `angle ${f(sim.angle)}  target ${input.target}  assist ${sim.assist}\n` +
          `zone ${z.lo.toFixed(1)}-${z.hi.toFixed(1)}  capacity ${f(sim.capacity)}\n` +
          `flow ${f(sim.flow)}  turb ${f(sim.turb)}\n` +
          `level ${f(levelOf(sim))}  head ${f(headOf(sim))}\nwaste ${f(sim.waste)}  tilted ${f(sim.tiltWaste)}\n` +
          `pourTime ${sim.pourTime.toFixed(2)}  upright ${sim.uprightPour.toFixed(2)}\n` +
          `startAngle ${f(sim.startAngle)}  closeAngle ${f(sim.closeAngle)}\n` +
          `began ${f(sim.straightenBegan)}  via ${straightenVia}\n` +
          `canServe ${canServe(sim)}  served ${served ? served.result.primary : '-'}`);
      }
      return { update };
    })();

    // ==== Loop ===============================================================
    let acc = 0, last = performance.now();
    function frame(now) {
      if (!alive) return;
      acc += Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      while (acc >= STEP) { tick(); acc -= STEP; }
      // Coaching (the BRING UP band, the STOP label, the action marks) shows in Watch
      // and Guided and fades out in Solo, leaving the beer, the glass and the fill line.
      const coach = mode !== 'solo';
      Renderer.render(sim, { reducedMotion: motionQuery.matches, showMark: coach, marks: coach ? sim.events : null });
      syncUI();
      Debug.update();
      rafId = requestAnimationFrame(frame);
    }

    // ==== Unmount ============================================================
    // Leaves no trace: loop stopped, timers cleared, tap closed, every window
    // and document listener removed, markup gone. (Listeners on the station's
    // own elements go with the markup.)
    // Leaving mid-pour (the agreed M3 rule): the tap closes at once and the
    // attempt is abandoned, never graded. It is logged with endedBy set to
    // the reason, and the host is told. Returns { abandoned }.
    function unmount(reason) {
      if (!alive) return { abandoned: false };
      alive = false;
      cancelAnimationFrame(rafId);
      clearTimeout(flushTimer);
      stopPour();
      const abandoned = mode !== 'watch' && sim.opened && !served;
      if (abandoned) {
        Log.record(sim, null, false, reason || 'navigate');
        emit('abandoned', { mode, reason: reason || 'navigate' });
      }
      disposers.splice(0).forEach(off => off());
      host.textContent = '';
      host.classList.remove('pp-st');
      return { abandoned };
    }

    setVariant(variant);
    setMode('watch');
    rafId = requestAnimationFrame(frame);
    return { unmount };
  }

  global.PilsnerStation = { mount };
})(window);
