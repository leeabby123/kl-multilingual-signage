/* ============================================================
   Main JS — SPA navigation (index.html only)
   Handles: scroll-to-middle on load, scroll nav between 3 sections
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

  // Set scroll position before paint to avoid flash
  scrollToMiddle('instant');
  // Reveal once positioned
  requestAnimationFrame(() => root.classList.remove('loading'));

  // Re-scroll on full page load (handles late-arriving fonts/SVG)
  window.addEventListener('load', () => {
    if (!sessionStorage.getItem('scrolled-from-middle')) {
      scrollToMiddle('instant');
    }
  });

  /* ----------------------------------------------------------
     2. Scroll cue clicks (large up/down arrows)
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
     3. Enter Hub button — navigates to hub.html, remembers source
     ---------------------------------------------------------- */
  document.querySelectorAll('[data-enter-hub]').forEach(btn => {
    btn.addEventListener('click', () => {
      const source = btn.dataset.enterHub; // 'top' or 'bottom'
      sessionStorage.setItem('hub-source', source);
      window.location.href = 'pages/hub.html';
    });
  });

  /* ----------------------------------------------------------
     4. Keyboard navigation (arrow keys)
     ---------------------------------------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const currentScroll = window.scrollY;
    const vh = window.innerHeight;

    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      if (currentScroll < vh * 0.5) {
        // Currently at top → middle
        e.preventDefault();
        sectionMiddle.scrollIntoView({ behavior: 'smooth' });
      } else if (currentScroll < vh * 1.5) {
        // Currently at middle → bottom
        e.preventDefault();
        sectionBottom.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      if (currentScroll > vh * 1.5) {
        // Currently at bottom → middle
        e.preventDefault();
        sectionMiddle.scrollIntoView({ behavior: 'smooth' });
      } else if (currentScroll > vh * 0.5) {
        // Currently at middle → top
        e.preventDefault();
        sectionTop.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      scrollToMiddle('smooth');
    }
  });

})();
