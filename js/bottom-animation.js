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
  const BLOOM_TOTAL        = 200;     // ~200 flowers — denser/more elaborate (繁复)
  const BLOOM_WAVES        = 20;      // 20 waves over 3 s = one every 150 ms
  const BLOOM_DURATION_MS  = 3000;
  const BLOOM_COLORS       = ['b-hR', 'b-hO', 'b-hG', 'b-hB', 'b-hGy'];
  // Expanded viewBox 0 0 1600 2000 — middle page = y=0..1000, bottom page = y=1000..2000.
  // Bloom only spawns in the BOTTOM page area (y=1000..1900) with edge margin.
  const BLOOM_X_MIN = 40,    BLOOM_X_MAX = 1560;
  const BLOOM_Y_MIN = 1040,  BLOOM_Y_MAX = 1940;

  // Phase 3 (tagline) — kicks off PHASE3_DELAY after phase 2 starts
  const PHASE3_DELAY_MS    = 3200;     // 200 ms breather after bloom finishes

  // Phase 1 (seed fall) — scroll progress threshold at which seeds are fully landed.
  // With the expanded 2-vh active range (middle + bottom), p reaches 1.0 exactly
  // when the user has scrolled to the START of the bottom section. At that
  // moment, the seeds' landing y=1720-1920 is at the bottom 1/3 of the visible
  // bottom page. Setting PHASE1_COMPLETE = 1.0 uses the entire range for the fall.
  const PHASE1_COMPLETE    = 1.0;

  // -----------------------------------------------------------
  // Boot
  // -----------------------------------------------------------
  const section = document.getElementById(SECTION_ID);
  if (!section) return;

  const seedsLayer  = document.getElementById(SEED_LAYER_ID);
  const bloomField  = document.getElementById(BLOOM_FIELD_ID);
  const mapEl       = section.querySelector('.' + MAP_CLASS);
  const animLayer   = section.querySelector('.bottom-anim-layer');
  const plateEl     = section.querySelector('.' + PLATE_CLASS);
  if (!seedsLayer || !bloomField || !mapEl || !animLayer || !plateEl) {
    console.warn('[bottom-animation] missing elements, aborting');
    return;
  }

  // Replace the <object> kl-map embed with an inline <svg> that has all
  // 60 cluster groups REMOVED (not just hidden). Previous attempts using
  // <object>.contentDocument were unreliable on GitHub Pages — some
  // browser configurations block cross-document DOM access even on same
  // origin. Inline injection gives us full control: the user never sees
  // a version of kl-map that contains clusters.
  function inlineCleanedMap() {
    fetch('scripts/kl-map-bare.svg')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(svgText => {
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const svg = doc.documentElement;

        // Drop every cluster group — they belong to Hub's interactive map,
        // not the bottom page's bloom narrative.
        const removed = svg.querySelectorAll('.cluster').length;
        svg.querySelectorAll('.cluster').forEach(c => c.remove());

        // Sizing/styling for inline use
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        // Fill the container — no letterbox bars on the sides (which were
        // showing as "dark rectangles" because the section's peach gradient
        // showed through where the 1.6:1 SVG didn't reach in a 1.78:1 viewport).
        // 'slice' scales up to cover, cropping ~6% top/bottom in 16:9 viewports.
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

        // Swap <object> for the cleaned inline <svg>
        mapEl.innerHTML = '';
        mapEl.appendChild(svg);
        console.info('[bottom-animation] map inlined, ' + removed + ' clusters removed');
      })
      .catch(e => {
        console.warn('[bottom-animation] inline map failed:', e);
      });
  }
  inlineCleanedMap();

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

  // Reference point for scroll progress: the MIDDLE section (entry page).
  // Seeds become visible/active from the moment the entry page enters the viewport
  // and finish landing as the user reaches the bottom 1/3 of the bottom section.
  // The total active scroll range is therefore ~2 viewports (middle + bottom).
  const sectionMiddle = document.querySelector('.section--middle');

  // -----------------------------------------------------------
  // PHASE 1 — scroll-driven seed fall
  // -----------------------------------------------------------
  function updateSeedFall() {
    const vh = window.innerHeight;

    // Anchor progress on the middle section's top edge relative to the viewport.
    // midTop = 0    → user just reached the entry page (middle fills viewport)  → p = 0  (seeds at START y=900, visible at lawn level)
    // midTop = -vh  → user just reached the bottom page                         → p = 1  (seeds LANDED at y=1720-1920, bottom 1/3 of bottom page)
    // Active scroll range = 1vh (the scroll from entry-top to bottom-top).
    //
    // Previous bug: `raw = (vh - midTop) / (2*vh)` put p=0.5 when user was AT entry page,
    // which (combined with ease-out cubic) made the seed already 87% fallen — landing
    // them visually BELOW the viewport before the user had even started scrolling.
    const midTop = sectionMiddle.getBoundingClientRect().top;
    const raw    = -midTop / vh;
    const p      = Math.max(0, Math.min(1, raw));

    // Map [0, PHASE1_COMPLETE] → [0, 1] for seed interpolation. Above that, seeds are landed.
    const t = Math.min(1, p / PHASE1_COMPLETE);

    // Ease-IN cubic — SLOW at the start, FAST at the end. The seeds linger
    // near their start position (y=900, garden-ground level of the entry page)
    // throughout the entry-page viewing, only accelerating to their landing
    // positions as the user enters the bottom page. This satisfies the
    // requirement that the seeds remain visible DURING the entry→bottom
    // transition (with ease-out the opposite — they'd be 87% fallen at the
    // midpoint and well below the viewport).
    const eased = t * t * t;

    seeds.forEach((s, i) => {
      // ============================================================
      // CURVED TRAJECTORY — quadratic Bézier
      // ============================================================
      // Each seed follows a quadratic Bézier curve from start (sx,sy)
      // through a control point CP to target (tx,ty). The CP is offset
      // RIGHT (+CURVE_X) and slightly DOWN (+CURVE_Y) from the straight-line
      // midpoint, so EVERY seed's path bulges to the right of its straight
      // line. This creates a unified visual "rightward swirl" that pairs
      // with the clockwise spin below.
      //
      // B(t) = (1-t)² · P0  +  2(1-t)t · CP  +  t² · P2
      //
      // We feed `eased` (cubic ease-in) into t so the fall is slow-start /
      // fast-end (keeps seeds visible throughout the entry-page scroll).
      // ============================================================
      const CURVE_X = 300;
      const CURVE_Y = 80;
      const midX = (s.sx + s.tx) / 2;
      const midY = (s.sy + s.ty) / 2;
      const cpX  = midX + CURVE_X;
      const cpY  = midY + CURVE_Y;

      const u = 1 - eased;                       // 1-t
      const x = u*u*s.sx + 2*u*eased*cpX + eased*eased*s.tx;
      const y = u*u*s.sy + 2*u*eased*cpY + eased*eased*s.ty;

      // CONSTANT scale — matches the middle-garden seed visual size
      const SEED_SCALE = 0.30;

      // ============================================================
      // CLOCKWISE-ONLY rotation
      // ============================================================
      // In SVG the Y-axis points DOWN, so a POSITIVE rotate() angle
      // visually rotates the element CLOCKWISE on screen. No alternating
      // direction per seed — every flower spins the same way.
      // Linear in the raw scroll progress `p` (not eased) so the spin
      // feels steady throughout the fall — about 1.5 full turns total.
      // `i*47` is just a per-seed phase offset so the 5 flowers aren't
      // all at the exact same rotation angle.
      // ============================================================
      const rot = (i * 47 + p * 540) % 360;

      s.el.setAttribute(
        'transform',
        `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${SEED_SCALE}) rotate(${rot.toFixed(0)})`
      );
    });

    // Trigger phase 2 when seeds are fully landed (i.e., user reached start of bottom section)
    // With the new 2-vh range, p >= ~0.98 means user is at or past scrollY = 2vh (bottom-top).
    if (t >= 1 && p >= 0.98 && !phase2Started) {
      startPhase2();
    }

    // Reset when user has scrolled fully back past the entry page
    // p <= 0.40 corresponds to midTop > 0.2*vh, i.e., user still mostly above middle section.
    if (p <= 0.40 && (phase2Started || phase3Started)) {
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
      const scale = 0.30 + Math.random() * 0.15;    // 0.30 (1x of seed) to 0.45 (1.5x)
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
    mapEl.classList.add('faded');           // map base → nearly transparent
    animLayer.classList.add('faded');       // bloom + seeds → nearly transparent
    plateEl.classList.add('visible');       // plate emerges with text
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
    animLayer.classList.remove('faded');
    plateEl.classList.remove('visible');

    phase2Started = false;
    phase3Started = false;
  }

  // -----------------------------------------------------------
  // Scroll listener — RAF-throttled, with direction-aware up-scroll cleanup
  // -----------------------------------------------------------
  let ticking = false;
  let lastScrollY = window.scrollY;
  function onScroll() {
    // Direction-aware cleanup for #6: when the user scrolls UP while bloom
    // (Phase 2) or the tagline plate (Phase 3) are showing, clear them
    // immediately. Without this, the bloom and plate linger as the user
    // returns to the entry/top pages until the slow p-threshold fires.
    const sy = window.scrollY;
    if (sy < lastScrollY && (phase2Started || phase3Started)) {
      resetPhases();
    }
    lastScrollY = sy;

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
