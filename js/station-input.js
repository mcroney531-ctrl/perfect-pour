// Station input: the continuous pad and the keyboard, shared by the stations
// (docs/shared-station-ui.md, step 3). Moved here unchanged from the
// Hefeweizen station and the Pilsner station's continuous control: same
// gestures, dead zone, travel, keys and safety stops. What a station does
// beyond that stays in the station: Pilsner's staged, slider and switch
// variants come in through the hooks; the glass switch's click handler and
// everything the sim does with the target stay with the station.
// Classic script; publishes RiversideStationInput. Loaded before any station.
(function (global) {
  'use strict';

  // opts:
  //   pad, tapModeBox, toggle   the pad button, the tap-mode checkbox, the glass switch
  //   ctl, padTarget            control feel and the thumb-to-angle mapping (the station's)
  //   on                        the station's tracked listener (kit lifecycle), for window/document
  //   locked()                  true while the controls must not act (Watch, or after Serve)
  //   watching()                true in Watch (S does not serve)
  //   serve(), restart()        the S and R keys
  //   onStraighten(via)         the glass target may have come up ('slide' | 'key'); the station decides what that means
  //   focusExempt               selector of a panel whose buttons keep focus after a pointer click (Pilsner: '#debug')
  //   hooks (optional; return true when the station handled it, so the shared path does nothing):
  //     padMove(dy, drag)       a pad drag moved (dy px up since it landed)
  //     arrow(key, event)       an arrow key
  //     skipT()                 the T key does nothing at all
  function pad({ pad, tapModeBox, toggle, ctl, padTarget, on, locked, watching, serve, restart, onStraighten,
    focusExempt = null, hooks = {} }) {
    // Pour flags stay separate (pointer, key, latch) so releasing one never
    // cancels another mid-pour.
    const input = { pointer: false, key: false, latch: false, target: 0 };
    let activePointer = null, drag = null, tapMode = false;

    function stop() {
      input.pointer = input.key = input.latch = false;
      drag = null;
      if (activePointer !== null) {
        try { pad.releasePointerCapture(activePointer); } catch (_) { /* already gone */ }
        activePointer = null;
      }
    }
    const setTarget = v => { input.target = Math.max(0, Math.min(ctl.maxAngle, Math.round(v * 10) / 10)); };

    // Pad gestures. Thumb movement is measured from where it landed, with a
    // dead zone, so resting a thumb does not nudge the glass.
    pad.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      if (locked()) return;
      activePointer = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch (_) { /* pointer already released */ }
      drag = { y0: e.clientY, angle0: input.target, moved: false };
      if (!tapMode) input.pointer = true;
    });
    pad.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== activePointer || locked()) return;
      const dy = drag.y0 - e.clientY;                      // up is positive
      if (Math.abs(dy) > ctl.padDead) drag.moved = true;
      if (hooks.padMove && hooks.padMove(dy, drag)) return;
      if (drag.moved) { setTarget(padTarget(drag.angle0, dy, ctl)); onStraighten('slide'); }
    });
    const endPointer = e => {
      if (e.pointerId !== activePointer) return;
      if (tapMode && drag && !drag.moved && e.type === 'pointerup' && !locked()) input.latch = !input.latch;
      input.pointer = false;
      activePointer = null;
      drag = null;
    };
    pad.addEventListener('pointerup', endPointer);
    pad.addEventListener('pointercancel', endPointer);
    pad.addEventListener('lostpointercapture', endPointer);
    pad.addEventListener('contextmenu', e => e.preventDefault());

    // A click with no pointer press just before it came from assistive tech;
    // those cannot hold, so it toggles. Pointerup counts as pointer activity
    // too, or the click ending a long hold would latch the tap open.
    let lastPointerAt = -Infinity;
    const notePointer = () => { lastPointerAt = performance.now(); };
    on(document, 'pointerdown', notePointer, true);
    on(document, 'pointerup', notePointer, true);
    const fromPointer = () => performance.now() - lastPointerAt < 1000;
    pad.addEventListener('click', () => { if (!fromPointer() && !locked()) input.latch = !input.latch; });

    tapModeBox.addEventListener('change', e => { tapMode = e.target.checked; stop(); });

    const isTyping = el => el && (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable ||
      (el.tagName === 'INPUT' && el.type !== 'range' && el.type !== 'checkbox'));
    const isOtherControl = el => el && el !== pad &&
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
        if (hooks.arrow && hooks.arrow(k, e)) return;
        // Up and Left bring the glass up, matching the pad's slide-up.
        e.preventDefault();
        if (locked()) return;
        setTarget(input.target + (k === 'ArrowUp' || k === 'ArrowLeft' ? -5 : 5));
        onStraighten('key');
      } else if (k === 't' || k === 'T') {
        if (hooks.skipT && hooks.skipT()) return;
        e.preventDefault();
        if (!locked()) toggle.click();
      } else if ((k === 's' || k === 'S') && !watching()) {
        e.preventDefault(); serve();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault(); restart();
      }
    });

    // Pointer clicks drop focus, so Space pours rather than re-pressing the
    // button just clicked; keyboard activation keeps focus where it was.
    on(document, 'click', e => {
      const b = e.target.closest && e.target.closest('button');
      if (b && b !== pad && fromPointer() && !(focusExempt && b.closest(focusExempt))) setTimeout(() => {
        if (document.activeElement === b) b.blur();
      }, 0);
    });

    on(window, 'keyup', e => {
      if ((e.key === ' ' || e.key === 'Enter') && input.key) { input.key = false; e.preventDefault(); }
    });

    // Never leave the tap open behind the player's back.
    on(window, 'blur', stop);
    on(window, 'pagehide', stop);
    on(document, 'visibilitychange', () => { if (document.hidden) stop(); });

    return {
      input,                                     // { pointer, key, latch, target }: read by the station's loop and UI
      setTarget, stop,
      tapMode: () => tapMode,
      pouring: () => input.pointer || input.key || input.latch
    };
  }

  global.RiversideStationInput = { pad };
})(window);
