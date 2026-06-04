

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

  const PETAL_PATH = 'M0,0 C-16,-7 -28,-25 -25,-42 C-22,-55 -9,-58 0,-46 C9,-58 22,-55 25,-42 C28,-25 16,-7 0,0Z';
  const PETAL_OPACITIES = [0.68, 0.62, 0.57, 0.65, 0.72];

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

  function buildSwitcher(currentLang) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 240');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Language switcher — 5 hibiscus petals');

    const cx = 120, cy = 120, r = 62;

    LANGS.forEach((lang, i) => {
      const angle = (i * 72 - 90) * Math.PI / 180;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      const labelR = 100;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);

      let textAnchor = 'middle';
      if (lx > cx + 8) textAnchor = 'start';
      else if (lx < cx - 8) textAnchor = 'end';

      const isActive = lang.code === currentLang;

      const wrap = document.createElementNS(svgNS, 'g');
      wrap.setAttribute('class', `lang-petal ${isActive ? 'active' : ''}`);
      wrap.setAttribute('data-lang', lang.code);
      wrap.setAttribute('role', 'button');
      wrap.setAttribute('tabindex', '0');
      wrap.setAttribute('aria-label', `Switch language to ${lang.label}`);

      const hit = document.createElementNS(svgNS, 'circle');
      hit.setAttribute('cx', x);
      hit.setAttribute('cy', y);
      hit.setAttribute('r', '22');
      hit.setAttribute('class', 'lang-petal-hit');
      wrap.appendChild(hit);

      const flowerGroup = document.createElementNS(svgNS, 'g');
      flowerGroup.setAttribute('transform', `translate(${x},${y})`);
      flowerGroup.appendChild(buildHibiscus(svgNS, lang, 0.5));
      wrap.appendChild(flowerGroup);

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

  function applyLanguage(code) {
    document.documentElement.setAttribute('data-lang', code);

    document.documentElement.setAttribute('lang', code === 'jawi' ? 'ms-Arab' : code);

    if (code === 'jawi') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }

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

  function injectLangInfoButton() {
    if (document.querySelector('.lang-info-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'lang-info-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Show language key');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'lang-info-popup');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"/>' +
      '<line x1="12" y1="16" x2="12" y2="11"/>' +
      '<circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>' +
      '</svg>';

    const popup = document.createElement('div');
    popup.className = 'lang-info-popup';
    popup.id = 'lang-info-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-labelledby', 'lang-info-title');
    popup.hidden = true;
    popup.innerHTML =
      '<div class="lang-info-title" id="lang-info-title">Languages on signage</div>' +
      '<ul class="lang-info-list">' +
        '<li><span class="lang-info-dot" style="background:#27ae60"></span><span class="lang-info-name">Bahasa Melayu</span><span class="lang-info-en">Malay</span></li>' +
        '<li><span class="lang-info-dot" style="background:#d63031"></span><span class="lang-info-name">华语</span><span class="lang-info-en">Chinese</span></li>' +
        '<li><span class="lang-info-dot" style="background:#e67e22"></span><span class="lang-info-name">தமிழ்</span><span class="lang-info-en">Tamil</span></li>' +
        '<li><span class="lang-info-dot" style="background:#2980b9"></span><span class="lang-info-name">English</span><span class="lang-info-en">English</span></li>' +
        '<li><span class="lang-info-dot" style="background:#7f8c8d"></span><span class="lang-info-name">جاوي</span><span class="lang-info-en">Jawi · Malay in Arabic script</span></li>' +
      '</ul>';

    document.body.appendChild(btn);
    document.body.appendChild(popup);

    function close() {
      btn.setAttribute('aria-expanded', 'false');
      popup.hidden = true;
    }
    function open() {
      btn.setAttribute('aria-expanded', 'true');
      popup.hidden = false;
    }
    function toggle() {
      if (popup.hidden) open(); else close();
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    popup.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', () => {
      if (!popup.hidden) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popup.hidden) {
        close();
        btn.focus();
      }
    });
  }

  function init() {
    const placeholder = document.querySelector('.lang-switcher');
    const currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;

    document.documentElement.setAttribute('data-lang', currentLang);
    document.documentElement.setAttribute('lang', currentLang === 'jawi' ? 'ms-Arab' : currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'jawi' ? 'rtl' : 'ltr');

    injectLangInfoButton();

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

  window.HibiscusBuilder = {
    buildHibiscus: (svgRoot, langCode, scale) => {
      const lang = LANGS.find(l => l.code === langCode);
      return lang ? buildHibiscus(svgRoot.namespaceURI, lang, scale) : null;
    },
    applyLanguage,
    LANGS
  };

})();
