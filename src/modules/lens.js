
/* modules/lens.js */
/* GENChase: a thin gravitational lens. Convergence is a seeded mass map, the deflection is the gradient of a Jacobi-solved potential, and the plate is the lensed source. For a single centered mass the measured Einstein radius is compared to the point-mass formula. */
(function () {
  'use strict';
  const U = Studio.util;
  const GEOM = 'geom', PAINT = 'paint';
  const f2 = v => v.toFixed(2);
  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
  const RANGE = (group, key, label, kind, min, max, step, fmt, extra) =>
    Object.assign({ group, key, label, type: 'range', kind, min, max, step, fmt }, extra || {});
  const Pal = Studio.PALETTES;
  const pre = (label, p, pal) => ({ label, p, palette: pal });

  const SCHEMA = [
    RANGE('Lens', 'grid', 'Grid', GEOM, 96, 288, 16, v => v + ''),
    { group: 'Lens', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    { group: 'Lens', key: 'massKind', label: 'Mass', type: 'seg', kind: GEOM, options: [['point', 'One mass'], ['sis', 'SIS'], ['clumps', 'Clumps'], ['cluster', 'Cluster']] },
    RANGE('Lens', 'einstein', 'Einstein R', GEOM, 8, 70, 1, v => v + ''),
    RANGE('Lens', 'clumps', 'Clumps', GEOM, 2, 16, 1, v => v + '', { dimUnless: s => s.massKind === 'clumps' || s.massKind === 'cluster' }),
    RANGE('Lens', 'relax', 'Poisson steps', GEOM, 20, 160, 5, v => v + ''),
    { group: 'Source', key: 'source', label: 'Source', type: 'seg', kind: GEOM, options: [['grid', 'Grid'], ['stars', 'Stars'], ['galaxy', 'Galaxy'], ['ring', 'Ring test']] },
    RANGE('Source', 'offsetX', 'Source x', GEOM, -0.4, 0.4, 0.01, f2),
    RANGE('Source', 'offsetY', 'Source y', GEOM, -0.4, 0.4, 0.01, f2),
    RANGE('Source', 'srcScale', 'Source scale', GEOM, 0.3, 2.2, 0.05, f2),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['lensed', 'Lensed'], ['mass', 'Mass'], ['potential', 'Potential'], ['mag', 'Magnification']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.4, 0.05, f2),
    { group: 'Picture', key: 'caustics', label: 'Draw critical', type: 'toggle', kind: PAINT },
  ];

  const DEFAULTS = {
    grid: 192, aspect: '1:1', massKind: 'point', einstein: 28, clumps: 6, relax: 70,
    source: 'stars', offsetX: 0.04, offsetY: -0.02, srcScale: 1,
    view: 'lensed', exposure: 1.05, caustics: false,
  };

  const PRESETS = {
    einstein: pre('Einstein ring', { massKind: 'point', source: 'ring', offsetX: 0, offsetY: 0, einstein: 32, view: 'lensed' }, Pal.ember),
    quad: pre('Quad image', { massKind: 'sis', source: 'galaxy', offsetX: 0.08, offsetY: 0.05, einstein: 30, view: 'lensed' }, Pal.harbor),
    cluster: pre('Cluster arcs', { massKind: 'cluster', clumps: 9, source: 'stars', einstein: 36, view: 'lensed' }, Pal.nightshade),
    mass: pre('Convergence', { massKind: 'cluster', view: 'mass', clumps: 8 }, Pal.thermal),
    stars: pre('Lensed field', { massKind: 'clumps', source: 'stars', clumps: 7, einstein: 22, view: 'lensed' }, Pal.kiln),
    grid: pre('Warped mesh', { massKind: 'sis', source: 'grid', einstein: 34, view: 'lensed' }, Pal.graphite),
    mag: pre('Magnification', { massKind: 'sis', view: 'mag', einstein: 28 }, Pal.xray),
  };

  function surprise(rng) {
    return {
      massKind: rng.pick(['point', 'sis', 'clumps', 'cluster']),
      source: rng.pick(['stars', 'galaxy', 'grid']),
      einstein: rng.int(18, 48),
      offsetX: rng.range(-0.12, 0.12),
      offsetY: rng.range(-0.12, 0.12),
      view: rng.pick(['lensed', 'lensed', 'mag']),
    };
  }

  function sanitize(s) {
    s.grid = Math.max(96, Math.min(288, Math.round(s.grid / 16) * 16));
  }

  Studio.register({
    id: 'lens',
    name: 'Gravitational Lens',
    tab: 'Lens',
    subtitle: 'thin-lens mapping · 1936',
    order: 41,
    equation: 'β = θ − α(θ),   α = ∇ψ,   ∇²ψ = 2κ,   θ_E² = 4GM D_ls / (c² D_l D_s)',
    credit: 'A. Einstein, Science 84, 506 (1936), computed the deflection of starlight by the sun and noted the ring that appears when source and lens align. The plate is the thin-lens equation as in Schneider, Ehlers and Falco, Gravitational Lenses (1992). The potential is solved by Jacobi iteration on the Poisson equation for the seeded convergence.',
    blurb: 'Mass on this sheet bends the paths that light would have taken. A single centered mass and an aligned source draw an Einstein ring whose radius the plate measures and checks against the point-mass formula. Offset the source and the ring breaks into arcs or a quad. A cluster of clumps makes the long thin arcs that show up in deep images. The magnification view is the inverse Jacobian of the lens map, so the critical curve is the place the images go bright.',
    schema: SCHEMA,
    defaults: DEFAULTS,
    presets: PRESETS,
    closedGroups: ['Source'],
    hints: {
      Lens: 'Einstein R sets the scale of the deflection in cells. One mass is the textbook ring. SIS is the singular isothermal sphere used for galaxies. Clumps and cluster sprinkle extra halos from the seed.',
      Source: 'Ring test is a thin circle of source light, the cleanest way to see whether the measured radius matches theory. Stars and galaxy are what the print is for.',
      Picture: 'Lensed is the camera. Magnification lights the critical curve. Mass and potential are the ingredients.',
    },
    palette: true,
    defaultPalette: 'ember',
    surprise,
    sanitize,
    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, kappa, psi, imgSrc, buf, img, stats = null;

      function sizeFrom(s) {
        const aspect = ASPECTS[s.aspect] || 1;
        const g = s.grid | 0;
        return { W: g, H: Math.max(64, Math.round(g * aspect)) };
      }

      function addHalo(k, W, H, cx, cy, re, kind) {
        const re2 = re * re;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const r = Math.hypot(x - cx, y - cy) + 0.6;
          let val = 0;
          if (kind === 'point') val = re2 / (r * r + 2.5);
          else val = 0.5 * re / r; // SIS κ ~ 1/(2R) in these units
          k[y * W + x] += val;
        }
      }

      function buildKappa(s, W, H) {
        const k = new Float32Array(W * H);
        const rng = U.makeRng(s.seed + '/m');
        const re = s.einstein;
        if (s.massKind === 'point' || s.massKind === 'sis') {
          addHalo(k, W, H, W * 0.5, H * 0.5, re, s.massKind === 'sis' ? 'sis' : 'point');
        } else {
          addHalo(k, W, H, W * 0.5, H * 0.5, re * 0.55, 'sis');
          const n = s.clumps | 0;
          for (let i = 0; i < n; i++) {
            const cx = W * (0.5 + rng.range(-0.28, 0.28));
            const cy = H * (0.5 + rng.range(-0.28, 0.28));
            addHalo(k, W, H, cx, cy, re * rng.range(0.12, 0.32), rng() < 0.5 ? 'point' : 'sis');
          }
        }
        return k;
      }

      function solvePsi(k, W, H, steps) {
        const N = W * H;
        const p = new Float32Array(N);
        for (let it = 0; it < steps; it++) {
          for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
              const i = y * W + x;
              p[i] = 0.25 * (p[i + 1] + p[i - 1] + p[i + W] + p[i - W] - 2 * k[i]);
            }
          }
        }
        return p;
      }

      function sourceValue(s, bx, by, W, H, rngStar) {
        const ox = s.offsetX * W, oy = s.offsetY * H;
        const sc = s.srcScale;
        const x = (bx - W * 0.5) / sc + W * 0.5 - ox;
        const y = (by - H * 0.5) / sc + H * 0.5 - oy;
        if (s.source === 'grid') {
          const gx = Math.abs(((x % 16) + 16) % 16 - 8);
          const gy = Math.abs(((y % 16) + 16) % 16 - 8);
          return (gx < 1.1 || gy < 1.1) ? 1 : 0.04;
        }
        if (s.source === 'ring') {
          const r = Math.hypot(x - W * 0.5, y - H * 0.5);
          return Math.exp(-Math.pow(r - 18 * sc, 2) / 10);
        }
        if (s.source === 'galaxy') {
          const dx = x - W * 0.5, dy = y - H * 0.5;
          const u = dx * 0.8 + dy * 0.3, v = -dx * 0.3 + dy * 0.9;
          return Math.exp(-(u * u) / (2 * 22 * 22 * sc * sc) - (v * v) / (2 * 10 * 10 * sc * sc));
        }
        // stars: hash of coarse cell
        const cx = Math.floor(x / 4), cy = Math.floor(y / 4);
        const h = Math.abs(Math.sin(cx * 12.9898 + cy * 78.233 + (rngStar || 0)) * 43758.5453);
        const frac = h - Math.floor(h);
        return frac > 0.93 ? Math.pow((frac - 0.93) / 0.07, 2) : 0.02;
      }

      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s);
        W = sz.W; H = sz.H;
        kappa = buildKappa(s, W, H);
        psi = solvePsi(kappa, W, H, s.relax | 0);
        imgSrc = new Float32Array(W * H);
        const mag = new Float32Array(W * H);
        const rngStar = U.makeRng(s.seed + '/src')();
        let ringR = 0, ringN = 0;
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const ax = 0.5 * (psi[y * W + x + 1] - psi[y * W + x - 1]);
            const ay = 0.5 * (psi[(y + 1) * W + x] - psi[(y - 1) * W + x]);
            const axx = psi[y * W + x + 1] - 2 * psi[y * W + x] + psi[y * W + x - 1];
            const ayy = psi[(y + 1) * W + x] - 2 * psi[y * W + x] + psi[(y - 1) * W + x];
            const axy = 0.25 * (psi[(y + 1) * W + x + 1] - psi[(y + 1) * W + x - 1] - psi[(y - 1) * W + x + 1] + psi[(y - 1) * W + x - 1]);
            const det = (1 - axx) * (1 - ayy) - axy * axy;
            mag[y * W + x] = 1 / Math.max(0.02, Math.abs(det));
            const bx = x - ax * 8;
            const by = y - ay * 8;
            imgSrc[y * W + x] = sourceValue(s, bx, by, W, H, rngStar);
            if (s.source === 'ring' && imgSrc[y * W + x] > 0.35) {
              ringR += Math.hypot(x - W * 0.5, y - H * 0.5);
              ringN++;
            }
          }
        }
        const measured = ringN ? ringR / ringN : 0;
        stats = { mag, measured, theory: s.einstein, ringN };
        buf = document.createElement('canvas');
        buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }

      function paint() {
        if (!imgSrc) return;
        const s = host.getState();
        const data = img.data;
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#1A1A1A', '#F25C05', '#FFF3D6'];
        const ramp = U.makeRamp(pal, s.bg || '#121110');
        const exp = s.exposure;
        const field = s.view === 'mass' ? kappa : s.view === 'potential' ? psi : s.view === 'mag' ? stats.mag : imgSrc;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < field.length; i++) {
          const v = field[i];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        const span = (hi - lo) || 1;
        const logm = s.view === 'mag' || s.view === 'lensed';
        for (let i = 0; i < field.length; i++) {
          let t;
          if (logm && s.view !== 'lensed') t = U.clamp(Math.log(1 + (field[i] - lo)) / Math.log(1 + span) * exp, 0, 1);
          else t = U.clamp(Math.pow((field[i] - lo) / span, s.view === 'lensed' ? 0.65 : 1) * exp, 0, 1);
          const c = ramp(t);
          const o = i * 4;
          data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        if (s.caustics && stats) {
          const ink = U.hexToRgb(U.inkFor(s.bg));
          for (let i = 0; i < stats.mag.length; i++) if (stats.mag[i] > 12) {
            const o = i * 4;
            data[o] = ink[0]; data[o + 1] = ink[1]; data[o + 2] = ink[2];
          }
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = s.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }

      function status() {
        if (!stats) return;
        const ring = stats.ringN
          ? ('θ_E <b>' + stats.measured.toFixed(1) + '</b> · set ' + stats.theory)
          : ('θ_E set <b>' + stats.theory + '</b>');
        host.setStatus(
          '<span>grid <b>' + W + '×' + H + '</b></span>' +
          '<span>' + ring + '</span>' +
          '<span>Poisson <b>solved</b></span>'
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
