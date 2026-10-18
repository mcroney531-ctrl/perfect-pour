// Riverside brewery app: the landing (first visit), the hub (an image-based
// brewery scene with live station hotspots), a first-time station intro, and
// navigation between them and the stations.
// - The whole app is one 16:9 frame (css/brewery.css #app-root), scaled to
//   the window. Environment art is a landscape plate with
//   anchors in plate pixels: js/hub-scenes.js. Art carries no UI or state.
// - Hotspots are real buttons, in teaching order, placed by layoutScene().
// - Hash routes (#/, #/pilsner, #/welcome) so the browser back button works
//   and the page still opens from disk. Stations are mounted and unmounted
//   whole. First-time learners land on the landing; returning ones on the hub.
(function () {
  'use strict';
  const P = window.RiversideProgress;
  const { SCENES, pickScene, layoutScene } = window.RiversideHubScenes;

  // ---- Stations (metadata only; state comes from progress) ----
  const STATIONS = [
    { id: 'pilsner', name: 'Pilsner', sub: 'Foundation pour', glass: 'pils', playable: true },
    { id: 'hefeweizen', name: 'Hefeweizen', sub: 'Transfer pour', glass: 'hefe', playable: false },
    { id: 'stout', name: 'Nitro Stout', sub: 'Two-step pour', glass: 'stout', playable: false }
  ];
  const BY_ID = Object.fromEntries(STATIONS.map(s => [s.id, s]));
  // What each state looks like on a card: words first, colour second.
  const STATE = {
    new: { action: 'Start here', status: 'Not started. Recommended first station.', ring: 'new' },
    inProgress: { action: 'Continue', status: 'In progress.', ring: 'progress' },
    certified: { action: 'Replay', status: 'Certified.', ring: 'certified' },   // set by M6 only
    preview: { action: 'Coming soon', status: 'Coming soon. Not playable yet.', ring: 'preview' }
  };
  const ROOM = { top: 0, bottom: 52, side: 12, edge: 4, ring: 44 };   // top is the measured header height
  // The landing's exterior plate (Riverside at dusk, 2560 x 1440).
  const LANDING = { src: 'assets/landing/landing.webp', provisional: false };
  const PUSH_MS = 650;          // hub-to-station camera push (agreed 0.5-0.8 s)
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const INTRO = {
    pilsner: { label: 'Pilsner station', title: 'Foundation pour',
      steps: ['<b>Watch</b> a demo pour.', '<b>Guided:</b> pour it yourself, with hints.', '<b>Solo:</b> pour it on your own.'],
      goal: 'Your goal: tilt first, bring the glass upright gradually, and stop at the line with the right amount of foam.' }
  };

  const root = document.getElementById('app-root');
  root.innerHTML = `
    <section class="land" id="landing" hidden aria-labelledby="landTitle">
      <div class="land__scene" aria-hidden="true"><img id="landPlate" alt="" decoding="async"></div>
      <div class="land__shade" aria-hidden="true"></div>
      <div class="land__block">
        <svg class="land__emblem" aria-hidden="true"><use href="#pp-emblem"/></svg>
        <p class="pp-label">Riverside Brewing Co.</p>
        <h1 class="pp-display land__title" id="landTitle" tabindex="-1">Perfect Pour</h1>
        <p class="land__sub">Staff Training Experience</p>
        <button type="button" class="pp-btn pp-btn--primary pp-btn--lg" id="startBtn">Start Training <span class="pp-arrow" aria-hidden="true">›</span></button>
      </div>
      <p class="land__provisional" id="landProvisional" hidden>Provisional art</p>
    </section>
    <section class="intro" id="intro" hidden aria-labelledby="introTitle">
      <div class="intro__scene" id="introScene" aria-hidden="true"></div>
      <div class="pp-panel intro__panel">
        <p class="pp-label" id="introLabel"></p>
        <h2 class="pp-display intro__title" id="introTitle" tabindex="-1"></h2>
        <ol class="intro__steps" id="introSteps"></ol>
        <p class="intro__goal" id="introGoal"></p>
        <button type="button" class="pp-btn pp-btn--primary" id="introBegin">Begin <span class="pp-arrow" aria-hidden="true">›</span></button>
      </div>
    </section>
    <div class="hub" id="hub" hidden>
      <div class="hub__canvas" id="hubCanvas">
        <div class="hub__scene" aria-hidden="true"><img id="hubPlate" alt="" decoding="async"></div>
        <div class="hub__shade" aria-hidden="true"></div>
        <ol class="hub__spots" aria-label="Stations">
          ${STATIONS.map(s => `
            <li class="hub__spot" data-spot="${s.id}">
              <span class="hub__ring" data-ring="${s.id}" aria-hidden="true"></span>
              <button type="button" class="hub__card" data-station="${s.id}"
                ${s.playable ? '' : 'aria-disabled="true"'} aria-describedby="status-${s.id}">
                <svg class="hub__thumb" aria-hidden="true"><use href="#pp-glass-${s.glass}"/></svg>
                <span class="hub__name">${s.name}</span>
                <span class="hub__sub">${s.sub}</span>
                <span class="hub__action" id="chip-${s.id}"></span>
                <span class="sr-only" id="status-${s.id}"></span>
              </button>
            </li>`).join('')}
          <li class="hub__spot hub__spot--rush" data-spot="finalRush">
            <button type="button" class="hub__rush" id="rushBtn" aria-disabled="true" aria-describedby="rushChip">
              <svg class="hub__laurel" viewBox="0 0 120 64" aria-hidden="true">
                <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                  <path d="M36 58C18 50 10 34 14 14M84 58c18-8 26-24 22-44"/>
                  <path d="M16 22c6 2 9 6 9 12M13 32c6 1 10 5 11 11M17 43c6 0 10 3 12 8M104 22c-6 2-9 6-9 12M107 32c-6 1-10 5-11 11M103 43c-6 0-10 3-12 8"/>
                </g>
                <g fill="currentColor"><rect x="49" y="28" width="22" height="18" rx="3"/></g>
                <path d="M53 29v-6a7 7 0 0 1 14 0v6" fill="none" stroke="currentColor" stroke-width="3"/>
              </svg>
              <span class="hub__rush-name">Final Rush</span>
              <span class="hub__rush-sub" id="rushChip">Locked · complete all 3 stations to unlock</span>
            </button>
          </li>
        </ol>
      </div>
      <header class="hub__top" id="hubTop">
        <svg class="hub__emblem" aria-hidden="true"><use href="#pp-emblem"/></svg>
        <div class="hub__titles">
          <p class="pp-label">Riverside Brewing Co.</p>
          <h1 class="pp-display hub__title" id="hubTitle" tabindex="-1">The Bar</h1>
          <p class="hub__lede" id="hubLede"></p>
        </div>
        <div class="hub__side">
          <p class="hub__score"><b id="hubCount">0</b> of 3<span>certified</span></p>
          <p class="hub__provisional" id="hubProvisional" hidden></p>
        </div>
      </header>
      <p class="hub__notice" id="hubNotice" role="status" aria-live="polite"></p>
    </div>
    <div id="stationHost"></div>`;

  const hub = document.getElementById('hub');
  const landing = document.getElementById('landing');
  const intro = document.getElementById('intro');
  const canvas = document.getElementById('hubCanvas');
  const plate = document.getElementById('hubPlate');
  const top = document.getElementById('hubTop');
  const stationHost = document.getElementById('stationHost');
  const notice = document.getElementById('hubNotice');
  const provisional = document.getElementById('hubProvisional');
  let current = null;        // { id, station } while a station (or its intro) is open
  let pending = null;        // { id, timer } while the camera push plays
  let pushNext = false;      // the next route into a station came from a hub card
  let cameFromHub = false;   // so "Back to the bar" can step back in history
  let noticeTimer = 0;
  let sceneName = null, lastLayout = null;

  function say(text) {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    notice.classList.toggle('is-on', !!text);
    if (text) noticeTimer = setTimeout(() => { notice.textContent = ''; notice.classList.remove('is-on'); }, 6000);
  }

  // ---- Scene: pick the plate, fit it, place the hotspots ----
  function setPlate(name) {
    if (name === sceneName) return;
    sceneName = name;
    const sc = SCENES[name];
    hub.classList.remove('hub--noart');
    hub.dataset.scene = name;
    plate.src = sc.src;
    plate.width = sc.width; plate.height = sc.height;
    provisional.hidden = !sc.provisional;
    provisional.textContent = 'Provisional art';
  }
  plate.addEventListener('error', () => {
    // Visibly broken in development rather than silently plain.
    hub.classList.add('hub--noart');
    provisional.hidden = false;
    provisional.textContent = 'Hub art failed to load';
  });

  function layout() {
    if (hub.hidden) return;
    const vw = hub.clientWidth, vh = hub.clientHeight;
    if (!vw || !vh) return;
    setPlate(pickScene(vw, vh));
    const sc = SCENES[sceneName];
    // The live UI scales with the frame: 1 at 1280 x 720, 1.5 at 1920 x 1080,
    // down to 0.7 on small frames (a phone held sideways), where cards stay
    // about 44 px tall.
    const ui = Math.min(1.75, Math.max(0.7, Math.min(vw / 1280, vh / 720)));
    hub.style.setProperty('--ui', ui.toFixed(4));
    const cards = [...hub.querySelectorAll('.hub__card')];
    const card = { w: Math.max(...cards.map(c => c.offsetWidth)) * ui, h: Math.max(...cards.map(c => c.offsetHeight)) * ui };
    const rushEl = document.getElementById('rushBtn');
    const rush = { w: rushEl.offsetWidth * ui, h: rushEl.offsetHeight * ui };
    const L = layoutScene(sc, vw, vh, { ...ROOM, top: top.offsetHeight * ui + 8 }, card, rush);
    lastLayout = { scene: sceneName, ...L, card, ui };
    canvas.style.height = L.height + 'px';
    const img = plate.style;
    img.left = L.ox + 'px'; img.top = L.oy + 'px';
    img.width = sc.width * L.s + 'px'; img.height = sc.height * L.s + 'px';
    // Each <li> sits on its point (the ring); its card is placed from the
    // layout's card box, relative to that point.
    hub.querySelectorAll('.hub__spot').forEach(li => {
      const id = li.dataset.spot, [x, y] = L.points[id], c = L.cards[id];
      li.style.setProperty('--x', x.toFixed(1) + 'px');
      li.style.setProperty('--y', y.toFixed(1) + 'px');
      li.style.setProperty('--cx', (c.cx - x).toFixed(1) + 'px');
      li.style.setProperty('--cy', (c.top - y).toFixed(1) + 'px');
      li.style.setProperty('--ring', Math.max(44, Math.min(96, 140 * L.s)).toFixed(1) + 'px');
    });
  }
  new ResizeObserver(layout).observe(hub);
  addEventListener('resize', layout);      // belt and braces: rotation on some phones

  // ---- Hub state ----
  function renderHub() {
    STATIONS.forEach(s => {
      const state = s.playable ? P.station(s.id).status : 'preview';
      const look = STATE[state] || STATE.new;
      const btn = hub.querySelector(`[data-station="${s.id}"]`);
      const action = document.getElementById('chip-' + s.id);
      action.textContent = look.action;
      action.className = 'hub__action hub__action--' + look.ring;
      document.getElementById('status-' + s.id).textContent = look.status;
      btn.className = `hub__card hub__card--${look.ring}`;
      hub.querySelector(`.hub__ring[data-ring="${s.id}"]`).className = `hub__ring hub__ring--${look.ring}`;
    });
    document.getElementById('hubCount').textContent = P.certifiedCount();
    const pil = P.station('pilsner').status;
    document.getElementById('hubLede').textContent =
      pil === 'new' ? 'Your first shift. Start at the Pilsner station.'
      : pil === 'inProgress' ? 'Pick up where you left off: the Pilsner station.'
      : 'Pilsner certified. More stations are on the way.';
  }

  hub.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'rushBtn') return say('Final Rush unlocks once all three stations are certified.');
    const s = BY_ID[btn.dataset.station];
    if (!s) return;
    if (!s.playable) return say(`${s.name} is coming soon. Start with the Pilsner.`);
    cameFromHub = true;
    pushNext = true;
    location.hash = '#/' + s.id;
    route();   // start now; the hashchange that follows finds it already under way
  });

  // ---- Landing ----
  const landPlate = document.getElementById('landPlate');
  function showLanding(fromApp) {
    hub.hidden = true; intro.hidden = true;
    if (!landPlate.getAttribute('src')) landPlate.src = LANDING.src;
    landing.classList.toggle('land--provisional', LANDING.provisional);
    document.getElementById('landProvisional').hidden = !LANDING.provisional;
    landing.hidden = false;
    document.title = 'Perfect Pour · Riverside Brewing Co.';
    if (fromApp) document.getElementById('landTitle').focus({ preventScroll: true });
  }
  document.getElementById('startBtn').addEventListener('click', () => {
    P.markSeen('landing');
    if (location.hash !== '#/') location.hash = '#/';
    route();   // show the hub now; the hashchange that follows finds it already up
  });

  // ---- Camera push into a station (hub art zooms toward the station) ----
  function push(id) {
    const pt = lastLayout && lastLayout.points[id];
    if (pt) canvas.style.transformOrigin = `${pt[0].toFixed(1)}px ${pt[1].toFixed(1)}px`;
    hub.classList.add('is-pushing');
    pending = { id, timer: setTimeout(() => { pending = null; openStation(id); }, PUSH_MS) };
  }
  function cancelPush() {
    if (pending) { clearTimeout(pending.timer); pending = null; }
    hub.classList.remove('is-pushing');
    canvas.style.transformOrigin = '';
  }

  // ---- Stations ----
  function openStation(id) {
    hub.hidden = true; landing.hidden = true;
    cancelPush();
    P.markEntered(id);
    current = { id, station: null };
    document.title = `${BY_ID[id].name} station · Riverside Brewing Co.`;
    if (INTRO[id] && !P.seen('intro.' + id)) return showIntro(id);
    mountStation(id);
  }

  // First visit only: what the station is and how it runs, then straight in.
  function showIntro(id) {
    const t = INTRO[id];
    document.getElementById('introLabel').textContent = t.label;
    document.getElementById('introTitle').textContent = t.title;
    document.getElementById('introSteps').innerHTML = t.steps.map(x => `<li>${x}</li>`).join('');
    document.getElementById('introGoal').textContent = t.goal;
    document.getElementById('introScene').style.backgroundImage = `url("${SCENES[sceneName || 'desktop'].src}")`;
    intro.hidden = false;
    document.getElementById('introBegin').focus({ preventScroll: true });
  }
  document.getElementById('introBegin').addEventListener('click', () => {
    if (!current || current.station) return;
    P.markSeen('intro.' + current.id);
    intro.hidden = true;
    mountStation(current.id);
  });

  // The station's backdrop (16:9, same frame coordinates as the live scene).
  const STATION_BACKDROP = { src: 'assets/station/pilsner-provisional.svg', provisional: true };
  function frameUi() {                       // panel scale for the station, from the frame size
    const w = root.clientWidth;
    stationHost.style.setProperty('--st-ui', Math.min(1.75, Math.max(0.8, w / 1280)).toFixed(4));
  }
  new ResizeObserver(frameUi).observe(root);

  function mountStation(id) {
    frameUi();
    const station = PilsnerStation.mount(stationHost, {
      onExit: leaveStation,
      onEvent(type, d) {
        if (type === 'served') P.recordServed(id, d.pass);
        if (type === 'abandoned') P.recordAbandoned(id);
      }
    });
    current = { id, station };
    stationHost.insertAdjacentHTML('afterbegin', `<div class="st-backdrop" aria-hidden="true"
      style="background-image:url('${STATION_BACKDROP.src}')">${STATION_BACKDROP.provisional ? '<p class="st-backdrop__label">Provisional backdrop</p>' : ''}</div>`);
    const exit = document.getElementById('exitBtn');
    if (exit) exit.focus({ preventScroll: true });
  }

  function leaveStation() {
    if (cameFromHub) history.back();
    else location.replace('#/');
  }

  // Leaving a station by any route (its back button, the browser's back
  // button, a typed URL) unmounts it: the tap closes at once and an unserved
  // attempt is abandoned, ungraded. Progress stays In progress.
  function closeStation() {
    if (!current) return null;
    const { id, station } = current;
    current = null;
    intro.hidden = true;
    if (!station) return { id, abandoned: false };          // left from the intro
    const { abandoned } = station.unmount('navigate');
    return { id, abandoned };
  }

  // ---- Router ----
  function route() {
    const id = (location.hash.match(/^#\/([a-z-]+)$/) || [])[1] || '';
    const fromHub = pushNext; pushNext = false;
    if (current && current.id === id) return;
    if (pending && pending.id === id) return;
    cancelPush();                       // any other navigation cancels a push
    const left = closeStation();
    if (id === 'welcome') return showLanding(true);
    if (id && BY_ID[id] && BY_ID[id].playable) {
      if (fromHub && !reducedMotion() && !hub.hidden) return push(id);
      return openStation(id);
    }
    if (id) {
      history.replaceState(null, '', '#/');
      if (BY_ID[id]) say(`${BY_ID[id].name} is coming soon. Start with the Pilsner.`);
    }
    if (!P.seen('landing')) return showLanding(!!left);
    showHub(left);
  }

  function showHub(left) {
    cameFromHub = false;
    landing.hidden = true; intro.hidden = true;
    renderHub();
    hub.hidden = false;
    if (left && !reducedMotion()) {       // a short fade back into the bar
      hub.classList.add('is-arriving');
      setTimeout(() => hub.classList.remove('is-arriving'), 300);
    }
    layout();
    document.title = 'The Bar · Riverside Brewing Co.';
    if (left) {
      if (left.abandoned) say('Pour stopped. Attempt not scored. Return to Pilsner to try again.');
      const card = hub.querySelector(`[data-station="${left.id}"]`);
      if (card) card.focus({ preventScroll: true });
    }
  }

  // Upright phones: a "turn sideways" prompt (as Storyline does), which can be
  // dismissed for this visit.
  const rotate = document.getElementById('rotatePrompt');
  if (rotate) document.getElementById('rotateDismiss').addEventListener('click', () => {
    document.documentElement.classList.add('rotate-dismissed');
  });

  addEventListener('hashchange', route);
  route();

  // For tests and debugging.
  window.ppBrewery = {
    current: () => current && current.station ? current.id : null,
    view: () => !landing.hidden ? 'landing' : !intro.hidden ? 'intro' : pending ? 'pushing' : !hub.hidden ? 'hub' : current ? 'station' : 'none',
    progress: P, layout: () => lastLayout
  };
})();
