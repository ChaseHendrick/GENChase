// Fisher-KPP benchmarks for the fisher-kpp tab (src/modules/fisher-kpp.js).
//
//   node tools/fisher-kpp-science.js [--write] [--cpu-only]
//
// 1. Logistic growth: the real GPU module on a uniform field against the exact logistic solution; a halved
//    growth rate must fail.
// 2. Implementation: the real GPU step against an independent Float64 twin of the same scheme (9-point
//    Laplacian, forward Euler, exact logistic flow, arrival time and founder label) on a 512 x 512 plate.
// 3. Front speed in a stated asymptotic regime (Float64): a straight front of the tab's scheme, whose 9-point
//    stencil reduces exactly to the 3-point one on a field that does not vary along the front, measured over
//    t in [100, 200] and [200, 400] (units of 1/r) against Bramson's lag and the Ebert-van Saarloos term,
//    at three cell sizes with D dt/h² = 1/6 and for three (D, r) pairs. The bare minimal speed 2√(rD), with no
//    finite-time lag, must miss.
// 4. Refinement: the same windows at D dt/h² = 1/4 (where the stencil and Euler errors do not cancel) show the
//    error falling with h²; at 1/6 it is already below the unknown next asymptotic term.
// 5. The plate itself (GPU, production grid): the status-line front speed of three presets against the lag
//    band for straight and circular fronts, with the module's own h-and-2h grid effect.
// 6. Wrong diffusion sign: D -> -D in the Float64 scheme and on the GPU; the discrete maximum principle and the
//    front-speed criterion must both fail.
// Setup for the GPU parts: Playwright + Chromium per BUILDING.md (SwiftShader by default, tools/lib/gl-args.js).
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write'), CPU_ONLY = process.argv.includes('--cpu-only');
const failures = [];
const check = (ok, what) => { if (!ok) failures.push(what); return ok; };

