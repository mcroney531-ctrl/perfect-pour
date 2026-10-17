// Riverside brewery app (M3): the U-shaped bar hub and navigation between
// it and the stations. The hub is a list of real buttons laid over an
// illustration, so it works by keyboard and screen reader; the router is
// hash-based (#/ and #/pilsner) so the browser's back button works and the
// page still opens from disk. Stations are mounted and unmounted whole.
(function () {
  'use strict';
  const P = window.RiversideProgress;

  // The three stations around the U, in teaching order. Only the Pilsner has
  // a simulation; the others are shown, clearly not playable, until theirs exist.
  const STATIONS = [
    { id: 'pilsner', name: 'Pilsner', sub: 'Foundation pour', glass: 'pils', playable: true, badge: '#a5392b',
      card: 'left:3%;top:40%', spot: [64, 360] },
    { id: 'hefeweizen', name: 'Hefeweizen', sub: 'Transfer pour', glass: 'hefe', playable: false, badge: '#c7802a',
      card: 'left:50%;top:12%;transform:translateX(-50%)', spot: [195, 205] },
    { id: 'stout', name: 'Nitro Stout', sub: 'Two-step pour', glass: 'stout', playable: false, badge: '#1c1410',
      card: 'right:3%;top:58%', spot: [343, 455] }
  ];
  const BY_ID = Object.fromEntries(STATIONS.map(s => [s.id, s]));
  const CHIP = {
    new: ['pp-chip--new', 'Start here'],
    inProgress: ['pp-chip--progress', 'In progress'],
    certified: ['pp-chip--certified', 'Certified'],
    preview: ['pp-chip--preview', 'Coming soon']
  };

  const root = document.getElementById('app-root');
  root.innerHTML = `
    <div class="hub" id="hub">
      <header class="hub__top">
        <svg class="hub__emblem" aria-hidden="true"><use href="#pp-emblem"/></svg>
        <div class="hub__titles">
          <p class="pp-label">Riverside Brewing Co.</p>
          <h1 class="pp-display hub__title" id="hubTitle" tabindex="-1">The Bar</h1>
        </div>
        <p class="hub__score"><b id="hubCount">0</b> of 3<span>certified</span></p>
      </header>
      <p class="hub__lede" id="hubLede"></p>
      <div class="hub__stage">
        ${hubArt()}
        <ol class="hub__stations" aria-label="Stations">
          ${STATIONS.map(s => `
            <li style="${s.card}">
              <button type="button" class="pp-station pp-panel hub__card" data-station="${s.id}"
                ${s.playable ? '' : 'aria-disabled="true"'} aria-describedby="chip-${s.id}">
                <svg class="pp-station__art" aria-hidden="true"><use href="#pp-glass-${s.glass}"/></svg>
                <span class="pp-station__name">${s.name}</span>
                <span class="pp-station__sub">${s.sub}</span>
                <span class="pp-chip" id="chip-${s.id}"></span>
              </button>
            </li>`).join('')}
          <li class="hub__rush-item">
            <button type="button" class="pp-panel hub__rush" id="rushBtn" aria-disabled="true" aria-describedby="rushChip">
              <span class="hub__rush-name">Final Rush</span>
              <span class="pp-chip pp-chip--locked" id="rushChip">Locked: earn all 3</span>
            </button>
          </li>
        </ol>
      </div>
      <p class="hub__notice" id="hubNotice" role="status" aria-live="polite"></p>
    </div>
    <div id="stationHost"></div>`;

  const hub = document.getElementById('hub');
  const stationHost = document.getElementById('stationHost');
  const notice = document.getElementById('hubNotice');
  let current = null;        // { id, station } while a station is mounted
  let cameFromHub = false;   // so "Back to the bar" can step back in history
  let noticeTimer = 0;

  function say(text) {
    clearTimeout(noticeTimer);
    notice.textContent = text;
    if (text) noticeTimer = setTimeout(() => { notice.textContent = ''; }, 6000);
  }

  // ---- Hub ----
  function renderHub() {
    STATIONS.forEach(s => {
      const state = s.playable ? P.station(s.id).status : 'preview';
      const btn = hub.querySelector(`[data-station="${s.id}"]`);
      const chip = document.getElementById('chip-' + s.id);
      chip.className = 'pp-chip ' + CHIP[state][0];
      chip.textContent = CHIP[state][1];
      btn.classList.toggle('is-recommended', state === 'new');
      btn.classList.toggle('is-preview', state === 'preview');
      const ring = hub.querySelector(`.hub-ring[data-ring="${s.id}"]`);
      ring.setAttribute('class', `hub-ring hub-ring--${state}` + (state === 'new' ? ' is-recommended' : ''));
    });
    const n = P.certifiedCount();
    document.getElementById('hubCount').textContent = n;
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
    location.hash = '#/' + s.id;
    route();   // open now; the hashchange that follows finds it already open
  });

  // ---- Stations ----
  function openStation(id) {
    hub.hidden = true;
    P.markEntered(id);
    const station = PilsnerStation.mount(stationHost, {
      onExit: leaveStation,
      onEvent(type, d) {
        if (type === 'served') P.recordServed(id, d.pass);
        if (type === 'abandoned') P.recordAbandoned(id);
      }
    });
    current = { id, station };
    document.title = `${BY_ID[id].name} station · Riverside Brewing Co.`;
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
    const { abandoned } = station.unmount('navigate');
    return { id, abandoned };
  }

  // ---- Router ----
  function route() {
    const id = (location.hash.match(/^#\/([a-z-]+)$/) || [])[1] || '';
    if (current && current.id === id) return;
    const left = closeStation();
    if (id && BY_ID[id] && BY_ID[id].playable) return openStation(id);
    if (id && !(location.hash === '#/' || location.hash === '')) {
      history.replaceState(null, '', '#/');
      if (BY_ID[id]) say(`${BY_ID[id].name} is coming soon. Start with the Pilsner.`);
    }
    showHub(left);
  }

  function showHub(left) {
    cameFromHub = false;
    renderHub();
    hub.hidden = false;
    document.title = 'The Bar · Riverside Brewing Co.';
    if (left) {
      if (left.abandoned) say("Pour stopped. That attempt wasn't scored; you'll start fresh next time.");
      const card = hub.querySelector(`[data-station="${left.id}"]`);
      if (card) card.focus({ preventScroll: true });
    }
  }

  addEventListener('hashchange', route);
  route();

  // For tests and debugging.
  window.ppBrewery = { current: () => current && current.id, progress: P };

  // ---- Illustration (placeholder art; final art needs separate approval) ----
  function hubArt() {
    const towers = STATIONS.map(s => {
      const [x, y] = s.spot, dim = s.playable ? 1 : 0.5;
      return `
        <ellipse class="hub-glow" cx="${x}" cy="${y}" rx="78" ry="46" fill="url(#hubGlow)" opacity="${s.playable ? 0.9 : 0.45}"/>
        <ellipse class="hub-ring" data-ring="${s.id}" cx="${x}" cy="${y + 4}" rx="30" ry="8"/>
        <g opacity="${dim}">
          <rect x="${x - 6}" y="${y - 30}" width="12" height="30" rx="3" fill="url(#hubSteel)"/>
          <rect x="${x - 3.5}" y="${y - 48}" width="7" height="20" rx="2.5" fill="${s.badge}" stroke="#f2d9a6" stroke-width="0.8"/>
          <rect x="${x - 13}" y="${y - 2}" width="26" height="5" rx="2" fill="#5c6468"/>
        </g>`;
    }).join('');
    return `
      <svg class="hub__art" viewBox="0 0 390 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <linearGradient id="hubWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#161d1f"/><stop offset="1" stop-color="#0d1514"/>
          </linearGradient>
          <linearGradient id="hubWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#3f2a1b"/><stop offset="1" stop-color="#24170e"/>
          </linearGradient>
          <linearGradient id="hubCopper" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#3a2416"/><stop offset="0.5" stop-color="#9a5f35"/><stop offset="1" stop-color="#2c1b10"/>
          </linearGradient>
          <linearGradient id="hubSteel" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#5a6367"/><stop offset="0.45" stop-color="#c9d0d3"/><stop offset="1" stop-color="#4a5256"/>
          </linearGradient>
          <radialGradient id="hubGlow">
            <stop offset="0" stop-color="#ffb547" stop-opacity="0.32"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="hubPool" cx="0.5" cy="0" r="1">
            <stop offset="0" stop-color="#ffb547" stop-opacity="0.12"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="390" height="560" fill="url(#hubWall)"/>
        <!-- Back wall: tanks and a shelf, kept dim so the cards read. -->
        <g opacity="0.35">
          <rect x="4" y="40" width="58" height="150" rx="28" fill="url(#hubCopper)"/>
          <rect x="328" y="40" width="58" height="150" rx="28" fill="url(#hubCopper)"/>
        </g>
        <rect x="96" y="150" width="198" height="3" fill="#3a4245"/>
        <g fill="#24302c" opacity="0.8">
          ${[108, 122, 136, 150, 232, 246, 260, 274].map((x, i) => `<rect x="${x}" y="${128 - (i % 3) * 3}" width="9" height="${22 + (i % 3) * 3}" rx="3"/>`).join('')}
        </g>
        <!-- Pendants. -->
        <g stroke="#2a3336" stroke-width="1.2">
          <line x1="195" y1="0" x2="195" y2="26"/><line x1="70" y1="0" x2="70" y2="16"/><line x1="320" y1="0" x2="320" y2="16"/>
        </g>
        <g fill="#2b2f31">
          <path d="M183 26 h24 l6 10 h-36z"/><path d="M60 16 h20 l5 8 h-30z"/><path d="M310 16 h20 l5 8 h-30z"/>
        </g>
        <g fill="#ffd27a"><ellipse cx="195" cy="37" rx="8" ry="2"/><ellipse cx="70" cy="25" rx="6" ry="1.6"/><ellipse cx="320" cy="25" rx="6" ry="1.6"/></g>
        <rect width="390" height="300" fill="url(#hubPool)"/>
        <!-- Floor, then the U-shaped counter (seen from the open end). -->
        <rect y="180" width="390" height="380" fill="#090d0c"/>
        <path d="M108 228 L282 228 L320 560 L70 560 Z" fill="#0e1312"/>
        <path d="M60 180 L330 180 L400 560 L-10 560 Z M108 228 L70 560 L320 560 L282 228 Z" fill="url(#hubWood)" fill-rule="evenodd"/>
        <path d="M108 228 L282 228 L284 246 L106 246 Z" fill="#170f09"/>
        <path d="M108 228 L116 246 L86 560 L70 560 Z" fill="#170f09"/>
        <path d="M282 228 L274 246 L304 560 L320 560 Z" fill="#170f09"/>
        <path d="M-10 560 L60 180 L330 180 L400 560" fill="none" stroke="#6b4a2e" stroke-width="1.2"/>
        <path d="M70 560 L108 228 L282 228 L320 560" fill="none" stroke="#b9733f" stroke-width="1.6" stroke-opacity="0.85"/>
        ${towers}
      </svg>`;
  }
})();
