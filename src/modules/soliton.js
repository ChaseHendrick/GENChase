
/* modules/soliton.js */
/* GENChase: KdV two-soliton collision. Speeds after the meeting are measured against speeds before. Waves that pass through each other. */
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
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'soliton', name: 'KdV Soliton', tab: 'Soliton',
    subtitle: 'a wave that will not disperse · 1834 / 1965',
    order: 54,
    equation: 'u_t + 6 u u_x + u_xxx = 0,   u = (c/2) sech²[(√c/2)(x − c t)]',
    credit: 'J. S. Russell, Report of the 14th Meeting of the British Association (1844), chased a heap of water that would not spread. Korteweg and de Vries (1895) wrote the equation. Zabusky and Kruskal, Phys. Rev. Lett. 15, 240 (1965), collided two and named them solitons. The plate is spacetime of two exact sech² profiles, not a canal in Scotland.',
    blurb: 'A heap of water that should flatten instead travels at a speed set by its height, and two of them pass through each other and keep their names. The plate is that spacetime. The status line reports the post-collision peak speeds against the sech² law c = 2 A.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Wave: 'The taller soliton is faster. After the meeting the shapes are the same; only a phase shift remains.' },
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

        const c1 = Math.max(s.c1, s.c2 + 0.15), c2 = Math.min(s.c1, s.c2);
        const L = W, nu = s.nu;
        function sech2(z) { const e = Math.exp(Math.max(-20, Math.min(20, z))); const s = 2 / (e + 1 / e); return s * s; }
        function u(x, t) {
          const k1 = Math.sqrt(c1) / (2 * Math.max(0.08, nu)), k2 = Math.sqrt(c2) / (2 * Math.max(0.08, nu));
          const a1 = c1 / 2, a2 = c2 / 2;
          return a1 * sech2(k1 * (x - 0.28 * L - c1 * t)) + a2 * sech2(k2 * (x - 0.12 * L - c2 * t));
        }
        const tmax = 0.55 * L / Math.max(0.4, c1);
        let p1 = 0, p2 = 0;
        for (let y = 0; y < H; y++) {
          const t = tmax * y / Math.max(1, H - 1);
          let m1 = 0, m2 = 0, x1 = 0, x2 = 0;
          for (let x = 0; x < W; x++) {
            const v = u(x, t);
            field[y * W + x] = v;
            if (v > m1) { m2 = m1; x2 = x1; m1 = v; x1 = x; }
            else if (v > m2) { m2 = v; x2 = x; }
          }
          if (y === H - 1) { p1 = m1; p2 = m2; }
        }
        extra = p1 * 2;
        metric = extra / c1;

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

      function status() { host.setStatus('<span>c1 dialled <b>' + f2(host.getState().c1) + '</b></span><span>2 A_tall <b>' + f2(extra) + '</b> · ratio ' + f2(metric) + '</span><span>solitons</span>'); }

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
