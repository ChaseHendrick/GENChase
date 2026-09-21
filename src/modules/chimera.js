
/* modules/chimera.js */
/* GENChase — Chimera States: identical oscillators that split into coherent and incoherent domains. */
(function () {
  'use strict';
  const U = Studio.util;
  const TAU = U.TAU;

  const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '2:3': 1.5, '16:9': 9 / 16 };
  const LUT_N = 512;               // entries in the color ramps
  const FRAME_BUDGET_MS = 20;      // simulation work per animation frame
  const REDUCED_BUDGET_MS = 3500;  // synchronous budget when prefers-reduced-motion is on
  const POLAR_RES = 1100;          // offscreen resolution of the ring view
  const GRID_ORDER_W = 1;          // half width (cells) of the 2D order-parameter box

  const f2 = v => v.toFixed(2);
  const f3 = v => v.toFixed(3);
  const pct = v => Math.round(v * 100) + '%';
  const HALF_PI = Math.PI / 2;

  /* ================================================================
     Nonlocal coupling kernels on the ring.

     Every kernel returns a function conv(x, y) writing the normalized weighted
     circular mean  y_i = sum_j G(d_ij) x_j / sum_j G  into y. The coupling term
     sum_j G sin(th_i - th_j + a) is then
        sin(th_i + a) * conv(cos th) - cos(th_i + a) * conv(sin th),
     so each right-hand side needs two convolutions and no inner trig. Each kernel
     has an exact O(N) form, which is what makes N = 2048 comfortable.
  ================================================================ */
  function ringConv(kind, N, s) {
    if (kind === 'tophat') {
      // box of radius R: sliding sum
      const R = Math.max(1, Math.min(N >> 1, Math.round(s.radius * N)));
      const inv = 1 / (2 * R + 1);
      return function (x, y) {
        let acc = 0;
        for (let k = -R; k <= R; k++) acc += x[(k + N) % N];
        y[0] = acc * inv;
        for (let i = 1; i < N; i++) {
          acc += x[(i + R) % N] - x[(i - R - 1 + N) % N];
          y[i] = acc * inv;
        }
      };
    }
    if (kind === 'cos') {
      // 1 + A cos(2 pi d): expand cos(a-b) so only three global sums are needed
      const A = s.cosA, cs = new Float64Array(N), sn = new Float64Array(N);
      for (let i = 0; i < N; i++) { cs[i] = Math.cos(TAU * i / N); sn[i] = Math.sin(TAU * i / N); }
      return function (x, y) {
        let m = 0, cc = 0, ss = 0;
        for (let j = 0; j < N; j++) { const v = x[j]; m += v; cc += cs[j] * v; ss += sn[j] * v; }
        m /= N; cc = A * cc / N; ss = A * ss / N;
        for (let i = 0; i < N; i++) y[i] = m + cs[i] * cc + sn[i] * ss;
      };
    }
    // exp(-kappa d) truncated at the antipode: two compensated recursive filters
    const W = N >> 1, a = Math.exp(-s.kappa / N), aW = Math.pow(a, W), aW1 = aW * a;
    let tot = 1 + aW;
    for (let d = 1; d < W; d++) tot += 2 * Math.pow(a, d);
    const inv = 1 / tot;
    const F = new Float64Array(N), B = new Float64Array(N);
    return function (x, y) {
      let acc = 0, w = 1;
      for (let d = 0; d <= W; d++) { acc += w * x[(N - 1 + d) % N]; w *= a; }
      F[N - 1] = acc;
      for (let i = N - 2; i >= 0; i--) F[i] = x[i] + a * F[i + 1] - aW1 * x[(i + 1 + W) % N];
      acc = 0; w = 1;
      for (let d = 0; d <= W; d++) { acc += w * x[(N - d) % N]; w *= a; }
      B[0] = acc;
      for (let i = 1; i < N; i++) B[i] = x[i] + a * B[i - 1] - aW1 * x[(i - 1 - W + 2 * N) % N];
      for (let i = 0; i < N; i++) y[i] = (F[i] + B[i] - x[i] - aW * x[(i + W) % N]) * inv;
    };
  }

  /* Separable version of the same three profiles for the torus, truncated at R cells.
     Cost is O(S^2 R) instead of O(S^2 R^2), which is what keeps the grid interactive. */
  function gridConv(kind, S, R, s) {
    const g = new Float64Array(R + 1);
    for (let d = 0; d <= R; d++) {
      const u = d / R;
      g[d] = kind === 'tophat' ? 1 : kind === 'cos' ? 1 + s.cosA * Math.cos(Math.PI * u) : Math.exp(-s.kappa * u);
    }
    let tot = g[0];
    for (let d = 1; d <= R; d++) tot += 2 * g[d];
    for (let d = 0; d <= R; d++) g[d] /= tot;
    const line = new Float64Array(S + 2 * R), mid = new Float64Array(S * S);
    return function (x, y) {
      for (let r = 0; r < S; r++) {
        const row = r * S;
        for (let i = 0; i < S + 2 * R; i++) line[i] = x[row + (((i - R) % S) + S) % S];
        for (let c = 0; c < S; c++) {
          const p = c + R;
          let acc = g[0] * line[p];
          for (let d = 1; d <= R; d++) acc += g[d] * (line[p - d] + line[p + d]);
          mid[row + c] = acc;
        }
      }
      for (let c = 0; c < S; c++) {
        for (let i = 0; i < S + 2 * R; i++) line[i] = mid[((((i - R) % S) + S) % S) * S + c];
        for (let r = 0; r < S; r++) {
          const p = r + R;
          let acc = g[0] * line[p];
          for (let d = 1; d <= R; d++) acc += g[d] * (line[p - d] + line[p + d]);
          y[r * S + c] = acc;
        }
      }
    };
  }

  /* ================================================================
     initial conditions (all drawn from the seeded rng)
  ================================================================ */
  function initRing(N, kind, rng) {
    const th = new Float64Array(N);
    const q = rng.int(1, 3);
    for (let i = 0; i < N; i++) {
      const x = i / N;
      if (kind === 'random') th[i] = rng() * TAU;
      else if (kind === 'domains') th[i] = x < 0.5 ? rng() * TAU : 0.3 * Math.sin(TAU * x) + 0.02 * (rng() - 0.5);
      else if (kind === 'wave' || kind === 'spiral') th[i] = TAU * q * x + 0.05 * (rng() - 0.5);
      // Kuramoto-Battogtokh: random phases under a Gaussian envelope, flat elsewhere
      else th[i] = 6 * Math.exp(-30 * (x - 0.5) * (x - 0.5)) * (rng() - 0.5);
    }
    return th;
  }

  function initGrid(S, kind, rng) {
    const th = new Float64Array(S * S);
    const q = rng.int(1, 3);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const fx = x / S, fy = y / S;
        let v;
        if (kind === 'random') v = rng() * TAU;
        else if (kind === 'domains') v = fx < 0.5 ? rng() * TAU : 0.3 * Math.sin(TAU * fy) + 0.02 * (rng() - 0.5);
        else if (kind === 'wave') v = TAU * q * fx + 0.05 * (rng() - 0.5);
        else if (kind === 'spiral') {
          // a vortex / antivortex pair — the only spiral arrangement a torus allows
          const sy = Math.sin(TAU * (fy - 0.5));
          v = Math.atan2(sy, Math.sin(TAU * (fx - 0.25))) - Math.atan2(sy, Math.sin(TAU * (fx - 0.75))) + 0.1 * (rng() - 0.5);
        } else {
          let dx = fx - 0.5, dy = fy - 0.5;
          dx -= Math.round(dx); dy -= Math.round(dy);
          v = 6 * Math.exp(-30 * (dx * dx + dy * dy)) * (rng() - 0.5);
        }
        th[y * S + x] = v;
      }
    }
    return th;
  }

  /* ================================================================
     simulations
  ================================================================ */
  function makeSim(s, rng) {
    const grid = s.view === 'grid';
    const S = grid ? (s.side | 0) : 0;
    const n = grid ? S * S : (s.N | 0);
    const conv = grid
      ? gridConv(s.kernel, S, Math.max(2, Math.min(S >> 1, Math.round(s.radius * S))), s)
      : ringConv(s.kernel, n, s);
    const th = grid ? initGrid(S, s.init, rng) : initRing(n, s.init, rng);
    const cs = new Float64Array(n), sn = new Float64Array(n);
    const Cc = new Float64Array(n), Cs = new Float64Array(n);
    const alpha = s.alpha, omega = s.omega, dt = s.dt;
    const k1 = new Float64Array(n), k2 = new Float64Array(n), tmp = new Float64Array(n);
    const rk4 = s.integ === 'rk4';
    const k3 = rk4 ? new Float64Array(n) : null, k4 = rk4 ? new Float64Array(n) : null;

    function deriv(t, out) {
      for (let i = 0; i < n; i++) { cs[i] = Math.cos(t[i]); sn[i] = Math.sin(t[i]); }
      conv(cs, Cc); conv(sn, Cs);
      for (let i = 0; i < n; i++) {
        const a = t[i] + alpha;
        out[i] = omega - (Math.sin(a) * Cc[i] - Math.cos(a) * Cs[i]);
      }
    }
    const sim = {
      n, S, th, steps: 0,
      step() {
        deriv(th, k1);
        if (!rk4) {
          for (let i = 0; i < n; i++) tmp[i] = th[i] + dt * k1[i];
          deriv(tmp, k2);
          for (let i = 0; i < n; i++) th[i] += dt * 0.5 * (k1[i] + k2[i]);
        } else {
          for (let i = 0; i < n; i++) tmp[i] = th[i] + dt * 0.5 * k1[i];
          deriv(tmp, k2);
          for (let i = 0; i < n; i++) tmp[i] = th[i] + dt * 0.5 * k2[i];
          deriv(tmp, k3);
          for (let i = 0; i < n; i++) tmp[i] = th[i] + dt * k3[i];
          deriv(tmp, k4);
          for (let i = 0; i < n; i++) th[i] += dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
        }
        sim.steps++;
      },
    };
    return sim;
  }

  /* local order parameter r_i = |mean of exp(i theta) over a box neighborhood| */
  let scratchC = null, scratchS = null;
  function scratch(n) {
    if (!scratchC || scratchC.length < n) { scratchC = new Float64Array(n); scratchS = new Float64Array(n); }
  }
  function ringOrder(th, N, W, out) {
    scratch(N);
    const c = scratchC, s = scratchS;
    for (let i = 0; i < N; i++) { c[i] = Math.cos(th[i]); s[i] = Math.sin(th[i]); }
    const inv = 1 / (2 * W + 1);
    let sc = 0, ss = 0;
    for (let k = -W; k <= W; k++) { const j = (k + N) % N; sc += c[j]; ss += s[j]; }
    out[0] = Math.sqrt(sc * sc + ss * ss) * inv;
    for (let i = 1; i < N; i++) {
      const add = (i + W) % N, rem = (i - W - 1 + N) % N;
      sc += c[add] - c[rem]; ss += s[add] - s[rem];
      out[i] = Math.sqrt(sc * sc + ss * ss) * inv;
    }
  }

  let gridCh = null, gridSh = null;
  function gridOrder(th, S, W, out) {
    const n = S * S;
    scratch(n);
    if (!gridCh || gridCh.length < n) { gridCh = new Float64Array(n); gridSh = new Float64Array(n); }
    const c = scratchC, s = scratchS, ch = gridCh, sh = gridSh;
    for (let i = 0; i < n; i++) { c[i] = Math.cos(th[i]); s[i] = Math.sin(th[i]); }
    const M = 2 * W + 1, inv = 1 / (M * M);
    for (let y = 0; y < S; y++) {
      const row = y * S;
      let sc = 0, ss = 0;
      for (let k = -W; k <= W; k++) { const j = ((k % S) + S) % S; sc += c[row + j]; ss += s[row + j]; }
      for (let x = 0; x < S; x++) {
        ch[row + x] = sc; sh[row + x] = ss;
        const add = (x + W + 1) % S, rem = ((x - W) % S + S) % S;
        sc += c[row + add] - c[row + rem]; ss += s[row + add] - s[row + rem];
      }
    }
    for (let x = 0; x < S; x++) {
      let sc = 0, ss = 0;
      for (let k = -W; k <= W; k++) { const j = ((k % S) + S) % S; sc += ch[j * S + x]; ss += sh[j * S + x]; }
      for (let y = 0; y < S; y++) {
        out[y * S + x] = Math.sqrt(sc * sc + ss * ss) * inv;
        const add = (y + W + 1) % S, rem = ((y - W) % S + S) % S;
        sc += ch[add * S + x] - ch[rem * S + x]; ss += sh[add * S + x] - sh[rem * S + x];
      }
    }
  }

  /* Collective phase of the current field as a fraction of a turn, unwrapped against the last
     reading. When the ring is far from synchrony that reading is noisy, so what is accumulated is
     a smoothed drift rate: the display frame then rotates steadily instead of jittering. */
  const DRIFT_EMA = 0.04;
  function meanPhase(n, rot) {
    let c = 0, s = 0;
    for (let i = 0; i < n; i++) { c += scratchC[i]; s += scratchS[i]; }
    const a = Math.atan2(s, c) / TAU;
    let d = a - rot.raw;
    d -= Math.round(d);
    rot.raw += d;
    rot.rate = rot.rate === null ? d : rot.rate + (d - rot.rate) * DRIFT_EMA;
    rot.psi += rot.rate;
    return rot.psi;
  }

  function coherentFraction(r) {
    let c = 0;
    for (let i = 0; i < r.length; i++) if (r[i] > 0.9) c++;
    return c / r.length;
  }

  /* ================================================================
     color
  ================================================================ */
  function cyclicLUT(s) {
    if (s.cyc === 'hue') {
      const lut = new Uint8ClampedArray(LUT_N * 3);
      let h0 = 0, sat = 0, lit = 0, best = -1;
      for (const hex of s.palette) {
        const c = U.hexToRgb(hex), hsl = U.rgbToHsl(c[0], c[1], c[2]);
        sat += hsl[1]; lit += hsl[2];
        if (hsl[1] > best) { best = hsl[1]; h0 = hsl[0]; }
      }
      sat = U.clamp(sat / s.palette.length, 25, 62);
      lit = U.isLight(s.bg) ? U.clamp(lit / s.palette.length, 32, 56) : U.clamp(lit / s.palette.length, 46, 74);
      for (let i = 0; i < LUT_N; i++) {
        // lightness cycles with hue as well, so the ramp still reads in greyscale on paper
        const c = U.hslToRgb(h0 + 360 * i / LUT_N, sat, lit + 22 * Math.cos(TAU * i / LUT_N));
        lut[i * 3] = c[0]; lut[i * 3 + 1] = c[1]; lut[i * 3 + 2] = c[2];
      }
      return lut;
    }
    const p = s.palette;
    const cols = s.cyc === 'mirror' ? p.concat(p.slice(0, -1).reverse()) : p.concat([p[0]]);
    return U.makeRampLUT(cols, null, LUT_N);
  }

  // monotone warp of the ramp coordinate that leaves 0 and 1 fixed, so a cyclic ramp stays seamless
  function shape(t, gam, con, inv) {
    if (inv) t = 1 - t;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    if (gam !== 1) t = Math.pow(t, gam);
    if (con > 0) {
      const c1 = con > 1 ? 1 : con;
      t += (t * t * (3 - 2 * t) - t) * c1;
      if (con > 1) t += (t * t * (3 - 2 * t) - t) * (con - 1);
    }
    return t;
  }

  function hash2(x, y, seed) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function seedInt(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h | 0;
  }

  function paintCfg(s) {
    return {
      cyc: cyclicLUT(s),
      ord: U.makeRampLUT(s.palette, s.bg, LUT_N),
      bg: U.hexToRgb(s.bg),
      src: s.colorSrc === 'order' ? 1 : s.colorSrc === 'blend' ? 2 : 0,
      derot: s.derot, gam: s.gamma, con: s.contrast, inv: s.invert, expo: s.exposure,
      grain: s.grain, seed: seedInt(s.seed),
    };
  }

  /* One scan line of the field into RGBA. row is only used to keep grain stable. */
  function paintLine(P, phases, poff, rvals, roff, data, out, row, len, psi) {
    const L = LUT_N - 1, INV = 1 / TAU;
    const bg0 = P.bg[0], bg1 = P.bg[1], bg2 = P.bg[2];
    const lut = P.src === 1 ? P.ord : P.cyc;
    for (let i = 0; i < len; i++) {
      let t, w = 1;
      if (P.src === 1) t = rvals[roff + i];
      else {
        let ph = phases[poff + i] * INV - psi;
        ph -= Math.floor(ph);
        t = ph;
        if (P.src === 2) w = shape(rvals[roff + i], P.gam, P.con, P.inv);
      }
      const idx = (shape(t, P.gam, P.con, P.inv) * L | 0) * 3;
      const e = w * P.expo;
      let r = bg0 + (lut[idx] - bg0) * e;
      let g = bg1 + (lut[idx + 1] - bg1) * e;
      let b = bg2 + (lut[idx + 2] - bg2) * e;
      if (P.grain > 0) {
        const nz = (hash2(i, row, P.seed) - 0.5) * P.grain * 46;
        r += nz; g += nz; b += nz;
      }
      const o = out + i * 4;
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
  }

  /* ================================================================
     schema
  ================================================================ */
  const isGrid = s => s.view === 'grid';
  const schema = [
    { group: 'Oscillators', key: 'view', label: 'View', type: 'seg', kind: 'geom', wrap: true,
      options: [['spacetime', 'Space-time'], ['ring', 'Ring'], ['grid', '2D grid']] },
    { group: 'Oscillators', key: 'N', label: 'Oscillators', type: 'range', kind: 'geom', min: 256, max: 2048, step: 64, dimUnless: s => !isGrid(s) },
    { group: 'Oscillators', key: 'side', label: 'Grid side', type: 'range', kind: 'geom', min: 96, max: 160, step: 8, dimUnless: isGrid,
      hint: 'The torus is side × side oscillators, each coupled to every neighbor inside the coupling radius.' },
    { group: 'Oscillators', key: 'init', label: 'Initial phases', type: 'seg', kind: 'geom', wrap: true,
      options: [['bump', 'Perturbed bump'], ['random', 'Uniform random'], ['domains', 'Two domains'], ['wave', 'Twisted wave'], ['spiral', 'Spiral pair']] },
    // ---- Coupling
    { group: 'Coupling', key: 'kernel', label: 'Kernel', type: 'seg', kind: 'geom',
      options: [['exp', 'Exponential'], ['cos', 'Cosine'], ['tophat', 'Top hat']] },
    { group: 'Coupling', key: 'kappa', label: 'Decay κ', type: 'range', kind: 'geom', min: 0.5, max: 16, step: 0.1, fmt: f2, dimUnless: s => s.kernel === 'exp' },
    { group: 'Coupling', key: 'cosA', label: 'Amplitude A', type: 'range', kind: 'geom', min: 0, max: 1, step: 0.005, fmt: f3, dimUnless: s => s.kernel === 'cos' },
    { group: 'Coupling', key: 'radius', label: 'Radius R', type: 'range', kind: 'geom', min: 0.02, max: 0.5, step: 0.005, fmt: f3, dimUnless: s => s.kernel === 'tophat' || isGrid(s) },
    { group: 'Coupling', key: 'alpha', label: 'Phase lag α', type: 'range', kind: 'geom', min: 0, max: 1.5708, step: 0.0005,
      fmt: v => v.toFixed(3) + ' (β ' + (HALF_PI - v).toFixed(3) + ')' },
    { group: 'Coupling', key: 'omega', label: 'Natural frequency ω', type: 'range', kind: 'geom', min: -2, max: 2, step: 0.01, fmt: f2 },
    // ---- Time
    { group: 'Time', key: 'dt', label: 'Time step', type: 'range', kind: 'geom', min: 0.005, max: 0.2, step: 0.005, fmt: f3 },
    { group: 'Time', key: 'integ', label: 'Integrator', type: 'seg', kind: 'geom', options: [['heun', 'Heun'], ['rk4', 'RK4']] },
    { group: 'Time', key: 'spr', label: 'Steps per row', type: 'range', kind: 'geom', min: 1, max: 24, step: 1 },
    { group: 'Time', key: 'rows', label: 'Time window', type: 'range', kind: 'geom', min: 240, max: 1200, step: 20, dimUnless: s => !isGrid(s) },
    { group: 'Time', key: 'whenFull', label: 'When full', type: 'seg', kind: 'geom', options: [['stop', 'Stop'], ['scroll', 'Scroll']], dimUnless: s => !isGrid(s) },
    { group: 'Time', key: 'settle', label: 'Settle steps', type: 'range', kind: 'geom', min: 200, max: 6000, step: 100, dimUnless: isGrid },
    // ---- Color
    { group: 'Color', key: 'colorSrc', label: 'Color by', type: 'seg', kind: 'paint',
      options: [['phase', 'Phase'], ['order', 'Order r'], ['blend', 'Blend']] },
    { group: 'Color', key: 'cyc', label: 'Cyclic mapping', type: 'seg', kind: 'paint',
      options: [['wrap', 'Wrap'], ['mirror', 'Mirror'], ['hue', 'Hue wheel']], dimUnless: s => s.colorSrc !== 'order' },
    { group: 'Color', key: 'derot', label: 'De-rotate', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.01, fmt: f2, dimUnless: s => s.colorSrc !== 'order',
      hint: '1 plots phase in the frame that turns with the collective rhythm, so the locked domain stands still; 0 is the laboratory frame, where every phase cycles down the page.' },
    { group: 'Color', key: 'orderWin', label: 'Order window', type: 'range', kind: 'paint', min: 0.005, max: 0.15, step: 0.005, fmt: pct, dimUnless: s => !isGrid(s) },
    { group: 'Color', key: 'exposure', label: 'Exposure', type: 'range', kind: 'paint', min: 0.2, max: 2, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'gamma', label: 'Gamma', type: 'range', kind: 'paint', min: 0.3, max: 3, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'contrast', label: 'Contrast', type: 'range', kind: 'paint', min: 0, max: 2, step: 0.05, fmt: f2 },
    { group: 'Color', key: 'invert', label: 'Invert ramp', type: 'toggle', kind: 'paint' },
    { group: 'Color', key: 'grain', label: 'Grain', type: 'range', kind: 'paint', min: 0, max: 1, step: 0.05, fmt: pct },
    { group: 'Color', key: 'inner', label: 'Ring hole', type: 'range', kind: 'paint', min: 0.05, max: 0.7, step: 0.01, fmt: f2, dimUnless: s => s.view === 'ring' },
    { group: 'Color', key: 'aspect', label: 'Aspect', type: 'seg', kind: 'paint', wrap: true, dimUnless: s => !isGrid(s),
      options: [['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:2', '3:2'], ['2:3', '2:3'], ['16:9', '16:9']] },
  ];

  const defaults = {
    view: 'spacetime', N: 512, side: 112, init: 'bump',
    kernel: 'exp', kappa: 4, cosA: 0.995, radius: 0.25, alpha: 1.457, omega: 0,
    dt: 0.05, integ: 'heun', spr: 4, rows: 700, whenFull: 'stop', settle: 2000,
    colorSrc: 'phase', cyc: 'wrap', derot: 0.93, orderWin: 0.025, exposure: 1, gamma: 1, contrast: 0,
    invert: false, grain: 0.06, inner: 0.22, aspect: '4:5',
  };

  const P = Studio.PALETTES;
  const base = {
    N: 512, side: 112, kernel: 'exp', kappa: 4, cosA: 0.995, radius: 0.25, omega: 0,
    dt: 0.05, integ: 'heun', spr: 4, rows: 700, whenFull: 'stop', settle: 2000,
    cyc: 'wrap', derot: 0.93, orderWin: 0.025, exposure: 1, gamma: 1, contrast: 0, invert: false,
    grain: 0.06, inner: 0.22, aspect: '4:5',
  };
  const pre = (label, p, palette) => ({ label, palette, p: Object.assign({}, base, p) });
  const presets = {
    classic: pre('Classic chimera', { view: 'spacetime', init: 'bump', kernel: 'exp', kappa: 4, alpha: 1.457, colorSrc: 'phase', cyc: 'wrap', rows: 700, spr: 4 }, P.nightshade),
    order: pre('Order parameter', { view: 'spacetime', init: 'bump', kernel: 'exp', kappa: 4, alpha: 1.457, colorSrc: 'order', gamma: 2.2, contrast: 1, rows: 700, spr: 4, grain: 0 }, P.glacier),
    breathing: pre('Breathing chimera', { view: 'spacetime', init: 'domains', kernel: 'exp', kappa: 6, alpha: 1.4208, colorSrc: 'blend', cyc: 'wrap', rows: 900, spr: 8, exposure: 1.15 }, P.ember),
    multi: pre('Multi-headed', { view: 'spacetime', init: 'bump', kernel: 'tophat', radius: 0.25, alpha: 1.4208, colorSrc: 'phase', cyc: 'wrap', rows: 800, spr: 6 }, P.verdigris),
    spiral: pre('Spiral chimera', { view: 'grid', init: 'spiral', side: 128, kernel: 'exp', kappa: 4, radius: 0.14, alpha: 1.27, dt: 0.12, spr: 4, settle: 1400, colorSrc: 'blend', cyc: 'wrap', contrast: 0.6, grain: 0 }, P.thermal),
    cosine: pre('Cosine kernel', { view: 'spacetime', init: 'bump', kernel: 'cos', cosA: 0.995, alpha: 1.4208, colorSrc: 'phase', cyc: 'wrap', rows: 700, spr: 4, aspect: '1:1' }, P.harbor),
    polar: pre('Polar ring', { view: 'ring', init: 'bump', kernel: 'exp', kappa: 4, alpha: 1.457, colorSrc: 'blend', cyc: 'wrap', rows: 620, spr: 5, inner: 0.24, aspect: '1:1', exposure: 1.1, grain: 0.1 }, P.graphite),
    coherent: pre('Coherent', { view: 'spacetime', init: 'wave', kernel: 'tophat', radius: 0.1, alpha: 0.85, omega: 0.4, derot: 0, colorSrc: 'phase', cyc: 'wrap', rows: 700, spr: 5, grain: 0.12 }, P.kiln),
  };

  /* ================================================================
     module
  ================================================================ */
  Studio.register({
    id: 'chimera', name: 'Chimera States', order: 55,
    subtitle: 'identical oscillators that split into synchrony and chaos · 2004',
    equation: 'dθi/dt = ω − (1/N) Σj G(|i−j|) sin(θi − θj + α)',
    credit: 'Yoshiki Kuramoto and Dorjsuren Battogtokh found a ring of identical, identically coupled oscillators splitting into a coherent and an incoherent domain in 2002 — a state everyone had assumed impossible. Daniel Abrams and Steven Strogatz named it the chimera state in 2004, after the Greek beast assembled from mismatched animals.',
    blurb: 'Every oscillator here is identical and every one is coupled to its neighbors in exactly the same way, with a strength that falls off with distance around the ring. Symmetry says they should all do the same thing: lock together, or not. Instead, for a phase lag α just under a right angle, the ring spontaneously tears in two — part of it locks into a smooth traveling wave while the rest drifts in permanent disorder, and the border between them stays put. Nothing in the equations picks that border; the pattern chooses it. The space-time plot puts oscillator index across and time downward, so the coherent domain reads as smooth diagonal banding and the incoherent one as a permanent scramble beside it. On a 2D torus the same coupling makes spiral waves whose cores never lock.',
    schema, defaults, presets,
    hints: {
      Coupling: 'G is the nonlocal kernel: exponential exp(−κd) (Kuramoto and Battogtokh used κ = 4), the cosine 1 + A·cos(2πd) that Abrams and Strogatz could solve exactly, or a top hat of radius R. Distance is measured around the ring, so d runs 0 … 0.5. Chimeras need α close to π/2: the useful window is roughly β = π/2 − α between 0.05 and 0.18; below it the ring drifts apart, above it everything locks. On the 2D grid the kernel is truncated at the coupling radius and κ or A then set how fast it falls off across that radius.',
      Time: 'The space-time views record one row every few integration steps until the time window is full, then stop or scroll. The 2D grid has no rows: there, Steps per row is how far the simulation advances each animation frame, and Settle steps is where the run stops. Heun is enough for these smooth phase equations; RK4 costs twice as much and gives a visually identical chimera.',
      Color: 'Phase is cyclic, so its ramp wraps: Wrap runs through the palette and back to the first color, Mirror reflects it, Hue wheel rotates hue through a full turn at the palette\'s saturation. The local order parameter r is the length of the average of exp(iθ) over a neighborhood — near 1 where oscillators lock, near zero where they drift — and Blend keeps the phase color but fades the incoherent domain towards the background.',
    },
    closedGroups: ['Time'],
    palette: true, defaultPalette: 'nightshade', paletteLabel: 'Colors (cyclic: last wraps to first)',
    headline: 'N', headlineLabel: 'oscillators',

    sanitize(s) {
      s.N = U.clamp(Math.round(s.N / 2) * 2, 256, 2048);
      s.side = U.clamp(Math.round(s.side / 2) * 2, 96, 160);
    },
    onParam(s, key) {
      if (key !== 'view') return;
      if (s.view === 'grid') {
        // the torus wants a longer step and a lag further from pi/2 than the ring does
        if (s.init !== 'spiral') s.init = 'spiral';
        if (s.dt < 0.1) s.dt = 0.1;
        if (s.alpha > 1.35) s.alpha = 1.27;
      }
      else if (s.init === 'spiral') s.init = 'bump';
    },
    surprise(rng) {
      const grid = rng() < 0.2;
      const kernel = rng.pick(['exp', 'exp', 'exp', 'cos', 'tophat']);
      const beta = rng.range(0.08, 0.17);
      const src = rng.pick(['phase', 'phase', 'blend', 'order']);
      return {
        view: grid ? 'grid' : rng.pick(['spacetime', 'spacetime', 'spacetime', 'ring']),
        N: rng.pick([384, 512, 512, 768, 1024]), side: rng.pick([96, 112, 128]),
        init: grid ? 'spiral' : rng.pick(['bump', 'bump', 'bump', 'random']),
        kernel, kappa: rng.range(3.5, 7), cosA: rng.range(0.7, 1), radius: rng.range(0.12, 0.32),
        alpha: grid ? HALF_PI - rng.range(0.35, 0.6) : HALF_PI - beta,
        omega: rng() < 0.25 ? rng.range(-0.6, 0.6) : 0,
        dt: grid ? 0.1 : 0.05, integ: 'heun', spr: grid ? 3 : rng.int(3, 8),
        rows: rng.pick([600, 700, 800, 900]), whenFull: 'stop', settle: 2400,
        colorSrc: grid ? 'phase' : src,
        cyc: rng.pick(['wrap', 'wrap', 'wrap', 'mirror', 'hue']), orderWin: rng.range(0.015, 0.05),
        exposure: rng.range(0.9, 1.25), gamma: rng.range(0.85, 1.3), contrast: src === 'order' ? rng.range(0.4, 1.2) : rng.range(0, 0.5),
        invert: rng() < 0.12, grain: rng.pick([0, 0.06, 0.1, 0.15]),
        inner: rng.range(0.15, 0.35), aspect: rng.pick(['4:5', '4:5', '1:1', '5:4', '2:3']),
      };
    },

    create(host) {
      const canvas = host.canvas;
      const ctx = canvas.getContext('2d');
      const img = document.createElement('canvas');
      const ictx = img.getContext('2d');
      const polar = document.createElement('canvas');
      const pctx = polar.getContext('2d');

      let sim = null, imageData = null, phases = null, gridR = null, rowR = null, psi = null, polarData = null, pcfg = null;
      let cap = 0, count = 0, first = 0, width = 0;
      const rot = { raw: 0, psi: 0, rate: null };
      let spin = 0;
      let raf = 0, done = false, coh = 0, nextDrawAt = 0;
      let dirtyLo = 0, dirtyHi = -1;

      function ensureImage(w, h) {
        if (img.width !== w || img.height !== h || !imageData) {
          img.width = w; img.height = h;
          imageData = ictx.createImageData(w, h);
        }
      }
      function markDirty(y) {
        if (dirtyHi < dirtyLo) { dirtyLo = dirtyHi = y; return; }
        if (y < dirtyLo) dirtyLo = y;
        if (y > dirtyHi) dirtyHi = y;
      }
      function flush() {
        if (dirtyHi < dirtyLo) return;
        ictx.putImageData(imageData, 0, 0, 0, dirtyLo, width, dirtyHi - dirtyLo + 1);
        dirtyLo = 0; dirtyHi = -1;
      }

      /* ---- space-time rows ---- */
      function appendRow(s, P) {
        const N = sim.n, slot = (first + count) % cap, off = slot * N;
        const th = sim.th;
        for (let i = 0; i < N; i++) {
          let v = th[i] % TAU;
          if (v < 0) v += TAU;
          phases[off + i] = v;
        }
        ringOrder(th, N, Math.max(1, Math.round(s.orderWin * N)), rowR);
        psi[slot] = meanPhase(N, rot);
        coh = coherentFraction(rowR);
        paintLine(P, phases, off, rowR, 0, imageData.data, slot * N * 4, slot, N, P.derot * psi[slot]);
        markDirty(slot);
        if (count < cap) count++;
        else first = (first + 1) % cap;
      }
      function repaintRows(P, s) {
        const N = sim.n, W = Math.max(1, Math.round(s.orderWin * N));
        for (let k = 0; k < count; k++) {
          const slot = (first + k) % cap, off = slot * N;
          ringOrder(phases.subarray(off, off + N), N, W, rowR);
          if (k === count - 1) coh = coherentFraction(rowR);
          paintLine(P, phases, off, rowR, 0, imageData.data, slot * N * 4, slot, N, P.derot * psi[slot]);
        }
        dirtyLo = 0; dirtyHi = cap - 1;
      }

      /* ---- grid ---- */
      function readGrid() {
        const S = sim.S, th = sim.th;
        gridOrder(th, S, GRID_ORDER_W, gridR);
        spin = meanPhase(S * S, rot);
        coh = coherentFraction(gridR);
        for (let i = 0; i < S * S; i++) {
          const v = th[i] % TAU;
          phases[i] = v < 0 ? v + TAU : v;
        }
      }
      function paintGrid(P) {
        const S = sim.S, sp = P.derot * spin;
        for (let y = 0; y < S; y++) paintLine(P, phases, y * S, gridR, y * S, imageData.data, y * S * 4, y, S, sp);
        dirtyLo = 0; dirtyHi = S - 1;
      }

      /* ---- painting to a destination context ---- */
      function paintTo(c, W, H, s) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = s.bg;
        c.fillRect(0, 0, W, H);
        if (s.view === 'grid') {
          c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
          c.drawImage(img, 0, 0, W, H);
        } else if (s.view === 'ring') {
          const k = Math.min(1, POLAR_RES / Math.max(W, H));
          const pw = Math.max(2, Math.round(W * k)), ph = Math.max(2, Math.round(H * k));
          renderPolar(pw, ph, s);
          c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
          c.drawImage(polar, 0, 0, W, H);
        } else {
          const rows = count || 1;
          const hh = Math.max(1, Math.round(H * Math.min(1, count / cap)));
          c.imageSmoothingEnabled = H / cap < 1.4;
          c.imageSmoothingQuality = 'high';
          const n1 = Math.min(rows, cap - first), n2 = rows - n1;
          const h1 = Math.round(hh * n1 / rows);
          c.drawImage(img, 0, first, width, n1, 0, 0, W, h1);
          if (n2 > 0) c.drawImage(img, 0, 0, width, n2, 0, h1, W, hh - h1);
        }
      }

      /* time as radius, oscillator index as angle: the space-time plot rolled into a disc */
      function renderPolar(W, H, s) {
        const N = sim.n, data = imageData.data;
        if (polar.width !== W || polar.height !== H || !polarData) {
          polar.width = W; polar.height = H;
          polarData = pctx.createImageData(W, H);
        }
        const od = polarData.data;
        const bg = U.hexToRgb(s.bg);
        const cx = W / 2, cy = H / 2, rad = Math.min(W, H) / 2 * 0.985;
        const inner = s.inner, span = 1 - inner, rows = Math.max(1, count);
        for (let y = 0; y < H; y++) {
          const dy = (y + 0.5 - cy) / rad;
          for (let x = 0; x < W; x++) {
            const dx = (x + 0.5 - cx) / rad;
            const o = (y * W + x) * 4;
            const rr = Math.sqrt(dx * dx + dy * dy);
            if (rr > 1 || rr < inner) {
              od[o] = bg[0]; od[o + 1] = bg[1]; od[o + 2] = bg[2]; od[o + 3] = 255;
              continue;
            }
            let k = Math.floor((rr - inner) / span * rows);
            if (k >= rows) k = rows - 1;
            let a = Math.atan2(dy, dx) / TAU;
            a -= Math.floor(a);
            let col = (a * N) | 0;
            if (col >= N) col = N - 1;
            const src = (((first + k) % cap) * N + col) * 4;
            od[o] = data[src]; od[o + 1] = data[src + 1]; od[o + 2] = data[src + 2]; od[o + 3] = 255;
          }
        }
        pctx.putImageData(polarData, 0, 0);
      }

      function status(s) {
        const n = s.view === 'grid' ? sim.S + '×' + sim.S : String(sim.n);
        host.setStatus('<span><b>' + n + '</b> oscillators</span>' +
          '<span>α ' + f3(s.alpha) + '</span>' +
          '<span>step ' + sim.steps + (done ? ' · settled' : '') + '</span>' +
          '<span>coherent ' + pct(coh) + '</span>');
      }

      function draw() {
        const s = host.getState();
        const t0 = performance.now();
        flush();
        paintTo(ctx, canvas.width, canvas.height, s);
        const ms = performance.now() - t0;   // heavy views (the polar disc) redraw less often
        nextDrawAt = performance.now() + Math.min(400, ms * 2);
        status(s);
      }

      /* run the simulation for up to budget ms, recording rows / counting steps */
      function advance(s, P, budget) {
        const t0 = performance.now();
        const spr = s.spr | 0;
        if (s.view === 'grid') {
          while (sim.steps < s.settle) {
            for (let k = 0; k < spr && sim.steps < s.settle; k++) sim.step();
            if (performance.now() - t0 > budget) break;
          }
          done = sim.steps >= s.settle;
          readGrid();
          paintGrid(P);
          return;
        }
        while (count < cap || s.whenFull === 'scroll') {
          for (let k = 0; k < spr; k++) sim.step();
          appendRow(s, P);
          if (performance.now() - t0 > budget) break;
        }
        done = count >= cap && s.whenFull === 'stop';
      }

      function frame() {
        raf = 0;
        const s = host.getState();
        advance(s, pcfg, FRAME_BUDGET_MS);
        if (done || performance.now() >= nextDrawAt) draw();
        if (!done && host.isActive()) raf = requestAnimationFrame(frame);
      }
      function loop() {
        cancelAnimationFrame(raf); raf = 0;
        if (!done) raf = requestAnimationFrame(frame);
      }

      return {
        aspect(s) { return s.view === 'grid' ? 1 : (ASPECTS[s.aspect] || 1); },

        regenerate() {
          cancelAnimationFrame(raf); raf = 0;
          const s = host.getState();
          sim = makeSim(s, U.makeRng(s.seed));
          done = false; coh = 0; spin = 0; rot.raw = 0; rot.psi = 0; rot.rate = null; dirtyLo = 0; dirtyHi = -1;
          if (s.view === 'grid') {
            width = sim.S;
            phases = new Float32Array(sim.n);
            gridR = new Float32Array(sim.n);
            rowR = null;
            ensureImage(sim.S, sim.S);
          } else {
            width = sim.n; cap = s.rows | 0; count = 0; first = 0;
            phases = new Float32Array(cap * sim.n);
            gridR = null;
            rowR = new Float32Array(sim.n);
            psi = new Float32Array(cap);
            ensureImage(sim.n, cap);
          }
          pcfg = paintCfg(s);
          advance(s, pcfg, host.reducedMotion() ? REDUCED_BUDGET_MS : FRAME_BUDGET_MS * 2);
          if (host.reducedMotion()) done = true;
          draw();
          loop();
        },

        repaint() {
          if (!sim) return;
          const s = host.getState();
          pcfg = paintCfg(s);
          if (s.view === 'grid') paintGrid(pcfg); else repaintRows(pcfg, s);
          draw();
        },

        resize() { if (sim) draw(); },
        pause() { cancelAnimationFrame(raf); raf = 0; },
        resume() { if (!raf && sim) loop(); },
        disturb(p) {
          if (!sim) return;
          const s = host.getState();
          if (s.view === 'grid') {
            const S = sim.S, cx = p.x * S, cy = p.yGL * S, R = 7;
            for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
              const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
              sim.th[y * S + x] += 1.6 * Math.exp(-d2 / (R * R));
            }
          } else {
            const n = sim.n, i0 = Math.round(p.x * (n - 1)), W = Math.max(6, n / 36);
            for (let k = -Math.ceil(W * 3); k <= W * 3; k++) {
              const j = ((i0 + k) % n + n) % n;
              sim.th[j] += 1.3 * Math.exp(-(k * k) / (W * W));
            }
          }
          done = false;
          this.repaint();
          loop();
        },

        exportPNG(w, h) {
          const s = host.getState();
          const out = document.createElement('canvas');
          out.width = w; out.height = h;
          flush();
          paintTo(out.getContext('2d'), w, h, s);
          return U.toBlob(out);
        },
      };
    },
  });
})();

