/* ============================================================
   hub-reveal.js — Progressive reveal animation (poppyfield-style)

   ~7-second cascade when user first lands on hub.html in a session:
     0.0s   Map background paths visible from start (no animation)
     0.5s   Findings + map labels fade in
     0.8s   8 finding buttons fade in (150ms stagger each)
     2.2s   60 clusters fade in — 4 districts START IN PARALLEL, each with its own
            pacing curve (KB ease-in, PS ease-out, BB smoothstep, LI linear). All
            districts finish together at ~6.2s, giving the 4 areas equal billing.
     6.3s   Language switcher (5-hibiscus) fades in last

   FOUC prevention: <head> sets html.hub-animating *synchronously* before
   CSS loads, so opacity:0 applies instantly. If JS is disabled, elements
   stay visible (no .hub-animating means default opacity:1).

   ─── Engine ──────────────────────────────────────────────────
   Frame-aligned rAF scheduler instead of setTimeout chain:
     · DOM changes happen just before next paint → no visual jitter
     · Elapsed time driven by performance.now() each frame → no drift
       (one frame's delay never accumulates into later items)
     · Tab visibility pause/resume: rAF auto-pauses on hidden tab;
       when user returns, the hidden duration is added to pausedTime
       so playback continues from where it left off (not jumped ahead)
     · One rAF loop scans the schedule array, vs ~72 setTimeout calls
       crowding the task queue

   Once-per-session: sessionStorage gate skips the animation on
   subsequent visits within the same browser session.
   Escape key skips to final state.
   ============================================================ */
(function() {
  'use strict';

  const SESSION_KEY = 'hub-reveal-played';
  const PREFERS_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shouldSkip = sessionStorage.getItem(SESSION_KEY) === '1' || PREFERS_REDUCED;

  function revealAll() {
    document.querySelectorAll(
      '.hub-findings-label, .hub-map-label, .finding-btn, .cluster, .lang-switcher'
    ).forEach(el => el.classList.add('hub-revealed'));
    document.documentElement.classList.remove('hub-animating');
  }

  if (shouldSkip) {
    revealAll();
    return;
  }

  /* ---- Build schedule array: { at: ms-from-start, action: fn, done: bool } ---- */
  const schedule = [];
  function add(at, action) { schedule.push({ at, action, done: false }); }

  // Phase 1: labels (0.5s)
  add(500, () => {
    document.querySelectorAll('.hub-findings-label, .hub-map-label')
      .forEach(el => el.classList.add('hub-revealed'));
  });

  // Phase 2: 8 finding buttons, 150ms stagger
  document.querySelectorAll('.finding-btn').forEach((btn, i) => {
    add(800 + i * 150, () => btn.classList.add('hub-revealed'));
  });

  // Phase 3: 60 clusters, 4 districts revealed IN PARALLEL with district-specific rhythms.
  // Each district starts at the same moment (2200 ms) and finishes together (~6200 ms),
  // but the pacing within each district differs — giving the 4 areas equal billing rather
  // than one district fully revealing before the next:
  //   KB → ease-in cubic  (slow start, fast end)
  //   PS → ease-out cubic (fast start, slow end)
  //   BB → smoothstep     (gradual at both ends, fast middle)
  //   LI → linear         (constant pace)
  const DISTRICT_START = 2200;
  const DISTRICT_DURATION = 4000;
  const easings = {
    KB: t => t * t * t,
    PS: t => 1 - Math.pow(1 - t, 3),
    BB: t => 3 * t * t - 2 * t * t * t,
    LI: t => t
  };
  ['KB', 'PS', 'BB', 'LI'].forEach(dist => {
    const clusters = document.querySelectorAll(`.cluster[data-district="${dist}"]`);
    const ease = easings[dist];
    const lastIdx = Math.max(1, clusters.length - 1);
    clusters.forEach((c, i) => {
      const t = i / lastIdx;
      const offset = DISTRICT_DURATION * ease(t);
      add(DISTRICT_START + offset, () => c.classList.add('hub-revealed'));
    });
  });

  // Phase 4: language switcher (6.3s)
  add(6300, () => {
    document.querySelector('.lang-switcher')?.classList.add('hub-revealed');
  });

  // Finalize: remove animating class, mark session played
  add(7100, () => {
    document.documentElement.classList.remove('hub-animating');
    sessionStorage.setItem(SESSION_KEY, '1');
  });

  /* ---- rAF scheduler ---- */
  let startTime = null;
  let pausedTime = 0;     // total time the tab was hidden (subtracted from elapsed)
  let hiddenAt = null;    // timestamp when tab became hidden
  let rafId = null;

  function tick(now) {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime - pausedTime;

    let allDone = true;
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      if (item.done) continue;
      if (elapsed >= item.at) {
        item.action();
        item.done = true;
      } else {
        allDone = false;
      }
    }

    if (allDone) {
      cleanup();
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  function cleanup() {
    rafId = null;
    document.removeEventListener('visibilitychange', onVisChange);
    document.removeEventListener('keydown', onSkipKey);
  }

  /* ---- Pause on hidden tab, resume on visible, compensate for hidden duration ---- */
  function onVisChange() {
    if (document.hidden) {
      hiddenAt = performance.now();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      if (hiddenAt !== null) {
        pausedTime += performance.now() - hiddenAt;
        hiddenAt = null;
      }
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }
  }
  document.addEventListener('visibilitychange', onVisChange);

  /* ---- Escape skip ---- */
  function onSkipKey(e) {
    if (e.key !== 'Escape') return;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    // Fire any remaining scheduled actions immediately, in order
    schedule.forEach(item => {
      if (!item.done) { item.action(); item.done = true; }
    });
    revealAll();
    sessionStorage.setItem(SESSION_KEY, '1');
    cleanup();
  }
  document.addEventListener('keydown', onSkipKey);

  /* ---- Kick off ---- */
  function start() { rafId = requestAnimationFrame(tick); }
  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();
