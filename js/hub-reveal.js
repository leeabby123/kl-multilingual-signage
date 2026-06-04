/* ============================================================
   hub-reveal.js — Progressive reveal animation (poppyfield-style)

   ~7-second cascade when user first lands on hub.html in a session:
     0.0s   Map background paths visible from start (no animation)
     0.5s   Findings + map labels fade in
     0.8s   8 finding buttons fade in (150ms stagger each)
     2.2s   60 clusters fade in by district (KB→PS→BB→LI, 60ms stagger)
     6.3s   Language switcher (5-hibiscus) fades in last

   FOUC prevention: <head> sets html.hub-animating *synchronously* before
   CSS loads, so opacity:0 applies instantly. If JS is disabled, elements
   stay visible (no .hub-animating means default opacity:1).

   Once-per-session: sessionStorage gate skips the animation on subsequent
   visits within the same browser session. Escape key skips to final state.
   ============================================================ */
(function() {
  'use strict';

  const SESSION_KEY = 'hub-reveal-played';
  const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Skip animation if: already played this session, OR user prefers reduced motion
  const shouldSkip = sessionStorage.getItem(SESSION_KEY) === '1' || PREFERS_REDUCED;

  function revealAll() {
    document.querySelectorAll(
      '.hub-findings-label, .hub-map-label, .finding-btn, .cluster, .lang-switcher'
    ).forEach(el => el.classList.add('hub-revealed'));
    document.documentElement.classList.remove('hub-animating');
  }

  if (shouldSkip) {
    // Either skip flag or first paint already done in head — just reveal everything
    revealAll();
    return;
  }

  // Timeline of staggered reveals
  const timeouts = [];
  function later(ms, fn) { timeouts.push(setTimeout(fn, ms)); }

  function startCascade() {
    // Phase 1: labels (0.5s)
    later(500, () => {
      document.querySelectorAll('.hub-findings-label, .hub-map-label')
        .forEach(el => el.classList.add('hub-revealed'));
    });

    // Phase 2: 8 finding buttons (0.8s + 150ms stagger)
    const findings = document.querySelectorAll('.finding-btn');
    findings.forEach((btn, i) => {
      later(800 + i * 150, () => btn.classList.add('hub-revealed'));
    });

    // Phase 3: 60 clusters by district order, within each by DOM order
    const districts = ['KB', 'PS', 'BB', 'LI'];
    let clusterIndex = 0;
    districts.forEach(dist => {
      const clusters = document.querySelectorAll(`.cluster[data-district="${dist}"]`);
      clusters.forEach(c => {
        later(2200 + clusterIndex * 60, () => c.classList.add('hub-revealed'));
        clusterIndex++;
      });
    });

    // Phase 4: language switcher (6.3s, after all clusters done at ~5.8s)
    later(6300, () => {
      document.querySelector('.lang-switcher')?.classList.add('hub-revealed');
    });

    // Animation complete: drop the html class so any new elements added later
    // (e.g. dynamic markers) default to opacity:1 instead of 0
    later(7100, () => {
      document.documentElement.classList.remove('hub-animating');
      sessionStorage.setItem(SESSION_KEY, '1');
    });
  }

  // Skip on Escape key — user controls pacing
  function onSkipKey(e) {
    if (e.key === 'Escape') {
      timeouts.forEach(t => clearTimeout(t));
      revealAll();
      sessionStorage.setItem(SESSION_KEY, '1');
      document.removeEventListener('keydown', onSkipKey);
    }
  }
  document.addEventListener('keydown', onSkipKey);

  // Start after page paint settles
  if (document.readyState === 'complete') {
    startCascade();
  } else {
    window.addEventListener('load', startCascade, { once: true });
  }
})();
