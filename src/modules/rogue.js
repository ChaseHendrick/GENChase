
/* modules/rogue.js */
/* GENChase: Peregrine rational solution of the focusing NLSE. Peak intensity is measured against the background. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });
  const SCHEMA = [
    RANGE('Wave', 'grid', 'Grid', GEOM, 96, 256, 16, v => v + ''),
    { group: 'Wave', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Wave', 'span', 'Window', GEOM, 5, 18, 0.5, f2),
    RANGE('Wave', 't0', 'Time centre', GEOM, -3, 3, 0.1, f2),
    { group: 'Wave', key: 'kind', label: 'Kind', type: 'seg', kind: GEOM, options: [['peregrine', 'Peregrine'], ['akhmediev', 'Akhmediev'], ['km', 'Kuznetsov–Ma']] },
    RANGE('Wave', 'a', 'Modulation a', GEOM, 0.12, 0.42, 0.01, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', '|ψ|²'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 192, aspect: '4:5', span: 10, t0: 0, kind: 'peregrine', a: 0.25, view: 'int', exposure: 1 };
  const PRESETS = {
    peregrine: pre('Peregrine', { kind: 'peregrine', span: 10, t0: 0, view: 'int' }, Pal.thermal),
    nowhere: pre('From nowhere', { kind: 'peregrine', span: 14, view: 'log' }, Pal.nightshade),
    akh: pre('Akhmediev', { kind: 'akhmediev', a: 0.22, span: 9, view: 'int' }, Pal.ember),
    km: pre('Kuznetsov–Ma', { kind: 'km', a: 0.28, span: 10, view: 'int' }, Pal.glacier),
    wide: pre('Wide', { span: 16, kind: 'peregrine' }, Pal.harbor),
    peak: pre('Peak', { span: 6, t0: 0, exposure: 0.75, kind: 'peregrine' }, Pal.xray),
  };
  function surprise(rng) { return { kind: rng.pick(['peregrine', 'peregrine', 'akhmediev', 'km']), span: rng.range(7, 14), view: rng.pick(['int', 'log']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(256, Math.round(s.grid / 16) * 16)); s.a = U.clamp(Number.isFinite(s.a) ? s.a : .25, .05, .49); s.span = U.clamp(Number.isFinite(s.span) ? s.span : 10, 5, 18); s.t0 = U.clamp(Number.isFinite(s.t0) ? s.t0 : 0, -3, 3); if (!['peregrine','akhmediev','km'].includes(s.kind)) s.kind = 'peregrine'; }
  // Haragus–Pelinovsky (2021), Eqs1.1–1.4. Return the full complex field.
  // a maps to lambda=sqrt(2a) for AB and sqrt(1+2a) for KM.
  function waveValue(kind, a, x, t) {
    let re, im;
    if (kind === 'akhmediev') {
      const lam = Math.sqrt(2 * a), k = 2 * Math.sqrt(1 - lam * lam);
      const z = lam * k * t, den = Math.cosh(z) - lam * Math.cos(k * x);
      re = -1 + 2 * (1 - lam * lam) * Math.cosh(z) / den;
      im = lam * k * Math.sinh(z) / den;
    } else if (kind === 'km') {
      const lam = Math.sqrt(1 + 2 * a), beta = 2 * Math.sqrt(lam * lam - 1);
      const z = lam * beta * t, den = lam * Math.cosh(beta * x) - Math.cos(z);
      re = -1 + 2 * (lam * lam - 1) * Math.cos(z) / den;
      im = lam * beta * Math.sin(z) / den;
    } else {
      const den = 1 + 4 * (x * x + t * t);
      re = -1 + 4 / den; im = 8 * t / den;
    }
    return [re * Math.cos(t) - im * Math.sin(t), re * Math.sin(t) + im * Math.cos(t)];
  }
  function peakReference(kind, a) {
    return kind === 'peregrine' ? 9 : (1 + 2 * Math.sqrt(kind === 'km' ? 1 + 2 * a : 2 * a)) ** 2;
  }
  Studio.register({
    id: 'rogue', name: 'Rogue Wave', tab: 'Rogue',
    subtitle: 'Peregrine soliton, waves from nowhere · 1983',
    order: 50,
    equation: 'i ψ_t + ½ ψ_xx + |ψ|² ψ = 0,   ψ_P = [1 − 4(1+2it)/(1+4x²+4t²)] e^{it},   |ψ|²_max / |ψ|²_∞ = 9',
    credit: 'D. H. Peregrine, J. Austral. Math. Soc. Ser. B 25, 16 (1983). Akhmediev, Eleonskii and Kulagin (1987); Kuznetsov (1977) and Ma (1979). Draupner measured a rogue wave in 1995. Formula conventions: Haragus and Pelinovsky, arXiv:2112.14426, Eqs1.1–1.4. The plate samples these established analytic solutions.',
    blurb: 'Spacetime intensity of three exact solutions of the dimensionless focusing NLSE. The sampled maximum is compared with the analytic global maximum on a unit-intensity background. A finite window or coarse grid can miss that peak; this is a formula sampling check, not an ocean forecast or a dynamical discovery.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Wave: 'Peregrine is localized in space and time; Akhmediev is periodic in space and localized in time; Kuznetsov–Ma is periodic in time and localized in space. For the a control, λ=√(2a) in Akhmediev and λ=√(1+2a) in Kuznetsov–Ma.' },
    palette: true, defaultPalette: 'thermal', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, buf, img;
      function sizeFrom(s) { const a = ASPECTS[s.aspect] || 1, g = s.grid | 0; return { W: g, H: Math.max(48, Math.round(g * a)) }; }
      function compute() {
        const s = host.getState(); const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const L = s.span, t0 = s.t0, a = U.clamp(s.a, 0.05, 0.49);
        let peak = 0;
        for (let y = 0; y < H; y++) {
          const t = t0 + L * (y / Math.max(1, H - 1) - 0.5);
          for (let x = 0; x < W; x++) {
            const xx = L * (x / Math.max(1, W - 1) - 0.5);
            const z = waveValue(s.kind, a, xx, t), amp2 = z[0] * z[0] + z[1] * z[1];
            field[y * W + x] = amp2;
            if (amp2 > peak) peak = amp2;
          }
        }
        metric = peakReference(s.kind, a); extra = peak;
        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }
      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#0A0710', '#E63946', '#FFF1A8'];
        const ramp = U.makeRamp(pal, s.bg || '#0A0710'), data = img.data;
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
        ctx.fillStyle = s.bg || '#0A0710'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }
      function status() {
        host.setStatus(U.stats.compare({ label: 'max |ψ|² on the grid', measured: extra, expected: metric, reference: 'analytic global max', basis: 'deterministic', note: 'grid sample of the closed form' }) +
          '<span>unit background · finite grid/window</span>');
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); }, resize() { paint(); }, pause() {}, resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState(), c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false }); g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#0A0710'; g.fillRect(0, 0, w, h); g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
