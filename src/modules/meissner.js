
/* modules/meissner.js */
/* GENChase: London equation in a superconducting disk. Interior B is measured against I0(r/λ)/I0(R/λ). */
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
    RANGE('SC', 'lambda', 'Penetration λ', GEOM, 4, 40, 1, v => v + ''),
    RANGE('SC', 'R', 'Disk R', GEOM, 16, 80, 1, v => v + ''),
    RANGE('SC', 'relax', 'Relax', GEOM, 40, 240, 10, v => v + '', { hint: 'Cap on multigrid cycles, or Jacobi sweeps for a pre-v7 recipe. The multigrid stops early once the residual is under 1e-9, which happens inside this cap when the disk sits in the frame.' }),
    { group: 'SC', key: 'solver', label: 'Solver', type: 'seg', kind: GEOM, options: [['mg', 'Multigrid'], ['jacobi', 'Jacobi']],
      hint: 'Multigrid is London\'s equation on the disk, converged inside the Relax cap. Jacobi is the damped sweep recipes used before recipe v7; it is not converged at any Relax the slider allows.' },
    { group: 'Picture', key: 'view', label: 'View', type: 'seg', kind: PAINT, options: [['int', 'Field'], ['log', 'Log']] },
    RANGE('Picture', 'exposure', 'Exposure', PAINT, 0.4, 2.2, 0.05, f2),
  ];
  const DEFAULTS = { grid: 160, aspect: '1:1', lambda: 10, R: 48, relax: 90, solver: 'mg', view: 'int', exposure: 1 };
  const PRESETS = {
    expel: pre('Expelled', { lambda: 8, R: 52, relax: 110 }, Pal.glacier),
    thin: pre('Thin λ', { lambda: 5, R: 56 }, Pal.nightshade),
    deep: pre('Deep λ', { lambda: 28, R: 40 }, Pal.harbor),
    log: pre('Log B', { view: 'log', lambda: 9, R: 50 }, Pal.ember),
    small: pre('Small disk', { R: 22, lambda: 10 }, Pal.kiln),
    tight: pre('Tight', { lambda: 6, R: 60, relax: 130 }, Pal.thermal),
  };

  // Modified Bessel I0 from its power series, sum_k (z/2)^{2k} / (k!)^2. Every term is positive, so
  // there is no cancellation, and the sum stops once a term falls below 1e-16 of it.
  function besselI0(z) {
    const q = z * z / 4;
    let term = 1, sum = 1;
    for (let k = 1; k < 500; k++) {
      term *= q / (k * k);
      sum += term;
      if (term < 1e-16 * sum) break;
    }
    return sum;
  }

  function plateSize(grid, aspect) {
    const a = ASPECTS[aspect] || 1, W = grid | 0;
    return { W, H: Math.max(48, Math.round(W * a)) };
  }

  // Distance from a cell centre to the circle along a unit grid step. The centre is inside, so one root is positive.
  function rayToCircle(px, py, sx, sy, cx, cy, R) {
    const dx = px - cx, dy = py - cy, b = dx * sx + dy * sy, c = dx * dx + dy * dy - R * R;
    const disc = b * b - c;
    if (disc < 0) return 1;
    const s = Math.sqrt(disc), t1 = -b - s, t2 = -b + s;
    const t = t1 > 1e-8 ? t1 : t2;
    if (!(t > 1e-8) || t > 1) return 1;
    return t < 1e-3 ? 1e-3 : t;
  }

  // Damped Jacobi, the pre-v7 plate. dt = 0.2 on lap - B/λ², clamped at 0. Forty to 240 sweeps do not reach the steady disk.
  function solveJacobi(W, H, lam, R, steps) {
    const cx = W / 2, cy = H / 2;
    let B = new Float64Array(W * H);
    B.fill(1);
    const n = steps | 0;
    for (let k = 0; k < n; k++) {
      const nB = B.slice();
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
        const i = y * W + x;
        if (r >= R) { nB[i] = 1; continue; }
        const lap = B[i + 1] + B[i - 1] + B[i + W] + B[i - W] - 4 * B[i];
        nB[i] = B[i] + 0.2 * (lap - B[i] * (1 / (lam * lam)));
        if (nB[i] < 0) nB[i] = 0;
      }
      B = nB;
    }
    return { field: B, cycles: n, residual: NaN, solver: 'jacobi' };
  }

  // Cell-centred geometric multigrid for (∇² - κ) B = 0 on the disk, B = 1 outside.
  // The rim uses the Shortley-Weller spacing so the circle, not the staircase of cell centres, carries B = 1.
  // κ = london / λ². london is +1 for London's equation. tools/meissner-science.js flips that sign.
  function solveMultigrid(W, H, lam, R, cycles) {
    const london = 1;
    const kappa = london / (lam * lam);
    const cx = W / 2, cy = H / 2;
    const fine = buildFine(W, H, R, cx, cy, kappa);
    const levels = [fine];
    while (levels[levels.length - 1].w >= 8 && levels[levels.length - 1].h >= 8) {
      const c = coarsen(levels[levels.length - 1], kappa);
      if (c.w < 4 || c.h < 4 || c.n < 4) break;
      levels.push(c);
    }
    const u = new Float64Array(W * H);
    u.fill(1);
    const cap = cycles | 0;
    let residual = operatorResidual(levels[0], u), used = 0;
    for (let c = 0; c < cap && residual > 1e-9; c++) {
      vcycle(levels, 0, u);
      used++;
      residual = operatorResidual(levels[0], u);
      if (!Number.isFinite(residual) || residual > 1e6) break;
    }
    for (let i = 0; i < u.length; i++) if (!fine.inside[i]) u[i] = 1;
    return { field: u, cycles: used, residual, solver: 'mg' };
  }

  function buildFine(W, H, R, cx, cy, kappa) {
    const N = W * H, inside = new Uint8Array(N);
    const diag = new Float64Array(N), b = new Float64Array(N);
    const ce = new Float32Array(N), cw = new Float32Array(N), cn = new Float32Array(N), cs = new Float32Array(N);
    let n = 0;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const px = x + 0.5, py = y + 0.5;
      if ((px - cx) * (px - cx) + (py - cy) * (py - cy) < R * R) { inside[y * W + x] = 1; n++; }
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!inside[i]) continue;
      const px = x + 0.5, py = y + 0.5;
      const he = inside[i + 1] ? 1 : rayToCircle(px, py, 1, 0, cx, cy, R);
      const hw = inside[i - 1] ? 1 : rayToCircle(px, py, -1, 0, cx, cy, R);
      const hn = inside[i + W] ? 1 : rayToCircle(px, py, 0, 1, cx, cy, R);
      const hs = inside[i - W] ? 1 : rayToCircle(px, py, 0, -1, cx, cy, R);
      // Shortley-Weller: u_xx = 2 u_e / (h_e (h_e+h_w)) + 2 u_w / (h_w (h_e+h_w)) - 2 u / (h_e h_w), and the same in y.
      const ke = 2 / (he * (he + hw)), kw = 2 / (hw * (he + hw));
      const kn = 2 / (hn * (hn + hs)), ks = 2 / (hs * (hn + hs));
      diag[i] = 2 / (he * hw) + 2 / (hn * hs) + kappa;
      if (inside[i + 1]) ce[i] = ke; else b[i] += ke;
      if (inside[i - 1]) cw[i] = kw; else b[i] += kw;
      if (inside[i + W]) cn[i] = kn; else b[i] += kn;
      if (inside[i - W]) cs[i] = ks; else b[i] += ks;
    }
    return { w: W, h: H, spacing: 1, n, inside, diag, b, ce, cw, cn, cs };
  }

  function coarsen(fine, kappa) {
    const w = Math.floor(fine.w / 2), h = Math.floor(fine.h / 2), N = w * h;
    const inside = new Uint8Array(N);
    let n = 0;
    for (let J = 0; J < h; J++) for (let I = 0; I < w; I++) {
      let cnt = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const x = 2 * I + dx, y = 2 * J + dy;
        if (x < fine.w && y < fine.h && fine.inside[y * fine.w + x]) cnt++;
      }
      // A coarse unknown only where the whole 2x2 block is unknown, so the coarse boundary lies inside the fine one.
      if (cnt === 4) { inside[J * w + I] = 1; n++; }
    }
    const diag = new Float64Array(N), b = new Float64Array(N);
    const ce = new Float32Array(N), cw = new Float32Array(N), cn = new Float32Array(N), cs = new Float32Array(N);
    const kh2 = kappa * (fine.spacing * 2) * (fine.spacing * 2);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!inside[i]) continue;
      diag[i] = 4 + kh2;
      if (x + 1 < w && inside[i + 1]) ce[i] = 1;
      if (x > 0 && inside[i - 1]) cw[i] = 1;
      if (y + 1 < h && inside[i + w]) cn[i] = 1;
      if (y > 0 && inside[i - w]) cs[i] = 1;
    }
    return { w, h, spacing: fine.spacing * 2, n, inside, diag, b, ce, cw, cn, cs };
  }

  function applyOp(L, u, i) {
    let acc = L.b[i];
    if (L.ce[i]) acc += L.ce[i] * u[i + 1];
    if (L.cw[i]) acc += L.cw[i] * u[i - 1];
    if (L.cn[i]) acc += L.cn[i] * u[i + L.w];
    if (L.cs[i]) acc += L.cs[i] * u[i - L.w];
    return acc - L.diag[i] * u[i];
  }

  function gaussSeidel(L, u, sweeps) {
    const { w, h, inside } = L;
    for (let s = 0; s < sweeps; s++) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!inside[i]) continue;
      let acc = L.b[i];
      if (L.ce[i]) acc += L.ce[i] * u[i + 1];
      if (L.cw[i]) acc += L.cw[i] * u[i - 1];
      if (L.cn[i]) acc += L.cn[i] * u[i + w];
      if (L.cs[i]) acc += L.cs[i] * u[i - w];
      u[i] = acc / L.diag[i];
    }
  }

  function operatorResidual(L, u) {
    const { w, h, inside } = L;
    let max = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!inside[i]) continue;
      const a = Math.abs(applyOp(L, u, i));
      if (a > max) max = a;
    }
    return max;
  }

  function prolong(C, e, fine, u) {
    const { w, h, inside } = fine;
    const at = (I, J) => (I < 0 || J < 0 || I >= C.w || J >= C.h || !C.inside[J * C.w + I]) ? 0 : e[J * C.w + I];
    for (let J = 0; J < C.h; J++) for (let I = 0; I < C.w; I++) {
      if (!C.inside[J * C.w + I]) continue;
      const c = at(I, J), l = at(I - 1, J), r = at(I + 1, J), d = at(I, J - 1), up = at(I, J + 1);
      const dl = at(I - 1, J - 1), dr = at(I + 1, J - 1), ul = at(I - 1, J + 1), ur = at(I + 1, J + 1);
      const vals = [
        [2 * I, 2 * J, (9 * c + 3 * l + 3 * d + dl) / 16],
        [2 * I + 1, 2 * J, (9 * c + 3 * r + 3 * d + dr) / 16],
        [2 * I, 2 * J + 1, (9 * c + 3 * l + 3 * up + ul) / 16],
        [2 * I + 1, 2 * J + 1, (9 * c + 3 * r + 3 * up + ur) / 16],
      ];
      for (let k = 0; k < 4; k++) {
        const x = vals[k][0], y = vals[k][1];
        if (x < w && y < h && inside[y * w + x]) u[y * w + x] += vals[k][2];
      }
    }
  }

  function vcycle(levels, li, u) {
    const L = levels[li];
    if (li === levels.length - 1) { gaussSeidel(L, u, 80); return; }
    gaussSeidel(L, u, 2);
    const { w, h, inside } = L, rho = new Float64Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (inside[i]) rho[i] = applyOp(L, u, i);
    }
    const C = levels[li + 1];
    C.b.fill(0);
    const add = (I, J, wgt, val) => {
      if (I < 0 || J < 0 || I >= C.w || J >= C.h || !C.inside[J * C.w + I]) return;
      C.b[J * C.w + I] += wgt * val;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, r = rho[i];
      if (!inside[i] || !r) continue;
      const I = x >> 1, J = y >> 1, di = (x & 1) ? 1 : -1, dj = (y & 1) ? 1 : -1;
      add(I, J, 9 / 16, r);
      add(I + di, J, 3 / 16, r);
      add(I, J + dj, 3 / 16, r);
      add(I + di, J + dj, 1 / 16, r);
    }
    const e = new Float64Array(C.w * C.h);
    vcycle(levels, li + 1, e);
    prolong(C, e, L, u);
    gaussSeidel(L, u, 2);
  }

  // The plate's update. mode 'jacobi' is the pre-v7 sweep. Anything else is the multigrid, capped at `relax` cycles.
  function solveLondon(W, H, lam, R, relax, mode) {
    lam = Math.max(2, +lam);
    if (mode === 'jacobi') return solveJacobi(W, H, lam, R, relax);
    return solveMultigrid(W, H, lam, R, relax);
  }

  function surprise(rng) { return { lambda: rng.int(6, 28), R: rng.int(24, 64) }; }
  function sanitize(s) { s.grid = Math.max(96, Math.min(224, Math.round(s.grid / 16) * 16)); }
  Studio.register({
    id: 'meissner', name: 'Meissner', tab: 'Meissner',
    subtitle: 'a field a perfect conductor would have frozen, expelled · 1933',
    order: 67,
    equation: '∇²B = B/λ²,   B(r) = B0 I0(r/λ) / I0(R/λ)   (cylinder)',
    credit: 'W. Meissner and R. Ochsenfeld, Naturwissenschaften 21, 787 (1933). A perfect conductor would freeze the flux it was born with. A superconductor expels it. The London brothers (1935) wrote ∇²B = B/λ². From recipe v7 the plate is a multigrid solve of that equation on a disk; recipes older than v7 keep the Jacobi relaxation they were made with.',
    blurb: 'Cool a metal in a field and a perfect conductor would trap that field forever. A superconductor kicks it out. That is the Meissner effect, and it is why superconductivity is not just infinite conductivity. The plate is B inside a disk held at B0 on the rim. From recipe v7 a multigrid reaches the London profile I0(r/λ)/I0(R/λ) inside the Relax cap. Older links keep the Jacobi sweeps they were made with, which stop short of that profile. The status line reports the core against that profile.',
    schema: SCHEMA, defaults: DEFAULTS, presets: PRESETS, closedGroups: ['Picture'],
    // Recipes older than v7 were made with the damped Jacobi sweep. They keep it, so they reprint.
    legacy: { 7: { solver: 'jacobi' } },
    hints: { SC: 'R much larger than λ is a dark core. R comparable to λ lets the field leak in. The circle has to sit inside the frame; a disk that runs into the edge is no longer the Bessel disk.' },
    palette: true, defaultPalette: 'glacier', surprise, sanitize,
    create(host) {
      const canvas = host.canvas, ctx = canvas.getContext('2d', { alpha: false });
      let W = 0, H = 0, field, metric = 0, extra = 0, cycles = 0, buf, img;
      function compute() {
        const s = host.getState();
        const sz = plateSize(s.grid, s.aspect); W = sz.W; H = sz.H;
        const solved = solveLondon(W, H, s.lambda, s.R, s.relax, s.solver);
        field = new Float32Array(solved.field);
        cycles = solved.cycles;
        const cx = W / 2, cy = H / 2, lam = Math.max(2, s.lambda), denom = besselI0(s.R / lam);
        let csum = 0, esum = 0, nc = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
          if (dx * dx + dy * dy < 4) {
            csum += field[y * W + x];
            esum += besselI0(Math.hypot(dx, dy) / lam) / denom;
            nc++;
          }
        }
        metric = csum / Math.max(1, nc);
        extra = esum / Math.max(1, nc);
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
        const s = host.getState();
        const jacobi = s.solver === 'jacobi';
        host.setStatus(U.stats.compare({
          label: 'core B/B0', measured: metric, expected: extra, reference: 'mean I0(r/λ)/I0(R/λ) on r<2',
          basis: 'deterministic', note: jacobi ? 'Jacobi, not converged' : 'multigrid',
        }) + '<span>' + (jacobi ? 'sweeps' : 'cycles') + ' <b>' + cycles + '</b></span><span>' +
          (metric < 0.35 ? 'expelled' : 'leaking') + '</span>');
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