/* ---------- Float64 straight front of the tab's scheme ---------- */
// The plate's 9-point update on a field constant along y is (4(e + w + 2c) + 2e + 2w - 20c)/6 = e + w - 2c,
// the 3-point Laplacian, so this line is the plate's scheme for a front along a grid axis. Zero-flux ends,
// the same one-cell antialiased edge as the tab's seeding (u = clamp((x0 - x)/h + 1/2, 0, 1)).
function straightFront({ h, mu, D, r, L = 1000, x0 = 10, tEnd, times, sign = 1 }) {
  const N = Math.round(L / h), dt = mu * h * h / D;
  let u = new Float64Array(N), v = new Float64Array(N);
  for (let i = 0; i < N; i++) u[i] = Math.min(1, Math.max(0, (x0 - (i + 0.5) * h) / h + 0.5));
  const gr = Math.exp(r * dt), m = sign * mu;
  const want = times.slice().sort((a, b) => a - b), X = {};
  let front = Math.ceil(x0 / h) + 2, bad = false, lo = 0, hi = 1;
  const steps = Math.round(tEnd / dt);
  const position = () => {
    // the first cell below 1/2, interpolated between cell centres
    for (let i = 1; i < N; i++) if (u[i] < 0.5 && u[i - 1] >= 0.5) return (i - 0.5) * h + h * (u[i - 1] - 0.5) / (u[i - 1] - u[i]);
    return NaN;
  };
  let k = 0;
  for (let n = 1; n <= steps; n++) {
    // cells beyond front + n are still exactly zero; update only the support
    const top = Math.min(N, front + n + 2);
    for (let i = 0; i < top; i++) {
      const l = i > 0 ? u[i - 1] : u[i], rr = i < N - 1 ? u[i + 1] : u[i];
      const ud = u[i] + m * (l + rr - 2 * u[i]);
      v[i] = ud * gr / (1 + ud * (gr - 1));
    }
    for (let i = top; i < N; i++) v[i] = u[i];
    const t = u; u = v; v = t;
    if (n % 64 === 0 || n === steps) {
      for (let i = 0; i < top; i++) { if (!Number.isFinite(u[i])) { bad = true; break; } lo = Math.min(lo, u[i]); hi = Math.max(hi, u[i]); }
      if (bad || lo < -1e-12 || hi > 1 + 1e-12) { bad = true; break; }
    }
    while (k < want.length && Math.abs(n * dt - want[k]) < dt / 2) { X[want[k]] = position(); k++; }
  }
  return { X, dt, steps, bad, lo, hi };
}
// Continuum straight front, D = r = 1 units: X(t) = 2t - (3/2) ln t + a - 3√π/√t + ... (Bramson 1978; Ebert and
// van Saarloos 2000, proved by Nolen, Roquejoffre and Ryzhik). Mean speed over [t1, t2] in units of D and r.
function straightSpeed(D, r, t1, t2) {
  const s = Math.sqrt(D / r), T1 = r * t1, T2 = r * t2;
  const xi = T => 2 * T - 1.5 * Math.log(T) - 3 * Math.sqrt(Math.PI) / Math.sqrt(T);
  return s * (xi(T2) - xi(T1)) / (t2 - t1);
}
function cpuPart() {
  const out = { windows: [], refinement: [], wrongSign: null };
  const W = [[100, 200], [200, 400]];
  // (D, r) pairs: the default, a slower-growing wider front (same 2√(rD) = 2, lag twice as long), a faster one
  for (const [D, r] of [[1, 1], [2, 0.5], [1, 2]]) {
    for (const h of [1, 0.5, 0.25]) {
      const hh = h * Math.sqrt(D / r);             // the same cells per decay length in every pair
      const tEnd = 400 / r, times = [100 / r, 200 / r, 400 / r];
      const res = straightFront({ h: hh, mu: 1 / 6, D, r, L: 1000 * Math.sqrt(D / r) + 50, tEnd, times });
      for (const [a, b] of W) {
        const t1 = a / r, t2 = b / r, c = (res.X[t2] - res.X[t1]) / (t2 - t1), cs = 2 * Math.sqrt(r * D), pred = straightSpeed(D, r, t1, t2);
        out.windows.push({ D, r, h: hh, cellsPerDecayLength: 1 / h, mu: '1/6', window: [t1, t2], measured: c, minimalSpeed: cs,
          bramsonEbertVanSaarloos: pred, errorVsAsymptotic: c - pred, errorVsBareMinimalSpeed: c - cs });
      }
    }
  }
  // Refinement at a fixed physical window [100, 200], D = r = 1, at D dt/h² = 1/4 (the stencil and Euler errors
  // add) and 1/6 (they cancel at leading order). The grid error is taken against the finest 1/6 run, which removes
  // the asymptotic remainder common to all of them.
  for (const mu of [0.25, 1 / 6]) for (const h of [1, 0.5, 0.25, 0.125]) {
    const res = straightFront({ h, mu, D: 1, r: 1, tEnd: 200, times: [100, 200] });
    const c = (res.X[200] - res.X[100]) / 100;
    out.refinement.push({ mu: mu === 0.25 ? '1/4' : '1/6', h, dt: res.dt, measured: c, errorVsAsymptotic: c - straightSpeed(1, 1, 100, 200) });
  }
  const ref = out.refinement.find(x => x.mu === '1/6' && x.h === 0.125).measured;
  for (const x of out.refinement) x.gridError = x.measured - ref;
  out.refinementOrders = {};
  for (const mu of ['1/4', '1/6']) {
    const rows = out.refinement.filter(x => x.mu === mu && !(mu === '1/6' && x.h === 0.125));
    out.refinementOrders[mu] = rows.slice(1).map((x, i) => Math.log2(Math.abs(rows[i].gridError) / Math.abs(x.gridError)));
  }
  // wrong diffusion sign: anti-diffusion. The grid-scale mode grows by 1 + 4 mu per step.
  const bad = straightFront({ h: 0.5, mu: 1 / 6, D: 1, r: 1, tEnd: 200, times: [100, 200], sign: -1 });
  const cBad = (bad.X[200] - bad.X[100]) / 100;
  out.wrongSign = { h: 0.5, mu: '1/6', maximumPrincipleHolds: !bad.bad, uRange: [bad.lo, bad.hi], measured: Number.isFinite(cBad) ? cBad : null,
    rejected: bad.bad || !(Math.abs(cBad - straightSpeed(1, 1, 100, 200)) < 2e-3) };
  return out;
}

