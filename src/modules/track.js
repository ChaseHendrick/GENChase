
/* modules/track.js */
/* GENChase: Track. A sine-Gordon breather that writes the index it runs on. That is a self-written waveguide on sine-Gordon, not a private name. Open loop matches Lorentz. Polar paint is the worldline. */
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

  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Wave', 'boost', 'Boost v', GEOM, 0.05, 0.55, 0.01, f2),
    RANGE('Wave', 'beta', 'Envelope β', GEOM, 0.25, 0.75, 0.05, f2),
    RANGE('Loop', 'eta', 'Write η', GEOM, 0, 1.4, 0.05, f2, { hint: 'η = 0 is the exact sine-Gordon breather. η > 0 writes the index from strain. Too large tears the lump.' }),
    { group: 'Loop', key: 'kind', label: 'Lumps', type: 'seg', kind: GEOM, options: [['one', 'One'], ['braid', 'Braid']] },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['polar', 'Spiral'], ['strip', 'Spacetime'], ['road', 'Road'], ['n', 'Index']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = {
    grid: 176, aspect: '1:1', boost: 0.32, beta: 0.5, eta: 0.5,
    kind: 'one', view: 'polar', exposure: 1.08,
  };
  const PRESETS = {
    pave: pre('Spiral', { eta: 0.5, boost: 0.32, kind: 'one', view: 'polar' }, Pal.ember),
    braid: pre('Braid', { eta: 0.48, boost: 0.28, kind: 'braid', view: 'polar', beta: 0.55 }, Pal.nightshade),
    open: pre('Open loop', { eta: 0, boost: 0.32, kind: 'one', view: 'polar' }, Pal.graphite),
    road: pre('Road', { eta: 0.5, boost: 0.32, view: 'road', kind: 'one' }, Pal.kiln),
    strip: pre('Spacetime', { eta: 0.5, view: 'strip', kind: 'one' }, Pal.harbor),
    rest: pre('At rest', { boost: 0.06, eta: 0.45, view: 'polar', kind: 'one' }, Pal.glacier),
    torn: pre('Torn', { eta: 1.3, boost: 0.4, view: 'strip', kind: 'one' }, Pal.thermal),
  };

  function surprise(rng) {
    return {
      boost: rng.range(0.18, 0.45),
      beta: rng.range(0.35, 0.65),
      eta: rng.pick([0, 0, 0.4, 0.55, 0.8]),
      kind: rng.pick(['one', 'one', 'braid']),
      view: rng.pick(['polar', 'polar', 'road', 'strip']),
    };
  }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }

  Studio.register({
    id: 'track', name: 'Track', tab: 'Track',
    subtitle: 'a breather that paves the index it runs on, drawn as its worldline',
    order: 100,
    equation: 'φ_tt = ∂x(n ∂x φ) − sin φ,   ∂t n = η ((φ_x)²/⟨φ_x²⟩ − 1)',
    credit: 'The sine-Gordon breather is exact; Seeger, Donth and Kochendörfer (1953), Faddeev and Takhtajan. A prescribed index n(x) is an inhomogeneous Josephson junction. A beam that writes the index it travels in is a self-written waveguide: Monro, de Sterke and Poladian, J. Mod. Opt. 45, 1998, and the photorefractive soliton of Segev. This plate puts that idea on a sine-Gordon breather, writes n from strain, and checks the open loop against the Lorentz speed. It is not a new law and it is not named as one.',
    blurb: 'A sine-Gordon breather is a lump that rings and never radiates. Give the medium an index n written from the lump\'s own strain and you have the self-written waveguide, which is a 1990s optics literature, running on a Josephson breather. Open loop (η = 0) has to match the Lorentz boost; that is the check. Close it and the worldline is an Archimedean spiral, because radius is space and angle is time. Braid is three lumps at once. Torn is the failure, kept as a preset. The status line prints v_meas / v against 1.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: {
      Loop: 'Open loop is the control. Paving (η ≈ 0.5) speeds the breather without tearing it. Torn is the failure, kept as a preset so the breaking is visible. Braid runs three boosts on one sheet.',
      Picture: 'Spiral is the worldline in polar coordinates, radius for space and angle for time. Road is the last slice, the index as a ribbon. Spacetime is the usual strip.',
    },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, phiS, nS, extra = 1, metric = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function sech(z) {
        const e = Math.exp(Math.max(-20, Math.min(20, z)));
        return 2 / (e + 1 / e);
      }
      function runOne(s, v, xOff, L, N, dx, dt, steps, stride) {
        const b = U.clamp(s.beta, 0.2, 0.85);
        const aa = Math.sqrt(Math.max(1e-6, 1 - b * b));
        const eta = Math.max(0, s.eta);
        const gam = 1 / Math.sqrt(Math.max(1e-6, 1 - v * v));
        function exact(x, t) {
          const xp = gam * (x - v * t), tp = gam * (t - v * x);
          return 4 * Math.atan((b / Math.max(0.05, aa)) * Math.sin(aa * tp) * sech(b * xp));
        }
        const phi = new Float32Array(N), old = new Float32Array(N), nxt = new Float32Array(N);
        const nn = new Float32Array(N), px = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const x = -L / 2 + (i + 0.5) * dx;
          phi[i] = exact(x - xOff, 0);
          old[i] = exact(x - xOff, -dt);
          nn[i] = 1;
        }
        function comOf(arr) {
          let m = 0, w = 0;
          for (let i = 0; i < N; i++) {
            const e = arr[i] * arr[i];
            m += e * (-L / 2 + (i + 0.5) * dx);
            w += e;
          }
          return m / (w || 1);
        }
        const cStart = comOf(phi);
        const phiOut = new Float32Array(H * N);
        const nOut = new Float32Array(H * N);
        let row = 0, eOut = 0, eAll = 0;
        const wCut = 6 / Math.max(0.2, b);
        for (let st = 0; st <= steps; st++) {
          if (st % stride === 0 && row < H) {
            for (let i = 0; i < N; i++) {
              phiOut[row * N + i] = phi[i];
              nOut[row * N + i] = nn[i];
            }
            if (row === H - 1) {
              const cNow = comOf(phi);
              for (let i = 0; i < N; i++) {
                const x = -L / 2 + (i + 0.5) * dx - cNow;
                const e = phi[i] * phi[i];
                eAll += e;
                if (Math.abs(x) > wCut) eOut += e;
              }
            }
            row++;
          }
          for (let i = 0; i < N; i++) {
            const ip = (i + 1) % N, im = (i + N - 1) % N;
            px[i] = (phi[ip] - phi[im]) / (2 * dx);
          }
          if (eta > 0) {
            let mean = 0;
            for (let i = 0; i < N; i++) mean += px[i] * px[i];
            mean /= N;
            const rate = 0.0004 * eta;
            for (let i = 0; i < N; i++) {
              let nv = nn[i] + rate * (px[i] * px[i] / (mean + 1e-8) - 1);
              if (nv < 0.5) nv = 0.5;
              if (nv > 2) nv = 2;
              nn[i] = nv;
            }
          }
          for (let i = 0; i < N; i++) {
            const ip = (i + 1) % N, im = (i + N - 1) % N;
            const nx = (nn[ip] - nn[im]) / (2 * dx);
            const pxx = (phi[ip] - 2 * phi[i] + phi[im]) / (dx * dx);
            const rhs = nn[i] * pxx + nx * px[i] - Math.sin(phi[i]);
            nxt[i] = 2 * phi[i] - old[i] + dt * dt * rhs;
            if (!isFinite(nxt[i])) nxt[i] = 0;
          }
          for (let i = 0; i < N; i++) { old[i] = phi[i]; phi[i] = nxt[i]; }
        }
        const cEnd = comOf(phi);
        const T = steps * dt;
        const vmeas = (cEnd - cStart) / Math.max(1e-6, T);
        return {
          phi: phiOut, n: nOut,
          extra: vmeas / v,
          metric: eOut / Math.max(1e-12, eAll),
        };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        const v0 = U.clamp(s.boost, 0.02, 0.7);
        const L = 40, N = W, dx = L / N, dt = 0.35 * dx;
        const steps = Math.max(H * 4, 640);
        const stride = Math.max(1, (steps / H) | 0);
        phiS = new Float32Array(H * W);
        nS = new Float32Array(H * W);
        const jobs = s.kind === 'braid'
          ? [
              { v: Math.max(0.08, v0 * 0.72), off: -0.34 * L },
              { v: v0, off: -0.22 * L },
              { v: Math.min(0.62, v0 * 1.22), off: -0.12 * L },
            ]
          : [{ v: v0, off: -0.28 * L }];
        let extraSum = 0, metricSum = 0;
        for (let j = 0; j < jobs.length; j++) {
          const out = runOne(s, jobs[j].v, jobs[j].off, L, N, dx, dt, steps, stride);
          extraSum += out.extra;
          metricSum += out.metric;
          const wgt = 1 / jobs.length;
          for (let i = 0; i < phiS.length; i++) {
            phiS[i] += wgt * out.phi[i];
            nS[i] += wgt * out.n[i];
          }
        }
        extra = extraSum / jobs.length;
        metric = metricSum / jobs.length;
      }
      function sample(arr, row, col) {
        const r0 = Math.max(0, Math.min(H - 1.001, row));
        const c0 = Math.max(0, Math.min(W - 1.001, col));
        const i0 = r0 | 0, j0 = c0 | 0;
        const i1 = Math.min(H - 1, i0 + 1), j1 = Math.min(W - 1, j0 + 1);
        const fr = r0 - i0, fc = c0 - j0;
        const a = arr[i0 * W + j0], b = arr[i0 * W + j1];
        const c = arr[i1 * W + j0], d = arr[i1 * W + j1];
        return a * (1 - fr) * (1 - fc) + b * (1 - fr) * fc + c * fr * (1 - fc) + d * fr * fc;
      }
      function valueAt(s, row, col) {
        const p = sample(phiS, row, col);
        const n = sample(nS, row, col);
        if (s.view === 'n') return n - 1;
        if (s.view === 'road') return p * p * 0.55 + 1.8 * (n - 1);
        return p + 1.55 * (n - 1);
      }
      function paintTo(g, dw, dh, s) {
        if (!phiS) return;
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#111', '#eee'];
        const ramp = U.makeRamp(pal, s.bg || '#111');
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const view = s.view;
        const imgData = g.createImageData(dw, dh);
        const data = imgData.data;
        const vals = new Float32Array(dw * dh);
        let lo = Infinity, hi = -Infinity;
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            let row, col;
            if (view === 'polar') {
              const cx = dw * 0.5, cy = dh * 0.5;
              const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
              const rMax = Math.max(8, 0.49 * Math.min(dw, dh));
              const r = Math.hypot(dx, dy) / rMax;
              const th = Math.atan2(dy, dx);
              row = ((th + Math.PI) / (Math.PI * 2)) * (H - 1);
              col = U.clamp(r, 0, 1.15) * (W - 1) / 1.15;
              if (r > 1.02) {
                vals[y * dw + x] = NaN;
                continue;
              }
            } else if (view === 'road') {
              const last = H - 1;
              col = (x / Math.max(1, dw - 1)) * (W - 1);
              const yy = y / Math.max(1, dh - 1);
              const ribbon = Math.exp(-Math.pow((yy - 0.5) / 0.16, 2));
              const p = sample(phiS, last, col);
              const n = sample(nS, last, col);
              const v = ribbon * (0.35 + 1.4 * (n - 0.85) + 0.9 * p * p);
              vals[y * dw + x] = v;
              if (v < lo) lo = v;
              if (v > hi) hi = v;
              continue;
            } else {
              row = (y / Math.max(1, dh - 1)) * (H - 1);
              col = (x / Math.max(1, dw - 1)) * (W - 1);
            }
            const v = valueAt(s, row, col);
            vals[y * dw + x] = v;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
        }
        const span = (hi - lo) || 1;
        const bg = U.hexToRgb(s.bg || '#111');
        for (let i = 0; i < vals.length; i++) {
          const o = i * 4;
          if (!isFinite(vals[i])) {
            data[o] = bg[0]; data[o + 1] = bg[1]; data[o + 2] = bg[2]; data[o + 3] = 255;
            continue;
          }
          const t = U.clamp(((vals[i] - lo) / span) * exp, 0, 1);
          const c = ramp(t);
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        g.putImageData(imgData, 0, 0);
      }
      function paint() {
        if (!phiS) return;
        const s = host.getState();
        const dw = canvas.width, dh = canvas.height;
        ctx.fillStyle = s.bg || '#111';
        ctx.fillRect(0, 0, dw, dh);
        if (!buf || buf.width !== dw || buf.height !== dh) {
          buf = document.createElement('canvas');
          buf.width = dw; buf.height = dh;
        }
        const g = buf.getContext('2d', { alpha: false });
        paintTo(g, dw, dh, s);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(buf, 0, 0);
      }
      function status() {
        const s = host.getState();
        const torn = metric > 0.2;
        const pave = s.eta > 0.05 && extra > 1.12 && !torn;
        const openOk = s.eta < 0.05 && extra > 0.85 && extra < 1.2 && metric < 0.08;
        // A deterministic integration with no randomness. The Lorentz boost is the reference only for the
        // open loop, η = 0, where the medium is unwritten; once η writes the index the breather is meant
        // to depart from it, so the ratio is printed without a reference.
        const open = s.eta < 0.05;
        host.setStatus(
          U.stats.compare(Object.assign({ label: 'v_meas / v', measured: extra, basis: 'deterministic' }, open ? { expected: 1, reference: 'Lorentz' } : {})) +
          U.stats.compare({ label: 'E_out / E', measured: metric, expected: 0, reference: 'bound state', basis: 'deterministic' }) +
          '<span>' + (torn ? 'torn' : (pave ? 'paving' : (openOk ? 'open loop' : 'running'))) + '</span>'
        );
      }
      return {
        aspect(s) { return ASPECTS[s.aspect] || 1; },
        fieldCells() {
          const s = host.getState();
          if (s.view === 'polar' || s.view === 'road') return null;
          return W && H ? [W, H] : null;
        },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); },
        resize() { paint(); },
        pause() {},
        resume() { paint(); },
        async exportPNG(w, h) {
          if (!phiS) throw new Error('nothing to export');
          const s = host.getState();
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.fillStyle = s.bg || '#111'; g.fillRect(0, 0, w, h);
          paintTo(g, w, h, s);
          return U.toBlob(c);
        },
      };
    },
  });
})();
