
/* modules/vortex.js */
/* GENChase: Abrikosov vortex lattice from a Ginzburg-Landau order parameter in a uniform B. Fixed-field relaxation with descriptive winding counts. */
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

  // The Grid slider and sanitize() read the same bounds, so no slider position is clamped away.
  const GRID_MIN = 96, GRID_MAX = 192;
  const SCHEMA = [
    RANGE('Field', 'grid', 'Grid', GEOM, GRID_MIN, GRID_MAX, 16, v => v + ''),
    { group: 'Field', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('GL', 'B', 'Field B', GEOM, 0.4, 3.2, 0.05, f2),
    RANGE('GL', 'kappa', 'κ', GEOM, 0.5, 4, 0.05, f2),
    RANGE('GL', 'relax', 'Relax', GEOM, 30, 240, 10, v => v + ''),
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 128, aspect: '1:1', B: 1.4, kappa: 1.6, relax: 90, view: 'int', exposure: 1 };
  const PRESETS = {
    hex: pre('Relaxed field', { B: 1.5, kappa: 1.8, relax: 110 }, Pal.ember),
    few: pre('Lower field', { B: 0.7, kappa: 1.4, relax: 80 }, Pal.harbor),
    dense: pre('Dense', { B: 2.6, kappa: 2.2, relax: 120 }, Pal.thermal),
    type1: pre('Low κ', { B: 1.2, kappa: 0.7, relax: 90 }, Pal.glacier),
    log: pre('Log |ψ|', { B: 1.6, view: 'log' }, Pal.nightshade),
    quiet: pre('Low field', { B: 0.55, kappa: 2.4 }, Pal.kiln),
  };

  // Unit-grid, fixed-field covariant Laplacian; links have modulus one.
  // Exact local saturation followed by a convex diffusion step keeps amplitudes bounded.
  function vortexSubsteps(kappa) { return Math.max(1, Math.ceil(0.12 / (0.8 * kappa * kappa / 4))); }
  function vortexAdvance(re, im, W, H, flux, kappa, dt) {
    const r = new Float64Array(re.length), v = new Float64Array(im.length);
    const nr = new Float64Array(re.length), ni = new Float64Array(im.length);
    const e = Math.exp(2 * dt), weight = dt / (kappa * kappa);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, scale = Math.sqrt(e / (1 + (re[i] * re[i] + im[i] * im[i]) * (e - 1)));
      r[i] = re[i] * scale; v[i] = im[i] * scale;
    }
    for (let y = 1; y < H - 1; y++) {
      const ax = -flux * (y - H / 2), c = Math.cos(ax), a = Math.sin(ax);
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        const lr = c * (r[i-1] + r[i+1]) + a * (v[i+1] - v[i-1]) + r[i-W] + r[i+W];
        const li = c * (v[i-1] + v[i+1]) + a * (r[i-1] - r[i+1]) + v[i-W] + v[i+W];
        nr[i] = (1 - 4 * weight) * r[i] + weight * lr;
        ni[i] = (1 - 4 * weight) * v[i] + weight * li;
      }
    }
    return [nr, ni];
  }

  function surprise(rng) { return { B: rng.range(0.7, 2.4), kappa: rng.range(0.8, 2.8) }; }
  function sanitize(s) { s.grid = Math.max(GRID_MIN, Math.min(GRID_MAX, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'vortex', name: 'Abrikosov', tab: 'Vortex',
    subtitle: 'fixed-field order-parameter relaxation · 1957',
    order: 59,
    equation: '∂ψ/∂t = κ⁻²(∇ − iA)²ψ + (1 − |ψ|²)ψ,   A = (−0.08 B y, 0),   Δx = 1',
    credit: 'A. A. Abrikosov, Zh. Eksp. Teor. Fiz. 32, 1442 (1957). Type-II superconductors were supposed to be like type I, expelling all flux until a catastrophic jump. Abrikosov found a lattice of flux tubes instead, each carrying one quantum. This plate is a reduced fixed-field Ginzburg-Landau relaxation with unit-modulus lattice links in Landau gauge and zero order parameter at the boundary. It does not evolve the magnetic field or establish critical fields.',
    blurb: 'A complex order parameter relaxes in an imposed magnetic field. Color shows its squared amplitude. The winding count is a descriptive grid diagnostic, not a test of flux quantization or proof of a hexagonal equilibrium. The model uses unit grid spacing and fixed zero edges; increasing the grid enlarges the domain. Magnetic screening and the type-I/type-II transition are outside this reduced model.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    hints: { GL: 'κ sets the inverse diffusion scale in this reduced fixed-field equation. B sets the imposed link flux, 0.08 B radians per cell.' },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, usedDt = 0, buf, img;
      function sizeFrom(s) {
        const a = ASPECTS[s.aspect] || 1, g = s.grid | 0;
        return { W: g, H: Math.max(48, Math.round(g * a)) };
      }
      function compute() {
        const s = host.getState();
        const sz = sizeFrom(s); W = sz.W; H = sz.H;
        field = new Float32Array(W * H);
        const rng = U.makeRng(String(s.seed) + '/x');

        const B = s.B, kap = s.kappa, steps = s.relax | 0;
        const N = W * H;
        let re = new Float64Array(N), im = new Float64Array(N);
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const i = y * W + x; re[i] = 0.2 * rng.gauss(); im[i] = 0.2 * rng.gauss();
        }
        const flux = B * 0.08, macroDt = 0.12;
        const substeps = vortexSubsteps(kap);
        usedDt = macroDt / substeps;
        for (let k = 0; k < steps * substeps; k++) [re, im] = vortexAdvance(re, im, W, H, flux, kap, usedDt);
        for (let i = 0; i < N; i++) {
          field[i] = re[i] * re[i] + im[i] * im[i];
          if (!Number.isFinite(field[i])) throw new Error('Nonfinite order parameter; reduce the workload and reseed.');
        }
        let zeros = 0;
        for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
          const i = y * W + x;
          const p = re[i] * re[i] + im[i] * im[i];
          field[i] = p;
          const n = [[re[i], im[i]], [re[i + 1], im[i + 1]], [re[i + 1 + W], im[i + 1 + W]], [re[i + W], im[i + W]]];
          let ang = 0;
          for (let k = 0; k < 4; k++) {
            const a = n[k], b = n[(k + 1) % 4];
            ang += Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
          }
          if (Math.abs(ang) > 4) zeros++;
        }
        metric = zeros;


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

      function status() { host.setStatus('<span>winding plaquettes <b>' + metric + '</b> (descriptive)</span><span>fixed field · zero edges · dx 1</span><span>substep dt ' + usedDt.toFixed(3) + '</span>'); }


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
