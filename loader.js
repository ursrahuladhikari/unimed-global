/**
 * ============================================================
 *  UNIMED GLOBAL — First-Visit Splash Loader
 *  ============================================================
 *  HOW TO USE:    <script src="loader.js"></script>  (first in <head>)
 *  HOW TO REMOVE: Delete/comment out that script tag.
 *
 *  BEHAVIOUR:
 *    - Shows ONCE per browser session on the very first page load.
 *    - On index.html: stays visible until 3D globe assets finish
 *      loading (app.js calls window.__unimedLoader.hide()).
 *    - On other pages: auto-hides when window.load fires.
 *    - After the splash: ZERO loading animation anywhere —
 *      tab switches, menu clicks, page navigation — all instant.
 *
 *  GLOBAL API (for app.js to drive the loader):
 *    window.__unimedLoader.setProgress(0-100)  — update % counter
 *    window.__unimedLoader.hide()              — dismiss loader
 * ============================================================
 */

(function () {
  'use strict';

  // ── Only run loader on home page (index.html or root /) ─────────
  var pathname = window.location.pathname.toLowerCase();
  var isHomePage = pathname.endsWith('index.html') || pathname.endsWith('/') || pathname === '' || pathname.endsWith('\\index.html');
  if (!isHomePage) {
    window.__unimedLoader = { setProgress: function(){}, hide: function(){} };
    return;
  }

  var SESSION_KEY = 'unimed_splash_done';

  // ── Already shown this session → expose no-op API and exit ─
  if (sessionStorage.getItem(SESSION_KEY)) {
    window.__unimedLoader = { setProgress: function(){}, hide: function(){} };
    return;
  }

  // Mark shown immediately (before any navigation)
  sessionStorage.setItem(SESSION_KEY, '1');

  // ── Inject CSS ──────────────────────────────────────────────
  var style = document.createElement('style');
  style.id = 'unimedLoaderStyles';
  style.textContent = `
    #unimedLoader {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      background: #060d1a;
      font-family: 'Outfit', 'Inter', sans-serif;
      opacity: 0;
      visibility: visible;
      transition: opacity 0.35s ease;
    }

    #unimedLoader.visible {
      opacity: 1;
    }

    #unimedLoader.fade-out {
      opacity: 0 !important;
      pointer-events: none;
      transition: opacity 0.5s ease;
    }

    /* Radial glow backdrop */
    #unimedLoader::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 55% 45% at 50% 50%, rgba(0,242,254,0.09) 0%, transparent 70%),
        radial-gradient(ellipse 80% 60% at 25% 75%, rgba(59,130,246,0.07) 0%, transparent 70%);
      pointer-events: none;
    }

    /* ── Logo ring ── */
    #unimedLoaderLogoWrap {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: ulLogoPop 0.55s cubic-bezier(0.16,1,0.3,1) both;
    }

    #unimedLoaderLogoWrap::before {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 1.5px solid rgba(0,242,254,0.35);
      animation: ulRingPulse 1.8s ease-in-out infinite;
    }

    #unimedLoaderLogoWrap::after {
      content: '';
      position: absolute;
      inset: -20px;
      border-radius: 50%;
      border: 1.5px solid rgba(59,130,246,0.2);
      animation: ulRingPulse 1.8s ease-in-out infinite;
      animation-delay: 0.4s;
    }

    #unimedLoaderLogo {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid rgba(0,242,254,0.25);
      box-shadow: 0 0 28px rgba(0,242,254,0.22);
      display: block;
    }

    /* ── Brand ── */
    #unimedLoaderBrand {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      animation: ulFadeUp 0.5s 0.15s cubic-bezier(0.16,1,0.3,1) both;
    }

    #unimedLoaderName {
      font-size: clamp(1.5rem, 5vw, 2rem);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
      background: linear-gradient(135deg, #ffffff 25%, #00f2fe 60%, #3b82f6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    #unimedLoaderTagline {
      font-size: 0.7rem;
      font-weight: 600;
      color: rgba(148,163,184,0.8);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    /* ── Progress section ── */
    #unimedLoaderProgressWrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: clamp(180px, 44vw, 260px);
      animation: ulFadeUp 0.5s 0.25s cubic-bezier(0.16,1,0.3,1) both;
    }

    /* Circular spinner */
    #unimedSpinnerWrap {
      position: relative;
      width: 68px;
      height: 68px;
    }

    #unimedSpinnerSvg {
      width: 68px;
      height: 68px;
      transform: rotate(-90deg);
    }

    #unimedSpinnerTrack {
      fill: none;
      stroke: rgba(255,255,255,0.06);
      stroke-width: 5;
    }

    #unimedSpinnerFill {
      fill: none;
      stroke: url(#ulGrad);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-dasharray: 188.5;
      stroke-dashoffset: 188.5;
      transition: stroke-dashoffset 0.25s ease;
      filter: drop-shadow(0 0 5px rgba(0,242,254,0.6));
    }

    #unimedSpinnerPct {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 800;
      color: #00f2fe;
      letter-spacing: -0.02em;
    }

    /* Linear bar */
    #unimedLoaderBarWrap {
      width: 100%;
      height: 3px;
      background: rgba(255,255,255,0.07);
      border-radius: 999px;
      overflow: hidden;
    }

    #unimedLoaderBar {
      height: 100%;
      width: 0%;
      border-radius: 999px;
      background: linear-gradient(90deg, #00f2fe, #3b82f6);
      box-shadow: 0 0 8px rgba(0,242,254,0.55);
      transition: width 0.25s ease;
    }

    /* Typewriter line */
    #unimedLoaderTypewriter {
      font-size: clamp(0.76rem, 2.5vw, 0.9rem);
      font-weight: 600;
      color: #00f2fe;
      letter-spacing: 0.05em;
      min-height: 1.5em;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 16px;
      margin-top: 2px;
      animation: ulFadeUp 0.5s 0.35s cubic-bezier(0.16,1,0.3,1) both;
      text-shadow: 0 0 12px rgba(0, 242, 254, 0.4);
    }

    .unimed-cursor {
      display: inline-block;
      width: 2px;
      height: 1.15em;
      background-color: #00f2fe;
      margin-left: 3px;
      animation: unimedCursorBlink 0.65s infinite;
      vertical-align: middle;
      box-shadow: 0 0 8px rgba(0, 242, 254, 0.8);
    }

    @keyframes unimedCursorBlink {
      0%, 100% { opacity: 1; }
      50%      { opacity: 0; }
    }

    /* ── Dots ── */
    #unimedLoaderDots {
      display: flex;
      gap: 6px;
      animation: ulFadeUp 0.5s 0.4s cubic-bezier(0.16,1,0.3,1) both;
    }

    #unimedLoaderDots span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: rgba(0,242,254,0.65);
      animation: ulDotBounce 1.1s ease-in-out infinite;
      display: block;
    }

    #unimedLoaderDots span:nth-child(2) { animation-delay: 0.16s; }
    #unimedLoaderDots span:nth-child(3) { animation-delay: 0.32s; }

    /* ── Keyframes ── */
    @keyframes ulLogoPop {
      from { opacity: 0; transform: scale(0.72); }
      to   { opacity: 1; transform: scale(1); }
    }

    @keyframes ulFadeUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes ulRingPulse {
      0%, 100% { opacity: 0.35; transform: scale(1); }
      50%      { opacity: 0.85; transform: scale(1.07); }
    }

    @keyframes ulDotBounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
      40%            { transform: translateY(-6px); opacity: 1; }
    }

    body.unimed-loading { overflow: hidden !important; }
  `;
  document.head.appendChild(style);

  // ── Build loader HTML ───────────────────────────────────────
  var loader = document.createElement('div');
  loader.id = 'unimedLoader';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-label', 'Loading UNIMED Global');
  loader.innerHTML = `
    <svg width="0" height="0" style="position:absolute">
      <defs>
        <linearGradient id="ulGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#00f2fe"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
    </svg>

    <div id="unimedLoaderLogoWrap">
      <img id="unimedLoaderLogo"
           src="assets/common/logo.png"
           alt="UNIMED Global Logo"
           onerror="this.style.display='none'">
    </div>

    <div id="unimedLoaderBrand">
      <div id="unimedLoaderName">UNIMED Global</div>
      <div id="unimedLoaderTagline">Guiding Future Doctors</div>
    </div>

    <div id="unimedLoaderProgressWrap">
      <div id="unimedSpinnerWrap">
        <svg id="unimedSpinnerSvg" viewBox="0 0 68 68">
          <circle id="unimedSpinnerTrack" cx="34" cy="34" r="30"/>
          <circle id="unimedSpinnerFill"  cx="34" cy="34" r="30"/>
        </svg>
        <div id="unimedSpinnerPct">0%</div>
      </div>
      <div id="unimedLoaderBarWrap">
        <div id="unimedLoaderBar"></div>
      </div>
    </div>

    <div id="unimedLoaderTypewriter">
      <span id="unimedTypewriterText"></span><span class="unimed-cursor"></span>
    </div>

    <div id="unimedLoaderDots">
      <span></span><span></span><span></span>
    </div>
  `;

  // ── Internal state ──────────────────────────────────────────
  var CIRCUMFERENCE = 188.5;
  var currentPct   = 0;
  var rafId        = null;
  var dismissed    = false;
  var mountTime    = null;
  var MIN_DISPLAY  = 2500; // ms — holds splash screen for at least 2.5 seconds

  // Status messages at different progress thresholds
  var STATUS_MSGS = [
    [0,  'Initializing…'],
    [15, 'Loading assets…'],
    [40, 'Building scene…'],
    [70, 'Rendering globe…'],
    [90, 'Almost ready…'],
    [99, 'Done!']
  ];

  function getStatusMsg(pct) {
    var msg = STATUS_MSGS[0][1];
    for (var i = 0; i < STATUS_MSGS.length; i++) {
      if (pct >= STATUS_MSGS[i][0]) msg = STATUS_MSGS[i][1];
    }
    return msg;
  }

  // ── Apply progress to DOM ───────────────────────────────────
  function applyProgress(pct) {
    pct = Math.min(100, Math.max(0, Math.round(pct)));
    var bar   = document.getElementById('unimedLoaderBar');
    var fill  = document.getElementById('unimedSpinnerFill');
    var label = document.getElementById('unimedSpinnerPct');
    if (bar)   bar.style.width = pct + '%';
    if (fill)  fill.style.strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * pct / 100);
    if (label) label.textContent = pct + '%';
  }

  // ── Smooth animate to a target percentage ──────────────────
  function animateTo(target, onDone) {
    if (rafId) cancelAnimationFrame(rafId);
    function step() {
      var diff = target - currentPct;
      if (Math.abs(diff) < 0.4) {
        currentPct = target;
        applyProgress(target);
        if (onDone) onDone();
        return;
      }
      currentPct += diff * 0.09;
      applyProgress(currentPct);
      rafId = requestAnimationFrame(step);
    }
    step();
  }

  // ── Typewriter Effect ──────────────────────────────────────
  var typewriterPhrase = "Empowering Your Journey to Become a Doctor…";
  var charIdx          = 0;

  function startTypewriter() {
    var textEl = document.getElementById('unimedTypewriterText');
    if (!textEl) return;
    textEl.textContent = '';
    charIdx = 0;

    function typeChar() {
      if (dismissed) return;
      if (charIdx < typewriterPhrase.length) {
        textEl.textContent += typewriterPhrase.charAt(charIdx);
        charIdx++;
        setTimeout(typeChar, 42); // 42ms per character
      }
    }

    setTimeout(typeChar, 250);
  }

  // ── Mount loader ────────────────────────────────────────────
  function mountLoader() {
    mountTime = Date.now();
    document.body.classList.add('unimed-loading');
    document.body.insertBefore(loader, document.body.firstChild);

    // Reveal after 2 RAF frames — entire loader appears as one unit
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        loader.classList.add('visible');
        startTypewriter();
      });
    });
  }

  if (document.body) {
    mountLoader();
  } else {
    document.addEventListener('DOMContentLoaded', mountLoader);
  }

  // ── Public API: app.js calls these to control the loader ───
  function publicSetProgress(pct) {
    if (dismissed) return;
    animateTo(pct);
  }

  function publicHide() {
    if (dismissed) return;

    var elapsed   = mountTime ? Date.now() - mountTime : MIN_DISPLAY;
    var remaining = Math.max(0, MIN_DISPLAY - elapsed);

    setTimeout(function () {
      if (dismissed) return;
      dismissed = true;
      if (rafId) cancelAnimationFrame(rafId);

      // Animate to 100% then fade out
      currentPct = currentPct || 0;
      animateTo(100, function () {
        setTimeout(function () {
          loader.classList.add('fade-out');
          document.body.classList.remove('unimed-loading');
          setTimeout(function () {
            if (loader.parentNode) loader.remove();
            if (style.parentNode)  style.remove();
          }, 550);
        }, 400);
      });
    }, remaining);
  }

  // Expose globally so app.js can drive the loader
  window.__unimedLoader = {
    setProgress: publicSetProgress,
    hide:        publicHide
  };

  // ── Fallback: auto-hide on window.load for non-3D pages ────
  // (index.html will call publicHide() via app.js before this fires)
  if (document.readyState === 'complete') {
    publicHide();
  } else {
    window.addEventListener('load', publicHide);
  }

  // Hard fail-safe: always gone within 8s
  setTimeout(publicHide, 8000);

})();
