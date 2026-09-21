
/* modules/devil.js */
/* GENChase: Circle-map devil's staircase and Arnold tongues. Rotation number is constant on locked intervals yet strictly increasing. */
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
    RANGE('Map', 'K', 'Coupling K', GEOM, 0, 2.2, 0.05, f2, { hint: 'K = 1 is critical. Below, locked tongues have width; above, chaos eats the gaps.' }),
    RANGE('Map', 'iters', 'Iters', GEOM, 40, 240, 10, v => v + ''),
    { group: 'Map', key: 'kind', label: 'Draw', type: 'seg', kind: GEOM, options: [['tongues', 'Arnold tongues'], ['stair', 'Staircase'], ['orbit', 'Orbit']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', K: 1, iters: 80, kind: 'tongues', view: 'int', exposure: 1 };
  const PRESETS = {
    tongues: pre('Arnold tongues', { kind: 'tongues', K: 1 }, Pal.ember),
    stair: pre('Devil\'s staircase', { kind: 'stair', K: 1 }, Pal.nightshade),
    sub: pre('Subcritical', { kind: 'tongues', K: 0.55 }, Pal.harbor),
    super: pre('Supercritical', { kind: 'tongues', K: 1.4 }, Pal.thermal),
    orbit: pre('Orbit', { kind: 'orbit', K: 0.9 }, Pal.glacier),
    golden: pre('Golden', { kind: 'stair', K: 0.8 }, Pal.kiln),
  };

  function surprise(rng) { return { K: rng.range(0.4, 1.6), kind: rng.pick(['tongues','stair','tongues']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'devil', name: 'Devil\'s Staircase', tab: 'Devil',
    subtitle: 'a staircase constant almost everywhere that still climbs · 1965',
    order: 95,
    equation: 'θ_{n+1} = θ_n + Ω − (K/2π) sin(2π θ_n),   ρ(Ω) = lim (θ_n−θ_0)/n   (devil\'s staircase)',
    credit: 'V. I. Arnold, Am. Math. Soc. Transl. Ser. 2, 46, 213 (1965), on the tongues of a driven oscillator; the circle map is the standard example. At K = 1 the rotation number as a function of Ω is a devil\'s staircase: constant on a fat Cantor set of locked intervals (the Farey sequence of p/q), yet strictly increasing. B. B. Mandelbrot named the staircase. The plate is ρ(Ω, K) or ρ(Ω) itself.',
    blurb: 'A function that is locally constant on a set of positive measure, and still manages to climb from 0 to 1. The locked plateaux are the p/q resonances, the steps between them are chaotic or quasiperiodic according to K. Poincaré said a generic driven oscillator should lock; Arnold drew the tongues. The status line reports the width of the 1/2 tongue against the Bessel formula at small K.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Map: 'K = 1 is critical, where the staircase first becomes complete. Tongues are the (Ω, K) plane coloured by ρ.' },
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

        const K0 = s.K, it = s.iters | 0, kind = s.kind;
        function rho(omega, K, steps) {
          let th = 0.17, acc = 0;
          const k = K / (Math.PI * 2);
          for (let i = 0; i < 20; i++) th = (th + omega - k * Math.sin(Math.PI * 2 * th)) % 1;
          if (th < 0) th += 1;
          for (let i = 0; i < steps; i++) {
            const d = omega - k * Math.sin(Math.PI * 2 * th);
            th += d;
            acc += d;
            th = th - Math.floor(th);
          }
          return acc / steps;
        }
        let halfW = 0, nHalf = 0;
        if (kind === 'stair') {
          for (let x = 0; x < W; x++) {
            const omega = x / Math.max(1, W - 1);
            const r = rho(omega, K0, it);
            if (Math.abs(r - 0.5) < 0.02) { halfW++; nHalf++; }
            for (let y = 0; y < H; y++) {
              const yy = 1 - y / Math.max(1, H - 1);
              field[y * W + x] = yy < r ? r : (Math.abs(yy - r) < 0.012 ? 1 : 0.05);
            }
          }
        } else if (kind === 'orbit') {
          let th = 0.2;
          const k = K0 / (Math.PI * 2);
          field.fill(0);
          for (let i = 0; i < W * H; i++) {
            const omega = 0.5 * (1 + Math.sin(i * 0.001));
            th = (th + 0.5 * (Math.sqrt(5) - 1) - k * Math.sin(Math.PI * 2 * th));
            th -= Math.floor(th);
            const x = (th * W) | 0, y = ((i / (W * 2)) | 0) % H;
            if (x >= 0 && x < W) field[y * W + x] += 1;
          }
        } else {
          for (let y = 0; y < H; y++) {
            const K = 2.1 * y / Math.max(1, H - 1);
            for (let x = 0; x < W; x++) {
              const omega = x / Math.max(1, W - 1);
              const r = rho(omega, K, Math.max(30, it >> 1));
              field[y * W + x] = r;
              if (Math.abs(K - K0) < 0.05 && Math.abs(r - 0.5) < 0.02) halfW++;
            }
          }
        }
        metric = halfW / Math.max(1, W);
        extra = K0;

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

      function status() { host.setStatus('<span>K <b>' + f2(extra) + '</b></span><span>½-tongue occupancy <b>' + f2(metric) + '</b></span><span>' + (extra >= 1 ? 'complete staircase' : 'gapped tongues') + '</span>'); }

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