/* ---------- Float64 twin of the 2D step (for the GPU implementation check) ---------- */
function twinStep(st, W, H, mu, rdt, t0, dt) {
  const out = new Float64Array(st.length);
  const at = (x, y) => (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y), e = at(x + 1, y), w = at(x - 1, y), n = at(x, y + 1), s = at(x, y - 1);
    const dg = st[at(x + 1, y + 1)] + st[at(x - 1, y + 1)] + st[at(x + 1, y - 1)] + st[at(x - 1, y - 1)];
    const ud = st[c] + mu * (4 * (st[e] + st[w] + st[n] + st[s]) + dg - 20 * st[c]) / 6;
    const gr = Math.exp(rdt * st[c + 3]);
    const un = ud * gr / (1 + ud * (gr - 1));
    let T = st[c + 1], lab = st[c + 2];
    if (T < 0 && un >= 0.5) {
      T = t0 + dt * Math.min(1, Math.max(0, (0.5 - st[c]) / Math.max(un - st[c], 1e-30)));
      let first = 1e30, most = -1, labU = -1;
      for (const q of [e, w, n, s]) {
        if (st[q + 1] >= 0 && st[q + 1] < first) { first = st[q + 1]; lab = st[q + 2]; }
        if (st[q + 2] >= 0 && st[q] > most) { most = st[q]; labU = st[q + 2]; }
      }
      if (first > 1e29) lab = labU;
    }
    out[c] = un; out[c + 1] = T; out[c + 2] = lab; out[c + 3] = st[c + 3];
  }
  return out;
}

