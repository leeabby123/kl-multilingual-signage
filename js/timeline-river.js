/* ============================================================
   Timeline River — interaction layer (6/4 rebuild)
   - Layer 1: hover any marker → tooltip with member name + per-node contribution
   - Layer 2: click any flower → enter trace mode, dim everyone else
              click empty space (or same flower again) → exit
   - Scroll reveal: nodes fade in as they enter viewport
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Member display names per language ---------- */
  const MEMBER_NAMES = {
    A: { en: 'A · Liao Ruixuan', ms: 'A · Liao Ruixuan', zh: 'A · 廖瑞萱',
         ta: 'A · லியாவ் ருய்சுவான்', jawi: 'A · لياو روي شوءن' },
    B: { en: 'B · Wei Jitao',    ms: 'B · Wei Jitao',    zh: 'B · 韦记韬',
         ta: 'B · வெய் ஜிதாவ்',    jawi: 'B · وي جيتاو' },
    C: { en: 'C · Chen Meilin',  ms: 'C · Chen Meilin',  zh: 'C · 陈美玲',
         ta: 'C · சென் மெய்லின்',  jawi: 'C · چن مي‌لين' },
    D: { en: 'D · Wei Honghai',  ms: 'D · Wei Honghai',  zh: 'D · 韦红海',
         ta: 'D · வெய் ஹோங்காய்',  jawi: 'D · وي هوڠ‌هاي' },
    E: { en: 'E · Li Bingyi',    ms: 'E · Li Bingyi',    zh: 'E · 李冰怡',
         ta: 'E · லீ பிங்யி',     jawi: 'E · لي بيڠ‌يي' }
  };

  /* ---------- Per-node × per-member tooltip text ----------
     Currently zh + en filled. Other langs fall back to en.
     Easy to extend later (just add ms/ta/jawi keys). */
  const TOOLTIPS = {
    'w1-2': {
      A: { en: 'Technologist · joined tool selection and TEI training', zh: 'Technologist · 参与工具选型与 TEI 训练' },
      B: { en: 'Data Steward · joined data planning and TEI training', zh: 'Data Steward · 参与数据规划与 TEI 训练' },
      C: { en: 'Humanist · joined research question framing and TEI training', zh: 'Humanist · 参与研究问题构建与 TEI 训练' },
      D: { en: 'Visualizer · joined visual planning and TEI training', zh: 'Visualizer · 参与视觉方案讨论与 TEI 训练' },
      E: { en: 'Ethicist · independently encoded PS_007 + LI_016 TEI samples', zh: 'Ethicist · 独立编码 PS_007 + LI_016 TEI 示例' }
    },
    'w7-cs1': {
      A: { en: 'Group proposal contributor · submitted individual CS1', zh: '参与 Group Proposal · 提交 CS1（individual）' },
      B: { en: 'Group proposal contributor · submitted individual CS1', zh: '参与 Group Proposal · 提交 CS1（individual）' },
      C: { en: 'Group proposal contributor · submitted individual CS1', zh: '参与 Group Proposal · 提交 CS1（individual）' },
      D: { en: 'Group proposal contributor · submitted individual CS1', zh: '参与 Group Proposal · 提交 CS1（individual）' },
      E: { en: 'Person 2 · wrote RQ1 · submitted CS1 (Lingscape contributory paradox)', zh: 'Person 2 · RQ1 撰写 · 提交 CS1（Lingscape contributory paradox 分析）' }
    },
    'w8-10': {
      A: { en: 'Joined field protocol negotiation · annotation schema discussion', zh: '参与田野协议商定 · 标注架构讨论' },
      B: { en: 'Joined field protocol negotiation · annotation schema discussion', zh: '参与田野协议商定 · 标注架构讨论' },
      C: { en: 'Joined field protocol negotiation · annotation schema discussion', zh: '参与田野协议商定 · 标注架构讨论' },
      D: { en: 'Joined field protocol negotiation · annotation schema discussion', zh: '参与田野协议商定 · 标注架构讨论' },
      E: { en: 'Joined field protocol negotiation · annotation schema discussion', zh: '参与田野协议商定 · 标注架构讨论' }
    },
    'may20-cs2': {
      A: { en: 'Submitted individual CS2 (own choice of trend)', zh: '各自提交 individual CS2（自选 trend）' },
      B: { en: 'Submitted individual CS2 (own choice of trend)', zh: '各自提交 individual CS2（自选 trend）' },
      C: { en: 'Submitted individual CS2 (own choice of trend)', zh: '各自提交 individual CS2（自选 trend）' },
      D: { en: 'Submitted individual CS2 (own choice of trend)', zh: '各自提交 individual CS2（自选 trend）' },
      E: { en: 'Submitted CS2 — "Reframing Information Literacy in the AI era"', zh: '提交 CS2「信息素养重构 in AI 时代」' }
    },
    'w11-fieldwork': {
      A: { en: 'Sampled 15 signs in Kampung Baru · 5/26', zh: '甘榜峇鲁采 15 块 · 5/26' },
      B: { en: 'Sampled 15 signs in Petaling Street', zh: '茨厂街采 15 块' },
      C: { en: 'Sampled 15 signs in Bukit Bintang', zh: '武吉免登采 15 块' },
      D: { en: 'Sampled 15 signs in Little India', zh: '小印度采 15 块' },
      E: { en: 'Received 60 photographs + Excel from team on 5/30 (Handover Day)', zh: '5/30 交接日 · 接手 60 张照片 + Excel' }
    },
    'may31-phase1': {
      A: { en: 'Not involved this milestone', zh: '本节点未参与' },
      B: { en: 'Not involved this milestone', zh: '本节点未参与' },
      C: { en: 'Not involved this milestone', zh: '本节点未参与' },
      D: { en: 'Not involved this milestone', zh: '本节点未参与' },
      E: { en: 'Independently delivered Phase 1 visual baseline', zh: '独立完成 Phase 1 视觉基线' }
    },
    'w12a-integration': {
      A: { en: 'Not involved · waiting for site handover', zh: '未参与 · 等待网站交付' },
      B: { en: 'Not involved · waiting for site handover', zh: '未参与 · 等待网站交付' },
      C: { en: 'Not involved · waiting for site handover', zh: '未参与 · 等待网站交付' },
      D: { en: 'Not involved · waiting for site handover', zh: '未参与 · 等待网站交付' },
      E: { en: 'Independently integrated all member data + content into the site', zh: '独立将所有组员数据 + 内容集成进网站' }
    },
    'w12b-testing': {
      A: { en: 'Tested KB-related pages, reported bugs to E', zh: '测试 KB 相关页面 · 反馈 bug 给 E' },
      B: { en: 'Tested PS-related pages, reported bugs to E', zh: '测试 PS 相关页面 · 反馈 bug 给 E' },
      C: { en: 'Tested BB-related pages, reported bugs to E', zh: '测试 BB 相关页面 · 反馈 bug 给 E' },
      D: { en: 'Tested LI-related pages, reported bugs to E', zh: '测试 LI 相关页面 · 反馈 bug 给 E' },
      E: { en: 'Iterated fixes based on whole-team feedback', zh: '根据团队反馈迭代修复' }
    },
    'end': {
      A: { en: 'In-class presentation 6/10', zh: '6/10 课堂展示' },
      B: { en: 'In-class presentation 6/10', zh: '6/10 课堂展示' },
      C: { en: 'In-class presentation 6/10', zh: '6/10 课堂展示' },
      D: { en: 'In-class presentation 6/10', zh: '6/10 课堂展示' },
      E: { en: 'Submitted final website 6/8 · joined team presentation 6/10', zh: '6/8 提交最终网站 · 6/10 团队展示' }
    }
  };

  /* ---------- Helpers ---------- */

  function getCurrentLang() {
    return document.documentElement.getAttribute('data-lang') || 'en';
  }

  function getTooltipText(node, member) {
    const lang = getCurrentLang();
    const nodeData = TOOLTIPS[node];
    if (!nodeData || !nodeData[member]) return '';
    return nodeData[member][lang] || nodeData[member].en || '';
  }

  function getMemberName(member) {
    const lang = getCurrentLang();
    return MEMBER_NAMES[member][lang] || MEMBER_NAMES[member].en;
  }

  /* ---------- Tooltip (Layer 1) ---------- */

  const tooltipEl = document.getElementById('member-tooltip');
  const tooltipName = tooltipEl ? tooltipEl.querySelector('.tooltip-name') : null;
  const tooltipDesc = tooltipEl ? tooltipEl.querySelector('.tooltip-desc') : null;

  function showTooltip(marker, evt) {
    if (!tooltipEl) return;
    const node = marker.closest('.node-markers').dataset.node;
    const member = marker.dataset.member;
    tooltipName.textContent = getMemberName(member);
    tooltipDesc.textContent = getTooltipText(node, member);

    // Position relative to .timeline-river-wrap
    const wrap = document.getElementById('river-wrap');
    const wrapRect = wrap.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();

    // Default: position to the right of the marker
    let left = markerRect.right - wrapRect.left + 8;
    let top  = markerRect.top   - wrapRect.top  - 4;

    tooltipEl.hidden = false;
    // Defer measurement until tooltip is laid out
    requestAnimationFrame(() => {
      const tipRect = tooltipEl.getBoundingClientRect();
      // If tooltip would overflow the right edge of wrap, position to the left of the marker instead
      if (left + tipRect.width > wrap.offsetWidth - 8) {
        left = markerRect.left - wrapRect.left - tipRect.width - 8;
      }
      // Clamp top to stay within wrap vertical range
      if (top < 4) top = 4;
      if (top + tipRect.height > wrap.offsetHeight - 4) {
        top = wrap.offsetHeight - tipRect.height - 4;
      }
      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top  = top + 'px';
    });
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.hidden = true;
  }

  /* ---------- Trace mode (Layer 2) ---------- */

  let tracedMember = null;
  const traceBanner = document.getElementById('trace-banner');
  const traceBannerName = traceBanner ? traceBanner.querySelector('.trace-banner-name') : null;

  function enterTrace(member) {
    tracedMember = member;
    document.body.classList.add('trace-mode');

    // Tag markers — active member gets .trace-active, others stay
    document.querySelectorAll('.marker').forEach(m => {
      if (m.dataset.member === member) {
        m.classList.add('trace-active');
      } else {
        m.classList.remove('trace-active');
      }
    });

    // Tag node-labels: if traced member did NOT participate, fade the whole label
    document.querySelectorAll('.node-label').forEach(label => {
      const node = label.dataset.node;
      const markerGroup = document.querySelector(`.node-markers[data-node="${node}"]`);
      if (!markerGroup) return;
      const memberMarker = markerGroup.querySelector(`.marker[data-member="${member}"]`);
      const participated = memberMarker && memberMarker.dataset.participated === 'true';
      if (!participated) {
        label.classList.add('trace-untouched');
      } else {
        label.classList.remove('trace-untouched');
      }
    });

    if (traceBanner) {
      traceBannerName.textContent = getMemberName(member);
      traceBanner.hidden = false;
    }
  }

  function exitTrace() {
    tracedMember = null;
    document.body.classList.remove('trace-mode');
    document.querySelectorAll('.marker.trace-active').forEach(m => m.classList.remove('trace-active'));
    document.querySelectorAll('.node-label.trace-untouched').forEach(l => l.classList.remove('trace-untouched'));
    if (traceBanner) traceBanner.hidden = true;
  }

  function refreshTraceLabels() {
    // Called when language changes, to update trace banner name
    if (tracedMember && traceBannerName) {
      traceBannerName.textContent = getMemberName(tracedMember);
    }
  }

  /* ---------- Wire up markers ---------- */

  document.querySelectorAll('.marker').forEach(marker => {
    // Keyboard accessibility
    marker.setAttribute('tabindex', '0');
    marker.setAttribute('role', 'button');

    marker.addEventListener('mouseenter', (e) => showTooltip(marker, e));
    marker.addEventListener('mouseleave', hideTooltip);
    marker.addEventListener('focus', (e) => showTooltip(marker, e));
    marker.addEventListener('blur', hideTooltip);

    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      const member = marker.dataset.member;
      if (tracedMember === member) {
        exitTrace();
      } else {
        enterTrace(member);
      }
    });

    marker.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const member = marker.dataset.member;
        if (tracedMember === member) exitTrace();
        else enterTrace(member);
      } else if (e.key === 'Escape' && tracedMember) {
        exitTrace();
      }
    });
  });

  // Click empty space → exit trace
  document.addEventListener('click', (e) => {
    if (!tracedMember) return;
    // Ignore clicks on markers, tooltip, chips, replay button, inline triggers, trace banner
    if (e.target.closest('.marker') ||
        e.target.closest('.trace-banner') ||
        e.target.closest('.member-chip') ||
        e.target.closest('.replay-btn') ||
        e.target.closest('.inline-replay')) return;
    exitTrace();
  });

  // Esc → exit trace
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tracedMember) exitTrace();
  });

  /* ---------- Scroll reveal ---------- */

  const reveal = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('revealed');
      // Sync corresponding SVG marker group
      const node = e.target.dataset.node;
      if (node) {
        const markerGroup = document.querySelector(`.node-markers[data-node="${node}"]`);
        if (markerGroup) markerGroup.classList.add('revealed');
      }
      reveal.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('.node-label').forEach(el => reveal.observe(el));

  /* ---------- River fade-in on load ---------- */

  window.addEventListener('load', () => {
    const svg = document.querySelector('.timeline-river');
    if (svg) svg.classList.add('loaded');
  });

  /* ---------- Member Stats Dashboard handlers (participation tracker) ---------- */

  // Sync chip 'active' class when trace state changes (observe body.trace-mode class)
  function syncChipStates() {
    const activeMarker = document.body.classList.contains('trace-mode')
      ? document.querySelector('.marker.trace-active')
      : null;
    const activeMember = activeMarker ? activeMarker.dataset.member : null;
    document.querySelectorAll('.member-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.member === activeMember);
    });
  }

  const traceClassObserver = new MutationObserver(syncChipStates);
  traceClassObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  document.querySelectorAll('.member-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      const member = chip.dataset.member;
      if (tracedMember === member) {
        exitTrace();
      } else {
        enterTrace(member);
      }
    });
  });

  /* ---------- Replay timeline animation ---------- */

  const NODE_ORDER = ['w1-2', 'w7-cs1', 'w8-10', 'may20-cs2', 'w11-fieldwork',
                      'may31-phase1', 'w12a-integration', 'w12b-testing', 'end'];

  const replayBtn = document.getElementById('replay-timeline');

  function playReplay() {
    if (replayBtn && replayBtn.classList.contains('replaying')) return;
    if (replayBtn) replayBtn.classList.add('replaying');

    // Exit trace mode if active
    if (tracedMember) exitTrace();

    // Reset: remove all revealed states
    document.querySelectorAll('.node-label.revealed, .node-markers.revealed').forEach(el => {
      el.classList.remove('revealed');
    });
    const svg = document.querySelector('.timeline-river');
    svg.classList.remove('loaded');

    // Scroll the timeline back into view from top
    const wrap = document.getElementById('river-wrap');
    if (wrap) {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Force reflow so transitions restart cleanly
    void document.body.offsetHeight;

    // Stage 1: river fade-in (after scroll settles)
    setTimeout(() => svg.classList.add('loaded'), 400);

    // Stage 2: nodes reveal one-by-one in time order
    NODE_ORDER.forEach((nodeId, idx) => {
      setTimeout(() => {
        document.querySelectorAll(`[data-node="${nodeId}"]`).forEach(el => {
          el.classList.add('revealed');
        });
      }, 900 + idx * 420);
    });

    // Re-enable button after animation completes
    setTimeout(() => {
      if (replayBtn) replayBtn.classList.remove('replaying');
    }, 900 + NODE_ORDER.length * 420 + 300);
  }

  if (replayBtn) replayBtn.addEventListener('click', playReplay);

  // Inline replay triggers in the lede paragraph (Kunm: lede text itself should be interactive)
  document.querySelectorAll('.inline-replay').forEach(trigger => {
    trigger.addEventListener('click', playReplay);
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        playReplay();
      }
    });
  });

  /* ---------- Hover an article → wake its cluster (reactive feedback) ---------- */
  document.querySelectorAll('.node-label').forEach(label => {
    label.addEventListener('mouseenter', () => {
      const node = label.dataset.node;
      const cluster = document.querySelector(`.node-markers[data-node="${node}"]`);
      if (cluster) cluster.classList.add('node-hover-active');
    });
    label.addEventListener('mouseleave', () => {
      const node = label.dataset.node;
      const cluster = document.querySelector(`.node-markers[data-node="${node}"]`);
      if (cluster) cluster.classList.remove('node-hover-active');
    });
  });


  const langObserver = new MutationObserver(() => {
    refreshTraceLabels();
    hideTooltip(); // close any stale tooltip
  });
  langObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-lang']
  });

})();
