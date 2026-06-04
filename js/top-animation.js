/* ============================================================
   js/top-animation.js
   AQC7015 KL Multilingual Signage — top-page UP-SCROLL animation

   Triggered as the user scrolls UP from the entry page to the top page.
   5 hibiscus flowers rise from scattered positions in the entry page:

     3 vanishers (red ZH / orange TA / blue EN):
       - Each follows an individual petal-fall schedule (5 petals,
         different timings + sequence patterns per flower).
       - Body + remaining-petal alpha fades to 0 by each flower's own
         "vanish-at" point on the scroll (ZH 0.45 → TA 0.65 → EN 0.85).
       - Detached petals fall under parabolic gravity (y ∝ lp²) with a
         small horizontal velocity derived from the petal's world-space
         facing direction at the moment of detach, counterclockwise spin,
         and linear opacity fade to 0 over a 0.20 progress window.

     2 survivors (green MS / gray Jawi):
       - No petal fall (fall-at sentinel 9.9), no body fade until the
         very end. They reach the .top-flowers placeholder position.
       - At p=0.95→1.00, anim survivors fade out while the placeholder
         fades in — a visually seamless swap since endpoints align with
         the placeholder's rendered position.

   All rotation is COUNTERCLOCKWISE (opposite of bottom layer's CW).
   Trajectory: quadratic Bézier per flower, control point chosen for
   organic side-curves.

   Reversibility: every frame recomputes state purely from current
   topProgress — no DOM moves, no event-driven state. Scrolling back
   down re-attaches petals automatically.
   ============================================================ */

