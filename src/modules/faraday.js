
/* modules/faraday.js */
/* GENChase: parametrically driven Faraday waves on a damped thin layer, with an oscillon seed. Dominant wavelength is measured from the plate and compared to the linear Faraday estimate. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Layer', 'grid', 'Grid', GEOM, 96, 256, 16, v => v + ''),
    { group: 'Layer', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Drive', 'amp', 'Drive Γ', LIVE, 0, 2.4, 0.05, f2),
    RANGE('Drive', 'omega', 'Frequency ω', LIVE, 0.15, 1.8, 0.05, f2),
    RANGE('Drive', 'damp', 'Damping', LIVE, 0.01, 0.25, 0.005, f2),
    RANGE('Layer', 'tension', 'Stiffness κ', LIVE, 0.08, 1.2, 0.02, f2),
    RANGE('Layer', 'g0', 'Restoring g', LIVE, 0.05, 1.2, 0.02, f2),
    RANGE('Layer', 'nonlin', 'Nonlinearity', LIVE, 0, 1.4, 0.05, f2),
    { group: 'Seed', key: 'init', label: 'Seed', type: 'seg', kind: GEOM, options: [['noise', 'Noise'], ['oscillon', 'Oscillon'], ['stripe', 'Stripe'], ['spot', 'Two spots']] },
    RANGE('Seed', 'warmup', 'Warm-up', GEOM, 0, 1600, 40, v => v + ''),
    { group: 'Seed', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['height', 'Height'], ['slope', 'Slope'], ['energy', 'Energy']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 160, aspect: '1:1',
    amp: 1.15, omega: 0.55, damp: 0.06,
    tension: 0.35, g0: 0.35, nonlin: 0.45,
    init: 'oscillon', warmup: 360, running: true,
    view: 'height', exposure: 1.05,
  };

  const PRESETS = {
    oscillon: pre('Oscillon', { init: 'oscillon', amp: 1.2, omega: 0.5, damp: 0.07, view: 'height' }, Pal.ember),
    square: pre('Square lattice', { init: 'noise', amp: 1.35, omega: 0.7, damp: 0.05, warmup: 700, view: 'height' }, Pal.harbor),
    stripe: pre('Stripes', { init: 'stripe', amp: 0.95, omega: 0.4, view: 'slope' }, Pal.kiln),
    pair: pre('Oscillon pair', { init: 'spot', amp: 1.25, omega: 0.48, view: 'height' }, Pal.bioluminescent),
    quiet: pre('Below threshold', { init: 'noise', amp: 0.25, omega: 0.6, warmup: 200, view: 'height' }, Pal.graphite),
    wild: pre('High drive', { init: 'noise', amp: 2.0, omega: 0.9, damp: 0.04, nonlin: 0.9, view: 'energy' }, Pal.thermal),
    fine: pre('Fine cells', { init: 'noise', omega: 1.05, amp: 1.15, tension: 0.45, damp: 0.07, warmup: 800, view: 'height' }, Pal.nightshade),
  };

  function surprise(rng) {
    return {
      init: rng.pick(['noise', 'oscillon', 'spot', 'stripe']),
      amp: rng.range(0.7, 1.8),
      omega: rng.range(0.35, 1.1),
      damp: rng.range(0.03, 0.1),
      view: rng.pick(['height', 'height', 'slope']),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(96, Math.min(256, Math.round(s.grid / 16) * 16));
  }

  Studio.register({
    id: 'faraday',
    name: 'Faraday Waves',
    tab: 'Faraday',
    subtitle: 'parametrically driven layer · 1831 / 1996',
    order: 43,
    equation: '∂tt h + γ ∂t h + (g − Γ cos ωt) ∇²h + κ ∇⁴h + u h³ = 0',
    credit: 'M. Faraday, Philos. Trans. R. Soc. 121, 299 (1831), saw crisp standing waves on a shaken plate of liquid. P. Umbanhowar, F. Melo and H. L. Swinney, Nature 382, 793 (1996), found oscillons: localized, subharmonic bouncing spots on a granular layer. The sheet here is a damped, parametrically driven conservation law with a cubic saturation, not a box of brass beads.',
    blurb: 'Shake a layer and the effective gravity ticks. Above a threshold the flat surface is unstable and a standing lattice grows at half the drive frequency. In a quieter window a single bump can live as an oscillon, a spot that bounces in place instead of spreading into a crystal. The plate integrates that oscillator on a grid. The status line reports the measured crest spacing against the linear Faraday estimate 2π sqrt(κ / ω). Click to drop another bump.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Seed'],
    hints: {
      Drive: 'Γ is the shake. Below about 0.5 on this sheet the flat state wins. Frequency selects the cell size. Damping kills everything if you push it.',
      Layer: 'Stiffness κ is the ∇⁴ penalty that stops the grid-scale mode. Nonlinearity saturates the amplitude so the lattice does not explode.',
      Seed: 'Oscillon is one bump. Noise grows a crystal if the drive is high enough. Below threshold the noise just sits there and dies.',
    },
    palette: true,
    defaultPalette: 'ember',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, hh, vv, step = 0, raf = 0, paused = false, buf, img, lam = 0, lamTh = 0, lamStat = null;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(64, Math.round(g * aspect)) };
      }

      function idx(x, y) { return y * W + x; }

      function seed(s) {
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        const N = W * H;
        hh = new Float32Array(N);
        vv = new Float32Array(N);
        const rng = U.makeRng(s.seed + '/h');
        if (s.init === 'noise') {
          for (let i = 0; i < N; i++) hh[i] = rng.gauss() * 0.15;
        } else if (s.init === 'stripe') {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) hh[idx(x, y)] = 0.4 * Math.sin(x * 0.28);
        } else if (s.init === 'spot') {
          const drop = (cx, cy, sgn) => {
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              const r = Math.hypot(x - cx, y - cy);
              hh[idx(x, y)] += sgn * 0.9 * Math.exp(-(r * r) / 40);
            }
          };
          drop(W * 0.38, H * 0.5, 1);
          drop(W * 0.62, H * 0.5, -1);
        } else {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const r = Math.hypot(x - W * 0.5, y - H * 0.5);
            hh[idx(x, y)] = 1.1 * Math.exp(-(r * r) / 28);
          }
        }
        step = 0;
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function lap4(src, x, y) {
        const xm = x === 0 ? W - 1 : x - 1, xp = x === W - 1 ? 0 : x + 1;
        const ym = y === 0 ? H - 1 : y - 1, yp = y === H - 1 ? 0 : y + 1;
        return src[idx(xp, y)] + src[idx(xm, y)] + src[idx(x, yp)] + src[idx(x, ym)] - 4 * src[idx(x, y)];
      }

      function advance(s, nsteps) {
        const g0 = s.g0, kap = s.tension, gam = s.damp, om = s.omega, G = s.amp, u = s.nonlin;
        const dt = Math.min(0.06, 0.35 / (1 + 10 * kap));
        for (let it = 0; it < nsteps; it++) {
          const drive = g0 - G * Math.cos(om * step * dt);
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const i = idx(x, y);
              const L = lap4(hh, x, y);
              const xm = x === 0 ? W - 1 : x - 1, xp = x === W - 1 ? 0 : x + 1;
              const ym = y === 0 ? H - 1 : y - 1, yp = y === H - 1 ? 0 : y + 1;
              const L2 = lap4(hh, xp, y) + lap4(hh, xm, y) + lap4(hh, x, yp) + lap4(hh, x, ym) - 4 * L;
              const force = drive * L - kap * 0.35 * L2 - u * hh[i] * hh[i] * hh[i];
              vv[i] = (vv[i] + dt * force) * (1 - gam);
              // clamp velocity so a bad step cannot fill the Nyquist mode
              if (vv[i] > 4) vv[i] = 4;
              if (vv[i] < -4) vv[i] = -4;
            }
          }
          for (let i = 0; i < hh.length; i++) {
            hh[i] += dt * vv[i];
            if (hh[i] > 6) hh[i] = 6;
            if (hh[i] < -6) hh[i] = -6;
          }
          step++;
        }
      }

      // Zero-crossing wavelength along one row, or 0 when the row crosses fewer than twice.
      function rowLam(y) {
        let crossings = 0, last = hh[idx(0, y)];
        for (let x = 1; x < W; x++) {
          const v = hh[idx(x, y)];
          if (last === 0 || (last < 0 && v >= 0) || (last > 0 && v <= 0)) crossings++;
          last = v;
        }
        return crossings > 1 ? (2 * W / crossings) : 0;
      }
      function measure(s) {
        // Zero-crossing wavelength, against 2π sqrt(κ / ω). The Stripe, Oscillon and Two-spot seeds
        // start from a formula with no randomness, so their mid row is read as before. The Noise seed
        // is a random draw: there the wavelength is averaged over every row that crosses at least
        // twice, with its error bar from tau_int over the row sequence, since neighboring rows of one
        // field are correlated.
        lamStat = null;
        if (s.init === 'noise') {
          const rows = [];
          for (let y = 0; y < H; y++) { const v = rowLam(y); if (v) rows.push(v); }
          lamStat = rows.length ? U.stats.seriesMean(rows) : null;
          lam = lamStat ? lamStat.mean : 0;
        } else {
          lam = rowLam((H / 2) | 0);
        }
        lamTh = s.omega > 0.05 ? (2 * Math.PI * Math.sqrt(Math.max(1e-4, s.tension) / s.omega)) : 0;
      }

      function paint(s) {
        if (!hh) return;
        const data = img.data;
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1A1A1A', '#F25C05', '#FFF3D6'];
        const ramp = U.makeRamp(pal, s.bg || '#121110');
        const exp = s.exposure;
        const view = s.view;
        let lo = Infinity, hi = -Infinity;
        const val = new Float32Array(hh.length);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = idx(x, y);
          let v = hh[i];
          if (view === 'slope') v = Math.hypot(hh[idx((x + 1) % W, y)] - hh[idx((x + W - 1) % W, y)], hh[idx(x, (y + 1) % H)] - hh[idx(x, (y + H - 1) % H)]);
          else if (view === 'energy') v = 0.5 * vv[i] * vv[i] + 0.5 * hh[i] * hh[i];
          val[i] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const span = (hi - lo) || 1;
        for (let i = 0; i < val.length; i++) {
          const t = U.clamp(((val[i] - lo) / span) * exp, 0, 1);
          const c = ramp(t);
          const o = i * 4;
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b></span>' +
          (!lam ? '<span>λ <b>—</b> · linear estimate ' + lamTh.toFixed(1) + '</span>'
            : lamStat
              ? U.stats.compare({ label: 'λ', measured: lam, expected: lamTh, reference: 'linear estimate', basis: 'sampled', digits: 3,
                  uncertainty: lamStat.se, method: 'τ_int over ' + lamStat.n + ' rows',
                  pending: lamStat.se === 0 ? 'every row gives the same crossing count' : 'too few rows to estimate τ_int' })
              : U.stats.compare({ label: 'λ', measured: lam, expected: lamTh, reference: 'linear estimate', basis: 'deterministic', digits: 3 })) +
          '<span>step <b>' + step.toLocaleString() + '</b></span>'
        );
      }

      function loop() {
        raf = 0;
        if (paused || !host.isActive()) return;
        const s = host.getState();
        if (!s.running) { paint(s); return; }
        const t0 = performance.now();
        let n = 0;
        while (performance.now() - t0 < 22 && n < 5) { advance(s, 1); n++; }
        if ((step & 7) === 0) measure(s);
        paint(s); status();
        raf = requestAnimationFrame(loop);
      }
      function startLoop() {
        if (raf || paused) return;
        const s = host.getState();
        if (!s.running || host.reducedMotion()) return;
        raf = requestAnimationFrame(loop);
      }
      function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() {
          const s = host.getState();
          stopLoop();
          seed(s);
          const warm = host.reducedMotion() ? Math.min(s.warmup, 50) : s.warmup;
          advance(s, warm);
          measure(s); paint(s); status();
          startLoop();
        },
        repaint() { const s = host.getState(); paint(s); status(); },
        live(key) {
          const s = host.getState();
          if (key === 'running') { if (s.running) startLoop(); else stopLoop(); }
        },
        resize() { const s = host.getState(); if (hh) paint(s); },
        pause() { paused = true; stopLoop(); },
        resume() {
          paused = false;
          const s = host.getState();
          if (hh) { paint(s); status(); }
          startLoop();
        },
        disturb(p) {
          if (!hh) return;
          const s = host.getState();
          const cx = p.x * (W - 1), cy = p.y * (H - 1);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const r = Math.hypot(x - cx, y - cy);
            hh[idx(x, y)] += 0.9 * Math.exp(-(r * r) / 22);
          }
          paint(s); status();
        },
        async exportPNG(w, ht) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas');
          c.width = w; c.height = ht;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = true;
          g.fillStyle = s.bg;
          g.fillRect(0, 0, w, ht);
          g.drawImage(buf, 0, 0, w, ht);
          return U.toBlob(c);
        },
      };
    },
  });
})();
