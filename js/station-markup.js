// Station markup: the panel, result sheet and live region every station
// shares, around the station's own stage (docs/shared-station-ui.md, step 2).
// Structure only: it builds markup strings and nothing else. Behaviour
// (input, result actions, focus, modes) stays in each station, and so does
// the stage (glass, beer, overlays). Built from the Pilsner station's markup
// unchanged, so both stations keep the same ids the station styles and the
// in-frame layout rely on.
// Classic script; publishes RiversideStationMarkup. Loaded before any station.
(function (global) {
  'use strict';

  // Slots (strings; each is inserted as given, with its own indentation):
  //   brand          the small line under "Perfect Pour" in the header
  //   headerExtra    controls between the brand and the mode tabs (Pilsner: debug toggle)
  //   stage          the station's scene, inside #stage
  //   angleExtra     controls before the glass switch (Pilsner: the v1 slider)
  //   toggleHidden   start with the glass switch hidden (Pilsner: its variants decide)
  //   pourHelp       what the pad, keys and switch do, for assistive tech
  //   watchExtra     Watch buttons between Replay and Skip (Hefeweizen: a calmer pour)
  //   transcriptNote the note under the Watch steps
  //   resultNote     the fine print on the result sheet
  //   after          anything after the live region (Pilsner: the debug panel)
  function station({ brand, headerExtra = '', stage, angleExtra = '', toggleHidden = false, pourHelp,
    watchExtra = '', transcriptNote, resultNote, after = '' }) {
    return `
<div id="app">
  <header>
    <div class="brand">Perfect Pour<small>${brand}</small></div>
${headerExtra}    <nav id="modes" aria-label="Mode">
      <button type="button" data-mode="watch">Watch</button>
      <button type="button" data-mode="guided">Guided</button>
      <button type="button" data-mode="solo">Solo</button>
    </nav>
  </header>

  <p id="caption"></p>

  <div id="stage">
${stage}  </div>

  <section id="controls" aria-label="Pour controls">
    <div id="angleCtl">
${angleExtra}      <div id="toggleWrap"${toggleHidden ? ' hidden' : ''}>
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
    <p id="pourHelp" class="sr-only">${pourHelp}</p>

    <div id="actions">
      <button type="button" id="serve" disabled>Serve<kbd>S</kbd></button>
      <button type="button" id="restart">Restart<kbd>R</kbd></button>
    </div>

    <div id="ghostActions" hidden>
      <button type="button" id="replay">Replay</button>
${watchExtra}      <button type="button" id="skip">Skip to Guided</button>
    </div>
    <div id="transcriptBox" hidden>
      <span id="transcriptTitle">Steps in this demo</span>
      <ol id="transcript" aria-labelledby="transcriptTitle"></ol>
      <p class="fineprint">${transcriptNote}</p>
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
  <p class="fineprint">${resultNote}</p>
  <div id="resultActions"></div>
</section>

<div id="live" class="sr-only" aria-live="polite" aria-atomic="true"></div>
${after}`;
  }

  global.RiversideStationMarkup = { station };
})(window);
