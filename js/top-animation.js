

(function () {
  'use strict';

  const layer       = document.querySelector('.top-anim-layer');
  const placeholder = document.querySelector('.top-flowers');
  const sectionTop  = document.querySelector('.section--top');
  if (!layer || !sectionTop) return;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function computeBodyAlpha(p, flower) {
    if (flower.isSurvivor) {
      return clamp01((1.0 - p) / 0.05);
    }
    if (p < flower.fadeStart) return 1;
    return clamp01(1 - (p - flower.fadeStart) / (flower.vanishAt - flower.fadeStart));
  }

  function bezierXY(t, flower) {
    const u = 1 - t;
    return [
      u*u*flower.sx + 2*u*t*flower.cpx + t*t*flower.ex,
      u*u*flower.sy + 2*u*t*flower.cpy + t*t*flower.ey,
    ];
  }

  function getTopProgress() {
    const sy = window.scrollY;
    const vh = window.innerHeight;
    return clamp01((vh - sy) / vh);
  }

  const bodies = Array.from(layer.querySelectorAll('.rf-body')).map(el => {
    const color = el.dataset.color;
    const vanishAt = parseFloat(el.dataset.vanishAt);
    const isSurvivor = vanishAt >= 0.9;

    let fadeStart = isSurvivor ? 0.95 : 1.0;
    if (!isSurvivor) {
      layer.querySelectorAll(`.rf-petal[data-flower="${color}"]`).forEach(p => {
        const fa = parseFloat(p.dataset.fallAt);
        if (fa < 9 && fa < fadeStart) fadeStart = fa;     // 9.9 sentinel = never falls
      });
    }

    return {
      el, color, vanishAt, isSurvivor, fadeStart,
      sx: parseFloat(el.dataset.sx), sy: parseFloat(el.dataset.sy),
      ex: parseFloat(el.dataset.ex), ey: parseFloat(el.dataset.ey),
      cpx: parseFloat(el.dataset.cpx), cpy: parseFloat(el.dataset.cpy),
      scaleStart: parseFloat(el.dataset.scaleStart || '0.4'),
      scaleEnd:   parseFloat(el.dataset.scaleEnd   || '0.4'),
    };
  });
  const bodyByColor = Object.fromEntries(bodies.map(b => [b.color, b]));

  const petals = Array.from(layer.querySelectorAll('.rf-petal')).map(el => {
    const flower = bodyByColor[el.dataset.flower];
    const angle  = parseFloat(el.dataset.angle);
    const fallAt = parseFloat(el.dataset.fallAt);
    const baseOpacity = parseFloat(el.dataset.baseOpacity);

    const t      = fallAt;
    const u      = 1 - t;
    const snapX  = u*u*flower.sx + 2*u*t*flower.cpx + t*t*flower.ex;
    const snapY  = u*u*flower.sy + 2*u*t*flower.cpy + t*t*flower.ey;
    const snapBodyRot   = -t * 540;
    const snapWorldAngle = snapBodyRot + angle;
    const snapBodyAlpha = computeBodyAlpha(t, flower);
    const snapScale = flower.scaleStart + (flower.scaleEnd - flower.scaleStart) * t;

    const vx = 60 * Math.sin(snapWorldAngle * Math.PI / 180);

    return {
      el, flower, angle, fallAt, baseOpacity,
      snapX, snapY, snapWorldAngle, snapBodyAlpha, snapScale, vx,
    };
  });

  function update() {
    const p = getTopProgress();

    bodies.forEach(flower => {
      const alpha = computeBodyAlpha(p, flower);
      const [bx, by] = bezierXY(p, flower);
      const brot = -p * 540;            // counterclockwise
      const s    = flower.scaleStart + (flower.scaleEnd - flower.scaleStart) * p;
      flower._bx = bx; flower._by = by; flower._brot = brot; flower._scale = s;  // cache for petals
      flower.el.setAttribute('transform', `translate(${bx.toFixed(1)},${by.toFixed(1)}) rotate(${brot.toFixed(1)}) scale(${s.toFixed(3)})`);
      flower.el.setAttribute('opacity',   alpha.toFixed(3));
    });

    petals.forEach(petal => {
      const f = petal.flower;
      if (p < petal.fallAt) {
        const rot = f._brot + petal.angle;
        const op  = computeBodyAlpha(p, f) * petal.baseOpacity;
        petal.el.setAttribute('transform', `translate(${f._bx.toFixed(1)},${f._by.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${f._scale.toFixed(3)})`);
        petal.el.setAttribute('opacity',   op.toFixed(3));
      } else {
        const lp = (p - petal.fallAt) / 0.40;
        if (lp >= 1) {
          petal.el.setAttribute('opacity', '0');
          return;
        }
        const dx = petal.vx * lp;
        const dy = 400 * lp * lp;       // parabolic gravity
        const rot = petal.snapWorldAngle - lp * 540;   // 1.5 extra ccw turns
        let op  = (1 - lp) * petal.baseOpacity * petal.snapBodyAlpha;
        if (p > 0.85) {
          op *= Math.max(0, (1 - p) / 0.15);
        }
        petal.el.setAttribute('transform', `translate(${(petal.snapX + dx).toFixed(1)},${(petal.snapY + dy).toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${petal.snapScale.toFixed(3)})`);
        petal.el.setAttribute('opacity',   op.toFixed(3));
      }
    });

    if (placeholder) {
      let phOpacity;
      if (p < 0.95) phOpacity = 0;
      else          phOpacity = (p - 0.95) / 0.05;
      placeholder.style.opacity = clamp01(phOpacity).toFixed(3);
    }
  }

  function calibrateSurvivorEndpoints() {
    if (!placeholder) return;
    const layerRect = layer.getBoundingClientRect();
    const phRect    = placeholder.getBoundingClientRect();
    if (layerRect.width === 0 || phRect.width === 0) return;  // not laid out yet

    const scaleX = layerRect.width / 1600;
    const scaleY = layerRect.height / 2000;
    const scale  = Math.max(scaleX, scaleY);
    const cropX  = (1600 * scale - layerRect.width)  / 2;
    const cropY  = (2000 * scale - layerRect.height) / 2;

    const phCenterPxX = (phRect.left + phRect.width  / 2) - layerRect.left;
    const phCenterPxY = (phRect.top  + phRect.height / 2) - layerRect.top;

    const phCenterVbX = (phCenterPxX + cropX) / scale;
    const phCenterVbY = (phCenterPxY + cropY) / scale;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      calibrateSurvivorEndpoints();
      update();
    });
  } else {
    calibrateSurvivorEndpoints();
    update();
  }

  window.addEventListener('load', () => {
    layer.classList.add('garden-loaded');
    calibrateSurvivorEndpoints();    // fonts/layout fully settled → re-measure
    update();
  });

})();
