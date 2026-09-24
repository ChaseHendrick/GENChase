
/* modules/weierstrass.js */
/* GENChase: finite phase-shifted Weierstrass-type sums. Increment ratios are finite-resolution diagnostics. */
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
    RANGE('Curve', 'a', 'Amplitude a', GEOM, 0.2, 0.8, 0.02, f2),
    RANGE('Curve', 'b', 'Frequency b', GEOM, 3, 21, 2, v => v + ''),
    RANGE('Curve', 'terms', 'Terms', GEOM, 4, 24, 1, v => v + ''),
    { group: 'Curve', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['field', '2D field'], ['graph', 'Graph'], ['rough', 'Scale stack']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '1:1', a: 0.5, b: 7, terms: 12, kind: 'field', view: 'int', exposure: 1 };
  const PRESETS = {
    classic: pre('Weierstrass', { a: 0.5, b: 7, terms: 12, kind: 'field' }, Pal.graphite),
    graph: pre('Graph', { kind: 'graph', a: 0.5, b: 7, terms: 14 }, Pal.ember),
    rough: pre('All scales', { kind: 'rough', terms: 16, a: 0.5, b: 9 }, Pal.nightshade),
    mild: pre('Mild', { a: 0.35, b: 5, kind: 'field' }, Pal.harbor),
    wild: pre('Wild', { a: 0.65, b: 13, terms: 10, kind: 'field' }, Pal.thermal),
    log: pre('Log', { view: 'log', kind: 'field' }, Pal.kiln),
  };

  function surprise(rng) { return { a: rng.range(0.35, 0.7), b: rng.pick([5,7,9,11,13]), terms: rng.int(8, 18), kind: rng.pick(['field','graph','rough']) }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'weierstrass', name: 'Weierstrass', tab: 'Weierstrass',
    subtitle: 'finite lacunary Fourier sums · inspired by 1872',
    order: 92,
    equation: 'W_N(x) = Σ_{n=0}^{N−1} a^n cos(b^n π x + φ_n),   0<a<1,   N finite; seeded phases',
    credit: 'K. Weierstrass, presented to the Prussian Academy in 1872 (published 1875). Analysts had assumed a continuous function was differentiable except at isolated points; Weierstrass wrote a Fourier series that is continuous everywhere and differentiable nowhere. Hardy (1916) weakened the condition to ab ≥ 1. The plate uses a finite, seeded phase-shifted sum inspired by that series. Each finite sum is smooth; the classical infinite-series theorem is not established for this displayed field.',
    blurb: 'A finite sum of increasingly high frequencies creates structure at several scales. Seeded phases shift each term. Every displayed finite sum is smooth, even when it looks rough. The increment ratio compares two finite distances; it is not proof of nowhere differentiability. Frequencies above the grid resolution alias, and increasing the term count alone does not resolve them.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Curve: 'a controls decay and b controls frequency growth. This is a finite smooth sum. Terms above the pixel resolution can alias; the increment ratio is only a sampled diagnostic.' },
    palette: true, defaultPalette: 'graphite', surprise, sanitize,
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

        const aa = s.a, bb = s.b | 0, N = s.terms | 0, kind = s.kind;
        const rng2 = U.makeRng(String(s.seed) + '/ph');
        const ph = new Float64Array(N), ps = new Float64Array(N);
        for (let n = 0; n < N; n++) { ph[n] = rng2() * Math.PI * 2; ps[n] = rng2() * Math.PI * 2; }
        function W1(x) {
          let ssum = 0, am = 1, freq = 1;
          for (let n = 0; n < N; n++) { ssum += am * Math.cos(freq * Math.PI * x + ph[n]); am *= aa; freq *= bb; }
          return ssum;
        }
        let r1 = 0, r10 = 0, nR = 0;
        for (let y = 0; y < H; y++) {
          const yy = (y / Math.max(1, H - 1)) * 2 - 1;
          for (let x = 0; x < W; x++) {
            const xx = (x / Math.max(1, W - 1)) * 2 - 1;
            let v;
            if (kind === 'graph') {
              const wv = W1(xx);
              const row = 0.5 - 0.28 * wv;
              v = Math.exp(-90 * (yy - row) * (yy - row));
            } else if (kind === 'rough') {
              const nShow = 1 + ((N * y / H) | 0);
              let ssum = 0, am = 1, freq = 1;
              for (let n = 0; n < nShow; n++) { ssum += am * Math.cos(freq * Math.PI * xx + ph[n]); am *= aa; freq *= bb; }
              const row = 0.5 - 0.28 * ssum;
              v = Math.exp(-80 * (yy - row) * (yy - row));
            } else {
              v = W1(xx) + W1(yy);
            }
            field[y * W + x] = v;
          }
        }
        const dx1 = 2 / W, dx10 = 20 / W;
        for (let k = 4; k < W - 4; k += 3) {
          const x0 = (k / W) * 2 - 1;
          r1 += Math.abs(W1(x0 + dx1) - W1(x0)) / dx1;
          r10 += Math.abs(W1(x0 + dx10) - W1(x0)) / dx10;
          nR++;
        }
        metric = (r1 / nR) / Math.max(1e-6, r10 / nR);
        extra = aa * bb;

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

      function status() { host.setStatus('<span>ab <b>' + f2(extra) + '</b></span><span>sampled increment ratio <b>' + f2(metric) + '</b></span><span>finite smooth sum · unresolved frequencies may alias</span>'); }

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