/* ---------- the real module in Chromium ---------- */
async function gpuPart() {
  const { glArgs } = require('./lib/gl-args');
  const { chromium } = require('playwright');
  let source = fs.readFileSync(path.join(root, 'src/modules/fisher-kpp.js'), 'utf8');
  const marker = 'fieldCells() { return fine ? [fine.W, fine.H] : null; },';
  if (source.split(marker).length !== 2) throw Error('expected one fieldCells hook in fisher-kpp.js');
  // Test-only instrumentation: a handle on the module's own grid, step and measurement. Production code is unchanged.
  source = source.replace(marker, marker + `
        auditInternals() { return { gl, readRaw, stepGrid, step, measure, stop,
          get fine() { return fine; }, get coarse() { return coarse; }, get steps() { return steps; }, get total() { return total; },
          get dt() { return dt; }, get meas() { return meas; } }; },`);
  const browser = await chromium.launch({ args: glArgs() });
  const page = await browser.newPage();
  const out = {};
  try {
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/fisher-kpp-science');
    await page.evaluate(source);
    await page.evaluate(() => {
      window.__make = (over) => {
        const mod = Studio.modules['fisher-kpp'], pal = Studio.PALETTES.kiln;
        const state = Object.assign({}, mod.defaults, { palette: pal.colors, bg: pal.bg }, over || {});
        mod.sanitize(state);
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
        let status = '';
        const inst = mod.create({ canvas, getState: () => state, setStatus(h) { status = h; }, setWitness() {}, isActive: () => false,
          reducedMotion: () => true, requestRepaint() {}, fault(m) { throw Error(m); } });
        return { inst, state, I: inst.auditInternals(), status: () => status };
      };
      window.__renderer = () => { const g = document.createElement('canvas').getContext('webgl2'); const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); };
    });
    out.renderer = await page.evaluate(() => window.__renderer());

    // 1. logistic growth on a uniform field
    out.logistic = await page.evaluate(() => {
      const rows = [];
      for (const [label, rScale] of [['production', 1], ['control: growth rate halved', 0.5]]) {
        const { inst, state, I } = window.__make({ grid: 256, habitat: 'uniform', r: 1, D: 1 });
        inst.regenerate(); inst.pause();
        const W = I.fine.W, H = I.fine.H, u0 = 0.02, data = new Float32Array(W * H * 4);
        for (let i = 0; i < W * H; i++) { data[i * 4] = u0; data[i * 4 + 1] = -1; data[i * 4 + 2] = -1; data[i * 4 + 3] = 1; }
        I.fine.C.read.upload(data);
        state.r = rScale;
        const dt = I.dt; let maxErr = 0, maxSpread = 0; const samples = [];
        for (let k = 1; k <= 8; k++) {
          for (let n = 0; n < 60; n++) I.stepGrid(I.fine, (k - 1) * 60 + n, dt);
          const st = I.readRaw(I.gl, I.fine.C.read), t = k * 60 * dt;
          const exact = u0 * Math.exp(t) / (1 + u0 * (Math.exp(t) - 1));
          let lo = Infinity, hi = -Infinity, err = 0;
          for (let i = 0; i < W * H; i++) { const u = st[i * 4]; lo = Math.min(lo, u); hi = Math.max(hi, u); err = Math.max(err, Math.abs(u - exact)); }
          maxErr = Math.max(maxErr, err); maxSpread = Math.max(maxSpread, hi - lo);
          samples.push({ t, exact, measuredMin: lo, measuredMax: hi });
        }
        rows.push({ label, dt, steps: 480, maxAbsError: maxErr, maxSpatialSpread: maxSpread, samples });
      }
      return rows;
    });

    // 2. GPU step against the Float64 twin on a 512 x 512 plate with seven founders
    const start = await page.evaluate(() => {
      const requestedGrid = 512;
      const { inst, state, I } = window.__make({ grid: requestedGrid, founders: 7, radius: 3, habitat: 'uniform' });
      inst.regenerate(); inst.pause();
      if (I.fine.W !== requestedGrid || I.fine.H !== requestedGrid) {
        throw Error('Fisher-KPP twin grid mismatch: requested ' + requestedGrid + ' x ' + requestedGrid +
          ', got ' + I.fine.W + ' x ' + I.fine.H);
      }
      window.__twin = { inst, state, I };
      return { requestedGrid, W: I.fine.W, H: I.fine.H, h: I.fine.h, dt: I.dt, D: state.D, r: state.r, st: Array.from(I.readRaw(I.gl, I.fine.C.read)) };
    });
    let cpu = Float64Array.from(start.st);
    const mu = start.D * start.dt / (start.h * start.h), rdt = start.r * start.dt, N = 480;
    for (let k = 0; k < N; k++) cpu = twinStep(cpu, start.W, start.H, mu, rdt, k * start.dt, start.dt);
    const gpu = await page.evaluate((N) => {
      const { I } = window.__twin;
      for (let k = 0; k < N; k++) I.stepGrid(I.fine, k, I.dt);
      return Array.from(I.readRaw(I.gl, I.fine.C.read));
    }, N);
    {
      let du = 0, dT = [], labMis = 0, arrMis = 0, arrived = 0;
      for (let i = 0; i < start.W * start.H; i++) {
        du = Math.max(du, Math.abs(gpu[i * 4] - cpu[i * 4]));
        const a = gpu[i * 4 + 1], b = cpu[i * 4 + 1];
        if ((a >= 0) !== (b >= 0)) arrMis++;
        else if (a >= 0) { arrived++; dT.push(Math.abs(a - b)); if (gpu[i * 4 + 2] !== cpu[i * 4 + 2]) labMis++; }
      }
      dT.sort((x, y) => x - y);
      out.implementation = { requestedGrid: [start.requestedGrid, start.requestedGrid], grid: [start.W, start.H], h: start.h, dt: start.dt, mu, steps: N, time: N * start.dt,
        maxAbsDensityDifference: du, arrivedCells: arrived, arrivalStatusMismatches: arrMis,
        arrivalTimeDifference: { median: dT[Math.floor(dT.length / 2)], p999: dT[Math.floor(0.999 * (dT.length - 1))], max: dT[dT.length - 1] },
        labelMismatches: labMis };
    }

    // 5. the plate: three presets at production settings, the module's own measurement
    out.plate = [];
    for (const preset of ['rings', 'single', 'edge']) {
      const row = await page.evaluate(async (preset) => {
        const mod = Studio.modules['fisher-kpp'], p = mod.presets[preset].p;
        const { inst, state, I } = window.__make(p);
        inst.regenerate();
        while (I.steps < I.total) await new Promise(r => setTimeout(r, 250));
        await new Promise(r => setTimeout(r, 300));
        const m = I.meas, s = state, k = Math.sqrt(s.D / s.r) * m.a.invT;
        return { preset, grid: [I.fine.W, I.fine.H], h: I.fine.h, dt: I.dt, steps: I.steps, time: I.steps * I.dt, D: s.D, r: s.r, init: s.init,
          measured: m.a.speed, cells: m.a.n, meanArrival: m.a.tMean, meanInverseArrival: m.a.invT,
          halfResolution: m.b ? m.b.speed : null, gridEffect: m.b ? Math.abs(m.a.speed - m.b.speed) : null,
          minimalSpeed: 2 * Math.sqrt(s.r * s.D), lagStraight: 1.5 * k, lagCircular: 2 * k };
      }, preset);
      out.plate.push(row);
    }

    // 6. wrong diffusion sign on the GPU: the default recipe with D -> -D after seeding
    out.wrongSignGPU = await page.evaluate(async () => {
      const { inst, state, I } = window.__make({ grid: 256 });
      inst.regenerate(); inst.pause();
      state.D = -Math.abs(state.D);
      for (let k = 0; k < 400; k++) I.stepGrid(I.fine, k, I.dt);
      const st = I.readRaw(I.gl, I.fine.C.read);
      let lo = Infinity, hi = -Infinity, nonfinite = 0;
      for (let i = 0; i < st.length; i += 4) { const u = st[i]; if (!Number.isFinite(u)) nonfinite++; else { lo = Math.min(lo, u); hi = Math.max(hi, u); } }
      return { grid: [I.fine.W, I.fine.H], steps: 400, uRange: [lo, hi], nonfiniteCells: nonfinite,
        maximumPrincipleHolds: nonfinite === 0 && lo >= 0 && hi <= 1 };
    });
  } finally { await browser.close(); }
  return out;
}

