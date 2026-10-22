// Training progress, saved on this device. Versioned so a later shape can be
// migrated instead of misread. Classic script; publishes RiversideProgress.
(function (global) {
  'use strict';
  const KEY = 'riverside.progress';
  const VERSION = 1;
  const IDS = ['pilsner', 'hefeweizen', 'stout'];
  // status: new -> inProgress (first time the station is opened) -> certified (M6)
  // seen: one-time screens already shown (the landing, each station's intro).
  // Added in M4 without a version bump: older saved data simply has none yet.

  function blank() {
    const stations = {};
    IDS.forEach(id => { stations[id] = { status: 'new', attempts: 0, passes: 0, abandoned: 0, lastPlayed: null }; });
    return { version: VERSION, stations, seen: {} };
  }

  // Unreadable or wrong-shaped data starts fresh. Data from a newer version
  // is left alone on disk (read-only here) so an old tab can't clobber it.
  let readOnly = false;
  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (_) { d = null; }
    if (d && typeof d.version === 'number' && d.version > VERSION) { readOnly = true; return blank(); }
    if (d && d.version === VERSION && d.stations && IDS.every(id => d.stations[id] && d.stations[id].status)) {
      if (!d.seen || typeof d.seen !== 'object') d.seen = {};
      return d;
    }
    return blank();
  }
  let data = load();

  function save() {
    if (readOnly) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* private mode: progress lasts this visit */ }
  }
  function touch(id, fn) {
    const s = data.stations[id];
    if (!s) return;
    fn(s);
    s.lastPlayed = new Date().toISOString();
    save();
  }

  global.RiversideProgress = {
    KEY, VERSION, IDS,
    station: id => Object.assign({}, data.stations[id]),
    certifiedCount: () => IDS.filter(id => data.stations[id].status === 'certified').length,
    markEntered: id => touch(id, s => { if (s.status === 'new') s.status = 'inProgress'; }),
    recordServed: (id, pass) => touch(id, s => { s.attempts++; if (pass) s.passes++; }),
    recordAbandoned: id => touch(id, s => { s.abandoned++; }),
    // M6: certification is awarded once and never revoked by later pours.
    // Returns true only the first time (idempotent; callers decide when).
    certify: id => {
      const s = data.stations[id];
      if (!s || s.status === 'certified') return false;
      touch(id, st => { st.status = 'certified'; st.certifiedAt = new Date().toISOString(); });
      return true;
    },
    seen: key => !!data.seen[key],
    markSeen: key => { if (!data.seen[key]) { data.seen[key] = true; save(); } },
    reload: () => { readOnly = false; data = load(); },
    reset: () => { data = blank(); save(); }
  };
})(window);
