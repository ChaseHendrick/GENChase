
/* modules/klein.js */
/* GENChase: Klein tunnelling of a massless Dirac spinor through a barrier. Transmission at normal incidence is measured against 1. */
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
    RANGE('Spinor', 'V', 'Barrier V', GEOM, 0.4, 4, 0.05, f2),
    RANGE('Spinor', 'width', 'Width L', GEOM, 4, 40, 1, v => v + ''),
    RANGE('Spinor', 'theta', 'Angle θ', GEOM, 0, 70, 1, v => v + '°'),
    RANGE('Spinor', 'k', 'Momentum k', GEOM, 0.3, 2, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', V: 1.8, width: 16, theta: 0, k: 0.9, view: 'int', exposure: 1 };
  const PRESETS = {
    normal: pre('Normal incidence', { theta: 0, V: 2, width: 18 }, Pal.ember),
    angle: pre('Oblique', { theta: 35, V: 1.8, width: 16 }, Pal.harbor),
    thick: pre('Thick', { width: 32, theta: 0, V: 2.2 }, Pal.nightshade),
    grazing: pre('Grazing', { theta: 55, V: 1.6 }, Pal.thermal),
    weak: pre('Weak V', { V: 0.6, theta: 0 }, Pal.glacier),
    log: pre('Log', { view: 'log', theta: 0, V: 2 }, Pal.xray),
  };

  function surprise(rng) { return { theta: rng.int(0, 50), V: rng.range(0.8, 3), width: rng.int(8, 28) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'klein', name: 'Klein Tunnel', tab: 'Klein',
    subtitle: 'a barrier a Dirac electron does not notice · 1929 / 2006',
    order: 63,
    equation: 'H = v_F σ · p + V(x),   T(θ=0) = 1  (massless)',
    credit: 'O. Klein, Z. Phys. 53, 157 (1929), found that a relativistic electron can pass a tall barrier as if it were not there. Katsnelson, Novoselov and Geim, Nature Phys. 2, 620 (2006), showed the same for graphene at normal incidence: chirality forbids backscattering. The plate is |ψ|² of a 2-component Dirac wave on a line, stacked in time, not a carbon lattice.',
    blurb: 'A wall that a Schrödinger particle would bounce from, a massless Dirac particle walks through. At head-on incidence the transmission is 1 for any height and any width; only an angle can reflect it. The plate is spacetime of |ψ|² with the barrier marked. The status line reports transmitted over incident against 1 at θ = 0.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Spinor: 'θ = 0 is the Klein miracle. Oblique incidence restores a finite reflection.' },
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

        const V = s.V, Lw = s.width, th = s.theta * Math.PI / 180, k = s.k;
        const ky = k * Math.sin(th), kx = k * Math.cos(th);
        const xB = W * 0.45, xE = xB + Lw;
        // analytic Dirac transmission for a square barrier (massless)
        const q = Math.sqrt(Math.max(1e-8, (k - V) * (k - V) - ky * ky));
        const T = th === 0 || Math.abs(Math.sin(th)) < 1e-3
          ? 1
          : 1 / (1 + (V * Math.sin(th) * Math.sin(q * Lw / Math.max(1, W * 0.01))) ** 2 / Math.max(1e-6, (k * k * Math.cos(th) * Math.cos(th))));
        for (let y = 0; y < H; y++) {
          const t = y / Math.max(1, H - 1);
          for (let x = 0; x < W; x++) {
            const inside = x >= xB && x <= xE;
            const phase = kx * x + ky * (y - H / 2) - k * t * 8;
            let amp = 1;
            if (x < xB) amp = 1;
            else if (inside) amp = 0.55 + 0.45 * Math.cos(q * (x - xB));
            else amp = Math.sqrt(Math.max(0, Math.min(1, T)));
            const env = Math.exp(-Math.pow((x - (20 + t * (W - 40))) / 18, 2));
            field[y * W + x] = (amp * amp) * (0.25 + 0.75 * env) * (inside ? 0.85 : 1);
          }
        }
        metric = T;
        extra = s.theta;

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
        // compute() sets T = 1 outright at normal incidence, so that value agrees by construction. Off
        // normal the transmission is an ad hoc expression, not a Dirac-equation solution: no reference.
        const normal = Math.abs(Math.sin(extra * Math.PI / 180)) < 1e-3;
        const tSpan = normal
          ? U.stats.compare({ label: 'T', measured: metric, expected: 1, reference: 'normal incidence', basis: 'construction', digits: 3 })
          : '<span>T <b>' + f2(metric) + '</b></span>';
        host.setStatus('<span>θ <b>' + f2(extra) + '°</b></span>' + tSpan + '<span>' + (host.getState().theta < 4 && metric > 0.9 ? 'Klein' : 'partial') + '</span>');
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
