/* ============================================================
   5-Color Flower Language Switcher
   Per memory #29 (locked 5/31):
   - 5 EQUAL-size watercolor hibiscus arranged as petals of a larger hibiscus
   - Labels next to each flower in that language's own script
   - NO hover animation (no scale, no transform — fixes shaking bug)
   - Click-only switching
   - Scroll-bound opacity (per memory #11)
   ============================================================ */

(function () {
  'use strict';

  const LANGS = [
    { code: 'ms',   color: '#27ae60', deep: '#145a30', stroke: '#20804a',
      label: 'Bahasa Melayu', labelClass: '' },
    { code: 'zh',   color: '#d63031', deep: '#8b1a1a', stroke: '#c43030',
      label: '华语', labelClass: 'lang-label--zh' },
    { code: 'ta',   color: '#e67e22', deep: '#8b4a10', stroke: '#c06820',
      label: 'தமிழ்', labelClass: 'lang-label--ta' },
    { code: 'en',   color: '#2980b9', deep: '#14456b', stroke: '#2070a0',
      label: 'English', labelClass: '' },
    { code: 'jawi', color: '#7f8c8d', deep: '#3a4244', stroke: '#5d686a',
      label: 'جاوي', labelClass: 'lang-label--jawi' }
  ];

  const STORAGE_KEY = 'lang-preference';
  const DEFAULT_LANG = 'en';        // per memory #29: default English, switcher changes

  // Exact petal path from homepage_garden_final.svg #fr def
  const PETAL_PATH = 'M0,0 C-16,-7 -28,-25 -25,-42 C-22,-55 -9,-58 0,-46 C9,-58 22,-55 25,-42 C28,-25 16,-7 0,0Z';
  // 5-petal opacity pattern creating watercolor effect — locked in memory #29
  const PETAL_OPACITIES = [0.68, 0.62, 0.57, 0.65, 0.72];

  /* ----------------------------------------------------------
     Build a single hibiscus flower — ALL identical in size
     ---------------------------------------------------------- */
  function buildHibiscus(svgNS, lang, scale = 1) {
    const flower = document.createElementNS(svgNS, 'g');
    flower.setAttribute('transform', `scale(${scale})`);

    for (let i = 0; i < 5; i++) {
      const petal = document.createElementNS(svgNS, 'path');
      petal.setAttribute('d', PETAL_PATH);
      petal.setAttribute('fill', lang.color);
      petal.setAttribute('opacity', PETAL_OPACITIES[i]);
      petal.setAttribute('transform', `rotate(${i * 72})`);
      flower.appendChild(petal);
    }

    const center = document.createElementNS(svgNS, 'circle');
    center.setAttribute('r', 5);
    center.setAttribute('fill', lang.deep);
    flower.appendChild(center);

    const stem = document.createElementNS(svgNS, 'line');
    stem.setAttribute('y2', '-26');
    stem.setAttribute('stroke', lang.stroke);
    stem.setAttribute('stroke-width', '1.8');
    stem.setAttribute('stroke-linecap', 'round');
    flower.appendChild(stem);

    const accent = document.createElementNS(svgNS, 'circle');
    accent.setAttribute('cy', '-26');
    accent.setAttribute('r', '1.8');
    accent.setAttribute('fill', '#e8c840');
    flower.appendChild(accent);

    return flower;
  }

  /* ----------------------------------------------------------
     Build the full switcher SVG
     5 flowers + 5 text labels next to each + 5 invisible click targets
     ---------------------------------------------------------- */
  function buildSwitcher(currentLang) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    // ViewBox big enough to accommodate flowers + labels around them
    svg.setAttribute('viewBox', '0 0 240 240');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Language switcher — 5 hibiscus petals');

    const cx = 120, cy = 120, r = 62;

    LANGS.forEach((lang, i) => {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      // Compute label position — radially OUTSIDE the flower
      const labelR = 100;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);

      // Text anchor depends on which side of the circle the label is on
      let textAnchor = 'middle';
      if (lx > cx + 8) textAnchor = 'start';
      else if (lx < cx - 8) textAnchor = 'end';

      const isActive = lang.code === currentLang;

      // Wrapper group with click target
      const wrap = document.createElementNS(svgNS, 'g');
      wrap.setAttribute('class', `lang-petal ${isActive ? 'active' : ''}`);
      wrap.setAttribute('data-lang', lang.code);
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', `Switch language to ${lang.label}`);

      // Invisible hit circle (encompasses flower + nearby area for easy clicking)
      const hit = document.createElementNS(svgNS, 'circle');
      hit.setAttribute('cx', x);
      hit.setAttribute('cy', y);
      hit.setAttribute('r', '22');
      hit.setAttribute('class', 'lang-petal-hit');
      wrap.appendChild(hit);

      // Flower (positioned but NEVER transformed on hover)
      const flowerGroup = document.createElementNS(svgNS, 'g');
      flowerGroup.setAttribute('transform', `translate(${x},${y})`);
      flowerGroup.appendChild(buildHibiscus(svgNS, lang, 0.5));
      wrap.appendChild(flowerGroup);

      // Active state: dashed ring (only indicator — no size/color change)
      if (isActive) {
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('cx', x);
        ring.setAttribute('cy', y);
        ring.setAttribute('r', '26');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', lang.color);
        ring.setAttribute('stroke-width', '1.5');
        ring.setAttribute('opacity', '0.7');
        ring.setAttribute('stroke-dasharray', '3 3');
        wrap.appendChild(ring);
      }

      // Label text — in that language's own script
      const label = document.createElementNS(svgNS, 'text');
      label.setAttribute('x', lx);
      label.setAttribute('y', ly + 4);  // +4 for baseline tweak
      label.setAttribute('text-anchor', textAnchor);
      label.setAttribute('class', `lang-label ${lang.labelClass}`);
      label.textContent = lang.label;
      wrap.appendChild(label);

      svg.appendChild(wrap);
    });

    return svg;
  }

  /* ----------------------------------------------------------
     Apply language to page
     ---------------------------------------------------------- */
  function applyLanguage(code) {
    document.documentElement.setAttribute('data-lang', code);

    // Update page <html lang> for accessibility
    document.documentElement.setAttribute('lang', code === 'jawi' ? 'ms-Arab' : code);

    // For Jawi, swap title direction
    if (code === 'jawi') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }

    // Rebuild switcher to reflect new active state
    const placeholder = document.querySelector('.lang-switcher');
    if (placeholder) {
      placeholder.innerHTML = '';
      placeholder.appendChild(buildSwitcher(code));
      attachHandlers(placeholder);
    }

    localStorage.setItem(STORAGE_KEY, code);
  }

  function attachHandlers(placeholder) {
    placeholder.querySelectorAll('.lang-petal').forEach(petal => {
      petal.addEventListener('click', () => applyLanguage(petal.dataset.lang));
      petal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          applyLanguage(petal.dataset.lang);
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  function init() {
    const placeholder = document.querySelector('.lang-switcher');
    const currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

    // Set data-lang on <html> early so CSS selectors apply before any visible flash
    document.documentElement.setAttribute('data-lang', currentLang);
    document.documentElement.setAttribute('lang', currentLang === 'jawi' ? 'ms-Arab' : currentLang);

    if (!placeholder) return;

    placeholder.innerHTML = '';
    placeholder.appendChild(buildSwitcher(currentLang));
    attachHandlers(placeholder);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose hibiscus builder for reuse (future Hub map clusters)
  window.HibiscusBuilder = {
    buildHibiscus: (svgRoot, langCode, scale) => {
      const lang = LANGS.find(l => l.code === langCode);
      return lang ? buildHibiscus(svgRoot.namespaceURI, lang, scale) : null;
    },
    applyLanguage,
    LANGS
  };

})();
