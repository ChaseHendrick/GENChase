
/* modules/soliton.js */
/* GENChase: exact Hirota KdV two-soliton field, sampled in a moving frame. */
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

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Wave', 'c1', 'Speed c1', GEOM, 0.4, 2.4, 0.05, f2),
    RANGE('Wave', 'c2', 'Speed c2', GEOM, 0.2, 1.8, 0.05, f2),
    RANGE('Wave', 'nu', 'Dispersion', GEOM, 0.08, 0.6, 0.02, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '4:5', c1: 1.6, c2: 0.7, nu: 0.22, view: 'int', exposure: 1 };
  const PRESETS = {
    collide: pre('Collision', { c1: 1.7, c2: 0.65 }, Pal.glacier),
    equal: pre('Equal', { c1: 1.1, c2: 1.05 }, Pal.harbor),
    fast: pre('Fast overtake', { c1: 2.2, c2: 0.5 }, Pal.ember),
    soft: pre('Soft', { nu: 0.4, c1: 1.2, c2: 0.6 }, Pal.nightshade),
    train: pre('Train', { c1: 1.4, c2: 1.0, nu: 0.18 }, Pal.thermal),
    crisp: pre('Crisp', { nu: 0.12, c1: 1.8, c2: 0.55 }, Pal.xray),
  };

  function surprise(rng) { return { c1: rng.range(1.1, 2.1), c2: rng.range(0.4, 0.9), nu: rng.range(0.12, 0.35) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); s.c1 = U.clamp(Number.isFinite(s.c1) ? s.c1 : 1.6, .4, 2.4); s.c2 = U.clamp(Number.isFinite(s.c2) ? s.c2 : .7, .2, 1.8); s.nu = U.clamp(Number.isFinite(s.nu) ? s.nu : .22, .08, .6); }
  // Hirota two-soliton tau function for u_t+6u*u_x+nu^2*u_xxx=0.
  // Log-sum-exp weights avoid overflow; pairwise variance avoids cancellation.
  function kdvValue(c1, c2, nu, x, t) {
    const k1 = Math.sqrt(c1) / nu, k2 = Math.sqrt(c2) / nu;
    if (Math.abs(c1 - c2) < 1e-10) {
      const z = .5 * k1 * (x - c1 * t);
      const e = Math.exp(-Math.abs(z)); return 2 * c1 * e * e / (1 + e * e) ** 2;
    }
    const interaction = ((k1 - k2) / (k1 + k2)) ** 2;
    const eta1 = k1 * (x - c1 * t), eta2 = k2 * (x - c2 * t);
    const logs = [0, eta1, eta2, eta1 + eta2 + Math.log(interaction)];
    const slopes = [0, k1, k2, k1 + k2], shift = Math.max(...logs);
    const weights = logs.map(v => Math.exp(v - shift)), sum = weights.reduce((a, b) => a + b, 0);
    let variance = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) variance += weights[i] * weights[j] * (slopes[i] - slopes[j]) ** 2;
    return 2 * nu * nu * variance / (sum * sum);
  }
  function kdvWindow(s) {
    const slow = Math.min(s.c1, s.c2), fast = Math.max(s.c1, s.c2), equal = fast - slow < 1e-10;
    return { halfSpan: 18 * s.nu / Math.sqrt(slow), halfTime: equal ? 8 * s.nu / slow ** 1.5 : 14 * s.nu / (Math.sqrt(slow) * (fast - slow)), speed: .5 * (fast + slow), equal };
  }
  Studio.register({
    id: 'soliton', name: 'KdV Soliton', tab: 'Soliton',
    subtitle: 'a wave that will not disperse · 1834 / 1965',
    order: 54,
    equation: 'u_t + 6 u u_x + ν² u_xxx = 0; u = 2ν² ∂xx log τ, τ = 1+e^η1+e^η2+A12 e^(η1+η2)',
    credit: 'J. S. Russell, Report of the 14th Meeting of the British Association (1844), chased a heap of water that would not spread. Korteweg and de Vries (1895) wrote the equation. Zabusky and Kruskal, Phys. Rev. Lett. 15, 240 (1965), collided two and named them solitons. The plate evaluates the established Hirota two-soliton tau function, including its interaction term; Benes, Kasman and Young, On Decompositions of the KdV 2-Soliton (2006), provide a reference.',
    blurb: 'Two exact KdV solitons interact and separate with phase shifts. The plate samples their tau-function solution in a frame moving at the mean input speed. The status compares numerical quadrature on the middle row with the analytic whole-line mass; finite-window and sampling errors remain. Equal speeds display the one-soliton limit. This is analytic evaluation, not an independent time integration.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Wave: 'Speeds are exact solution inputs. ν² is the dispersion coefficient. A moving frame keeps the collision visible; increasing the grid refines the same physical window. Equal speeds select one soliton.' },
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
        const window = kdvWindow(s), dx = 2 * window.halfSpan / (W - 1);
        let mass = 0;
        for (let y = 0; y < H; y++) {
          const t = window.halfTime * (2 * y / (H - 1) - 1);
          for (let x = 0; x < W; x++) {
            const physicalX = -window.halfSpan + x * dx + window.speed * t;
            const v = kdvValue(s.c1, s.c2, s.nu, physicalX, t);
            field[y * W + x] = v;
            if (y === (H >> 1)) mass += v * dx * (x === 0 || x === W - 1 ? .5 : 1);
          }
        }
        extra = mass;
        metric = 2 * s.nu * (Math.sqrt(s.c1) + (window.equal ? 0 : Math.sqrt(s.c2)));

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

      function status() { host.setStatus('<span>sampled middle-row mass <b>' + f3(extra) + '</b></span><span>whole-line formula <b>' + f3(metric) + '</b></span><span>finite quadrature · moving frame</span>'); }

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
