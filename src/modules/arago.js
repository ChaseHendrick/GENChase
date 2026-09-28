
/* modules/arago.js */
/* GENChase: Fresnel diffraction of an opaque disk. Poisson's bright axial spot. */
/* The Babinet propagator integrates the disk and subtracts it from the open beam, so I(0)/I_open is 1. */
/* Recipes older than v7 keep the aliased cutoff quadrature and are labeled as that, not as the open-beam test. */
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
  // Points per shortest cycle of the chirp or of J0 on [0, R]. The axis sample is the number the
  // status line prints; the painted radii use the coarser count, which is already past the knee.
  const AXIS_SAMPLES = 16;
  const FIELD_SAMPLES = 8;
  const J0_ZERO = 2.404825557695773; // first positive zero of J0, the radial scale of the spot
  const SCHEMA = [
    RANGE('Wave', 'grid', 'Grid', GEOM, 96, 224, 16, v => v + ''),
    { group: 'Wave', key: 'aspect', label: 'Sheet', type: 'seg', kind: GEOM, options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['16:9', '16:9']] },
    RANGE('Wave', 'radius', 'Disk R', GEOM, 10, 60, 1, v => v + ''),
    RANGE('Wave', 'z', 'Distance z', GEOM, 0.2, 2.2, 0.05, f2),
    RANGE('Wave', 'k', 'Wavenumber k', GEOM, 0.5, 2.8, 0.05, f2),
    { group: 'Wave', key: 'propagator', label: 'Propagator', type: 'seg', kind: GEOM,
      options: [['babinet', 'Babinet'], ['pre7', 'Before v7']],
      hint: 'Babinet integrates the disk and subtracts it from the open beam, so the on-axis intensity equals that beam. Before v7 is the aliased cutoff used by recipes made before recipe v7: it stops near the edge of the plate and its center-to-ring ratio is not I(0)/I_open. Old links keep it so they reprint.' },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Intensity'], ['log', 'Log I']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', radius: 26, z: 0.7, k: 1.35, propagator: 'babinet', view: 'log', exposure: 1.05 };
  const PRESETS = {
    spot: pre('Arago spot', { radius: 26, z: 0.65, k: 1.4, view: 'log' }, Pal.ember),
    tight: pre('Tight disk', { radius: 40, z: 0.45, view: 'int' }, Pal.nightshade),
    far: pre('Far field', { radius: 16, z: 1.7, k: 1.1, view: 'log' }, Pal.glacier),
    bright: pre('On axis', { radius: 30, z: 0.55, k: 1.7, view: 'int', exposure: 0.75 }, Pal.thermal),
    wide: pre('Wide', { radius: 14, z: 1.05, view: 'log' }, Pal.harbor),
    hard: pre('Hard shadow', { radius: 48, z: 0.25, k: 2.2, view: 'log' }, Pal.graphite),
  };
  function surprise(rng) { return { radius: rng.int(14, 44), z: rng.range(0.4, 1.5), k: rng.range(0.8, 2), view: rng.pick(['log', 'int']) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }

  // J0. Power series through |x| < 20 (past that the terms cancel in float64); the asymptotic series after. Even, so the sign of x is dropped.
  function besselJ0(x) {
    const ax = Math.abs(x);
    if (ax < 20) {
      const y = x * x;
      let term = 1, sum = 1;
      for (let m = 1; m < 80; m++) {
        term *= -y / (4 * m * m);
        sum += term;
        if (Math.abs(term) < 1e-16 * (Math.abs(sum) + 1e-30)) break;
      }
      return sum;
    }
    const xx = ax * ax, th = ax - Math.PI / 4, e8 = 8 * ax;
    let P = 1 - 9 / (128 * xx);
    let Q = -1 / e8;
    Q += -((-1) * (-9) * (-25)) / (6 * e8 * e8 * e8);
    P += ((-1) * (-9) * (-25) * (-49)) / (24 * e8 * e8 * e8 * e8);
    Q += ((-1) * (-9) * (-25) * (-49) * (-81)) / (120 * Math.pow(e8, 5));
    P += -((-1) * (-9) * (-25) * (-49) * (-81) * (-121)) / (720 * Math.pow(e8, 6));
    return Math.sqrt(2 / (Math.PI * ax)) * (P * Math.cos(th) - Q * Math.sin(th));
  }

  // Fresnel amplitude at distance r from the axis.
  // U_ap = (k/(i z)) exp(i k r^2/(2z)) ∫_0^R exp(i k ρ^2/(2z)) J0(k r ρ/z) ρ dρ
  // The same prefactor integrates to 1 over the whole plane, so the open beam is 1 and, by Babinet,
  // the opaque disk is 1 minus the aperture. Simpson's rule, with `samples` points on the shortest
  // cycle of the chirp or of J0. kind is 'aperture', 'disk' or 'open'.
  function fresnelAmplitude(r, R, z, k, samples, kind) {
    if (kind === 'open') return { re: 1, im: 0 };
    const alpha = k / (2 * z);
    const beta = k * r / z;
    const lamC = 2 * Math.PI * z / (k * R);
    const lamJ = beta > 1e-12 ? 2 * Math.PI / beta : Infinity;
    let n = Math.max(32, Math.ceil(samples * R / Math.min(lamC, lamJ)));
    if (n % 2) n++;
    const h = R / n;
    let re = 0, im = 0;
    const axis = beta === 0;
    for (let i = 0; i <= n; i++) {
      const rho = h * i;
      const w = (i === 0 || i === n) ? 1 : (i & 1 ? 4 : 2);
      const A = axis ? 1 : besselJ0(beta * rho);
      const ph = alpha * rho * rho;
      const wt = w * A * rho;
      re += wt * Math.cos(ph);
      im += wt * Math.sin(ph);
    }
    re *= h / 3;
    im *= h / 3;
    const scale = k / z; // times 1/i = -i
    let pr = scale * im, pi = -scale * re;
    if (r !== 0) {
      const ph = k * r * r / (2 * z), c = Math.cos(ph), s = Math.sin(ph);
      const nr = pr * c - pi * s, ni = pr * s + pi * c;
      pr = nr; pi = ni;
    }
    if (kind === 'disk') return { re: 1 - pr, im: -pi };
    return { re: pr, im: pi };
  }

  function fresnelIntensity(r, R, z, k, samples, kind) {
    const u = fresnelAmplitude(r, R, z, k, samples, kind);
    return u.re * u.re + u.im * u.im;
  }

  // Radius of the first dark ring of the on-axis spot, z * j_{0,1} / (k R). Below one cell, the
  // painted samples miss the spot and only the on-axis evaluation of this propagator sees it.
  function spotRadius(R, z, k) { return J0_ZERO * z / (k * R); }

  function radialNodes(rMax, R) {
    const rs = [0];
    const fine = Math.min(rMax, R + 6);
    for (let r = 0.5; r <= fine + 1e-9; r += 0.5) rs.push(Math.min(r, rMax));
    let r = rs[rs.length - 1] + 2;
    for (; r < rMax - 1e-6; r += 2) rs.push(r);
    if (rMax - rs[rs.length - 1] > 1e-6) rs.push(rMax);
    return rs;
  }

  function sampleRadial(I, rs, r) {
    const last = rs.length - 1;
    if (r <= rs[0]) return I[0];
    if (r >= rs[last]) return I[last];
    let lo = 0, hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (rs[mid] <= r) lo = mid; else hi = mid;
    }
    const t = (r - rs[lo]) / (rs[hi] - rs[lo]);
    return I[lo] * (1 - t) + I[hi] * t;
  }

  // The cutoff quadrature shipped before recipe v7. Kept so those recipes reprint.
  // It integrates only from R out to about half a diagonal, with 18 radial and 24 angular nodes,
  // and the metric is the mean inside r^2 < 6 divided by a ring just outside the disk. That ratio
  // is not I(0)/I_open.
  function legacyPlate(W, H, R, z, k) {
    const field = new Float32Array(W * H);
    const cx = W / 2, cy = H / 2;
    const nPhi = 24, nRad = 18, rMax = Math.hypot(W, H) * 0.52;
    let I0 = 0, n0 = 0, Ir = 0, nr = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r2 = dx * dx + dy * dy;
      let re = 0, im = 0;
      for (let ir = 0; ir < nRad; ir++) {
        const rho = R + (rMax - R) * (ir + 0.5) / nRad, dr = (rMax - R) / nRad;
        const wgt = rho * dr * (Math.PI * 2 / nPhi);
        for (let ip = 0; ip < nPhi; ip++) {
          const ph = (ip + 0.5) * Math.PI * 2 / nPhi;
          const sx = rho * Math.cos(ph), sy = rho * Math.sin(ph);
          const d2 = (dx - sx) * (dx - sx) + (dy - sy) * (dy - sy);
          const phase = k * d2 / (2 * z);
          re += wgt * Math.cos(phase); im += wgt * Math.sin(phase);
        }
      }
      const I = re * re + im * im;
      field[y * W + x] = I;
      if (r2 < 6) { I0 += I; n0++; }
      if (r2 > (R + 6) * (R + 6) && r2 < (R + 16) * (R + 16)) { Ir += I; nr++; }
    }
    return { field, metric: (I0 / Math.max(1, n0)) / Math.max(1e-12, Ir / Math.max(1, nr)) };
  }

  // The plate. propagator 'pre7' is the old picture; anything else is Babinet.
  function renderField(W, H, R, z, k, propagator) {
    const F = (R * R * k) / (2 * Math.PI * z);
    const spot = spotRadius(R, z, k);
    if (propagator === 'pre7') {
      const old = legacyPlate(W, H, R, z, k);
      return { field: old.field, metric: old.metric, F, spotRadius: spot, propagator: 'pre7' };
    }
    const open = fresnelAmplitude(0, R, z, k, AXIS_SAMPLES, 'open');
    const axis = fresnelAmplitude(0, R, z, k, AXIS_SAMPLES, 'disk');
    const Iopen = open.re * open.re + open.im * open.im;
    const metric = (axis.re * axis.re + axis.im * axis.im) / Iopen;
    const rMax = Math.hypot(W, H) * 0.5;
    const rs = radialNodes(rMax, R);
    const table = new Float64Array(rs.length);
    for (let i = 0; i < rs.length; i++) {
      table[i] = fresnelIntensity(rs[i], R, z, k, rs[i] === 0 ? AXIS_SAMPLES : FIELD_SAMPLES, 'disk');
    }
    const field = new Float32Array(W * H);
    const cx = W / 2, cy = H / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      field[y * W + x] = sampleRadial(table, rs, Math.hypot(dx, dy));
    }
    return { field, metric, F, spotRadius: spot, propagator: 'babinet' };
  }

  Studio.register({
    id: 'arago', name: 'Arago Spot', tab: 'Arago',
    subtitle: 'Poisson bright spot behind a disk · 1818',
    order: 49,
    equation: 'U(0) = (e^{ikz}/iλz) ∫_{|ρ|>R} exp(ik|ρ|²/2z) dρ,   I(0) ≃ I_open',
    credit: 'S. D. Poisson argued in 1818 that Fresnel\'s wave theory implied a bright spot on axis in the shadow of an opaque disk, which he took as a reductio. D. F. J. Arago performed the experiment and found the spot. The plate is a Fresnel propagator through a circular stop.',
    blurb: 'Poisson said: if light is a wave, the center of a disk\'s shadow must glow, which is absurd. Arago looked. It glows. Wavelets from the unobstructed plane meet in phase on axis, so a sample taken there equals the open beam. The spot is only as wide as a cell when the Fresnel number is small; at a large Fresnel number the cells miss it and the status line is the one that measures it. Before v7 reprints the old aliased cutoff, which is not that measurement.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    // Recipes older than v7 were made with the aliased cutoff. They keep it, so they reprint.
    legacy: { 7: { propagator: 'pre7' } },
    hints: {
      Wave: 'Fresnel number R²/(λ z) of order 1 makes the spot crisp. The status line is the on-axis sample against the open beam.',
    },
    palette: true, defaultPalette: 'ember', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, F = 0, spot = 0, which = 'babinet', buf, img;
      const AS = ASPECTS;
      function sizeFrom(s) { const a = AS[s.aspect] || 1, g = s.grid | 0; return { W: g, H: Math.max(48, Math.round(g * a)) }; }
      function compute() {
        const s = host.getState(); const sz = sizeFrom(s); W = sz.W; H = sz.H;
        const R = s.radius, z = Math.max(0.15, s.z), k = s.k;
        which = s.propagator === 'pre7' ? 'pre7' : 'babinet';
        const plate = renderField(W, H, R, z, k, which);
        field = plate.field; metric = plate.metric; F = plate.F; spot = plate.spotRadius;
        buf = document.createElement('canvas'); buf.width = W; buf.height = H;
        img = buf.getContext('2d').createImageData(W, H);
      }
      function paint() {
        if (!field) return;
        const s = host.getState();
        const pal = Array.isArray(s.palette) && s.palette.length ? s.palette : ['#121110', '#F25C05', '#FFF3D6'];
        const ramp = U.makeRamp(pal, s.bg || '#121110'), data = img.data;
        const exp = isFinite(s.exposure) && s.exposure > 0 ? s.exposure : 1;
        let lo = Infinity, hi = -Infinity;
        const logv = s.view === 'log';
        for (let i = 0; i < field.length; i++) {
          const v = logv ? Math.log(1e-9 + field[i]) : field[i];
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
        const span = (hi - lo) || 1;
        for (let i = 0; i < field.length; i++) {
          const v = logv ? Math.log(1e-9 + field[i]) : field[i];
          const t = U.clamp(((v - lo) / span) * exp, 0, 1);
          const c = ramp(isFinite(t) ? t : 0);
          const o = i * 4; data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
        buf.getContext('2d').putImageData(img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = s.bg || '#121110'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
      }
      function status() {
        if (which === 'pre7') {
          host.setStatus('<span>F <b>' + f2(F) + '</b></span>' +
            U.stats.compare({ label: 'center/ring', measured: metric, basis: 'deterministic', digits: 3,
              note: 'aliased cutoff, not I(0)/I_open' }) +
            '<span>before v7</span>');
          return;
        }
        host.setStatus('<span>F <b>' + f2(F) + '</b></span>' +
          U.stats.compare({ label: 'I(0)/I_open', measured: metric, expected: 1, reference: 'Poisson', basis: 'deterministic', digits: 4,
            note: spot < 1 ? 'spot narrower than a cell' : 'spot wider than a cell' }));
      }
      return {
        aspect(s) { return AS[s.aspect] || 1; },
        fieldCells() { return W && H ? [W, H] : null; },
        regenerate() { compute(); paint(); status(); },
        repaint() { paint(); status(); }, resize() { paint(); }, pause() {}, resume() { paint(); },
        async exportPNG(w, h) {
          if (!buf) throw new Error('nothing to export');
          const s = host.getState(), c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d', { alpha: false }); g.imageSmoothingEnabled = false;
          g.fillStyle = s.bg || '#121110'; g.fillRect(0, 0, w, h); g.drawImage(buf, 0, 0, w, h);
          return U.toBlob(c);
        },
      };
    },
  });
})();
