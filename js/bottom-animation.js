/* ============================================================
   js/bottom-animation.js
   AQC7015 KL Multilingual Signage — bottom-page scroll animation

   Orchestrates 3 phases when user enters the bottom section:

   Phase 1  (scroll-driven, reversible)
     5 seed flowers fall from above the kl-map into their landing spots.
     Position interpolated by the user's scroll progress (0 = section just
     entering view, 1 = section fully in view). Reversible by scrolling up.

   Phase 2  (3 s, time-driven, one-shot)
     ~150 bloom flowers spawn in 15 waves of 10. Random scale, rotation,
     position, and one of the 5 language colors.

   Phase 3  (3 s, time-driven, one-shot)
     .bottom-map gets .faded (opacity 0.62 → 0.12) while
     .bottom-tagline-plate gets .visible (fades in + lifts).

   Reset:
     When the bottom section fully leaves the viewport (user scrolls back to
     middle/top), all phases reset so the animation can play fresh on the
     next entry. This is the simplest model that respects "reversible scroll
     animation" without inverse-time-replay of phases 2-3.
   ============================================================ */

(function () {
  'use strict';

  const SECTION_ID         = 'section-bottom';
  const SEED_LAYER_ID      = 'seeds-falling';
  const BLOOM_FIELD_ID     = 'bloom-field';
  const MAP_CLASS          = 'bottom-map';
  const PLATE_CLASS        = 'bottom-tagline-plate';

  // Phase 2 (bloom) tuning
  const BLOOM_TOTAL        = 150;     // ~150 flowers across the whole map
  const BLOOM_WAVES        = 15;      // 15 waves over 3 s = one every 200 ms
  const BLOOM_DURATION_MS  = 3000;
  const BLOOM_COLORS       = ['b-hR', 'b-hO', 'b-hG', 'b-hB', 'b-hGy'];
  // viewBox 0 0 1600 1000 — keep some margin so flowers don't clip the edge
  const BLOOM_X_MIN = 40,  BLOOM_X_MAX = 1560;
  const BLOOM_Y_MIN = 40,  BLOOM_Y_MAX = 960;

  // Phase 3 (tagline) — kicks off PHASE3_DELAY after phase 2 starts
  const PHASE3_DELAY_MS    = 3200;     // 200 ms breather after bloom finishes

  // Phase 1 (seed fall) — scroll progress threshold at which seeds are fully landed
  // 0 = bottom-section's TOP edge at viewport bottom
  // 1 = bottom-section fills viewport (its top is at viewport top)
  // We map progress in [0, PHASE1_COMPLETE] to seed transform [start → target].
  const PHASE1_COMPLETE    = 0.85;     // seeds fully landed before section is fully in view

  // -----------------------------------------------------------
  // Boot
  // -----------------------------------------------------------
  const section = document.getElementById(SECTION_ID);
  if (!section) return;

  const seedsLayer  = document.getElementById(SEED_LAYER_ID);
  const bloomField  = document.getElementById(BLOOM_FIELD_ID);
  const mapEl       = section.querySelector('.' + MAP_CLASS);
  const plateEl     = section.querySelector('.' + PLATE_CLASS);
  if (!seedsLayer || !bloomField || !mapEl || !plateEl) {
    console.warn('[bottom-animation] missing elements, aborting');
    return;
  }

  // Cache seed targets so we don't re-parse every scroll tick
  const seeds = Array.from(seedsLayer.querySelectorAll('.falling-seed')).map(el => ({
    el,
    sx: parseFloat(el.dataset.startX),
    sy: parseFloat(el.dataset.startY),
    tx: parseFloat(el.dataset.targetX),
    ty: parseFloat(el.dataset.targetY)
  }));

  let phase2Started = false;
  let phase3Started = false;
  let phase2Timeouts = [];

  // -----------------------------------------------------------
  // PHASE 1 — scroll-driven seed fall
  // -----------------------------------------------------------
  function updateSeedFall() {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;

    // Progress: 0 when section top is at viewport bottom, 1 when section top is at viewport top
    // i.e., as the user scrolls section into view, progress climbs 0 → 1.
    const raw = (vh - rect.top) / vh;
    const p   = Math.max(0, Math.min(1, raw));

    // Map [0, PHASE1_COMPLETE] → [0, 1] for seed interpolation. Above that, seeds are landed.
    const t = Math.min(1, p / PHASE1_COMPLETE);

    // Ease-out cubic so seeds decelerate as they land — feels gravity-correct
    const eased = 1 - Math.pow(1 - t, 3);

    seeds.forEach((s, i) => {
      const x = s.sx + (s.tx - s.sx) * eased;
      const y = s.sy + (s.ty - s.sy) * eased;
      // Slight horizontal sway for falling feel — sin-based, offset per seed
      const sway = Math.sin((eased + i * 0.18) * Math.PI * 2) * 18 * (1 - eased);
      // Scale grows from 0.3 → 0.9 over the fall (so they're not invisibly small at start)
      const scale = 0.3 + 0.6 * eased;
      // Spin slowly for life
      const rot = (i * 47 + eased * 360 * 0.35) % 360;
      s.el.setAttribute(
        'transform',
        `translate(${x + sway},${y}) scale(${scale}) rotate(${rot})`
      );
    });

    // Trigger phase 2 when seeds are fully landed AND section is mostly in view
    if (t >= 1 && p >= 0.92 && !phase2Started) {
      startPhase2();
    }

    // Reset when section is clearly out of view (user scrolled back up)
    if (p <= 0.05 && (phase2Started || phase3Started)) {
      resetPhases();
    }
  }

  // -----------------------------------------------------------
  // PHASE 2 — bloom (time-driven, ~150 flowers in 15 waves of 10)
  // -----------------------------------------------------------
  function startPhase2() {
    phase2Started = true;
    const flowersPerWave = Math.round(BLOOM_TOTAL / BLOOM_WAVES);
    const waveInterval = BLOOM_DURATION_MS / BLOOM_WAVES;

    for (let w = 0; w < BLOOM_WAVES; w++) {
      const timeoutId = setTimeout(() => spawnWave(flowersPerWave), w * waveInterval);
      phase2Timeouts.push(timeoutId);
    }

    // Schedule phase 3
    const phase3Id = setTimeout(startPhase3, PHASE3_DELAY_MS);
    phase2Timeouts.push(phase3Id);
  }

  function spawnWave(n) {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const use = document.createElementNS(SVG_NS, 'use');
      const color = BLOOM_COLORS[Math.floor(Math.random() * BLOOM_COLORS.length)];
      const x = BLOOM_X_MIN + Math.random() * (BLOOM_X_MAX - BLOOM_X_MIN);
      const y = BLOOM_Y_MIN + Math.random() * (BLOOM_Y_MAX - BLOOM_Y_MIN);
      const scale = 0.18 + Math.random() * 0.22;     // 0.18 - 0.40
      const rot   = Math.random() * 360;
      use.setAttribute('href', '#' + color);
      use.setAttribute('class', 'bloom-flower lang-' + color.slice(2).toLowerCase());
      use.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale.toFixed(2)}) rotate(${rot.toFixed(0)})`);
      // Small per-flower random delay so the wave doesn't feel rigid
      use.style.animationDelay = (Math.random() * 200).toFixed(0) + 'ms';
      frag.appendChild(use);
    }
    bloomField.appendChild(frag);
  }

  // -----------------------------------------------------------
  // PHASE 3 — map fade + tagline plate emerge
  // -----------------------------------------------------------
  function startPhase3() {
    phase3Started = true;
    mapEl.classList.add('faded');
    plateEl.classList.add('visible');
  }

  // -----------------------------------------------------------
  // Reset (when user scrolls back to middle/top)
  // -----------------------------------------------------------
  function resetPhases() {
    // Cancel any pending wave / phase3 timers
    phase2Timeouts.forEach(id => clearTimeout(id));
    phase2Timeouts = [];

    // Clear bloom field
    while (bloomField.firstChild) bloomField.removeChild(bloomField.firstChild);

    // Reset map + plate
    mapEl.classList.remove('faded');
    plateEl.classList.remove('visible');

    phase2Started = false;
    phase3Started = false;
  }

  // -----------------------------------------------------------
  // Scroll listener — RAF-throttled
  // -----------------------------------------------------------
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateSeedFall();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  // Run once on load so the initial state is correct if page loads scrolled
  document.addEventListener('DOMContentLoaded', updateSeedFall);
  // Also run immediately in case DOMContentLoaded already fired
  updateSeedFall();
})();
