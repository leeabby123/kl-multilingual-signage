
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

  const schedule = [];
  function add(at, action) { schedule.push({ at, action, done: false }); }

  add(500, () => {
    document.querySelectorAll('.hub-findings-label, .hub-map-label')
      .forEach(el => el.classList.add('hub-revealed'));
  });

  document.querySelectorAll('.finding-btn').forEach((btn, i) => {
    add(800 + i * 150, () => btn.classList.add('hub-revealed'));
  });

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

  add(6300, () => {
    document.querySelector('.lang-switcher')?.classList.add('hub-revealed');
  });

  add(7100, () => {
    document.documentElement.classList.remove('hub-animating');
    sessionStorage.setItem(SESSION_KEY, '1');
  });

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

  function onSkipKey(e) {
    if (e.key !== 'Escape') return;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    schedule.forEach(item => {
      if (!item.done) { item.action(); item.done = true; }
    });
    revealAll();
    sessionStorage.setItem(SESSION_KEY, '1');
    cleanup();
  }
  document.addEventListener('keydown', onSkipKey);

  function start() { rafId = requestAnimationFrame(tick); }
  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
})();
