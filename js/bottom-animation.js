

(function () {
  'use strict';

  const SECTION_ID         = 'section-bottom';
  const SEED_LAYER_ID      = 'seeds-falling';
  const BLOOM_FIELD_ID     = 'bloom-field';
  const MAP_CLASS          = 'bottom-map';
  const PLATE_CLASS        = 'bottom-tagline-plate';

  const BLOOM_TOTAL        = 200;     // ~200 flowers — denser/more elaborate (繁复)
  const BLOOM_WAVES        = 20;      // 20 waves over 3 s = one every 150 ms
  const BLOOM_DURATION_MS  = 3000;
  const BLOOM_COLORS       = ['b-hR', 'b-hO', 'b-hG', 'b-hB', 'b-hGy'];
  const BLOOM_X_MIN = 40,    BLOOM_X_MAX = 1560;
  const BLOOM_Y_MIN = 1140,  BLOOM_Y_MAX = 1940;

  const PHASE3_DELAY_MS    = 3200;     // 200 ms breather after bloom finishes

  const PHASE1_COMPLETE    = 1.0;

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

  function inlineCleanedMap() {
    fetch('scripts/kl-map-bare.svg')
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(svgText => {
        const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
        const svg = doc.documentElement;

        const removed = svg.querySelectorAll('.cluster').length;
        svg.querySelectorAll('.cluster').forEach(c => c.remove());

        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

        mapEl.innerHTML = '';
        mapEl.appendChild(svg);
        console.info('[bottom-animation] map inlined, ' + removed + ' clusters removed');
      })
      .catch(e => {
        console.warn('[bottom-animation] inline map failed:', e);
      });
  }
  inlineCleanedMap();

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

  const sectionMiddle = document.querySelector('.section--middle');

  function updateSeedFall() {
    const vh = window.innerHeight;

    const midTop = sectionMiddle.getBoundingClientRect().top;
    const raw    = -midTop / vh;
    const p      = Math.max(0, Math.min(1, raw));

    const t = Math.min(1, p / PHASE1_COMPLETE);

    const eased = t * t * t;

    seeds.forEach((s, i) => {
      const CURVE_X = 300;
      const CURVE_Y = 80;
      const midX = (s.sx + s.tx) / 2;
      const midY = (s.sy + s.ty) / 2;
      const cpX  = midX + CURVE_X;
      const cpY  = midY + CURVE_Y;

      const u = 1 - eased;                       // 1-t
      const x = u*u*s.sx + 2*u*eased*cpX + eased*eased*s.tx;
      const y = u*u*s.sy + 2*u*eased*cpY + eased*eased*s.ty;

      const SEED_SCALE = 0.30;

      const rot = (i * 47 + p * 540) % 360;

      s.el.setAttribute(
        'transform',
        `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${SEED_SCALE}) rotate(${rot.toFixed(0)})`
      );
    });

    if (t >= 1 && p >= 0.98 && !phase2Started) {
      startPhase2();
    }

    if (p <= 0.40 && (phase2Started || phase3Started)) {
      resetPhases();
    }
  }

  function startPhase2() {
    phase2Started = true;
    const flowersPerWave = Math.round(BLOOM_TOTAL / BLOOM_WAVES);
    const waveInterval = BLOOM_DURATION_MS / BLOOM_WAVES;

    for (let w = 0; w < BLOOM_WAVES; w++) {
      const timeoutId = setTimeout(() => spawnWave(flowersPerWave), w * waveInterval);
      phase2Timeouts.push(timeoutId);
    }

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
      use.style.animationDelay = (Math.random() * 200).toFixed(0) + 'ms';
      frag.appendChild(use);
    }
    bloomField.appendChild(frag);
  }

  function startPhase3() {
    phase3Started = true;
    mapEl.classList.add('faded');           // map base → nearly transparent
    animLayer.classList.add('faded');       // bloom + seeds → nearly transparent
    plateEl.classList.add('visible');       // plate emerges with text
  }

  function resetPhases() {
    phase2Timeouts.forEach(id => clearTimeout(id));
    phase2Timeouts = [];

    while (bloomField.firstChild) bloomField.removeChild(bloomField.firstChild);

    mapEl.classList.remove('faded');
    animLayer.classList.remove('faded');
    plateEl.classList.remove('visible');

    phase2Started = false;
    phase3Started = false;
  }

  let ticking = false;
  let lastScrollY = window.scrollY;
  function onScroll() {
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

  document.addEventListener('DOMContentLoaded', updateSeedFall);
  updateSeedFall();
})();
