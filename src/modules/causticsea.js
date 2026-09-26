
/* modules/causticsea.js */
/* GENChase: Caustic Sea. A Swift-Hohenberg height is its own phase screen; the caustic writes the height. The coupling is the artifact. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint', LIVE = 'live';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 192, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Sea', 'r', 'Drive r', LIVE, 0.05, 1.2, 0.05, f2, { hint: 'Swift–Hohenberg reduced drive. Below ~0.1 the flat state wins.' }),
    RANGE('Sea', 'waves', 'Wavelength', GEOM, 6, 18, 1, v => v + ''),
    RANGE('Loop', 'eta', 'Write η', LIVE, 0, 1.4, 0.05, f2, { hint: 'Feedback of the caustic into the sea. 0 is open-loop SH + a caustic. η > 0 is the closed loop.' }),
    RANGE('Loop', 's', 'Distance s', LIVE, 0.08, 1.4, 0.02, f2, { hint: 'Propagation after the phase screen. Larger s folds the light harder.' }),
    { group: 'Seed', key: 'init', label: 'Seed', type: 'seg', kind: GEOM, options: [['noise', 'Noise'], ['roll', 'Rolls'], ['spot', 'Spot']] },
    RANGE('Seed', 'warmup', 'Warm-up', GEOM, 0, 1600, 40, v => v + ''),
    { group: 'Seed', key: 'running', label: 'Run', type: 'toggle', kind: LIVE },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['lock', 'Lock'], ['height', 'Sea'], ['caustic', 'Caustic'], ['fold', 'Folds']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 128, aspect: '1:1',
    r: 0.55, waves: 10, eta: 0.55, s: 0.55,
    init: 'noise', warmup: 520, running: true,
    view: 'lock', exposure: 1.1,
  };

  const PRESETS = {
    lock: pre('Fold lock', { eta: 0.6, s: 0.55, r: 0.55, view: 'lock', init: 'noise' }, Pal.nightshade),
    open: pre('Open loop', { eta: 0, s: 0.6, r: 0.5, view: 'lock', init: 'noise' }, Pal.graphite),
    silk: pre('Silk', { eta: 0.45, s: 1.05, r: 0.45, waves: 8, view: 'caustic' }, Pal.glacier),
    rolls: pre('Locked rolls', { init: 'roll', eta: 0.7, s: 0.4, waves: 12, view: 'lock' }, Pal.ember),
    tight: pre('Tight cells', { waves: 7, eta: 0.5, s: 0.45, r: 0.7, view: 'lock' }, Pal.thermal),
    over: pre('Overwritten', { eta: 1.15, s: 0.8, r: 0.4, view: 'lock' }, Pal.kiln),
  };

  function surprise(rng) {
    return {
      r: rng.range(0.35, 0.9),
      waves: rng.int(7, 14),
      eta: rng.range(0.15, 0.95),
      s: rng.range(0.25, 1.0),
      init: rng.pick(['noise', 'noise', 'roll']),
      view: rng.pick(['lock', 'lock', 'caustic']),
    };
  }
  function sanitize(s) { s.grid = Math.max(96, Math.min(192, Math.round(s.grid / 16) * 16)); }

  Studio.register({
    id: 'causticsea', name: 'Caustic Sea', tab: 'Sea',
    subtitle: 'a sea that focuses its own light, and the light that writes the sea',
    order: 102,
    equation: '∂t h = −(∇²+k₀²)² h + r h − h³ + η(I−⟨I⟩),   X = x + s ∇h,   I(X) = 1/|det(I + s Hess h)|',
    credit: 'The sea is Swift and Hohenberg, Phys. Rev. A 15, 319 (1977). The brightness after a thin phase screen is Berry’s catastrophe optics, the ray map x ↦ x + s ∇h. Intensity writing a height is the photothermal / Marangoni class. Laser-induced surface patterns are already modelled with Swift–Hohenberg (Rudenko, Colombier, Itina, Stoian, Phys. Rev. Lett. 130, 226201, 2023). This plate is that family with the caustic in the loop, and it reports corr(h, I) against the open-loop control. It is not a new equation and it is not named as one.',
    blurb: 'A patterned sea focuses light. The light heats the sea. The sea changes, and so does the focus. That loop is the photothermal / LIPSS family, not a private invention: Rudenko et al. already run Swift–Hohenberg on laser-written surfaces. What the plate adds is the open-loop control on the same sea, so corr(h, I) can be watched going from near 0 to locked when η is raised. The status line is that number.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Seed'],
    hints: {
      Sea: 'r is how hard the pattern is driven. Wavelength is the Swift–Hohenberg k₀ in cells.',
      Loop: 'η = 0 is the control: the same sea, the same caustic, no writing. η > 0 is the closed loop. s is how far the light has travelled after the surface.',
    },
    palette: true, defaultPalette: 'nightshade', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, hh, hn, lin, II, step = 0, raf = 0, paused = false, buf, img;
      let corr = 0, lam = 0, lamTh = 0, lamStat = null;

      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(64, Math.round(g * a)) };
      }
      function idx(x, y) { return y * W + x; }
      function lap4(src, x, y) {
        const xm = x === 0 ? W - 1 : x - 1, xp = x === W - 1 ? 0 : x + 1;
        const ym = y === 0 ? H - 1 : y - 1, yp = y === H - 1 ? 0 : y + 1;
        return src[idx(xp, y)] + src[idx(xm, y)] + src[idx(x, yp)] + src[idx(x, ym)] - 4 * src[idx(x, y)];
      }

      function seed(s) {
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        const N = W * H;
        hh = new Float32Array(N);
        hn = new Float32Array(N);
        lin = new Float32Array(N);
        II = new Float32Array(N);
        const rng = U.makeRng(String(s.seed) + '/h');
        if (s.init === 'roll') {
          const k = Math.PI * 2 / Math.max(4, s.waves);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            hh[idx(x, y)] = 0.55 * Math.sin(k * x) + 0.08 * rng.gauss();
          }
        } else if (s.init === 'spot') {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const r = Math.hypot(x - W * 0.5, y - H * 0.5);
            hh[idx(x, y)] = 1.2 * Math.exp(-(r * r) / 36) + 0.05 * rng.gauss();
          }
        } else {
          for (let i = 0; i < N; i++) hh[i] = rng.gauss() * 0.25;
        }
        step = 0;
        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function caustic(s) {
        II.fill(0);
        const dist = 6 + 28 * s.s;
        let sum = 0;
        for (let y = 0; y < H; y++) {
          const ym = y === 0 ? H - 1 : y - 1, yp = y === H - 1 ? 0 : y + 1;
          for (let x = 0; x < W; x++) {
            const xm = x === 0 ? W - 1 : x - 1, xp = x === W - 1 ? 0 : x + 1;
            const c = hh[idx(x, y)];
            const hx = 0.5 * (hh[idx(xp, y)] - hh[idx(xm, y)]);
            const hy = 0.5 * (hh[idx(x, yp)] - hh[idx(x, ym)]);
            const hxx = hh[idx(xp, y)] + hh[idx(xm, y)] - 2 * c;
            const hyy = hh[idx(x, yp)] + hh[idx(x, ym)] - 2 * c;
            const hxy = 0.25 * (hh[idx(xp, yp)] - hh[idx(xm, yp)] - hh[idx(xp, ym)] + hh[idx(xm, ym)]);
            const jac = (1 + dist * hxx) * (1 + dist * hyy) - (dist * hxy) * (dist * hxy);
            const wgt = 1 / Math.max(0.06, Math.abs(jac));
            let px = x + dist * hx, py = y + dist * hy;
            px = ((px % W) + W) % W;
            py = ((py % H) + H) % H;
            const x0 = px | 0, y0 = py | 0;
            const fx = px - x0, fy = py - y0;
            const x1 = x0 + 1 === W ? 0 : x0 + 1;
            const y1 = y0 + 1 === H ? 0 : y0 + 1;
            II[idx(x0, y0)] += wgt * (1 - fx) * (1 - fy);
            II[idx(x1, y0)] += wgt * fx * (1 - fy);
            II[idx(x0, y1)] += wgt * (1 - fx) * fy;
            II[idx(x1, y1)] += wgt * fx * fy;
            sum += wgt;
          }
        }
        const mean = sum / (W * H);
        if (mean > 1e-8) {
          const inv = 1 / mean;
          for (let i = 0; i < II.length; i++) II[i] *= inv;
        }
      }

      function advance(s, nsteps) {
        const r = s.r, eta = s.eta;
        const q = 2 - 2 * Math.cos((Math.PI * 2) / Math.max(4, s.waves));
        const dt = 0.012;
        for (let it = 0; it < nsteps; it++) {
          if ((step & 3) === 0) caustic(s);
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lin[idx(x, y)] = lap4(hh, x, y) + q * hh[idx(x, y)];
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const i = idx(x, y);
              const bi = lap4(lin, x, y);
              const fb = eta * (II[i] - 1);
              let nxt = hh[i] + dt * (-bi + r * hh[i] - hh[i] * hh[i] * hh[i] + fb);
              if (nxt > 4) nxt = 4;
              if (nxt < -4) nxt = -4;
              if (!isFinite(nxt)) nxt = 0;
              hn[i] = nxt;
            }
          }
          const sw = hh; hh = hn; hn = sw;
          step++;
        }
      }

      function measure(s) {
        let mh = 0, mI = 0, N = hh.length;
        for (let i = 0; i < N; i++) { mh += hh[i]; mI += II[i]; }
        mh /= N; mI /= N;
        let num = 0, dh = 0, dI = 0;
        for (let i = 0; i < N; i++) {
          const a = hh[i] - mh, b = II[i] - mI;
          num += a * b; dh += a * a; dI += b * b;
        }
        corr = num / Math.sqrt((dh * dI) || 1e-12);
        // Wavelength from the power-weighted mean of the 5-point Laplacian symbol,
        // Q = <h' (-lap h)> / <h'^2> with h' = h - <h>: the lattice wavenumber of the pattern whatever the
        // orientation of its stripes. A mode of symbol Q has the wavelength 2 pi / acos(1 - Q/2) of an axis
        // mode with the same symbol, and the preferred mode of (lap + q)^2 has Q = q, so lambda = waves.
        // (Zero crossings along rows, used before, measure lambda / |cos theta| for stripes at angle theta
        // to the rows and read high.) Error bar: delta method for the ratio of two field means, with the
        // standard error of z = a - Q b from tau_int along rows and columns (U.stats.fieldMean).
        const a = new Float64Array(N), b = new Float64Array(N);
        let A = 0, B = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = idx(x, y), c = hh[i] - mh;
          a[i] = -c * lap4(hh, x, y); b[i] = c * c; A += a[i]; B += b[i];
        }
        const Q = B > 0 ? A / B : NaN;
        if (Q > 0 && Q < 4) {
          const z = new Float64Array(N);
          for (let i = 0; i < N; i++) z[i] = a[i] - Q * b[i];
          const fz = U.stats.fieldMean(z, W, H);
          lam = 2 * Math.PI / Math.acos(1 - Q / 2);
          const dQdLam = 2 * Math.sin(2 * Math.PI / lam) * 2 * Math.PI / (lam * lam);
          lamStat = { se: (fz.se / (B / N)) / dQdLam, reliable: fz.reliable, tau: Math.max(fz.tauX, fz.tauY) };
        } else { lam = 0; lamStat = null; }
        lamTh = s.waves;
      }

      function paint(s) {
        if (!hh) return;
        const data = img.data;
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const view = s.view;
        const val = new Float32Array(hh.length);
        let lo = Infinity, hi = -Infinity;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = idx(x, y);
          let v;
          if (view === 'height') v = hh[i];
          else if (view === 'caustic') v = Math.log(1.05 + II[i]);
          else if (view === 'fold') {
            const L = lap4(hh, x, y);
            v = Math.abs(L) * (0.4 + 0.6 * Math.log(1.05 + II[i]));
          } else {
            v = 0.38 * hh[i] + 0.9 * Math.log(1.05 + II[i]);
          }
          val[i] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const span = (hi - lo) || 1;
        for (let i = 0; i < val.length; i++) {
          const t = U.clamp(((val[i] - lo) / span) * exp, 0, 1);
          const c = ramp(isFinite(t) ? t : 0);
          const o = i * 4;
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        const s = host.getState();
        const loop = (s.eta > 0.08) && (corr > 0.12);
        host.setStatus(
          U.stats.compare({ label: 'corr(h, I)', measured: corr, basis: 'sampled', digits: 3,
            pending: 'one snapshot; the η = 0 control is not computed' }) +
          (lam && lamStat
            ? U.stats.compare({ label: 'λ', measured: lam, expected: lamTh, reference: 'preferred wavelength', units: 'cells', basis: 'sampled',
                uncertainty: lamStat.reliable && lamStat.se > 0 ? lamStat.se : undefined,
                method: 'Laplacian-symbol mean, delta method, τ_int along rows and columns',
                pending: lamStat.reliable ? 'zero spread in the field' : 'the field spans fewer than 40 correlation lengths' })
            : '<span>λ <b>—</b></span>') +
          '<span>' + (s.eta < 0.05 ? 'open loop' : (loop ? 'fold lock' : 'writing')) + '</span>'
        );
      }

      function loop() {
        raf = 0;
        if (paused || !host.isActive()) return;
        const s = host.getState();
        if (!s.running) { paint(s); return; }
        const t0 = performance.now();
        let n = 0;
        while (performance.now() - t0 < 22 && n < 4) { advance(s, 1); n++; }
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
          const warm = host.reducedMotion() ? Math.min(s.warmup, 40) : s.warmup;
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
            const r2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            hh[idx(x, y)] += 0.85 * Math.exp(-r2 / 18);
          }
          paint(s); status();
        },
        async exportPNG(w, ht) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = ht;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = true;
          g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, ht);
          g.drawImage(buf, 0, 0, w, ht);
          return U.toBlob(c);
        },
      };
    },
  });
})();
