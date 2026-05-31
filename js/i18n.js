/* ============================================================
   5-Color Flower Language Switcher
   Uses the EXACT hibiscus design from homepage_garden_final.svg:
   - Per flower: 5 petals with varying opacity (0.57-0.72) for watercolor effect
   - Dark center + stem + yellow accent
   - Same base hex colors (#d63031 / #e67e22 / #27ae60 / #2980b9 / #7f8c8d)
   ============================================================ */

(function () {
  'use strict';

  const LANGS = [
    { code: 'ms',   color: '#27ae60', deep: '#145a30', stroke: '#20804a', label: 'Bahasa Melayu' },
    { code: 'zh',   color: '#d63031', deep: '#8b1a1a', stroke: '#c43030', label: '华语' },
    { code: 'ta',   color: '#e67e22', deep: '#8b4a10', stroke: '#c06820', label: 'தமிழ்' },
    { code: 'en',   color: '#2980b9', deep: '#14456b', stroke: '#2070a0', label: 'English' },
    { code: 'jawi', color: '#7f8c8d', deep: '#3a4244', stroke: '#5d686a', label: 'جاوي' }
  ];

  const STORAGE_KEY = 'lang-preference';
  const DEFAULT_LANG = 'ms';

  // The exact petal path from homepage_garden_final.svg #fr def
  // ALL flowers use this same path — equal size per memory #29
  const PETAL_PATH = 'M0,0 C-16,-7 -28,-25 -25,-42 C-22,-55 -9,-58 0,-46 C9,-58 22,-55 25,-42 C28,-25 16,-7 0,0Z';

  // Opacity pattern per petal (0°, 72°, 144°, 216°, 288°) — creates watercolor effect
  // Identical for all 5 languages (no Jawi-fade in switcher context — all langs are equal options)
  const PETAL_OPACITIES = [0.68, 0.62, 0.57, 0.65, 0.72];

  /* ----------------------------------------------------------
     Build a single hibiscus flower with watercolor petals
     All flowers identical in size — only color varies
     ---------------------------------------------------------- */
  function buildHibiscus(svgNS, lang, scale = 1) {
    const flower = document.createElementNS(svgNS, 'g');
    flower.setAttribute('transform', `scale(${scale})`);

    // 5 petals at 72° apart, each with slightly different opacity
    for (let i = 0; i < 5; i++) {
      const petal = document.createElementNS(svgNS, 'path');
      petal.setAttribute('d', PETAL_PATH);
      petal.setAttribute('fill', lang.color);
      petal.setAttribute('opacity', PETAL_OPACITIES[i]);
      petal.setAttribute('transform', `rotate(${i * 72})`);
      flower.appendChild(petal);
    }

    // Dark center — same size for all
    const center = document.createElementNS(svgNS, 'circle');
    center.setAttribute('r', 5);
    center.setAttribute('fill', lang.deep);
    flower.appendChild(center);

    // Stem (going up from center)
    const stem = document.createElementNS(svgNS, 'line');
    stem.setAttribute('y2', '-26');
    stem.setAttribute('stroke', lang.stroke);
    stem.setAttribute('stroke-width', '1.8');
    stem.setAttribute('stroke-linecap', 'round');
    flower.appendChild(stem);

    // Yellow accent at top
    const accent = document.createElementNS(svgNS, 'circle');
    accent.setAttribute('cy', '-26');
    accent.setAttribute('r', '1.8');
    accent.setAttribute('fill', '#e8c840');
    flower.appendChild(accent);

    return flower;
  }

  /* ----------------------------------------------------------
     Build the switcher: 5 hibiscus arranged as petals of a larger hibiscus
     Per memory #29: circular composition removes ranking implication
     ---------------------------------------------------------- */
  function buildSwitcher(currentLang) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 240');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Language switcher — 5 hibiscus petals');

    const cx = 120, cy = 120, r = 56;

    LANGS.forEach((lang, i) => {
      // Position around a circle, starting at top
      const angle = (i * 72 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      const isActive = lang.code === currentLang;

      // Click target wrapper
      const wrap = document.createElementNS(svgNS, 'g');
      wrap.setAttribute('class', `lang-petal ${isActive ? 'active' : ''}`);
      wrap.setAttribute('transform', `translate(${x},${y})`);
      wrap.setAttribute('data-lang', lang.code);
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', `Switch to ${lang.label}`);

      // The hibiscus itself — same scale for ALL flowers (equal-size petals of larger flower)
      const flower = buildHibiscus(svgNS, lang, 0.58);
      wrap.appendChild(flower);

      // Active state ring (only indicator — does NOT change flower size or color)
      if (isActive) {
        const ring = document.createElementNS(svgNS, 'circle');
        ring.setAttribute('r', '30');
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', lang.color);
        ring.setAttribute('stroke-width', '1.2');
        ring.setAttribute('opacity', '0.55');
        ring.setAttribute('stroke-dasharray', '3 3');
        wrap.appendChild(ring);
      }

      svg.appendChild(wrap);
    });

    return svg;
  }

  /* ----------------------------------------------------------
     Apply language to page
     ---------------------------------------------------------- */
  function applyLanguage(code) {
    document.documentElement.setAttribute('data-lang', code);

    document.querySelectorAll('[data-lang-content]').forEach(el => {
      const isMatch = el.dataset.langContent === code;
      el.style.display = isMatch ? '' : 'none';
    });

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
    if (!placeholder) return;

    const currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

    placeholder.innerHTML = '';
    placeholder.appendChild(buildSwitcher(currentLang));
    attachHandlers(placeholder);

    document.documentElement.setAttribute('data-lang', currentLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose hibiscus builder for reuse (e.g., future Hub map clusters)
  window.HibiscusBuilder = {
    buildHibiscus: (svgRoot, langCode, scale) => {
      const lang = LANGS.find(l => l.code === langCode);
      return lang ? buildHibiscus(svgRoot.namespaceURI, lang, scale) : null;
    },
    applyLanguage,
    LANGS
  };

})();
