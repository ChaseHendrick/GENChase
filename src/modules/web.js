
/* modules/web.js */
/* GENChase: two-dimensional Zel'dovich displacement plus the adhesion (viscous Burgers / Hopf-Cole) model. A seeded Gaussian potential becomes a filament-and-node web. Density is measured from the plate. */
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
    RANGE('Field', 'grid', 'Grid', GEOM, 96, 320, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Field', 'modes', 'Modes', GEOM, 24, 220, 4, v => v + ''),
    RANGE('Field', 'index', 'Spectrum n', GEOM, -2.5, 1, 0.1, f2, { hint: 'P(k) ~ k^n. n = -1 is a mild cosmological tilt on a 2-D sheet. Steeper (more negative) gives bigger voids.' }),
    RANGE('Growth', 'growth', 'Growth D', GEOM, 0.05, 1.8, 0.05, f2),
    RANGE('Growth', 'nu', 'Viscosity ν', GEOM, 0.004, 0.12, 0.002, f2, { hint: 'Adhesion viscosity. Small ν makes knife-edge filaments. Large ν is a blurry Zel\'dovich sheet that has not stuck yet.' }),
    RANGE('Growth', 'heat', 'Heat steps', GEOM, 4, 80, 2, v => v + ''),
    { group: 'Growth', key: 'model', label: 'Model', type: 'seg', kind: GEOM, options: [['adhesion', 'Adhesion'], ['zeldovich', 'Zel\'dovich']] },
    RANGE('Picture', 'particles', 'Tracers', GEOM, 8000, 80000, 2000, v => v.toLocaleString()),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['density', 'Density'], ['log', 'Log density'], ['potential', 'Potential'], ['collapse', 'Collapsed axes']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.3, 3, 0.05, f2),
    RANGE('Picture', 'gamma', 'Gamma', PAINT, 0.3, 1.8, 0.05, f2),
  ];

  const DEFAULTS = {
    grid: 192, aspect: '1:1', modes: 80, index: -1,
    growth: 0.85, nu: 0.018, heat: 24, model: 'adhesion',
    particles: 36000, view: 'log', exposure: 1.1, gamma: 0.55,
  };

  const PRESETS = {
    local: pre('Local universe', { growth: 0.9, nu: 0.016, index: -1, modes: 96, view: 'log', exposure: 1.15 }, Pal.nightshade),
    young: pre('Young sheet', { growth: 0.28, nu: 0.03, model: 'zeldovich', view: 'density', exposure: 1.3 }, Pal.harbor),
    knife: pre('Knife filaments', { growth: 1.15, nu: 0.007, heat: 40, view: 'log', exposure: 1.4, gamma: 0.45 }, Pal.graphite),
    nodes: pre('Rich nodes', { growth: 1.35, nu: 0.022, index: -1.6, view: 'log', exposure: 1.2 }, Pal.ember),
    collapse: pre('Caustic class', { growth: 0.7, nu: 0.02, view: 'collapse', exposure: 1 }, Pal.kiln),
    voidy: pre('Void-dominated', { growth: 0.55, index: -2.1, modes: 48, view: 'log', exposure: 1.05 }, Pal.glacier),
    potential: pre('Primordial Φ', { growth: 0.15, view: 'potential', exposure: 1 }, Pal.xray),
  };

  function surprise(rng) {
    return {
      growth: rng.range(0.35, 1.25),
      nu: rng.range(0.008, 0.04),
      index: rng.range(-2.1, -0.3),
      modes: rng.int(40, 140),
      view: rng.pick(['log', 'log', 'density', 'collapse']),
      model: rng() < 0.75 ? 'adhesion' : 'zeldovich',
    };
  }

  function sanitize(s) {
    s.grid = Math.max(96, Math.min(320, Math.round(s.grid / 16) * 16));
    s.particles = Math.max(4000, Math.min(80000, Math.round(s.particles / 1000) * 1000));
    s.nu = Math.max(0.003, s.nu);
  }

  function buildPotential(s, W, H) {
    const N = W * H;
    const phi = new Float32Array(N);
    const rng = U.makeRng(s.seed + '/phi');
    const nModes = s.modes | 0;
    const tilt = s.index;
    for (let m = 0; m < nModes; m++) {
      const kx = rng.int(-18, 18) || 1;
      const ky = rng.int(-18, 18);
      const k = Math.hypot(kx * (2 * Math.PI / W), ky * (2 * Math.PI / H)) || 1e-6;
      const amp = Math.pow(k, tilt * 0.5 - 1) * rng.gauss() * (0.35 / Math.sqrt(nModes));
      const phase = rng.range(0, Math.PI * 2);
      for (let y = 0; y < H; y++) {
        const py = (2 * Math.PI * ky * y) / H;
        for (let x = 0; x < W; x++) {
          const px = (2 * Math.PI * kx * x) / W;
          phi[y * W + x] += amp * Math.cos(px + py + phase);
        }
      }
    }
    let mean = 0;
    for (let i = 0; i < N; i++) mean += phi[i];
    mean /= N;
    let var0 = 0;
    for (let i = 0; i < N; i++) { phi[i] -= mean; var0 += phi[i] * phi[i]; }
    const sig = Math.sqrt(var0 / N) || 1;
    for (let i = 0; i < N; i++) phi[i] /= sig;
    return phi;
  }

  function hopfCole(phi, W, H, nu, steps, D) {
    // ψ = exp(-Φ / 2ν), heat-flow ψ, Φ = -2ν log ψ. Time of heat flow scales with D.
    const N = W * H;
    const a = new Float32Array(N), b = new Float32Array(N);
    const inv = 1 / (2 * Math.max(1e-4, nu));
    for (let i = 0; i < N; i++) a[i] = Math.exp(-phi[i] * inv);
    const dt = Math.min(0.2, 0.15 * D / Math.max(1, steps));
    for (let sstep = 0; sstep < steps; sstep++) {
      for (let y = 0; y < H; y++) {
        const ym = (y + H - 1) % H, yp = (y + 1) % H;
        for (let x = 0; x < W; x++) {
          const xm = (x + W - 1) % W, xp = (x + 1) % W;
          const i = y * W + x;
          const lap = a[y * W + xp] + a[y * W + xm] + a[yp * W + x] + a[ym * W + x] - 4 * a[i];
          b[i] = a[i] + dt * lap;
        }
      }
      for (let i = 0; i < N; i++) a[i] = Math.max(1e-20, b[i]);
    }
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = -2 * nu * Math.log(a[i]);
    return out;
  }

  function sampleBilinear(arr, W, H, x, y) {
    x = ((x % W) + W) % W;
    y = ((y % H) + H) % H;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const x1 = (x0 + 1) % W, y1 = (y0 + 1) % H;
    const a = arr[y0 * W + x0], b = arr[y0 * W + x1];
    const c = arr[y1 * W + x0], d = arr[y1 * W + x1];
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  }

  function gradPhi(phi, W, H, x, y) {
    const d = 0.6;
    const px = sampleBilinear(phi, W, H, x + d, y) - sampleBilinear(phi, W, H, x - d, y);
    const py = sampleBilinear(phi, W, H, x, y + d) - sampleBilinear(phi, W, H, x, y - d);
    return [px / (2 * d), py / (2 * d)];
  }

  function collapseClass(phi, W, H, D) {
    // Number of collapsed axes from the 2-D deformation tensor ∂i∂j Φ, plus the
    // more-negative eigenvalue so the collapse view still has tone when few cells
    // have crossed the Zel'dovich shell-crossing cut.
    const nArr = new Float32Array(W * H);
    const lmin = new Float32Array(W * H);
    const cut = 1 / Math.max(0.08, D * 12);
    for (let y = 0; y < H; y++) {
      const ym = (y + H - 1) % H, yp = (y + 1) % H;
      for (let x = 0; x < W; x++) {
        const xm = (x + W - 1) % W, xp = (x + 1) % W;
        const phixx = phi[y * W + xp] - 2 * phi[y * W + x] + phi[y * W + xm];
        const phiyy = phi[yp * W + x] - 2 * phi[y * W + x] + phi[ym * W + x];
        const phixy = 0.25 * (phi[yp * W + xp] - phi[yp * W + xm] - phi[ym * W + xp] + phi[ym * W + xm]);
        const tr = phixx + phiyy;
        const det = phixx * phiyy - phixy * phixy;
        const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
        const l1 = 0.5 * (tr + disc), l2 = 0.5 * (tr - disc);
        let n = 0;
        if (l1 <= -cut) n++;
        if (l2 <= -cut) n++;
        nArr[y * W + x] = n;
        lmin[y * W + x] = l2;
      }
    }
    return { n: nArr, lmin };
  }

  Studio.register({
    id: 'web',
    name: 'Cosmic Web',
    tab: 'Web',
    subtitle: 'Zel\'dovich adhesion · 1970 / 1989',
    order: 42,
    equation: 'x = q + D ∇Φ,   ∂t v + (v·∇)v = ν ∇²v,   ψ = exp(−Φ / 2ν),   ∂t ψ = ν ∇²ψ',
    credit: 'Ya. B. Zel\'dovich, Astron. Astrophys. 5, 84 (1970). The adhesion model is Gurbatov, Saichev and Shandarin, Mon. Not. R. Astron. Soc. 236, 385 (1989), which is Burgers\' equation written for the displacement potential and solved by the Hopf-Cole substitution.',
    blurb: 'A Gaussian random potential is the early universe on this sheet. Zel\'dovich moves every particle in a straight line along the gradient. Where streams cross, adhesion makes them stick, which is Burgers\' equation with a small viscosity, solved here by Hopf-Cole heat flow. What remains is the two-dimensional cosmic web: voids that empty, filaments that catch the mass, nodes where filaments meet. The plate is the density of tracers after that mapping, or the number of collapsed axes of the deformation tensor. Same seed, same web, at any print size.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Picture'],
    hints: {
      Field: 'Modes and the spectral index build the primordial potential. Fewer modes, bigger voids. A more negative index does the same.',
      Growth: 'D is the linear growth factor. Raise it and the web sharpens. Viscosity is the adhesion glue. Zel\'dovich alone keeps flying through caustics and the filaments fatten instead of sticking.',
      Picture: 'Log density is the catalog view. Collapsed axes colors voids / filaments / nodes from the deformation tensor, which is the prediction the particles are supposed to follow.',
    },
    palette: true,
    defaultPalette: 'nightshade',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, dens, cls, lmin, pot, stats = null, buf, img;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(64, Math.round(g * aspect)) };
      }

      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        const N = W * H;
        pot = buildPotential(s, W, H);
        const used = s.model === 'adhesion' ? hopfCole(pot, W, H, s.nu, s.heat | 0, s.growth) : pot;
        const col = collapseClass(used, W, H, s.growth);
        cls = col.n;
        lmin = col.lmin;
        dens = new Float32Array(N);
        const rng = U.makeRng(s.seed + '/q');
        const nP = s.particles | 0;
        const D = s.growth;
        const side = Math.ceil(Math.sqrt(nP));
        for (let k = 0; k < nP; k++) {
          const qX = ((k % side) + 0.5) * W / side;
          const qY = ((Math.floor(k / side) + 0.5) * H / side);
          const g = gradPhi(used, W, H, qX, qY);
          let x = qX + D * g[0] * W * 0.12;
          let y = qY + D * g[1] * H * 0.12;
          x = ((x % W) + W) % W;
          y = ((y % H) + H) % H;
          const x0 = x | 0, y0 = y | 0;
          const fx = x - x0, fy = y - y0;
          const x1 = (x0 + 1) % W, y1 = (y0 + 1) % H;
          dens[y0 * W + x0] += (1 - fx) * (1 - fy);
          dens[y0 * W + x1] += fx * (1 - fy);
          dens[y1 * W + x0] += (1 - fx) * fy;
          dens[y1 * W + x1] += fx * fy;
        }
        const mean = nP / N;
        let filled = 0, nodes = 0, fils = 0, voids = 0;
        for (let i = 0; i < N; i++) {
          if (dens[i] > 2 * mean) filled++;
          if (cls[i] >= 1.5) nodes++;
          else if (cls[i] >= 0.5) fils++;
          else voids++;
        }
        stats = {
          mean,
          fill: filled / N,
          voids: voids / N,
          fils: fils / N,
          nodes: nodes / N,
        };
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
        void rng;
      }

      function paint() {
        if (!dens) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1A1A1A', '#C4472B', '#F1E8D8'];
        const ramp = U.makeRamp(pal, s.bg || '#17141F');
        const data = img.data;
        const view = s.view;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        const gam = isFinite(s.gamma) && s.gamma > 0 ? s.gamma : 1;
        const tone = (v, lo, hi) => {
          const span = (hi - lo) || 1;
          const x = Math.max(0, (v - lo) / span);
          const t = Math.pow(x, gam) * exp;
          return U.clamp(isFinite(t) ? t : 0, 0, 1);
        };
        if (view === 'collapse' && lmin) {
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < lmin.length; i++) {
            const v = -lmin[i];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
          for (let i = 0; i < W * H; i++) {
            const t = tone(-lmin[i], lo, hi);
            const c = ramp(t);
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        } else if (view === 'potential') {
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < pot.length; i++) { if (pot[i] < lo) lo = pot[i]; if (pot[i] > hi) hi = pot[i]; }
          for (let i = 0; i < W * H; i++) {
            const c = ramp(tone(pot[i], lo, hi));
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        } else {
          const logv = view === 'log';
          let lo = Infinity, hi = -Infinity;
          for (let i = 0; i < dens.length; i++) {
            const v = logv ? Math.log(1 + dens[i]) : dens[i];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
          }
          for (let i = 0; i < W * H; i++) {
            const raw = logv ? Math.log(1 + dens[i]) : dens[i];
            const c = ramp(tone(raw, lo, hi));
            const o = i * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg || '#17141F';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        if (!stats) return;
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b></span>' +
          '<span>filaments <b>' + Math.round(stats.fils * 100) + '%</b></span>' +
          '<span>nodes <b>' + Math.round(stats.nodes * 100) + '%</b></span>' +
          '<span>overdense <b>' + Math.round(stats.fill * 100) + '%</b></span>'
        );
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
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false });
          g.imageSmoothingEnabled = true;
          g.fillStyle = s.bg;
          g.fillRect(0, 0, w, h);
          g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
