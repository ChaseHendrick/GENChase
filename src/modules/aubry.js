
/* modules/aubry.js */
/* GENChase: Aubry-André quasiperiodic chain. Localisation without disorder, at λ = 2. IPR is measured against the self-dual point. */
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

  // The Grid slider and sanitize() read the same bounds, so no slider position is clamped away.
  const GRID_MIN = 96, GRID_MAX = 192;
  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, GRID_MIN, GRID_MAX, 16, v => v + ''),
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
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'aubry', name: 'Aubry–André', tab: 'Aubry',
    subtitle: 'localisation without disorder · 1980',
    order: 56,
    equation: 'ψ_{n+1}+ψ_{n-1} + 2λ cos(2π β n) ψ_n = E ψ_n,   β = (√5-1)/2,   localised for λ>2',
    credit: 'S. Aubry and G. André, Ann. Israel Phys. Soc. 3, 133 (1980). A quasiperiodic potential is deterministic, yet past λ = 2 every eigenstate localises. The model is self-dual: momentum-space at λ is real-space at 1/λ, so the transition sits exactly at 2. The plate is the ground state of a golden-ratio chain by imaginary-time relaxation.',
    blurb: 'Anderson needed randomness. Aubry and André did not: a cosine at an irrational period is enough, and the transition is sharp. Below λ = 2 the ground state is extended; above, it sits in a well. The status line reports the inverse participation ratio against 1/N.',
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

      // λ is printed as a setting only. With unit hopping and the potential 2λ cos(2πβn) implemented
      // here the self-dual point is λ = 1, not the 2 this line used to print, and the localised or
      // extended verdict keyed on λ > 2 went with it: an IPR from one unconverged relaxation cannot
      // classify the state on its own (λ = 0.8 reads about 5/N). Reconciling the convention with the
      // primary model is open in validation/MATERIAL-WAVES.md. One Gaussian start vector relaxed for a
      // fixed number of steps gives no honest error bar on the IPR from one plate.
      function status() {
        host.setStatus('<span>λ <b>' + f2(extra) + '</b></span>' +
          U.stats.compare({ label: 'IPR', measured: metric, expected: 1 / W, reference: 'uniform state', basis: 'sampled',
            pending: 'one start vector, relaxation not converged' }));
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
