
/* modules/tennis.js */
/* GENChase: Dzhanibekov / tennis-racket theorem. Intermediate-axis rotation is unstable and flips. Flip count of ω2 is measured. */
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
    RANGE('Body', 'I2', 'I_intermediate', GEOM, 1.05, 1.9, 0.05, f2),
    RANGE('Body', 'eps', 'Seed tilt', GEOM, 0.002, 0.08, 0.002, f3),
    RANGE('Body', 'T', 'Duration', GEOM, 20, 120, 2, v => v + ''),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '4:5', I2: 1.4, eps: 0.02, T: 60, view: 'int', exposure: 1 };
  const PRESETS = {
    flip: pre('Flip', { I2: 1.4, eps: 0.02, T: 70 }, Pal.ember),
    stable1: pre('Nearly equal I1 and I2', { I2: 1.05, eps: 0.01, T: 50 }, Pal.harbor),
    wild: pre('Wild', { I2: 1.55, eps: 0.05, T: 90 }, Pal.thermal),
    slow: pre('Slow seed', { I2: 1.35, eps: 0.006, T: 100 }, Pal.nightshade),
    log: pre('Log |ω2|', { view: 'log', I2: 1.45 }, Pal.glacier),
    racket: pre('Racket', { I2: 1.7, eps: 0.03, T: 80 }, Pal.kiln),
  };

  function surprise(rng) { return { I2: rng.range(1.15, 1.75), eps: rng.range(0.008, 0.05), T: rng.int(40, 100) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  // Fourth-order time stepping avoids the artificial energy growth of forward
  // Euler. Every preset starts near the intermediate axis; no flip during a
  // finite observation window does not establish stability.
  function tennisStep(w, dt, I2) {
    const rate = z => [(I2 - 2) * z[1] * z[2], z[2] * z[0] / I2, (1 - I2) * z[0] * z[1] / 2];
    const a = rate(w);
    const b = rate(w.map((v, i) => v + dt * a[i] / 2));
    const c = rate(w.map((v, i) => v + dt * b[i] / 2));
    const d = rate(w.map((v, i) => v + dt * c[i]));
    return w.map((v, i) => v + dt * (a[i] + 2 * b[i] + 2 * c[i] + d[i]) / 6);
  }
  Studio.register({
    id: 'tennis', name: 'Tennis Racket', tab: 'Tennis',
    subtitle: 'the intermediate axis that will not spin · 1834 / 1991',
    order: 68,
    equation: 'I1 ω1\' = (I2−I3) ω2 ω3  (cyc.),   I1 < I2 < I3,   ω2 flips',
    credit: 'L. Poinsot (1834) drew the polhode. The tennis-racket (or intermediate-axis) theorem says a rotation about the middle principal axis is unstable. V. Dzhanibekov saw a wingnut flip in free fall in 1985; video from 1991 made it famous. The plate is spacetime of the body-frame ω, with the middle component across the page.',
    blurb: 'Spin a racket about the handle, or about the face: it holds. Spin it about the remaining axis and it flips, over and over, for no dissipation at all. The plate is that polhode as spacetime. The status line reports how many times ω2 changed sign, against 0 for a stable axis.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Body: 'I1 = 1, I3 = 2, I2 in between. Closer I2 sits to either end, the slower the flip.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
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

        const I1 = 1, I3 = 2, I2 = U.clamp(s.I2, 1.02, 1.98), eps = s.eps, T = s.T;
        let w1 = eps, w2 = 1, w3 = eps * 0.4;
        const dt = T / Math.max(1, H) / 8;
        let flips = 0, prev = w2;
        for (let y = 0; y < H; y++) {
          for (let k = 0; k < 8; k++) {
            [w1, w2, w3] = tennisStep([w1, w2, w3], dt, I2);
          }
          if (prev * w2 < 0) flips++;
          prev = w2;
          for (let x = 0; x < W; x++) {
            const u = x / Math.max(1, W - 1);
            field[y * W + x] = w2 * (0.4 + 0.6 * u) + 0.35 * w1 * Math.sin(u * Math.PI) + 0.25 * w3 * Math.cos(u * Math.PI * 2);
          }
        }
        metric = flips;
        extra = I2;

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

      function status() { host.setStatus('<span>I2 <b>' + f2(extra) + '</b> in (1, 2)</span><span>ω2 flips <b>' + (metric | 0) + '</b></span><span>' + (metric > 0 ? 'flip observed' : 'no flip in this time window') + '</span>'); }

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
