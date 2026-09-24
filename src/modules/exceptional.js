
/* modules/exceptional.js */
/* GENChase: PT-symmetric dimer. Eigenvalues coalesce at an exceptional point. Gap |λ+ − λ−| is measured. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Dimer', 'gamma', 'Gain/loss γ', GEOM, 0, 2.2, 0.02, f2),
    RANGE('Dimer', 'kappa', 'Coupling κ', GEOM, 0.2, 2, 0.05, f2),
    { group: 'Dimer', key: 'kind', label: 'View', type: 'seg', kind: GEOM, options: [['sheet', 'Riemann sheet'], ['gap', 'Gap vs γ'], ['modes', 'Modes']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', gamma: 0.85, kappa: 1, kind: 'sheet', view: 'int', exposure: 1 };
  const PRESETS = {
    ep: pre('Exceptional point', { gamma: 1, kappa: 1, kind: 'sheet' }, Pal.thermal),
    broken: pre('Broken PT', { gamma: 1.6, kappa: 0.8, kind: 'sheet' }, Pal.ember),
    exact: pre('Exact PT', { gamma: 0.4, kappa: 1.2, kind: 'modes' }, Pal.harbor),
    gap: pre('Gap vs γ', { kind: 'gap', kappa: 1 }, Pal.nightshade),
    near: pre('Near EP', { gamma: 0.95, kappa: 1, kind: 'sheet' }, Pal.glacier),
    far: pre('Far', { gamma: 0.2, kappa: 1.4, kind: 'modes' }, Pal.kiln),
  };

  function surprise(rng) { return { gamma: rng.range(0.2, 1.8), kappa: rng.range(0.5, 1.6), kind: rng.pick(['sheet','gap','modes']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'exceptional', name: 'Exceptional Point', tab: 'Exceptional',
    subtitle: 'two eigenvectors become one · 1998',
    order: 66,
    equation: 'H = [[iγ, κ],[κ, −iγ]],   λ = ±√(κ²−γ²),   EP at γ = κ',
    credit: 'C. M. Bender and S. Boettcher, Phys. Rev. Lett. 80, 5243 (1998), on PT-symmetric spectra; Heiss (2004) and many others on exceptional points, where both eigenvalues and eigenvectors coalesce. Hermitian matrices cannot do this. The plate is Re λ (and the gap) over the (κ, γ) plane, or the two modes of one dimer.',
    blurb: 'Hermitian levels may cross, but their eigenvectors stay independent. At an exceptional point the matrix is not diagonalisable: the two eigenvalues meet and the two eigenvectors become one. Past it the spectrum goes complex and PT is broken. The status line reports |λ+ − λ−| against 0 at γ = κ.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Dimer: 'γ = κ is the exceptional point. Below, real split levels. Above, a complex conjugate pair.' },
    palette: true, defaultPalette: 'thermal', surprise, sanitize,
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

        const g0 = s.gamma, k0 = s.kappa, kind = s.kind;
        function ev(g, k) {
          const d = k * k - g * g;
          if (d >= 0) return { re: Math.sqrt(d), im: 0, gap: 2 * Math.sqrt(d) };
          return { re: 0, im: Math.sqrt(-d), gap: 0 };
        }
        if (kind === 'gap') {
          for (let y = 0; y < H; y++) {
            const g = 2.2 * y / Math.max(1, H - 1);
            const e = ev(g, k0);
            for (let x = 0; x < W; x++) {
              const xx = x / Math.max(1, W - 1);
              const yv = 1 - xx;
              const plot = Math.abs(yv - e.gap / 4);
              field[y * W + x] = Math.exp(-40 * plot * plot) + 0.15 * e.re;
            }
          }
        } else if (kind === 'modes') {
          const e = ev(g0, k0);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const u = x / W, v = y / H;
            const a = Math.exp(-18 * ((u - 0.3) * (u - 0.3) + (v - 0.5) * (v - 0.5)));
            const b = Math.exp(-18 * ((u - 0.7) * (u - 0.7) + (v - 0.5) * (v - 0.5)));
            const mix = e.gap < 1e-3 ? 0.5 : e.re / (e.re + e.im + 0.2);
            field[y * W + x] = a * mix + b * (1 - mix);
          }
        } else {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const k = 0.15 + 2.1 * x / Math.max(1, W - 1);
            const g = 2.2 * y / Math.max(1, H - 1);
            const e = ev(g, k);
            field[y * W + x] = e.re + 0.6 * e.im;
          }
        }
        // |λ+ − λ−| of the dimer itself, 2√|κ² − γ²| in both phases: real split levels below the EP, a
        // complex conjugate pair above it. ev().gap is the real splitting the gap view draws, which is 0 in
        // the broken phase and is not this magnitude.
        metric = 2 * Math.sqrt(Math.abs(k0 * k0 - g0 * g0));
        extra = g0 / Math.max(0.05, k0);

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

      function status() {
        host.setStatus('<span>γ/κ <b>' + f2(extra) + '</b> · the EP is where γ = κ</span>' +
          U.stats.compare({ label: '|λ+−λ−|', measured: metric, reference: 'closed form', basis: 'exact', note: 'closed form 2√|κ²−γ²|' }) +
          '<span>' + (Math.abs(extra - 1) < 0.08 ? 'exceptional' : (extra < 1 ? 'exact PT' : 'broken PT')) + '</span>');
      }

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
