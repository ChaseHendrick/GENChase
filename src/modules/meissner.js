
/* modules/meissner.js */
/* GENChase: London equation in a superconducting disk. Interior B is measured against the Bessel profile 1/I0(R/λ). */
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
    RANGE('SC', 'lambda', 'Penetration λ', GEOM, 4, 40, 1, v => v + ''),
    RANGE('SC', 'R', 'Disk R', GEOM, 16, 80, 1, v => v + ''),
    RANGE('SC', 'relax', 'Relax', GEOM, 40, 240, 10, v => v + ''),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', lambda: 10, R: 48, relax: 90, view: 'int', exposure: 1 };
  const PRESETS = {
    expel: pre('Expelled', { lambda: 8, R: 52, relax: 110 }, Pal.glacier),
    thin: pre('Thin λ', { lambda: 5, R: 56 }, Pal.nightshade),
    deep: pre('Deep λ', { lambda: 28, R: 40 }, Pal.harbor),
    log: pre('Log B', { view: 'log', lambda: 9, R: 50 }, Pal.ember),
    small: pre('Small disk', { R: 22, lambda: 10 }, Pal.kiln),
    tight: pre('Tight', { lambda: 6, R: 60, relax: 130 }, Pal.thermal),
  };

  function surprise(rng) { return { lambda: rng.int(6, 28), R: rng.int(24, 64) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'meissner', name: 'Meissner', tab: 'Meissner',
    subtitle: 'a field a perfect conductor would have frozen, expelled · 1933',
    order: 67,
    equation: '∇²B = B/λ²,   B(r) = B0 I0(r/λ) / I0(R/λ)   (cylinder)',
    credit: 'W. Meissner and R. Ochsenfeld, Naturwissenschaften 21, 787 (1933). A perfect conductor would freeze the flux it was born with. A superconductor expels it. The London brothers (1935) wrote ∇²B = B/λ². The plate is a Jacobi relax of that Helmholtz problem on a disk.',
    blurb: 'Cool a metal in a field and a perfect conductor would trap that field forever. A superconductor kicks it out. That is the Meissner effect, and it is why superconductivity is not just infinite conductivity. The plate is B. The status line reports B at the centre against 1/I0(R/λ).',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { SC: 'R much larger than λ is a dark core. R comparable to λ lets the field leak in.' },
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

        const lam = Math.max(2, s.lambda), R = s.R, steps = s.relax | 0;
        const cx = W / 2, cy = H / 2;
        let B = new Float64Array(W * H);
        B.fill(1);
        for (let k = 0; k < steps; k++) {
          const nB = B.slice();
          for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
            const i = y * W + x;
            if (r >= R) { nB[i] = 1; continue; }
            const lap = B[i + 1] + B[i - 1] + B[i + W] + B[i - W] - 4 * B[i];
            nB[i] = B[i] + 0.2 * (lap - B[i] * (1 / (lam * lam)));
            if (nB[i] < 0) nB[i] = 0;
          }
          B = nB;
        }
        let csum = 0, nc = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x;
          field[i] = B[i];
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy < 4) { csum += B[i]; nc++; }
        }
        metric = csum / Math.max(1, nc);
        const z = R / lam;
        extra = 1 / (1 + z * z / 4 + z * z * z * z / 64); // crude I0 padé

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

      function status() { host.setStatus('<span>B(0)/B0 <b>' + f3(metric) + '</b></span><span>~ 1/I0(R/λ) ' + f3(extra) + '</span><span>' + (metric < 0.35 ? 'expelled' : 'leaking') + '</span>'); }

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
