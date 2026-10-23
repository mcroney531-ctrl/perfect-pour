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
// - Stations come from the registry (js/stations.js): this file names no beer.
(function () {
  'use strict';
  const P = window.RiversideProgress;
  const { SCENES, pickScene, layoutScene } = window.RiversideHubScenes;

  // ---- Stations: whatever is registered (js/stations.js), in hub order.
  // Each brings its own name, intro, backdrop and mount; state comes from
  // progress. The first playable one is where a new learner starts.
  const STATIONS = window.RiversideStations.list().map(s => ({ id: s.id, playable: s.playable, def: s, ...s.meta }));
  const BY_ID = Object.fromEntries(STATIONS.map(s => [s.id, s]));
  // The certification seal: shared artwork (#pp-seal) with this station's
  // name on the lower arc. Names longer than "PILSNER STATION" are fitted to
  // the arc so they never run past it.
  function sealSvg(cls, id) {
    const label = `${BY_ID[id].name.toUpperCase()} STATION`;
    const fit = label.length > 15 ? ' textLength="150" lengthAdjust="spacingAndGlyphs"' : '';
    return `<svg class="${cls}" viewBox="0 0 220 220" aria-hidden="true" data-seal="${id}"><use href="#pp-seal"/>` +
      `<text class="seal__station" style="font: 700 13px 'Barlow Condensed', sans-serif; letter-spacing: 2.5px" fill="#f7d27a">` +
      `<textPath href="#pp-seal-bot" startOffset="50%" text-anchor="middle"${fit}>${label}</textPath></text></svg>`;
  }
  const FIRST = STATIONS.find(s => s.playable);
  // The station to do next: the first playable one, in hub order, that is
  // not certified yet (null once every open station is certified).
  const nextUp = () => STATIONS.find(s => s.playable && P.station(s.id).status !== 'certified') || null;
  const list = names => names.length < 3 ? names.join(' and ') : names.slice(0, -1).join(', ') + ' and ' + names.at(-1);
  // What each state looks like on a card: words first, colour second.
  const STATE = {
    new: { action: 'Start here', status: 'Not started. Recommended first station.', ring: 'new' },
    next: { action: 'Start here', status: 'Not started. Recommended next.', ring: 'new' },
    open: { action: 'Start', status: 'Not started.', ring: 'open' },       // playable, but not the one to do next
    inProgress: { action: 'Continue', status: 'In progress.', ring: 'progress' },
    certified: { action: 'Replay', status: 'Certified: virtual training complete.', ring: 'certified' },   // a passing Solo pour (M6)
    preview: { action: 'Coming soon', status: 'Coming soon. Not playable yet.', ring: 'preview' }
  };
  const ROOM = { top: 0, bottom: 52, side: 12, edge: 4, ring: 44 };   // top is the measured header height
  // The landing's exterior plate (Riverside at dusk, 2560 x 1440).
  const LANDING = { src: 'assets/landing/landing.webp', provisional: false };
  const PUSH_MS = 650;          // hub-to-station camera push (agreed 0.5-0.8 s)
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
                ${sealSvg('hub__seal', s.id)}
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
    const next = nextUp();
    const started = STATIONS.some(s => s.playable && P.station(s.id).status !== 'new');
    STATIONS.forEach(s => {
      let state = s.playable ? P.station(s.id).status : 'preview';
      if (state === 'new') state = s !== next ? 'open' : started ? 'next' : 'new';
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
    // Final Rush is not built yet: once every station is certified it says so
    // rather than claiming to be locked.
    document.getElementById('rushChip').textContent = P.certifiedCount() === STATIONS.length
      ? 'Coming soon · all 3 stations certified' : 'Locked · complete all 3 stations to unlock';
    const done = list(STATIONS.filter(s => s.playable && P.station(s.id).status === 'certified').map(s => s.name));
    const more = STATIONS.some(s => !s.playable);
    document.getElementById('hubLede').textContent =
      !next ? `${done} certified.${more ? ' More stations are on the way.' : ''}`
      : P.station(next.id).status === 'inProgress' ? `Pick up where you left off: the ${next.name} station.`
      : !started ? `Your first shift. Start at the ${next.name} station.`
      : `${done} certified. Next: the ${next.name} station.`;
  }

  hub.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'rushBtn') return say(P.certifiedCount() === STATIONS.length
      ? 'All three stations certified. Final Rush is coming soon.'
      : 'Final Rush unlocks once all three stations are certified.');
    const s = BY_ID[btn.dataset.station];
    if (!s) return;
    if (!s.playable) return say(`${s.name} is coming soon. Start with the ${FIRST.name}.`);
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
    if (BY_ID[id].intro && !P.seen('intro.' + id)) return showIntro(id);
    mountStation(id);
  }

  // First visit only: what the station is and how it runs, then straight in.
  function showIntro(id) {
    const t = BY_ID[id].intro;
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

  function frameUi() {                       // panel scale for the station, from the frame size
    const w = root.clientWidth;
    stationHost.style.setProperty('--st-ui', Math.min(1.75, Math.max(0.8, w / 1280)).toFixed(4));
  }
  new ResizeObserver(frameUi).observe(root);

  function mountStation(id) {
    frameUi();
    const st = BY_ID[id];
    const station = st.def.mount(stationHost, {
      onExit: leaveStation,
      onEvent(type, d) {
        if (type === 'served') onServed(id, d);
        if (type === 'abandoned') P.recordAbandoned(id);
      }
    });
    current = { id, station };
    // The station's backdrop (16:9, same frame coordinates as the live scene).
    const bd = st.backdrop;
    stationHost.insertAdjacentHTML('afterbegin', `<div class="st-backdrop" aria-hidden="true"
      style="background-image:url('${bd.src}')">${bd.provisional ? '<p class="st-backdrop__label">Backdrop candidate</p>' : ''}</div>`);
  }

  // M6: only a passing Solo pour certifies (Watch and Guided never do), once,
  // permanently. The station's own debrief stays; the seal sits above it.
  function onServed(id, d) {
    P.recordServed(id, d.pass);
    const old = stationHost.querySelector('.st-cert');
    if (old) old.remove();
    if (d.mode === 'solo' && d.pass === true && P.certify(id)) showCertified(id);
  }
  function showCertified(id) {
    const sheet = document.getElementById('result');
    if (!sheet) return;
    sheet.insertAdjacentHTML('afterbegin', `
      <div class="st-cert">
        ${sealSvg('st-cert__seal', id)}
        <div>
          <p class="pp-label st-cert__label">Certified</p>
          <p class="st-cert__title">${BY_ID[id].name} station complete</p>
          <p class="st-cert__note">You've completed Riverside's virtual ${BY_ID[id].name} training. Your pour details are below.</p>
        </div>
      </div>`);
    certLive.textContent = `Certified: ${BY_ID[id].name} station complete. You've completed Riverside's virtual ${BY_ID[id].name} training.`;
  }
  const certLive = document.createElement('div');
  certLive.className = 'sr-only'; certLive.setAttribute('aria-live', 'polite'); certLive.setAttribute('aria-atomic', 'true');
  document.body.appendChild(certLive);

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
      if (BY_ID[id]) say(`${BY_ID[id].name} is coming soon. Start with the ${FIRST.name}.`);
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
      if (left.abandoned) say(`Pour stopped. Attempt not scored. Return to ${BY_ID[left.id].name} to try again.`);
      const card = hub.querySelector(`[data-station="${left.id}"]`);
      if (card) card.focus({ preventScroll: true });
    }
  }

  // Upright phones: a "turn sideways" prompt, which can be
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
