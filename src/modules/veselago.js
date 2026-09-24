
/* modules/veselago.js */
/* GENChase: Veselago negative-index slab. Light bends the wrong way and a slab focuses. Image location is measured against 2L − d. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  // The Grid slider and sanitize() read the same bounds, so no slider position is clamped away.
  const GRID_MIN = 128, GRID_MAX = 224;
  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, GRID_MIN, GRID_MAX, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Slab', 'n', 'Index n', GEOM, -2.2, -0.4, 0.05, f2),
    RANGE('Slab', 'L', 'Thickness L', GEOM, 20, 80, 1, v => v + ''),
    RANGE('Slab', 'src', 'Source x', GEOM, 8, 50, 1, v => v + ''),
    RANGE('Slab', 'rays', 'Rays', GEOM, 12, 64, 2, v => v + ''),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', n: -1, L: 48, src: 24, rays: 28, view: 'int', exposure: 1 };
  const PRESETS = {
    perfect: pre('n = −1 focus', { n: -1, L: 48, src: 24 }, Pal.glacier),
    shallow: pre('Thin slab', { n: -1, L: 28, src: 16 }, Pal.harbor),
    deep: pre('Thick', { n: -1, L: 64, src: 20 }, Pal.nightshade),
    n12: pre('n = −1.2', { n: -1.2, L: 48, src: 24 }, Pal.ember),
    many: pre('Many rays', { rays: 48, n: -1 }, Pal.thermal),
    log: pre('Log', { view: 'log', n: -1 }, Pal.kiln),
  };

  function surprise(rng) { return { n: -rng.range(0.7, 1.6), L: rng.int(28, 64), src: rng.int(14, 36), rays: rng.int(18, 48) }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'veselago', name: 'Veselago Lens', tab: 'Veselago',
    subtitle: 'a slab that focuses because n is negative · 1968',
    order: 94,
    equation: 'n₁ sin θ₁ = n₂ sin θ₂,   n₂ = −1  ⇒  θ₂ = −θ₁,   image at 2L − d',
    credit: 'V. G. Veselago, Sov. Phys. Usp. 10, 509 (1968), asked what optics would do if ε and μ were both negative: a left-handed medium, a reversed Doppler shift, and a slab that acts as a lens. Pendry, Phys. Rev. Lett. 85, 3966 (2000), showed the same slab can amplify evanescent waves and beat the diffraction limit. The plate traces geometric rays through n < 0, not a fabricated metamaterial.',
    blurb: 'Light is not supposed to bend the wrong way at an interface. Give the slab a negative index and Snell\'s law says it must. A source in front of n = −1 focuses inside the slab and again behind it, as if the slab were a lens with no curved surface. The status line reports the brightest point behind the slab against 2L − d.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Slab: 'n = −1 is Veselago\'s perfect lens. Other negative n still focuses, just not at the textbook point.' },
    palette: true, defaultPalette: 'glacier', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const rng = U.makeRng(String(s.seed) + '/x');

        const nS = s.n, L = s.L, d = s.src, nR = s.rays | 0;
        const x0 = W * 0.12 + d * 0.15, slab0 = x0 + d, slab1 = slab0 + L;
        field.fill(0);
        function splat(x, y, w) {
          const xi = Math.round(x), yi = Math.round(y);
          if (xi >= 0 && yi >= 0 && xi < W && yi < H) field[yi * W + xi] += w;
        }
        const yS = H / 2;
        let peakX = slab1, peakI = 0;
        for (let r = 0; r < nR; r++) {
          const th = (r / Math.max(1, nR - 1) - 0.5) * 0.9;
          const s1 = Math.sin(th), c1 = Math.cos(th);
          const s2 = (1 / nS) * s1;
          if (Math.abs(s2) > 1) continue;
          const th2 = Math.asin(s2);
          const tdx = [c1, Math.cos(th2), c1];
          const tdy = [s1, Math.sin(th2), s1];
          let px = x0, py = yS;
          const xs = [slab0, slab1, W - 2];
          for (let seg = 0; seg < 3; seg++) {
            const xEnd = xs[seg];
            const steps = Math.max(4, (xEnd - px) | 0);
            const k = tdy[seg] / Math.max(0.05, tdx[seg]);
            for (let i = 0; i <= steps; i++) {
              const xx = px + (xEnd - px) * i / steps;
              const yy = py + k * (xx - px);
              splat(xx, yy, seg === 2 ? 1.4 : 0.7);
              if (seg === 2 && xx > slab1 + 2) {
                const ii = Math.round(yy) * W + Math.round(xx);
                if (ii >= 0 && ii < field.length && field[ii] > peakI && Math.abs(yy - yS) < H * 0.2) {
                  peakI = field[ii]; peakX = xx;
                }
              }
            }
            py = py + k * (xEnd - px);
            px = xEnd;
          }
        }
        const theory = slab0 + (2 * L - d);
        metric = (peakX - theory) / Math.max(1, W);
        extra = 2 * L - d;

        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }


      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < field.length; i++) { const v = field[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
        const span = (hi - lo) || 1, logv = s.view === 'log';
        for (let i = 0; i < field.length; i++) {
          let t = (field[i] - lo) / span;
          if (logv) t = Math.log(1.001 + 9 * Math.max(0, t)) / Math.log(10);
          t = U.clamp(t * exp, 0, 1);
          const c = ramp(isFinite(t) ? t : 0);
          const o = i * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() { host.setStatus('<span>n <b>' + f2(host.getState().n) + '</b></span><span>image Δx/W <b>' + f3(metric) + '</b> · 2L−d</span><span>' + (Math.abs(metric) < 0.12 ? 'Veselago focus' : 'shifted') + '</span>'); }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };

    },
  });
})();
