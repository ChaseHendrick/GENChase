
/* modules/loschmidt.js */
/* GENChase: Loschmidt reversal. A mixing gas that unmixes when every velocity is flipped. Return overlap is measured against 1. */
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
    RANGE('Gas', 'nPart', 'Particles', GEOM, 12, 80, 2, v => v + ''),
    RANGE('Gas', 'flipAt', 'Reverse at', GEOM, 0.3, 0.7, 0.02, f2),
    { group: 'Gas', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['spacetime', 'Spacetime'], ['mix', 'No reverse']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '4:5', nPart: 36, flipAt: 0.5, kind: 'spacetime', view: 'int', exposure: 1 };
  const PRESETS = {
    echo: pre('Loschmidt echo', { kind: 'spacetime', flipAt: 0.5, nPart: 40 }, Pal.harbor),
    late: pre('Late reverse', { flipAt: 0.62, nPart: 32 }, Pal.ember),
    early: pre('Early reverse', { flipAt: 0.38, nPart: 32 }, Pal.glacier),
    many: pre('Many', { nPart: 64, flipAt: 0.5 }, Pal.nightshade),
    mix: pre('No reverse', { kind: 'mix', nPart: 40 }, Pal.graphite),
    log: pre('Log', { view: 'log', nPart: 36 }, Pal.thermal),
  };

  function surprise(rng) { return { nPart: rng.int(20, 60), flipAt: rng.range(0.4, 0.6), kind: rng() < 0.15 ? 'mix' : 'spacetime' }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'loschmidt', name: 'Loschmidt Echo', tab: 'Loschmidt',
    subtitle: 'a gas that unmixes when you flip every arrow · 1876',
    order: 96,
    equation: 'x_i(t) = x_i + v_i t  (t < T),   v_i ← −v_i  at T,   overlap(2T) = 1',
    credit: 'J. Loschmidt, Sitzungsber. Kais. Akad. Wiss. Wien 73, 128 (1876), objected to Boltzmann: reverse every velocity and the entropy decrease is as lawful as the increase. The objection is correct for a finite isolated system; the catch is the exponential sensitivity that makes the reversal unprepareable. The plate is non-interacting tracers on a ring, reversed on cue, so the echo is exact and visible.',
    blurb: 'Mix a gas, then flip every velocity. The movie of mixing, played backwards, is a valid trajectory of Newton\'s laws, so the gas unmixes. Boltzmann\'s H-theorem looks violated; it is not, because the reversed state is one of measure zero. The plate is that movie as spacetime. The status line reports overlap with the initial condition at the end of the echo, against 1.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Gas: 'No reverse is the control: the same trajectories, never flipped, stay mixed. Reverse at 0.5 for a symmetric echo.' },
    palette: true, defaultPalette: 'harbor', surprise, sanitize,
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

        const n = s.nPart | 0, flip = s.flipAt, doFlip = s.kind !== 'mix';
        const x0 = new Float64Array(n), v = new Float64Array(n);
        for (let i = 0; i < n; i++) { x0[i] = rng() * 0.22 + 0.08; v[i] = (rng() - 0.5) * 1.8; }
        field.fill(0);
        const T = 1;
        for (let y = 0; y < H; y++) {
          const t = T * y / Math.max(1, H - 1);
          for (let i = 0; i < n; i++) {
            let xx;
            if (doFlip && t > flip * T) {
              const tR = flip * T;
              const xr = x0[i] + v[i] * tR;
              xx = xr - v[i] * (t - tR);
            } else xx = x0[i] + v[i] * t;
            xx = xx - Math.floor(xx);
            const xi = (xx * W) | 0;
            if (xi >= 0 && xi < W) {
              field[y * W + xi] += 1;
              if (xi + 1 < W) field[y * W + xi + 1] += 0.45;
              if (xi > 0) field[y * W + xi - 1] += 0.45;
            }
          }
        }
        let ov = 0;
        const yEnd = H - 1, y0 = 0;
        for (let x = 0; x < W; x++) ov += Math.min(field[yEnd * W + x], field[y0 * W + x]);
        let n0 = 0; for (let x = 0; x < W; x++) n0 += field[y0 * W + x];
        metric = ov / Math.max(1e-6, n0);
        extra = doFlip ? 1 : 0;

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

      function status() { host.setStatus('<span>overlap(end, 0) <b>' + f2(metric) + '</b></span><span>theory ' + (host.getState().kind === 'mix' ? '~ 0' : '1') + '</span><span>' + (host.getState().kind !== 'mix' && metric > 0.55 ? 'echo' : 'mixed') + '</span>'); }

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
