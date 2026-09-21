
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
  function sanitize(s) { s.grid = Math.max(96, Math.min(256, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'rogue', name: 'Rogue Wave', tab: 'Rogue',
    subtitle: 'Peregrine soliton, waves from nowhere · 1983',
    order: 50,
    equation: 'i ψ_t + ψ_xx + 2|ψ|² ψ = 0,   ψ_P = [1 − 4(1+2it)/(1+4x²+4t²)] e^{it},   |ψ|²_max / |ψ|²_∞ = 9',
    credit: 'D. H. Peregrine, J. Austral. Math. Soc. Ser. B 25, 16 (1983). Akhmediev, Eleonskii and Kulagin (1987); Kuznetsov (1977) and Ma (1979). Draupner measured a rogue wave in 1995. The plate is the exact rational / breather solution.',
    blurb: 'A wave that should not exist: it grows out of a finite background, peaks at nine times the intensity, and is gone. Sailors were not believed. The plate is spacetime of the focusing NLSE. The status line reports peak over background against 9 for Peregrine.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Wave: 'Peregrine is localised in space and time. Akhmediev breathes in space, Kuznetsov–Ma in time.' },
    palette: true, defaultPalette: 'thermal', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, buf, img;
      function sizeFrom(s) { const a = ASPECTS[s.aspect] || 1, g = s.grid | 0; return { W: g, H: Math.max(48, Math.round(g * a)) }; }
      function compute() {
        const s = host.getState(); const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const L = s.span, t0 = s.t0, a = U.clamp(s.a, 0.05, 0.49);
        let peak = 0, bg = 0, nbg = 0;
        for (let y = 0; y < H; y++) {
          const t = t0 + L * (y / Math.max(1, H - 1) - 0.5);
          for (let x = 0; x < W; x++) {
            const xx = L * (x / Math.max(1, W - 1) - 0.5);
            let amp2 = 1;
            if (s.kind === 'akhmediev') {
              const b = Math.sqrt(Math.max(0, 8 * a * (1 - 2 * a)));
              const om = 2 * Math.sqrt(Math.max(0, 1 - 2 * a));
              const den = Math.cosh(b * t) - Math.sqrt(2 * a) * Math.cos(om * xx);
              const re = ((1 - 4 * a) * Math.cosh(b * t) + Math.sqrt(2 * a) * Math.cos(om * xx)) / Math.max(1e-6, den);
              const im = (b * Math.sinh(b * t)) / Math.max(1e-6, den);
              amp2 = re * re + im * im;
            } else if (s.kind === 'km') {
              const mag = 1 + 2 * (2 * a) / Math.max(0.25, Math.cosh(2 * Math.sqrt(2 * a) * xx) + 2 * a * Math.cos(2 * t * Math.sqrt(1 + 2 * a)));
              amp2 = mag * mag;
            } else {
              const D = 1 + 4 * xx * xx + 4 * t * t;
              const re = 1 - 4 / D, im = -8 * t / D;
              amp2 = re * re + im * im;
            }
            if (!isFinite(amp2) || amp2 < 0) amp2 = 0;
            field[y * W + x] = amp2;
            if (amp2 > peak) peak = amp2;
            if (y < 3 || y > H - 4) { bg += amp2; nbg++; }
          }
        }
        metric = peak / Math.max(1e-9, bg / Math.max(1, nbg)); extra = peak;
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
        host.setStatus('<span>peak |ψ|² <b>' + f2(extra) + '</b></span><span>peak / bg <b>' + f2(metric) + '</b> · Peregrine 9</span><span>' + (metric > 4.5 ? 'rogue' : 'background') + '</span>');
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