(async () => {
  const t0 = Date.now();
  const cpu = cpuPart();
  // 3. at two or more cells per decay length: within the unknown next asymptotic term of Bramson + Ebert-van
  //    Saarloos (1.5e-3 of 2√(rD) on [100, 200]/r, 5e-4 on [200, 400]/r), shrinking with time; the bare minimal
  //    speed misses by more than three times that
  for (const w of cpu.windows) {
    const cs = 2 * Math.sqrt(w.D * w.r), late = w.window[0] * w.r >= 200, tol = (late ? 5e-4 : 1.5e-3) * cs / 2;
    w.tolerance = tol;
    w.accepted = w.cellsPerDecayLength >= 2 ? Math.abs(w.errorVsAsymptotic) < tol : null;
    w.bareMinimalSpeedRejected = Math.abs(w.errorVsBareMinimalSpeed) > 3 * tol;
    if (w.cellsPerDecayLength >= 2) {
      check(w.accepted, 'straight-front speed off the asymptotic value: ' + JSON.stringify(w));
      check(w.bareMinimalSpeedRejected, 'bare 2√(rD) not rejected for ' + JSON.stringify(w));
    }
  }
  // 4. second order at D dt/h² = 1/4, fourth order at 1/6 (where the cell sizes are large enough to see it)
  const o4 = cpu.refinementOrders['1/4'], o6 = cpu.refinementOrders['1/6'];
  check(o4.every(o => o > 1.8 && o < 2.3), 'refinement at D dt/h² = 1/4 is not second order: ' + o4);
  check(o6[0] > 3.5, 'refinement at D dt/h² = 1/6 is not fourth order between h = 1 and 1/2: ' + o6);
  check(cpu.wrongSign.rejected && !cpu.wrongSign.maximumPrincipleHolds, 'the wrong diffusion sign was not rejected on the Float64 scheme');
  let gpu = null;
  if (!CPU_ONLY) {
    gpu = await gpuPart();
    const [prod, ctrl] = gpu.logistic;
    // float32 bound: the growth factor exp(r dt) is rounded at about 1e-7 each step, which over 480 steps moves u(1 - u) by
    // at most 480 x 1.2e-7 x 1/4, about 1.4e-5. (A first run with a guessed 2e-6 failed at 4.1e-6; the criterion is this bound.)
    check(prod.maxAbsError < 2e-5 && prod.maxSpatialSpread < 1e-6, "logistic benchmark: " + JSON.stringify({ err: prod.maxAbsError, spread: prod.maxSpatialSpread }));
    check(ctrl.maxAbsError > 1e-2, 'halved growth rate not rejected by the logistic benchmark');
    const im = gpu.implementation;
    // the same float32 accounting: 480 steps of rounding at about 1.2e-7 each, worst case 5.7e-5 (a guessed 1e-5 failed at 1.6e-5 on the first run)
    check(im.maxAbsDensityDifference < 5.7e-5, 'GPU density differs from the Float64 twin by ' + im.maxAbsDensityDifference);
    check(im.arrivalStatusMismatches <= 2 && im.arrivalTimeDifference.p999 < 1e-3 && im.labelMismatches <= Math.ceil(1e-3 * im.arrivedCells), 'GPU arrival/label differ from the twin: ' + JSON.stringify(im));
    for (const p of gpu.plate) {
      const slack = 3e-3 + (p.gridEffect || 0);
      if (p.init === 'edge') {
        p.straightPrediction = p.minimalSpeed - p.lagStraight;
        // the Ebert-van Saarloos term, (3√π/2)(√D/r)⟨T^-3/2⟩, approximated with ⟨1/T⟩^3/2: recorded, not used in the criterion
        p.ebertVanSaarloosTermApprox = 1.5 * Math.sqrt(Math.PI) * Math.sqrt(p.D) / p.r * Math.pow(p.meanInverseArrival, 1.5);
        p.accepted = Math.abs(p.measured - p.straightPrediction) < slack;
      } else if (p.init === 'single') {
        p.circularPrediction = p.minimalSpeed - p.lagCircular;
        p.accepted = Math.abs(p.measured - p.circularPrediction) < slack;
      } else p.accepted = p.measured > p.minimalSpeed - p.lagCircular - slack && p.measured < p.minimalSpeed - p.lagStraight + slack;
      p.bareMinimalSpeedAccepted = Math.abs(p.measured - p.minimalSpeed) < slack;
      check(p.accepted && !p.bareMinimalSpeedAccepted, 'plate front speed outside its lag band: ' + JSON.stringify(p));
      check(p.gridEffect !== null && p.gridEffect < 0.01, 'grid effect too large on ' + p.preset);
    }
    check(!gpu.wrongSignGPU.maximumPrincipleHolds, 'the wrong diffusion sign was not rejected on the GPU');
  }
  const result = {
    scope: 'Fisher-KPP tab (src/modules/fisher-kpp.js): the logistic reaction step, the GPU implementation of the scheme, the straight-front speed of the scheme against the continuum asymptotics, refinement, the plate\'s own front-speed witness on three presets, and a wrong-diffusion-sign control.',
    command: 'node tools/fisher-kpp-science.js --write',
    reviewed: new Date().toISOString().slice(0, 10),
    references: {
      asymptotics: 'Straight front, D = r = 1: X(t) = 2t - (3/2) ln t + a - 3√π/√t + o(t^-1/2) (Bramson, Comm. Pure Appl. Math. 31, 531 (1978); Ebert and van Saarloos, Physica D 146, 1 (2000); the t^-1/2 term proved by Nolen, Roquejoffre and Ryzhik). Circular front in two dimensions: lag 2 ln t (Gärtner, Math. Nachr. 105, 317 (1982); Ducrot, Nonlinearity 28, 1043 (2015)). Checked in Berestycki, Brunet and Derrida, J. Phys. A 51, 035204 (2018), arXiv:1705.08416, eqs. (1) and (7).',
    },
    cpu, gpu,
    failures,
    seconds: Math.round((Date.now() - t0) / 1000),
  };
  if (WRITE) fs.writeFileSync(path.join(root, 'validation/results/fisher-kpp-science.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, (k, v) => (k === 'samples' ? undefined : v), 2));
  if (failures.length) { console.error('FAIL\n  ' + failures.join('\n  ')); process.exitCode = 1; }
  else console.log('PASS fisher-kpp-science');
})().catch(e => { console.error(e); process.exitCode = 1; });
