/* ==========================================================
   engagement-garden.js · The Garden That Grew
   ----------------------------------------------------------
   Interactive engagement tracker for AQC7015 capstone.
   12 events × 5 members planted as hibiscus flowers along a
   winding watercolor path from top-left to bottom-right.
   Time slider scrubs through Feb 16 → Jun 10; autoplay
   animates the project's growth in 8 seconds.
   ========================================================== */
(function () {
  'use strict';

  /* ==========================================================
     DATA — 12 events spanning the AQC7015 capstone project
     t = position along path (0 = Feb 16, 1 = Jun 10)
     Each member's flower of an event blooms at the same t but
     is offset perpendicular to the path by their member.offset.
     ========================================================== */
  const EVENTS = [
    {
      id: 1, t: 0.000, phase: 1, key: false,
      date: { en: 'Feb 16', ms: '16 Feb', zh: '2/16', ta: 'பிப் 16', jawi: '١٦ فيب' },
      title: {
        en: 'Topic locked + TEI/Voyant training + pilot 3 signs',
        ms: 'Topik dimuktamadkan + TEI/Voyant + 3 papan tanda perintis',
        zh: '选题锁定 + TEI/Voyant 培训 + pilot 3 块',
        ta: 'தலைப்பு உறுதி + TEI/Voyant பயிற்சி + 3 சோதனை பலகைகள்',
        jawi: 'توڤيق ديتتڤكن + لاتيهن TEI/Voyant + ٣ ڤاڤن تنده ڤرينتيس',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
    {
      id: 2, t: 0.465, phase: 2, key: false,
      date: { en: 'Apr 10', ms: '10 Apr', zh: '4/10', ta: 'ஏப் 10', jawi: '١٠ اڤريل' },
      title: {
        en: 'Group proposal drafted + first sampling round',
        ms: 'Cadangan kumpulan + pusingan pensampelan pertama',
        zh: '小组提案撰写 + 第一轮采样',
        ta: 'குழு முன்மொழிவு வரைவு + முதல் சுற்று மாதிரி',
        jawi: 'چادڠن كومڤولن + ڤوسيڠن ڤنسامڤلن ڤرتام',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
    {
      id: 3, t: 0.550, phase: 2, key: true,
      date: { en: 'Apr 19-20', ms: '19-20 Apr', zh: '4/19-20', ta: 'ஏப் 19-20', jawi: '١٩-٢٠ اڤريل' },
      title: {
        en: 'Group Proposal + CS1 Lingscape submitted',
        ms: 'Cadangan Kumpulan + CS1 Lingscape dihantar',
        zh: 'Group Proposal + CS1 Lingscape 提交',
        ta: 'குழு முன்மொழிவு + CS1 Lingscape சமர்ப்பித்தது',
        jawi: 'چادڠن كومڤولن + CS1 Lingscape ديهنتر',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
    {
      id: 4, t: 0.815, phase: 3, key: true,
      date: { en: 'May 20', ms: '20 Mei', zh: '5/20', ta: 'மே 20', jawi: '٢٠ ماي' },
      title: {
        en: 'CS2 Information Literacy submitted',
        ms: 'CS2 Literasi Maklumat dihantar',
        zh: 'CS2 信息素养 提交',
        ta: 'CS2 தகவல் கல்வியறிவு சமர்ப்பித்தது',
        jawi: 'CS2 ليتراسي معلومت ديهنتر',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
    {
      id: 5, t: 0.870, phase: 3, key: false,
      date: { en: 'May 26', ms: '26 Mei', zh: '5/26', ta: 'மே 26', jawi: '٢٦ ماي' },
      title: {
        en: 'Kampung Baru · 15 signs sampled (Round 2)',
        ms: 'Kampung Baru · 15 papan tanda (Pusingan 2)',
        zh: '甘榜峇鲁 · 第二轮 15 块采样',
        ta: 'கம்போங் பாரு · 15 பலகைகள் (சுற்று 2)',
        jawi: 'كامڤوڠ بارو · ١٥ ڤاڤن تنده (ڤوسيڠن ٢)',
      },
      members: ['A'],
    },
    {
      id: 6, t: 0.879, phase: 3, key: false,
      date: { en: 'May 27', ms: '27 Mei', zh: '5/27', ta: 'மே 27', jawi: '٢٧ ماي' },
      title: {
        en: 'Petaling Street · 15 signs sampled (Round 2)',
        ms: 'Petaling Street · 15 papan tanda (Pusingan 2)',
        zh: '茨厂街 · 第二轮 15 块采样',
        ta: 'பெட்டாலிங் தெரு · 15 பலகைகள் (சுற்று 2)',
        jawi: 'ڤيتاليڠ ستريت · ١٥ ڤاڤن تنده (ڤوسيڠن ٢)',
      },
      members: ['B'],
    },
    {
      id: 7, t: 0.888, phase: 3, key: false,
      date: { en: 'May 28', ms: '28 Mei', zh: '5/28', ta: 'மே 28', jawi: '٢٨ ماي' },
      title: {
        en: 'Bukit Bintang · 15 signs sampled (Round 2)',
        ms: 'Bukit Bintang · 15 papan tanda (Pusingan 2)',
        zh: '武吉免登 · 第二轮 15 块采样',
        ta: 'புக்கிட் பிந்தாங் · 15 பலகைகள் (சுற்று 2)',
        jawi: 'بوكيت بينتڠ · ١٥ ڤاڤن تنده (ڤوسيڠن ٢)',
      },
      members: ['C'],
    },
    {
      id: 8, t: 0.897, phase: 3, key: false,
      date: { en: 'May 29', ms: '29 Mei', zh: '5/29', ta: 'மே 29', jawi: '٢٩ ماي' },
      title: {
        en: 'Little India · 15 signs sampled (Round 2)',
        ms: 'Little India · 15 papan tanda (Pusingan 2)',
        zh: '小印度 · 第二轮 15 块采样',
        ta: 'லிட்டில் இந்தியா · 15 பலகைகள் (சுற்று 2)',
        jawi: 'ليتيل اينديا · ١٥ ڤاڤن تنده (ڤوسيڠن ٢)',
      },
      members: ['D'],
    },
    {
      id: 9, t: 0.906, phase: 3, key: false,
      date: { en: 'May 30', ms: '30 Mei', zh: '5/30', ta: 'மே 30', jawi: '٣٠ ماي' },
      title: {
        en: '60-sign master sheet handover + 8 findings locked',
        ms: 'Penyerahan helaian induk 60 papan + 8 penemuan dimuktamadkan',
        zh: '60 块数据移交 + 8 findings 锁定',
        ta: '60 பலகைகள் முதன்மை தாள் + 8 கண்டுபிடிப்புகள் உறுதி',
        jawi: 'ڤڽراهن هلاين اينڈوق ٦٠ ڤاڤن + ٨ ڤنموان ديتتڤكن',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
    {
      id: 10, t: 0.915, phase: 4, key: true,
      date: { en: 'May 31', ms: '31 Mei', zh: '5/31', ta: 'மே 31', jawi: '٣١ ماي' },
      title: {
        en: 'Phase 1 website live · visual baseline stable',
        ms: 'Laman web Fasa 1 dilancarkan · garis dasar visual stabil',
        zh: 'Phase 1 网站上线 · 视觉基线稳定',
        ta: 'கட்டம் 1 இணையதளம் நேரலை · காட்சி அடிப்படை நிலையான',
        jawi: 'لامن ويب فاسا ١ ديلنچركن · ݢاريس داسر ۏيسوال ستابيل',
      },
      members: ['E'],
    },
    {
      id: 11, t: 0.974, phase: 4, key: false,
      date: { en: 'Jun 7', ms: '7 Jun', zh: '6/7', ta: 'ஜூன் 7', jawi: '٧ جون' },
      title: {
        en: 'Phase 2 integration complete + full-team internal testing',
        ms: 'Integrasi Fasa 2 selesai + ujian dalaman pasukan penuh',
        zh: 'Phase 2 集成完成 + 全员内部测试',
        ta: 'கட்டம் 2 ஒருங்கிணைப்பு + முழு-குழு உள் சோதனை',
        jawi: 'اينتيݢراسي فاسا ٢ سلسأي + اوجين دالمن ڤاسوكن ڤنوه',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
    {
      id: 12, t: 1.000, phase: 4, key: true,
      date: { en: 'Jun 8 → 10', ms: '8 → 10 Jun', zh: '6/8 → 10', ta: 'ஜூன் 8 → 10', jawi: '٨ → ١٠ جون' },
      title: {
        en: 'Final submission + in-class presentation',
        ms: 'Penyerahan akhir + pembentangan dalam kelas',
        zh: '最终提交 + 课堂展示',
        ta: 'இறுதி சமர்ப்பணம் + வகுப்பறை வழங்கல்',
        jawi: 'ڤڽراهن اخير + ڤمبنتڠن دالم كلس',
      },
      members: ['A', 'B', 'C', 'D', 'E'],
    },
  ];

  /* ==========================================================
     MEMBERS — color, hibiscus symbol, perpendicular offset
     from path. Color = district language (A green=KB Malay,
     B red=PS Chinese, C blue=BB English, D orange=LI Tamil,
     E gray=Jawi → the developer who crosses all territories).
     Offset places each member's flowers in a fixed "row" or
     "band" parallel to the winding path, creating five ribbons
     that wind together.
     ========================================================== */
  const MEMBERS = {
    A: { name: 'LIAO RUIXUAN', district: 'Kampung Baru',  langColor: 'ms',   offset: -100, hibiscus: 'garden-hG'  },
    B: { name: 'WEI JITAO',    district: 'Petaling Street',langColor: 'zh',   offset:  -50, hibiscus: 'garden-hR'  },
    E: { name: 'LI BINGYI',    district: 'Web Development',langColor: 'jawi', offset:    0, hibiscus: 'garden-hGy' },
    C: { name: 'CHEN MEILIN',  district: 'Bukit Bintang',  langColor: 'en',   offset:   50, hibiscus: 'garden-hB'  },
    D: { name: 'WEI HONGHAI',  district: 'Little India',   langColor: 'ta',   offset:  100, hibiscus: 'garden-hO'  },
  };

  /* ==========================================================
     PHASES — 4 signposts mark the boundaries on the path
     ========================================================== */
  const PHASES = [
    { id: 1, tEnd: 0.40, name: { en: 'Preparation',     ms: 'Persediaan',  zh: '准备期',    ta: 'தயாரிப்பு',     jawi: 'ڤرسدياءن' } },
    { id: 2, tEnd: 0.60, name: { en: 'Proposal & CS',   ms: 'Cadangan',    zh: '提案与案例', ta: 'முன்மொழிவு',    jawi: 'چادڠن' } },
    { id: 3, tEnd: 0.91, name: { en: 'Fieldwork',       ms: 'Kerja Lapangan', zh: '田野与分析', ta: 'கள ஆய்வு',      jawi: 'كرجا لاڤڠن' } },
    { id: 4, tEnd: 1.00, name: { en: 'Delivery',        ms: 'Penyerahan',  zh: '网站与交付', ta: 'விநியோகம்',     jawi: 'ڤڽراهن' } },
  ];

  /* ==========================================================
     GEOMETRY: get path point + perpendicular normal at t∈[0,1]
     ========================================================== */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const path = document.getElementById('timePath');
  if (!path) {
    console.warn('[garden] timePath not found — aborting');
    return;
  }
  const pathLen = path.getTotalLength();

  function pointAtT(t) {
    const lenAt = Math.max(0.01, Math.min(pathLen - 0.01, t * pathLen));
    const pt = path.getPointAtLength(lenAt);
    const ptAhead = path.getPointAtLength(Math.min(lenAt + 1.5, pathLen));
    const dx = ptAhead.x - pt.x;
    const dy = ptAhead.y - pt.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    // Normal vector: rotate (dx,dy) by 90° CCW = (-dy, dx)
    // Positive offset = "right" side of forward direction (path → BR)
    // For our path going right-and-down, +offset = lower-right (TA orange side)
    return { x: pt.x, y: pt.y, nx: -dy / len, ny: dx / len };
  }

  // Deterministic pseudo-random — same seed → same value
  function seedRand(seed) {
    let s = (seed * 9301 + 49297) % 233280;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  /* ==========================================================
     RENDER: plant all flowers along the path
     ========================================================== */
  const flowersGroup = document.getElementById('flowers');
  const flowerEls = [];     // [{el, t, member, eventIdx}]

  function plantFlowers() {
    flowersGroup.innerHTML = '';
    flowerEls.length = 0;

    EVENTS.forEach((event, eventIdx) => {
      event.members.forEach((memberId, memberIdx) => {
        const member = MEMBERS[memberId];
        // Deterministic jitter per (event, member) pair
        const rand = seedRand(event.id * 100 + memberId.charCodeAt(0));
        const jitterPerp = (rand() - 0.5) * 18;     // ±9 px perpendicular
        const jitterAlong = (rand() - 0.5) * 0.006;  // tiny temporal jitter

        const t = Math.max(0, Math.min(1, event.t + jitterAlong));
        const p = pointAtT(t);
        const totalOffset = member.offset + jitterPerp;
        const x = p.x + p.nx * totalOffset;
        const y = p.y + p.ny * totalOffset;

        // Key milestones (CS1/CS2/Phase 1/Final) bloom +50% larger
        const scale = event.key ? 0.36 : 0.24;

        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', 'flower bloomed');
        g.setAttribute('transform', `translate(${x},${y}) scale(${scale})`);
        g.dataset.t = t;
        g.dataset.member = memberId;
        g.dataset.eventIdx = eventIdx;

        const use = document.createElementNS(SVG_NS, 'use');
        use.setAttribute('href', '#' + member.hibiscus);
        g.appendChild(use);

        flowersGroup.appendChild(g);
        flowerEls.push({ el: g, t, member: memberId, eventIdx });
      });
    });

    // Sort children visually so flowers later in time render on top of
    // earlier ones — gives a nice front-to-back bloom layering
    const sorted = Array.from(flowersGroup.children).sort(
      (a, b) => parseFloat(a.dataset.t) - parseFloat(b.dataset.t)
    );
    sorted.forEach(el => flowersGroup.appendChild(el));
  }

  /* ==========================================================
     RENDER: phase signposts (small wooden planks beside path)
     ========================================================== */
  function plantSignposts() {
    const group = document.getElementById('signposts');
    if (!group) return;
    group.innerHTML = '';

    PHASES.forEach((phase, idx) => {
      if (idx === PHASES.length - 1) return; // last phase doesn't need a signpost (it's the endpoint)
      const t = phase.tEnd;
      const p = pointAtT(t);
      // Signpost sits on the LEFT side of path (-180 offset)
      const sideOffset = -180;
      const sx = p.x + p.nx * sideOffset;
      const sy = p.y + p.ny * sideOffset;

      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'signpost');
      g.setAttribute('transform', `translate(${sx},${sy})`);

      // Wooden post (vertical line)
      const post = document.createElementNS(SVG_NS, 'rect');
      post.setAttribute('class', 'signpost-post');
      post.setAttribute('x', '-1.5');
      post.setAttribute('y', '0');
      post.setAttribute('width', '3');
      post.setAttribute('height', '24');
      g.appendChild(post);

      // Plank
      const plank = document.createElementNS(SVG_NS, 'rect');
      plank.setAttribute('class', 'signpost-plank');
      plank.setAttribute('x', '-32');
      plank.setAttribute('y', '-12');
      plank.setAttribute('width', '64');
      plank.setAttribute('height', '14');
      plank.setAttribute('rx', '1');
      g.appendChild(plank);

      // Label (current language)
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('class', 'signpost-label');
      text.setAttribute('y', '-1');
      text.dataset.phaseIdx = idx;
      // Initial language from i18n or fallback EN
      const lang = (document.documentElement.dataset.lang) || 'en';
      text.textContent = phase.name[lang] || phase.name.en;
      g.appendChild(text);

      group.appendChild(g);
    });
  }

  /* ==========================================================
     RENDER: small stones / pebbles along the path edge
     decorative texture, no interaction
     ========================================================== */
  function plantStones() {
    const group = document.getElementById('pathDecorations');
    if (!group) return;
    group.innerHTML = '';
    const STONE_COUNT = 28;
    const rand = seedRand(42);
    for (let i = 0; i < STONE_COUNT; i++) {
      const t = i / STONE_COUNT + (rand() - 0.5) * 0.02;
      const p = pointAtT(Math.max(0.01, Math.min(0.99, t)));
      // Random side ± edge offset
      const side = rand() < 0.5 ? -1 : 1;
      const edgeOffset = side * (10 + rand() * 6);
      const sx = p.x + p.nx * edgeOffset;
      const sy = p.y + p.ny * edgeOffset;
      const r = 1.4 + rand() * 1.4;
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('class', 'path-stone');
      c.setAttribute('cx', sx);
      c.setAttribute('cy', sy);
      c.setAttribute('r', r);
      group.appendChild(c);
    }
  }

  /* ==========================================================
     BLOOM STATE: update flowers based on current scrubber t
     Flowers with t > currentT are seeds (faded); ≤ are bloomed.
     Scrubber position also updates here.
     ========================================================== */
  let currentT = 1.0; // default: fully bloomed (slider at right end)
  const scrubber = document.getElementById('scrubber');

  function updateBloom(t) {
    currentT = t;
    flowerEls.forEach(f => {
      if (f.t <= t + 0.002) {
        f.el.classList.add('bloomed');
        f.el.classList.remove('seed');
      } else {
        f.el.classList.add('seed');
        f.el.classList.remove('bloomed');
      }
    });
    if (scrubber) {
      const p = pointAtT(Math.max(0.001, Math.min(0.999, t)));
      scrubber.setAttribute('transform', `translate(${p.x},${p.y})`);
      // Hide scrubber if fully bloomed
      scrubber.style.opacity = (t >= 0.999) ? '0' : '1';
    }
  }

  /* ==========================================================
     FILTER by member chips (multi-select)
     activeMembers empty = show all; otherwise dim non-selected
     ========================================================== */
  const activeMembers = new Set();

  function applyFilter() {
    flowerEls.forEach(f => {
      if (activeMembers.size === 0 || activeMembers.has(f.member)) {
        f.el.classList.remove('faded');
      } else {
        f.el.classList.add('faded');
      }
    });
  }

  document.querySelectorAll('.member-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const memberId = chip.dataset.member;
      if (activeMembers.has(memberId)) {
        activeMembers.delete(memberId);
        chip.setAttribute('aria-pressed', 'false');
      } else {
        activeMembers.add(memberId);
        chip.setAttribute('aria-pressed', 'true');
      }
      applyFilter();
    });
  });

  /* ==========================================================
     SLIDER drag → update bloom in real time
     ========================================================== */
  const slider = document.getElementById('timeSlider');
  if (slider) {
    slider.addEventListener('input', () => {
      const t = parseFloat(slider.value) / 1000;
      updateBloom(t);
    });
  }

  /* ==========================================================
     AUTOPLAY — 8-second sweep from t=0 to t=1
     ========================================================== */
  const autoplayBtn = document.getElementById('autoplayBtn');
  let autoplayRAF = null;

  function stopAutoplay() {
    if (autoplayRAF) {
      cancelAnimationFrame(autoplayRAF);
      autoplayRAF = null;
    }
    if (autoplayBtn) autoplayBtn.classList.remove('playing');
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayBtn.classList.add('playing');
    const duration = 8000;
    const startTime = performance.now();
    // Reset slider to 0
    if (slider) slider.value = 0;
    updateBloom(0);

    function tick(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-out for natural slowing-down at the end
      const eased = 1 - Math.pow(1 - t, 2.2);
      if (slider) slider.value = Math.round(eased * 1000);
      updateBloom(eased);
      if (t < 1) {
        autoplayRAF = requestAnimationFrame(tick);
      } else {
        autoplayRAF = null;
        autoplayBtn.classList.remove('playing');
      }
    }
    autoplayRAF = requestAnimationFrame(tick);
  }

  if (autoplayBtn) {
    autoplayBtn.addEventListener('click', () => {
      if (autoplayRAF) stopAutoplay();
      else startAutoplay();
    });
  }
  // User dragging the slider should stop autoplay
  if (slider) {
    slider.addEventListener('mousedown', stopAutoplay);
    slider.addEventListener('touchstart', stopAutoplay, { passive: true });
  }

  /* ==========================================================
     TOOLTIP — hover/focus on flower → show date + event + member
     ========================================================== */
  const tooltip = document.getElementById('gardenTooltip');
  const ttDate = tooltip.querySelector('.tt-date');
  const ttEvent = tooltip.querySelector('.tt-event');
  const ttMember = tooltip.querySelector('.tt-member');
  const wrap = document.querySelector('.garden-canvas-wrap');

  function getLang() {
    return document.documentElement.dataset.lang || 'en';
  }

  function showTooltip(flowerEl) {
    const eventIdx = parseInt(flowerEl.dataset.eventIdx, 10);
    const memberId = flowerEl.dataset.member;
    const event = EVENTS[eventIdx];
    const member = MEMBERS[memberId];
    const lang = getLang();

    ttDate.textContent = event.date[lang] || event.date.en;
    ttEvent.textContent = event.title[lang] || event.title.en;
    ttMember.textContent = memberId + ' · ' + member.name;
    ttMember.style.color = `var(--color-${member.langColor})`;
    tooltip.hidden = false;

    // Position tooltip relative to flower's screen position
    const flowerBox = flowerEl.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    const cx = flowerBox.left + flowerBox.width / 2 - wrapBox.left;
    const cy = flowerBox.top - wrapBox.top;
    tooltip.style.left = cx + 'px';
    tooltip.style.top = (cy - 4) + 'px';
  }

  function hideTooltip() {
    tooltip.hidden = true;
  }

  flowersGroup.addEventListener('mouseover', (e) => {
    const flower = e.target.closest('.flower');
    if (flower) showTooltip(flower);
  });
  flowersGroup.addEventListener('mouseout', (e) => {
    const flower = e.target.closest('.flower');
    if (flower && !flower.contains(e.relatedTarget)) hideTooltip();
  });

  /* ==========================================================
     LANGUAGE CHANGE: when i18n updates, re-render signpost labels
     The site's i18n.js sets document.documentElement.dataset.lang
     and dispatches a 'languageChanged' event (or we observe attr).
     ========================================================== */
  function refreshSignpostLabels() {
    const lang = getLang();
    document.querySelectorAll('.signpost-label').forEach(text => {
      const idx = parseInt(text.dataset.phaseIdx, 10);
      const phase = PHASES[idx];
      if (phase) text.textContent = phase.name[lang] || phase.name.en;
    });
  }

  // Observe lang attribute change
  const langObserver = new MutationObserver(refreshSignpostLabels);
  langObserver.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-lang', 'lang']
  });

  /* ==========================================================
     BOOTSTRAP
     ========================================================== */
  plantStones();
  plantSignposts();
  plantFlowers();
  updateBloom(1.0); // start fully bloomed
})();
