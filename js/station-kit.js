// Station kit: the plumbing every station runs on, moved here unchanged from
// the Pilsner and Hefeweizen stations (docs/shared-station-ui.md, step 1).
// Logic only: no markup, no beer. Each station still owns its sim, renderer,
// controls, coaching, result sheet and what goes into its log.
// Classic script; publishes RiversideStationKit. Loaded before any station,
// on both entry points (index.html, the brewery, and the legacy pilsner.html).
(function (global) {
  'use strict';

  // Listeners on window and document, tracked so unmount can take every one
  // back out, and the station's alive flag.
  function lifecycle() {
    const disposers = [];
    let alive = true;
    return {
      get alive() { return alive; },
      on(target, type, fn, options) {
        target.addEventListener(type, fn, options);
        disposers.push(() => target.removeEventListener(type, fn, options));
      },
      // The first call ends the station and returns true; later calls false.
      end() { if (!alive) return false; alive = false; return true; },
      dispose() { disposers.splice(0).forEach(off => off()); }
    };
  }

  // Polite live-region speech. Messages queued within 80 ms are spoken as
  // one, in order; the region is emptied first so a repeat is re-read.
  function announcer(live) {
    let pending = [], flushTimer = null;
    return {
      say(msg) {
        pending.push(msg);
        if (flushTimer) return;
        live.textContent = '';
        flushTimer = setTimeout(() => {
          live.textContent = pending.join(' ');
          pending = []; flushTimer = null;
        }, 80);
      },
      // Unmount: drop whatever is still queued.
      cancel() { clearTimeout(flushTimer); }
    };
  }

  // The caption line: plain, a hint, or a verdict. Text is only written when
  // it changes (el._t), as the stations' own setText does.
  function caption(el) {
    return (text, kind) => {
      const v = text || '';
      if (el._t !== v) { el._t = v; el.textContent = v; }
      el.classList.toggle('hint', kind === 'hint');
      el.classList.toggle('verdict', kind === 'verdict');
    };
  }

  // Fixed-step loop: sim ticks at `step` seconds, however the frames fall
  // (at most 0.25 s caught up per frame), then one draw per frame. The clock
  // starts when the loop is made, as the stations' inline loops did.
  function loop(step, tick, draw) {
    let acc = 0, last = performance.now(), rafId = 0, running = false;
    function frame(now) {
      if (!running) return;
      acc += Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      while (acc >= step) { tick(); acc -= step; }
      draw();
      rafId = requestAnimationFrame(frame);
    }
    return {
      start() { running = true; rafId = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(rafId); }
    };
  }

  // A capped list in localStorage: the transport for a station's pour log.
  // The station decides the key, the cap and every field of an entry.
  function logStore(key, cap) {
    return {
      key,
      read() { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; } },
      write(list) { try { localStorage.setItem(key, JSON.stringify(list.slice(-cap))); return true; } catch (_) { return false; } }
    };
  }

  global.RiversideStationKit = { lifecycle, announcer, caption, loop, logStore };
})(window);