(function () {
  'use strict';

  // -----------------------------------------------------------
  // Boot — locate layer + placeholder
  // -----------------------------------------------------------
  const layer       = document.querySelector('.top-anim-layer');
  const placeholder = document.querySelector('.top-flowers');
  const sectionTop  = document.querySelector('.section--top');
  if (!layer || !sectionTop) return;

  // -----------------------------------------------------------
  // Helpers (declared before they're used during petal init)
  // -----------------------------------------------------------
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // Body alpha curve. Vanishers fade linearly from p=0 to p=vanishAt.
  // Survivors stay opaque until p=0.95, then fade out over the last
  // 0.05 of progress to swap with the .top-flowers placeholder.
  function computeBodyAlpha(p, flower) {
    if (flower.isSurvivor) {
      // 1 for p ≤ 0.95, fades to 0 over p=0.95..1.00
      return clamp01((1.0 - p) / 0.05);
    }
    return clamp01(1 - p / flower.vanishAt);
  }

  // Quadratic Bézier evaluation: B(t) = (1-t)² P0 + 2(1-t)t CP + t² P2
  function bezierXY(t, flower) {
    const u = 1 - t;
    return [
      u*u*flower.sx + 2*u*t*flower.cpx + t*t*flower.ex,
      u*u*flower.sy + 2*u*t*flower.cpy + t*t*flower.ey,
    ];
  }

  // Scroll → topProgress. 1.0 when section--top fills the viewport,
  // 0.0 when section--middle (entry page) fills it. The map is purely
  // linear in scrollY so flowers stay visible throughout the up-scroll.
  function getTopProgress() {
    const sy = window.scrollY;
    const vh = window.innerHeight;
    return clamp01((vh - sy) / vh);
  }

  // -----------------------------------------------------------
  // Build internal model from DOM data-attributes
  // -----------------------------------------------------------
  const bodies = Array.from(layer.querySelectorAll('.rf-body')).map(el => ({
    el,
    color:    el.dataset.color,
    vanishAt: parseFloat(el.dataset.vanishAt),
    isSurvivor: parseFloat(el.dataset.vanishAt) >= 0.9,
    sx: parseFloat(el.dataset.sx), sy: parseFloat(el.dataset.sy),
    ex: parseFloat(el.dataset.ex), ey: parseFloat(el.dataset.ey),
    cpx: parseFloat(el.dataset.cpx), cpy: parseFloat(el.dataset.cpy),
  }));
  const bodyByColor = Object.fromEntries(bodies.map(b => [b.color, b]));

  const petals = Array.from(layer.querySelectorAll('.rf-petal')).map(el => {
    const flower = bodyByColor[el.dataset.flower];
    const angle  = parseFloat(el.dataset.angle);
    const fallAt = parseFloat(el.dataset.fallAt);
    const baseOpacity = parseFloat(el.dataset.baseOpacity);

    // Pre-compute snapshot data for the detached-petal phase. Since
    // fall_at, the flower's bezier trajectory and the static angle never
    // change, the snapshot position + facing + body-alpha at the moment
    // of detach are all constants. Computing them once at init keeps the
    // per-frame work tight.
    const t      = fallAt;
    const u      = 1 - t;
    const snapX  = u*u*flower.sx + 2*u*t*flower.cpx + t*t*flower.ex;
    const snapY  = u*u*flower.sy + 2*u*t*flower.cpy + t*t*flower.ey;
    const snapBodyRot   = -t * 540;
    const snapWorldAngle = snapBodyRot + angle;
    const snapBodyAlpha = computeBodyAlpha(t, flower);

    // Horizontal "blow-off" velocity: petal drifts outward in the
    // direction it was facing at detach. Capped at ±60 viewBox units.
    const vx = 60 * Math.sin(snapWorldAngle * Math.PI / 180);

    return {
      el, flower, angle, fallAt, baseOpacity,
      snapX, snapY, snapWorldAngle, snapBodyAlpha, vx,
    };
  });

  // -----------------------------------------------------------
  // Per-frame update
  // -----------------------------------------------------------
  function update() {
    const p = getTopProgress();

    // Update each flower body
    bodies.forEach(flower => {
      const alpha = computeBodyAlpha(p, flower);
      const [bx, by] = bezierXY(p, flower);
      const brot = -p * 540;            // counterclockwise
      flower._bx = bx; flower._by = by; flower._brot = brot;  // cache for petals
      flower.el.setAttribute('transform', `translate(${bx.toFixed(1)},${by.toFixed(1)}) rotate(${brot.toFixed(1)})`);
      flower.el.setAttribute('opacity',   alpha.toFixed(3));
    });

    // Update each petal — either attached (move + spin with body) or
    // detached (own parabolic drift + counterclockwise spin + fade).
    petals.forEach(petal => {
      const f = petal.flower;
      if (p < petal.fallAt) {
        // Attached
        const rot = f._brot + petal.angle;
        const op  = computeBodyAlpha(p, f) * petal.baseOpacity;
        petal.el.setAttribute('transform', `translate(${f._bx.toFixed(1)},${f._by.toFixed(1)}) rotate(${rot.toFixed(1)})`);
        petal.el.setAttribute('opacity',   op.toFixed(3));
      } else {
        // Detached — only triggers for non-survivors (survivors have fall_at=9.9)
        const lp = (p - petal.fallAt) / 0.20;
        if (lp >= 1) {
          petal.el.setAttribute('opacity', '0');
          return;
        }
        const dx = petal.vx * lp;
        const dy = 400 * lp * lp;       // parabolic gravity
        const rot = petal.snapWorldAngle - lp * 540;   // 1.5 extra ccw turns
        const op  = (1 - lp) * petal.baseOpacity * petal.snapBodyAlpha;
        petal.el.setAttribute('transform', `translate(${(petal.snapX + dx).toFixed(1)},${(petal.snapY + dy).toFixed(1)}) rotate(${rot.toFixed(1)})`);
        petal.el.setAttribute('opacity',   op.toFixed(3));
      }
    });

    // Placeholder swap: invisible until p>0.95, then fades in over the
    // final 0.05 of progress as the anim survivors fade out at the same
    // rate (their bodies' computeBodyAlpha returns (1-p)/0.05).
    if (placeholder) {
      let phOpacity;
      if (p < 0.95) phOpacity = 0;
      else          phOpacity = (p - 0.95) / 0.05;
      placeholder.style.opacity = clamp01(phOpacity).toFixed(3);
    }
  }

  // -----------------------------------------------------------
  // Survivor-endpoint calibration
  // -----------------------------------------------------------
  // The MS-green + Jawi-gray survivors must land EXACTLY on the
  // .top-flowers placeholder's green and gray sub-flower positions so the
  // opacity swap at p=0.95→1.00 looks seamless. The placeholder's rendered
  // pixel position depends on the top-page layout (and on transforms like
  // scale(0.75) applied to .top-content), so hardcoded viewBox endpoints
  // are fragile. Measure the placeholder's bounding rect at runtime and
  // convert to the top-anim-layer's viewBox coordinate system.
  //
  // Placeholder SVG viewBox is 0 0 280 240. Inside that local space:
  //   green hibiscus center is at (125, 108)  — offset (-15, -12) from
  //                                              placeholder local center (140, 120)
  //   gray  hibiscus center is at (195, 158)  — offset (+55, +38) from center
  function calibrateSurvivorEndpoints() {
    if (!placeholder) return;
    const layerRect = layer.getBoundingClientRect();
    const phRect    = placeholder.getBoundingClientRect();
    if (layerRect.width === 0 || phRect.width === 0) return;  // not laid out yet

    // top-anim-layer's preserveAspectRatio is "xMidYMid slice" — scale is
    // the LARGER of width/1600 and height/2000, content centered + cropped.
    const scaleX = layerRect.width / 1600;
    const scaleY = layerRect.height / 2000;
    const scale  = Math.max(scaleX, scaleY);
    const cropX  = (1600 * scale - layerRect.width)  / 2;
    const cropY  = (2000 * scale - layerRect.height) / 2;

    // Placeholder center in layer's local pixel space (relative to layer's top-left)
    const phCenterPxX = (phRect.left + phRect.width  / 2) - layerRect.left;
    const phCenterPxY = (phRect.top  + phRect.height / 2) - layerRect.top;

    // Convert to viewBox coords (account for the slice crop)
    const phCenterVbX = (phCenterPxX + cropX) / scale;
    const phCenterVbY = (phCenterPxY + cropY) / scale;

    // Sub-flower offsets: in placeholder-local viewBox units (0..280, 0..240).
    // Convert to top-anim-layer viewBox units via the placeholder's rendered
    // pixel size and the layer's scale: 1 placeholder-local unit = (phRect.width/280)
    // CSS pixels = (phRect.width / 280) / scale layer-viewBox units.
    const ratio = phRect.width / (280 * scale);
    const GREEN_DX = -15 * ratio;   // -15 in placeholder-local x
    const GREEN_DY = -12 * ratio;
    const GRAY_DX  =  55 * ratio;
    const GRAY_DY  =  38 * ratio;

    const green = bodyByColor['ms'];
    const jawi  = bodyByColor['jawi'];
    if (green) { green.ex = phCenterVbX + GREEN_DX; green.ey = phCenterVbY + GREEN_DY; }
    if (jawi)  { jawi.ex  = phCenterVbX + GRAY_DX;  jawi.ey  = phCenterVbY + GRAY_DY;  }
  }

  // -----------------------------------------------------------
  // Scroll listener — RAF-throttled
  // -----------------------------------------------------------
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    calibrateSurvivorEndpoints();    // viewport size change → re-measure
    onScroll();
  }, { passive: true });

  // Run once at DOMContentLoaded so the initial state is correct
  // regardless of whether the page loaded scrolled-to-top (hash nav)
  // or scrolled-to-middle (entry-page default in main.js initialScroll).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      calibrateSurvivorEndpoints();
      update();
    });
  } else {
    calibrateSurvivorEndpoints();
    update();
  }

  // Reveal the anim-layer only after the middle-garden.svg has loaded,
  // mirroring the bottom-anim-layer's loading-order fix. Without this,
  // the 5 flowers can briefly show against a blank cream background
  // before the garden art arrives.
  window.addEventListener('load', () => {
    layer.classList.add('garden-loaded');
    calibrateSurvivorEndpoints();    // fonts/layout fully settled → re-measure
    update();
  });

})();
