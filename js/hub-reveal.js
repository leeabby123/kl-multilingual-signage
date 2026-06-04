
(function() {
  'use strict';

  const PREFERS_REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll() {
    document.querySelectorAll(
      '.hub-findings-label, .hub-map-label, .finding-btn, .cluster, .lang-switcher'
    ).forEach(el => el.classList.add('hub-revealed'));
    document.documentElement.classList.remove('hub-animating');
  }

  function resetToInitial() {
    document.querySelectorAll(
      '.hub-findings-label, .hub-map-label, .finding-btn, .cluster, .lang-switcher'
    ).forEach(el => el.classList.remove('hub-revealed'));
    document.documentElement.classList.add('hub-animating');
  }

  let rafId = null;
  let startTime = null;
  let pausedTime = 0;
  let hiddenAt = null;
  let schedule = [];
  let onVisChange = null;
  let onSkipKey = null;

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
    if (onVisChange) document.removeEventListener('visibilitychange', onVisChange);
    if (onSkipKey) document.removeEventListener('keydown', onSkipKey);
    onVisChange = null;
    onSkipKey = null;
  }

  function runReveal() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    cleanup();

    if (PREFERS_REDUCED) {
      revealAll();
      return;
    }

    resetToInitial();
    startTime = null;
    pausedTime = 0;
    hiddenAt = null;
    schedule = [];

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
    });

    onVisChange = function() {
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
    };
    document.addEventListener('visibilitychange', onVisChange);

    onSkipKey = function(e) {
      if (e.key !== 'Escape') return;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      schedule.forEach(item => {
        if (!item.done) { item.action(); item.done = true; }
      });
      revealAll();
      cleanup();
    };
    document.addEventListener('keydown', onSkipKey);

    rafId = requestAnimationFrame(tick);
  }

  if (document.readyState === 'complete') {
    runReveal();
  } else {
    window.addEventListener('load', runReveal, { once: true });
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      runReveal();
    }
  });
})();
