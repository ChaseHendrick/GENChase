
/* modules/aubry.js */
/* GENChase: Aubry-André quasiperiodic chain. Localisation without disorder, at λ = 2. IPR is measured against the self-dual point. */
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
    RANGE('Chain', 'lambda', 'Potential λ', GEOM, 0, 4.5, 0.05, f2, { hint: 'Self-dual at λ = 2. Below, extended. Above, localised. No randomness is required.' }),
    RANGE('Chain', 'relax', 'Relax steps', GEOM, 40, 300, 10, v => v + ''),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 128, aspect: '4:5', lambda: 2.4, relax: 140, view: 'int', exposure: 1.05 };
  const PRESETS = {
    loc: pre('Localised', { lambda: 3.2 }, Pal.ember),
    ext: pre('Extended', { lambda: 0.8 }, Pal.harbor),
    crit: pre('Critical λ=2', { lambda: 2.0, view: 'log' }, Pal.nightshade),
    deep: pre('Deep', { lambda: 4.0 }, Pal.thermal),
    sweep: pre('Near dual', { lambda: 2.15 }, Pal.kiln),
    clean: pre('Almost free', { lambda: 0.3 }, Pal.glacier),
  };

  function surprise(rng) { return { lambda: rng.range(0.4, 3.8) }; }
  function sanitize(s) { s.grid = Math.max(64, Math.min(192, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'aubry', name: 'Aubry–André', tab: 'Aubry',
    subtitle: 'localisation without disorder · 1980',
    order: 56,
    equation: 'ψ_{n+1}+ψ_{n-1} + 2λ cos(2π β n) ψ_n = E ψ_n,   β = (√5-1)/2,   localised for λ>2',
    credit: 'S. Aubry and G. André, Ann. Israel Phys. Soc. 3, 133 (1980). A quasiperiodic potential is deterministic, yet past λ = 2 every eigenstate localises. The model is self-dual: momentum-space at λ is real-space at 1/λ, so the transition sits exactly at 2. The plate is the ground state of a golden-ratio chain by imaginary-time relaxation.',
    blurb: 'Anderson needed randomness. Aubry and André did not: a cosine at an irrational period is enough, and the transition is sharp. Below λ = 2 the ground state is extended; above, it sits in a well. The status line reports the inverse participation ratio against 1/N, and whether λ sits past the dual point 2.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { Chain: 'The golden ratio keeps the potential from ever repeating. λ = 2 is the self-dual critical line.' },
    palette: true, defaultPalette: 'nightshade', surprise, sanitize,
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

        const lam = s.lambda, steps = s.relax | 0, beta = 0.5 * (Math.sqrt(5) - 1);
        const N = W;
        let psi = new Float64Array(N), nxt = new Float64Array(N);
        const pot = new Float64Array(N);
        for (let i = 0; i < N; i++) { pot[i] = 2 * lam * Math.cos(2 * Math.PI * beta * i); psi[i] = rng.gauss(); }
        const dt = 0.08 / (4 + Math.abs(lam) + 1);
        for (let k = 0; k < steps; k++) {
          let n2 = 0;
          for (let i = 0; i < N; i++) {
            const L = psi[(i + N - 1) % N], R = psi[(i + 1) % N];
            const v = psi[i] - dt * (-(L + R) + (2 + pot[i]) * psi[i]);
            nxt[i] = v; n2 += v * v;
          }
          const inv = 1 / Math.sqrt(n2 || 1);
          for (let i = 0; i < N; i++) psi[i] = nxt[i] * inv;
        }
        let ipr = 0;
        for (let y = 0; y < H; y++) {
          const t = y / Math.max(1, H - 1);
          for (let x = 0; x < N; x++) {
            const p = psi[x] * psi[x];
            field[y * N + x] = p * (0.35 + 0.65 * Math.exp(-8 * Math.abs(t - 0.5)));
            if (y === (H >> 1)) ipr += p * p;
          }
        }
        metric = ipr;
        extra = lam;

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

      function status() { host.setStatus('<span>λ <b>' + f2(extra) + '</b> · dual 2</span><span>IPR <b>' + f3(metric) + '</b> · 1/N ' + f3(1 / W) + '</span><span>' + (extra > 2 ? (metric > 4 / W ? 'localised' : 'finite-size') : 'extended') + '</span>'); }

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
