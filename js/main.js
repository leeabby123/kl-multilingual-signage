/* ============================================================
   Main JS — SPA navigation + scroll-bound animations (index.html)
   Per memory #27: translation-only, reversible, no 3D/folding
   - Up-scroll: flowers in middle page lift away, petals scatter
   - Down-scroll: flowers rise from below
   ============================================================ */

(function () {
  'use strict';

  const root = document.querySelector('.spa-root');
  const sectionTop = document.querySelector('.section--top');
  const sectionMiddle = document.querySelector('.section--middle');
  const sectionBottom = document.querySelector('.section--bottom');

  if (!root || !sectionMiddle) return;

  /* ----------------------------------------------------------
     1. Scroll to MIDDLE on page load (middle is the entry)
     ---------------------------------------------------------- */
  function scrollToMiddle(behavior = 'instant') {
    sectionMiddle.scrollIntoView({ behavior, block: 'start' });
  }

  scrollToMiddle('instant');
  requestAnimationFrame(() => root.classList.remove('loading'));

  window.addEventListener('load', () => {
    const returnTo = sessionStorage.getItem('return-to');
    if (returnTo === 'top') {
      sessionStorage.removeItem('return-to');
      requestAnimationFrame(() => sectionTop.scrollIntoView({ behavior: 'instant' }));
    } else if (returnTo === 'bottom') {
      sessionStorage.removeItem('return-to');
      requestAnimationFrame(() => sectionBottom.scrollIntoView({ behavior: 'instant' }));
    } else if (!sessionStorage.getItem('scrolled-from-middle')) {
      scrollToMiddle('instant');
    }
  });

  /* ----------------------------------------------------------
     2. Scroll cue clicks
     ---------------------------------------------------------- */
  document.querySelectorAll('[data-scroll-target]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(el.dataset.scrollTarget);
      if (target) {
        sessionStorage.setItem('scrolled-from-middle', '1');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ----------------------------------------------------------
     3. Enter Hub button
     ---------------------------------------------------------- */
  document.querySelectorAll('[data-enter-hub]').forEach(btn => {
    btn.addEventListener('click', () => {
      const source = btn.dataset.enterHub;
      sessionStorage.setItem('hub-source', source);
      window.location.href = 'pages/hub.html';
    });
  });

  /* ----------------------------------------------------------
     4. Keyboard navigation
     ---------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const currentScroll = window.scrollY;
    const vh = window.innerHeight;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      if (currentScroll < vh * 0.5) {
        e.preventDefault();
        sectionMiddle.scrollIntoView({ behavior: 'smooth' });
      } else if (currentScroll < vh * 1.5) {
        e.preventDefault();
        sectionBottom.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (currentScroll > vh * 1.5) {
        e.preventDefault();
        sectionMiddle.scrollIntoView({ behavior: 'smooth' });
      } else if (currentScroll > vh * 0.5) {
        e.preventDefault();
        sectionTop.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToMiddle('smooth');
    }
  });

  /* ============================================================
     5. SCROLL-BOUND ANIMATIONS (per memory #27)
     - All translation only, no 3D/folding
     - Reversible: scroll back → animation reverses
     - scroll progress drives intermediate state
     ============================================================ */

  // Get the embedded SVG document once it loads
  let svgDoc = null;
  const middleArt = document.querySelector('.middle-art object');

  function getMiddleSVGDoc() {
    if (svgDoc) return svgDoc;
    if (!middleArt) return null;
    try {
      svgDoc = middleArt.contentDocument;
      return svgDoc;
    } catch (e) {
      return null;
    }
  }

  if (middleArt) {
    middleArt.addEventListener('load', () => { svgDoc = middleArt.contentDocument; });
  }

  // Easing helpers
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  // Map scrollY → 3 progress values: top-progress (0..1 between top and middle),
  // bottom-progress (0..1 between middle and bottom)
  function getScrollProgress() {
    const sy = window.scrollY;
    const vh = window.innerHeight;
    // 0 = at top, vh = at middle, 2vh = at bottom
    const topProgress = clamp((vh - sy) / vh, 0, 1);   // 1 when at top, 0 when at middle
    const bottomProgress = clamp((sy - vh) / vh, 0, 1); // 0 when at middle, 1 when at bottom
    return { topProgress, bottomProgress, sy, vh };
  }

  // RAF-throttled animation loop
  let rafId = null;
  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateScrollAnimations();
    });
  }

  function updateScrollAnimations() {
    const { topProgress, bottomProgress, sy, vh } = getScrollProgress();

    // === Middle SVG parallax + lift ===
    // When scrolling UP toward top page: flowers/garden shift up + fade
    // When scrolling DOWN toward bottom page: flowers/garden shift down + fade
    const art = document.querySelector('.middle-art');
    if (art) {
      // Upward push when scrolling to top
      const upShift = -topProgress * 80; // px translation
      const upOpacity = 1 - easeOut(topProgress) * 0.7;
      // Downward push when scrolling to bottom
      const downShift = bottomProgress * 80;
      const downOpacity = 1 - easeOut(bottomProgress) * 0.5;
      const finalShift = upShift + downShift;
      const finalOpacity = Math.min(upOpacity, downOpacity);
      art.style.transform = `translateY(${finalShift}px)`;
      art.style.opacity = finalOpacity;
    }

    // === Top page legal text fade in ===
    const topContent = document.querySelector('.top-content');
    if (topContent) {
      const t = easeOut(topProgress);
      topContent.style.transform = `translateY(${(1 - t) * 30}px)`;
      topContent.style.opacity = t;
    }

    // === Bottom page tagline fade in ===
    const bottomPlaceholder = document.querySelector('.bottom-placeholder');
    if (bottomPlaceholder) {
      const t = easeOut(bottomProgress);
      bottomPlaceholder.style.transform = `translateY(${(1 - t) * 30}px)`;
      bottomPlaceholder.style.opacity = t;
    }

    // === Falling petal effect on top transition ===
    // Spawn drifting flower SVGs in the top section when scrolling up
    updateFallingPetals(topProgress);

    // === Rising flower effect on bottom transition ===
    updateRisingFlowers(bottomProgress);
  }

  /* ----------------------------------------------------------
     Falling petals — when scrolling toward top page
     Drift downward from top, fading in as scroll progresses
     ---------------------------------------------------------- */
  let petalsContainer = null;
  function ensurePetalsContainer() {
    if (petalsContainer) return petalsContainer;
    petalsContainer = document.createElement('div');
    petalsContainer.className = 'falling-petals-container';
    petalsContainer.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 4;
      overflow: hidden;
    `;
    sectionTop.appendChild(petalsContainer);
    // Create N petal SVGs (5 colors × random positions)
    const colors = ['#d63031','#e67e22','#27ae60','#2980b9','#7f8c8d'];
    for (let i = 0; i < 12; i++) {
      const petal = document.createElement('div');
      const color = colors[i % 5];
      const left = 5 + Math.random() * 90; // %
      const startDelay = Math.random();
      petal.dataset.delay = startDelay;
      petal.dataset.left = left;
      petal.style.cssText = `
        position: absolute; left: ${left}%; top: -40px;
        width: 22px; height: 22px;
        opacity: 0;
        transform: translateY(0);
      `;
      petal.innerHTML = `<svg viewBox="-15 -15 30 30" width="22" height="22">
        <path d="M0,0 C-6,-3 -10,-9 -9,-15 C-8,-19 -3,-20 0,-16 C3,-20 8,-19 9,-15 C10,-9 6,-3 0,0Z" fill="${color}" opacity="0.7"/>
      </svg>`;
      petalsContainer.appendChild(petal);
    }
    return petalsContainer;
  }

  function updateFallingPetals(topProgress) {
    if (topProgress < 0.02) {
      if (petalsContainer) petalsContainer.style.display = 'none';
      return;
    }
    const container = ensurePetalsContainer();
    container.style.display = 'block';
    const petals = container.children;
    const vh = window.innerHeight;
    for (let i = 0; i < petals.length; i++) {
      const petal = petals[i];
      const delay = parseFloat(petal.dataset.delay);
      // Local progress: each petal starts at its delay
      const local = clamp((topProgress - delay * 0.3) / (1 - delay * 0.3), 0, 1);
      const y = local * vh * 1.05;
      const x = Math.sin(local * Math.PI * 2 + i) * 30;
      const opacity = local > 0.05 && local < 0.95 ? easeOut(local) * 0.9 : 0;
      const rotation = local * 270 + i * 30;
      petal.style.opacity = opacity;
      petal.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    }
  }

  /* ----------------------------------------------------------
     Rising flowers — when scrolling toward bottom page
     Flowers emerge from below and float up
     ---------------------------------------------------------- */
  let risingContainer = null;
  function ensureRisingContainer() {
    if (risingContainer) return risingContainer;
    risingContainer = document.createElement('div');
    risingContainer.className = 'rising-flowers-container';
    risingContainer.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 4;
      overflow: hidden;
    `;
    sectionBottom.appendChild(risingContainer);
    const colors = ['#d63031','#e67e22','#27ae60','#2980b9'];
    for (let i = 0; i < 14; i++) {
      const flower = document.createElement('div');
      const color = colors[i % 4];
      const left = 4 + Math.random() * 92;
      const delay = Math.random();
      const size = 24 + Math.random() * 18;
      flower.dataset.delay = delay;
      flower.dataset.left = left;
      flower.dataset.size = size;
      flower.style.cssText = `
        position: absolute; left: ${left}%; bottom: -60px;
        width: ${size}px; height: ${size}px;
        opacity: 0;
      `;
      // Mini hibiscus (5 petals + center)
      flower.innerHTML = `<svg viewBox="-30 -30 60 60" width="${size}" height="${size}">
        ${[0,72,144,216,288].map((r,j) => 
          `<path d="M0,0 C-12,-5 -22,-19 -19,-32 C-17,-42 -7,-44 0,-35 C7,-44 17,-42 19,-32 C22,-19 12,-5 0,0Z" fill="${color}" opacity="${0.55 + j*0.04}" transform="rotate(${r})"/>`).join('')}
        <circle r="3" fill="#222" opacity="0.6"/>
      </svg>`;
      risingContainer.appendChild(flower);
    }
    return risingContainer;
  }

  function updateRisingFlowers(bottomProgress) {
    if (bottomProgress < 0.02) {
      if (risingContainer) risingContainer.style.display = 'none';
      return;
    }
    const container = ensureRisingContainer();
    container.style.display = 'block';
    const flowers = container.children;
    const vh = window.innerHeight;
    for (let i = 0; i < flowers.length; i++) {
      const flower = flowers[i];
      const delay = parseFloat(flower.dataset.delay);
      const local = clamp((bottomProgress - delay * 0.4) / (1 - delay * 0.4), 0, 1);
      const y = -local * vh * 1.1; // rise up from bottom
      const x = Math.sin(local * Math.PI + i * 0.5) * 25;
      const opacity = local > 0.05 ? easeOut(Math.min(local * 1.5, 1)) * 0.85 : 0;
      const rotation = local * 180;
      flower.style.opacity = opacity;
      flower.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
    }
  }

  // Hook scroll listener
  window.addEventListener('scroll', onScroll, { passive: true });
  // Initial state
  updateScrollAnimations();

})();
