// Full coupled free-slip Boussinesq chain vs Float64 CPU twin and continuum linear rates.
// Below-onset decay only; not onset, turbulence, Nu, or default SOR-count certification.
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

const PI = Math.PI;
const Ra = 100, Pr = 1, EPS = 1e-3, TFIN = 0.08, ITERS = 24, WARM = 40;
const GAMMA = 2, KX = PI; // cos(KX * x) on width GAMMA
const nu = Math.sqrt(Pr / Ra), kappa = 1 / Math.sqrt(Ra * Pr);
const K2 = KX * KX + PI * PI;
const OUT = 'validation/results/convection-coupled-science.json';

function continuumAmps(t, Om0, Th0) {
  const a = -nu * K2, b = -KX, c = -KX / K2, d = -kappa * K2;
  const tr = a + d, det = a * d - b * c;
  const disc = Math.sqrt(Math.max(0, tr * tr - 4 * det));
  const l1 = 0.5 * (tr + disc), l2 = 0.5 * (tr - disc);
  const v1 = Math.abs(b) > 1e-14 ? [b, l1 - a] : [l1 - d, c];
  const v2 = Math.abs(b) > 1e-14 ? [b, l2 - a] : [l2 - d, c];
  const den = v1[0] * v2[1] - v2[0] * v1[1];
  const a1 = (Om0 * v2[1] - v2[0] * Th0) / den;
  const a2 = (v1[0] * Th0 - Om0 * v1[1]) / den;
  return {
    Om: a1 * v1[0] * Math.exp(l1 * t) + a2 * v2[0] * Math.exp(l2 * t),
    Th: a1 * v1[1] * Math.exp(l1 * t) + a2 * v2[1] * Math.exp(l2 * t),
    rates: [l1, l2],
  };
}

function wrapX(i, W) { i %= W; if (i < 0) i += W; return i; }

function gridOf(H) {
  const dx = 1 / (H - 1), W = GAMMA * (H - 1);
  return { H, W, dx };
}

function dtPlan(dx, finalTime, factor = 1) {
  const cap = 0.2 * dx * dx / Math.max(nu, kappa);
  const steps = Math.ceil(finalTime / (cap / factor));
  return { dt: finalTime / steps, steps, cap };
}

function seed(H, W, dx, T, om) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, yp = y * dx;
    let th = EPS * Math.sin(PI * yp) * Math.cos(KX * x * dx);
    if (y === 0 || y === H - 1) th = 0;
    T[i] = 1 - yp + th; om[i] = 0;
  }
}

function modeAmps(T, om, H, W, dx) {
  let thC = 0, omS = 0, nrm = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
    const yp = y * dx, xp = x * dx;
    const sy = Math.sin(PI * yp), cx = Math.cos(KX * xp), sx = Math.sin(KX * xp);
    const i = y * W + x;
    thC += (T[i] - (1 - yp)) * sy * cx;
    omS += om[i] * sy * sx;
    nrm += sy * sy * cx * cx;
  }
  return { Th: thC / nrm, Om: omS / nrm };
}

function maxAbsDiff(a, b) {
  let maxT = 0, maxOm = 0, nonfinite = false;
  for (let i = 0; i < a.length; i++) {
    if (![a[i], b[i]].every(Number.isFinite)) nonfinite = true;
    const d = Math.abs(a[i] - b[i]);
    if ((i & 1) === 0) maxT = Math.max(maxT, d); else maxOm = Math.max(maxOm, d);
  }
  return { maxT, maxOm, nonfinite };
}

// Interleaved [T,om,...] packing for field diffs.
function packTO(T, om) {
  const out = new Float64Array(T.length * 2);
  for (let i = 0; i < T.length; i++) { out[2 * i] = T[i]; out[2 * i + 1] = om[i]; }
  return out;
}

function makeCpu(H, iters) {
  const { W, dx } = gridOf(H), N = W * H;
  const T = new Float64Array(N), om = new Float64Array(N);
  const psi = new Float64Array(N), psi2 = new Float64Array(N);
  const u = new Float64Array(N), v = new Float64Array(N);
  const Ta = new Float64Array(N), oma = new Float64Array(N);
  const sorW = 0.95 * 2 / (1 + Math.sin(PI / H));

  function sampleF(arr, px, py) {
    const q = px - 0.5, r = py - 0.5;
    const ix = Math.floor(q), iy = Math.floor(r), fx = q - ix, fy = r - iy;
    const tap = (i, j) => arr[Math.min(H - 1, Math.max(0, j)) * W + wrapX(i, W)];
    const cubicRow = (j, f) => {
      const a = tap(ix - 1, j), b = tap(ix, j), c = tap(ix + 1, j), d = tap(ix + 2, j);
      return b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a)));
    };
    const r0 = cubicRow(iy - 1, fx), r1 = cubicRow(iy, fx), r2 = cubicRow(iy + 1, fx), r3 = cubicRow(iy + 2, fx);
    const val = r1 + 0.5 * fy * (r2 - r0 + fy * (2 * r0 - 5 * r1 + 4 * r2 - r3 + fy * (3 * (r1 - r2) + r3 - r0)));
    const b00 = tap(ix, iy), b10 = tap(ix + 1, iy), b01 = tap(ix, iy + 1), b11 = tap(ix + 1, iy + 1);
    const lo = Math.min(b00, b10, b01, b11), hi = Math.max(b00, b10, b01, b11);
    return Math.min(hi, Math.max(lo, val));
  }
  function sampleVel(px, py) {
    const q = px - 0.5, r = py - 0.5;
    const ix = Math.floor(q), iy = Math.floor(r), fx = q - ix, fy = r - iy;
    const tap = (arr, i, j) => arr[Math.min(H - 1, Math.max(0, j)) * W + wrapX(i, W)];
    const mix = (a, b, c, d) => (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    return {
      u: mix(tap(u, ix, iy), tap(u, ix + 1, iy), tap(u, ix, iy + 1), tap(u, ix + 1, iy + 1)),
      v: mix(tap(v, ix, iy), tap(v, ix + 1, iy), tap(v, ix, iy + 1), tap(v, ix + 1, iy + 1)),
    };
  }
  function solvePsi(nIter) {
    for (let it = 0; it < nIter; it++) for (let par = 0; par < 2; par++) {
      for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
        if (((x + y) & 1) !== par) continue;
        const i = y * W + x;
        const sum = psi[y * W + wrapX(x + 1, W)] + psi[y * W + wrapX(x - 1, W)]
          + psi[(y + 1) * W + x] + psi[(y - 1) * W + x];
        psi2[i] = psi[i] + sorW * (0.25 * (sum + dx * dx * om[i]) - psi[i]);
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (y === 0 || y === H - 1) psi2[i] = 0;
        else if (((x + y) & 1) !== par) psi2[i] = psi[i];
      }
      psi.set(psi2);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = psi[i];
      if (y === 0 || y === H - 1) {
        v[i] = 0;
        u[i] = y === 0 ? (psi[W + x] - p) / dx : (p - psi[(H - 2) * W + x]) / dx;
      } else {
        u[i] = (psi[(y + 1) * W + x] - psi[(y - 1) * W + x]) / (2 * dx);
        v[i] = -(psi[y * W + wrapX(x + 1, W)] - psi[y * W + wrapX(x - 1, W)]) / (2 * dx);
      }
    }
  }
  function step(dt, buoySign) {
    solvePsi(iters);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (y === 0 || y === H - 1) { Ta[i] = y === 0 ? 1 : 0; oma[i] = 0; continue; }
      const mid = sampleVel(x + 0.5 - 0.5 * dt * u[i] / dx, y + 0.5 - 0.5 * dt * v[i] / dx);
      const sx = x + 0.5 - dt * mid.u / dx, sy = y + 0.5 - dt * mid.v / dx;
      Ta[i] = sampleF(T, sx, sy); oma[i] = sampleF(om, sx, sy);
    }
    T.set(Ta); om.set(oma);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (y === 0 || y === H - 1) { Ta[i] = T[i]; oma[i] = om[i]; continue; }
      const eT = T[y * W + wrapX(x + 1, W)], wT = T[y * W + wrapX(x - 1, W)];
      const nT = T[(y + 1) * W + x], sT = T[(y - 1) * W + x];
      const eO = om[y * W + wrapX(x + 1, W)], wO = om[y * W + wrapX(x - 1, W)];
      const nO = om[(y + 1) * W + x], sO = om[(y - 1) * W + x];
      let Tn = T[i] + dt * kappa * (eT + wT + nT + sT - 4 * T[i]) / (dx * dx);
      if (Tn < 0) Tn = 0; else if (Tn > 1) Tn = 1;
      Ta[i] = Tn;
      oma[i] = om[i] + dt * (nu * (eO + wO + nO + sO - 4 * om[i]) / (dx * dx) + buoySign * (eT - wT) / (2 * dx));
    }
    T.set(Ta); om.set(oma);
  }
  return {
    W, H, dx,
    run(dt, steps, buoySign = 1) {
      seed(H, W, dx, T, om); psi.fill(0);
      solvePsi(Math.max(iters, WARM));
      for (let s = 0; s < steps; s++) step(dt, buoySign);
      return {
        T: Float64Array.from(T), om: Float64Array.from(om),
        amps: modeAmps(T, om, H, W, dx), packed: packTO(T, om),
      };
    },
  };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const cont = continuumAmps(TFIN, 0, EPS);
  const heights = [33, 65, 129];
  const spatialCpu = [];
  for (const H of heights) {
    const { dx, W } = gridOf(H);
    const { dt, steps } = dtPlan(dx, TFIN);
    const cpu = makeCpu(H, ITERS);
    const started = Date.now();
    const sol = cpu.run(dt, steps, 1);
    spatialCpu.push({
      height: H, width: W, dx, dt, steps, iters: ITERS,
      ms: Date.now() - started,
      amps: sol.amps,
      continuum: { Th: cont.Th, Om: cont.Om },
      errTh: Math.abs(sol.amps.Th - cont.Th),
      errOm: Math.abs(sol.amps.Om - cont.Om),
      packed: sol.packed,
    });
  }
  const spatialOrders = {
    Th: spatialCpu.slice(1).map((r, i) => Math.log2(spatialCpu[i].errTh / r.errTh)),
    Om: spatialCpu.slice(1).map((r, i) => Math.log2(spatialCpu[i].errOm / r.errOm)),
  };

  // Temporal self-convergence on H=65 against a fine-dt Float64 twin.
  const Ht = 65, { dx: dxt, W: Wt } = gridOf(Ht);
  const cpuT = makeCpu(Ht, ITERS);
  const fineFactor = 8;
  const finePlan = dtPlan(dxt, TFIN, fineFactor);
  const ref = cpuT.run(finePlan.dt, finePlan.steps, 1);
  const temporal = [1, 2, 4].map(factor => {
    const plan = dtPlan(dxt, TFIN, factor);
    const started = Date.now();
    const sol = cpuT.run(plan.dt, plan.steps, 1);
    const diff = maxAbsDiff(sol.packed, ref.packed);
    return {
      height: Ht, width: Wt, dx: dxt, dt: plan.dt, steps: plan.steps, factor,
      ms: Date.now() - started, maxT: diff.maxT, maxOm: diff.maxOm, nonfinite: diff.nonfinite,
      amps: sol.amps,
    };
  });
  const temporalOrders = {
    T: temporal.slice(1).map((r, i) => Math.log2(temporal[i].maxT / r.maxT)),
    Om: temporal.slice(1).map((r, i) => Math.log2(temporal[i].maxOm / r.maxOm)),
  };

  // Failure: wrong buoyancy on CPU twin (same check applied to GPU below).
  const badPlan = dtPlan(dxt, TFIN);
  const badCpu = cpuT.run(badPlan.dt, badPlan.steps, -1);
  const badVsCont = {
    errTh: Math.abs(badCpu.amps.Th - cont.Th),
    errOm: Math.abs(badCpu.amps.Om - cont.Om),
  };
  const halfPlan = { dt: badPlan.dt, steps: Math.max(1, Math.floor(badPlan.steps / 2)) };
  const halfCpu = cpuT.run(halfPlan.dt, halfPlan.steps, 1);
  const halfVsCont = {
    errTh: Math.abs(halfCpu.amps.Th - cont.Th),
    errOm: Math.abs(halfCpu.amps.Om - cont.Om),
    elapsed: halfPlan.dt * halfPlan.steps,
  };

  // GPU coupled chain (same operators / sweep count / free-slip).
  let source = fs.readFileSync(path.join(root, 'src/modules/wavesflow.js'), 'utf8');
  assert(source.includes('function convectionCreate'), 'convectionCreate missing');
  const expose = source.slice(0, source.lastIndexOf('})();'))
    + 'window.convScience={CONV_ADV_FS,CONV_DIFF_FS,CONV_SOR_FS,CONV_VEL_FS};})();';
  const browser = await chromium.launch({ args: glArgs() });
  let gpu;
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/convection-coupled-science');
    await page.evaluate(expose);
    gpu = await page.evaluate(({ heights, Ra, Pr, EPS, TFIN, ITERS, WARM, GAMMA, KX, nu, kappa, badSteps }) => {
      const G = Studio.gl, sh = window.convScience, gl = G.createGL(document.createElement('canvas'));
      if (!gl || !gl.floatExt) throw Error('Coupled convection benchmark requires float32');
      const opts = { type: 'rgba32f', filter: 'nearest', wrap: 'repeat' };
      const wrongDiffSrc = sh.CONV_DIFF_FS.replace('u_nu * lap.y + Tx', 'u_nu * lap.y - Tx');
      if (wrongDiffSrc === sh.CONV_DIFF_FS) throw Error('Buoyancy failure-control marker missing');
      const adv = new G.Pass(gl, sh.CONV_ADV_FS), diff = new G.Pass(gl, sh.CONV_DIFF_FS);
      const wrongDiff = new G.Pass(gl, wrongDiffSrc);
      const sor = new G.Pass(gl, sh.CONV_SOR_FS), vel = new G.Pass(gl, sh.CONV_VEL_FS);

      function runCase(H, dt, steps, buoySign, returnField) {
        const dx = 1 / (H - 1), W = GAMMA * (H - 1);
        const data = new Float32Array(W * H * 4);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = 4 * (y * W + x), yp = y * dx;
          let th = EPS * Math.sin(Math.PI * yp) * Math.cos(KX * x * dx);
          if (y === 0 || y === H - 1) th = 0;
          data[i] = 1 - yp + th; data[i + 3] = 1;
        }
        let F = new G.Target(gl, W, H, { ...opts, data }), F2 = new G.Target(gl, W, H, opts);
        let PSI = new G.Target(gl, W, H, opts), PSI2 = new G.Target(gl, W, H, opts);
        const VEL = new G.Target(gl, W, H, opts);
        PSI.clear(0, 0, 0, 1); PSI2.clear(0, 0, 0, 1); VEL.clear(0, 0, 0, 1);
        const sorW = 0.95 * 2 / (1 + Math.sin(Math.PI / H));
        const diffPass = buoySign < 0 ? wrongDiff : diff;
        const solvePsi = n => {
          for (let i = 0; i < n; i++) for (const par of [0, 1]) {
            sor.draw(PSI2, { u_psi: PSI, u_f: F, u_res: [W, H], u_dx: dx, u_omega: sorW, u_parity: { int: par } });
            [PSI, PSI2] = [PSI2, PSI];
          }
          vel.draw(VEL, { u_psi: PSI, u_res: [W, H], u_dx: dx, u_wall: { int: 1 } });
        };
        solvePsi(WARM);
        for (let s = 0; s < steps; s++) {
          solvePsi(ITERS);
          adv.draw(F2, { u_f: F, u_vel: VEL, u_res: [W, H], u_dt: dt, u_dx: dx, u_wall: { int: 1 } });
          [F, F2] = [F2, F];
          diffPass.draw(F2, { u_f: F, u_res: [W, H], u_dt: dt, u_kappa: kappa, u_nu: nu, u_dx: dx });
          [F, F2] = [F2, F];
        }
        const px = new Float32Array(W * H * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, F.fbo);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px);
        if (gl.getError() !== gl.NO_ERROR) throw Error('GPU readback failed');
        let thC = 0, omS = 0, nrm = 0, nonfinite = false;
        const packed = returnField ? new Float64Array(W * H * 2) : null;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, k = 4 * i, yp = y * dx;
          if (![px[k], px[k + 1]].every(Number.isFinite)) nonfinite = true;
          if (packed) { packed[2 * i] = px[k]; packed[2 * i + 1] = px[k + 1]; }
          if (y > 0 && y < H - 1) {
            const sy = Math.sin(Math.PI * yp), cx = Math.cos(KX * x * dx), sx = Math.sin(KX * x * dx);
            thC += (px[k] - (1 - yp)) * sy * cx;
            omS += px[k + 1] * sy * sx;
            nrm += sy * sy * cx * cx;
          }
        }
        for (const t of [F, F2, PSI, PSI2, VEL]) t.dispose();
        return {
          height: H, width: W, dx, dt, steps,
          amps: { Th: thC / nrm, Om: omS / nrm }, nonfinite,
          packed: packed ? Array.from(packed) : null,
        };
      }

      const spatial = [];
      for (const H of heights) {
        const dx = 1 / (H - 1);
        const cap = 0.2 * dx * dx / Math.max(nu, kappa);
        const steps = Math.ceil(TFIN / cap), dt = TFIN / steps;
        // Full fields only on the two coarser grids (CPU twin comparison).
        spatial.push(runCase(H, dt, steps, 1, H <= 65));
      }
      const H = 65, dx = 1 / (H - 1);
      const cap = 0.2 * dx * dx / Math.max(nu, kappa);
      const steps = Math.ceil(TFIN / cap), dt = TFIN / steps;
      const wrongBuoy = runCase(H, dt, steps, -1, false);
      const halfTime = runCase(H, dt, badSteps, 1, false);
      // False "refinement": hold cell count growth but shrink physical width with H (W=H-1).
      const falseDomain = [];
      for (const H of [33, 65]) {
        const dx = 1 / (H - 1), W = H - 1; // physical width -> 1, not GAMMA=2
        const cap = 0.2 * dx * dx / Math.max(nu, kappa);
        const steps = Math.ceil(TFIN / cap), dt = TFIN / steps;
        const data = new Float32Array(W * H * 4);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = 4 * (y * W + x), yp = y * dx;
          let th = EPS * Math.sin(Math.PI * yp) * Math.cos(KX * x * dx);
          if (y === 0 || y === H - 1) th = 0;
          data[i] = 1 - yp + th; data[i + 3] = 1;
        }
        let F = new G.Target(gl, W, H, { ...opts, data }), F2 = new G.Target(gl, W, H, opts);
        let PSI = new G.Target(gl, W, H, opts), PSI2 = new G.Target(gl, W, H, opts);
        const VEL = new G.Target(gl, W, H, opts);
        PSI.clear(0, 0, 0, 1); PSI2.clear(0, 0, 0, 1); VEL.clear(0, 0, 0, 1);
        const sorW = 0.95 * 2 / (1 + Math.sin(Math.PI / H));
        const solvePsi = n => {
          for (let i = 0; i < n; i++) for (const par of [0, 1]) {
            sor.draw(PSI2, { u_psi: PSI, u_f: F, u_res: [W, H], u_dx: dx, u_omega: sorW, u_parity: { int: par } });
            [PSI, PSI2] = [PSI2, PSI];
          }
          vel.draw(VEL, { u_psi: PSI, u_res: [W, H], u_dx: dx, u_wall: { int: 1 } });
        };
        solvePsi(WARM);
        for (let s = 0; s < steps; s++) {
          solvePsi(ITERS);
          adv.draw(F2, { u_f: F, u_vel: VEL, u_res: [W, H], u_dt: dt, u_dx: dx, u_wall: { int: 1 } });
          [F, F2] = [F2, F];
          diff.draw(F2, { u_f: F, u_res: [W, H], u_dt: dt, u_kappa: kappa, u_nu: nu, u_dx: dx });
          [F, F2] = [F2, F];
        }
        const px = new Float32Array(W * H * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, F.fbo);
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, px);
        let thC = 0, omS = 0, nrm = 0;
        for (let y = 1; y < H - 1; y++) for (let x = 0; x < W; x++) {
          const yp = y * dx, sy = Math.sin(Math.PI * yp), cx = Math.cos(KX * x * dx), sx = Math.sin(KX * x * dx);
          const i = 4 * (y * W + x);
          thC += (px[i] - (1 - yp)) * sy * cx; omS += px[i + 1] * sy * sx; nrm += sy * sy * cx * cx;
        }
        for (const t of [F, F2, PSI, PSI2, VEL]) t.dispose();
        falseDomain.push({
          height: H, width: W, physicalWidth: (W) * dx, dx, dt, steps,
          amps: { Th: thC / nrm, Om: omS / nrm },
        });
      }
      for (const p of [adv, diff, wrongDiff, sor, vel]) gl.deleteProgram(p.prog);
      return { spatial, wrongBuoy, halfTime, falseDomain };
    }, {
      heights, Ra, Pr, EPS, TFIN, ITERS, WARM, GAMMA, KX, nu, kappa,
      badSteps: halfPlan.steps,
    });
  } finally { await browser.close(); }

  const gpuVsCpu = gpu.spatial.map((g, i) => {
    const c = spatialCpu[i];
    const row = {
      height: g.height, width: g.width, dx: g.dx, dt: g.dt, steps: g.steps,
      gpuAmps: g.amps, cpuAmps: c.amps,
      ampErrTh: Math.abs(g.amps.Th - c.amps.Th),
      ampErrOm: Math.abs(g.amps.Om - c.amps.Om),
      nonfinite: g.nonfinite,
      continuumErrTh: Math.abs(g.amps.Th - cont.Th),
      continuumErrOm: Math.abs(g.amps.Om - cont.Om),
    };
    if (g.packed) {
      const diff = maxAbsDiff(Float64Array.from(g.packed), c.packed);
      row.maxFieldT = diff.maxT;
      row.maxFieldOm = diff.maxOm;
      row.fieldNonfinite = diff.nonfinite;
    }
    return row;
  });
  const gpuSpatialOrders = {
    Th: gpuVsCpu.slice(1).map((r, i) => Math.log2(gpuVsCpu[i].continuumErrTh / r.continuumErrTh)),
    Om: gpuVsCpu.slice(1).map((r, i) => Math.log2(gpuVsCpu[i].continuumErrOm / r.continuumErrOm)),
  };

  const wrongGpu = {
    errTh: Math.abs(gpu.wrongBuoy.amps.Th - cont.Th),
    errOm: Math.abs(gpu.wrongBuoy.amps.Om - cont.Om),
    amps: gpu.wrongBuoy.amps,
  };
  const halfGpu = {
    errTh: Math.abs(gpu.halfTime.amps.Th - cont.Th),
    errOm: Math.abs(gpu.halfTime.amps.Om - cont.Om),
    amps: gpu.halfTime.amps,
    steps: gpu.halfTime.steps,
  };
  const falseDomain = gpu.falseDomain.map(r => ({
    ...r,
    continuumErrTh: Math.abs(r.amps.Th - cont.Th),
    continuumErrOm: Math.abs(r.amps.Om - cont.Om),
  }));
  // Pretend fixed-domain refinement: errors must not drop like a true order-2 study.
  const falseOrderOm = Math.log2(falseDomain[0].continuumErrOm / falseDomain[1].continuumErrOm);

  // Assertions
  for (const row of gpuVsCpu) {
    assert(!row.nonfinite, 'GPU field became nonfinite');
    assert(row.ampErrTh < 3e-6, 'GPU/CPU temperature amplitude mismatch');
    assert(row.ampErrOm < 1e-6, 'GPU/CPU vorticity amplitude mismatch');
    if (row.maxFieldT !== undefined) {
      assert(!row.fieldNonfinite, 'Field comparison nonfinite');
      assert(row.maxFieldT < 5e-6, 'GPU/CPU temperature field mismatch');
      assert(row.maxFieldOm < 5e-6, 'GPU/CPU vorticity field mismatch');
    }
  }
  for (const row of temporal) assert(!row.nonfinite && Number.isFinite(row.maxT) && Number.isFinite(row.maxOm));
  // Spatial: vorticity vs continuum is cleanly ~2; temperature order is reduced by SL/FE coupling.
  // Spatial orders are taken from the Float64 CPU twin vs continuum; GPU float32
  // continuum residuals do not refine cleanly once they near ~1e-7.
  assert(spatialOrders.Om.every(p => p > 1.5 && p < 2.5), 'Spatial vorticity order outside honest band');
  assert(spatialOrders.Th.every(p => p > 0.8 && p < 2.5), 'Spatial temperature order outside honest band');
  assert(spatialCpu.at(-1).errOm < 5e-8, 'Finest CPU continuum vorticity error too large');
  assert(gpuVsCpu.every(r => r.continuumErrOm < 1e-6), 'GPU continuum vorticity residual absurd');
  // Temporal FE+SL band: roughly first-order, occasionally higher when asymptotic not yet reached.
  assert(temporalOrders.T.every(p => p > 0.9 && p < 2.2), 'Temporal temperature order outside honest band');
  assert(temporalOrders.Om.every(p => p > 0.9 && p < 2.2), 'Temporal vorticity order outside honest band');
  assert(temporal.at(-1).maxOm < 5e-8, 'Finest temporal self-error too large');

  // Failure controls must be loud.
  const fineCpuOmErr = spatialCpu[1].errOm;
  assert(wrongGpu.errOm > 100 * fineCpuOmErr, 'Negated buoyancy was not detected');
  assert(badVsCont.errOm > 100 * fineCpuOmErr, 'CPU negated-buoyancy control failed');
  assert(halfGpu.errOm > 5 * fineCpuOmErr, 'Half-time control was not detected');
  assert(halfVsCont.errOm > 5 * fineCpuOmErr, 'CPU half-time control failed');
  assert(!(falseOrderOm > 1.5 && falseOrderOm < 2.5), 'False domain-length change looked like honest order-2 refinement');
  assert(falseDomain.every(r => r.continuumErrOm > 10 * fineCpuOmErr), 'False-domain fixture unexpectedly matched continuum');

  const result = {
    scope: 'Full coupled free-slip Boussinesq chain (solvePsi -> CONV_ADV_FS -> CONV_DIFF_FS) on a fixed physical box Gamma=2x1, Pr=1, Ra=100<<Ra_c, small multimodal seed decaying to T_final=0.08. Float64 CPU twin of the discrete operators plus continuum linear free-fall rates. Float32 GPU. Not onset, turbulence, Nu, no-slip, float16, or default four-sweep Poisson certification.',
    parameters: {
      Ra, Pr, nu, kappa, gamma: GAMMA, epsilon: EPS, finalTime: TFIN,
      wall: 'free-slip', mode: 'sin(pi y) cos(pi x)', itersPerStep: ITERS, warmSweeps: WARM,
      continuumRates: cont.rates, continuumAmps: { Th: cont.Th, Om: cont.Om },
      note: 'W=GAMMA*(H-1) matches the existing fixed-domain diffusion fixture (periodic width 2).',
    },
    spatial: spatialCpu.map(({ packed, ...rest }) => rest),
    spatialOrders,
    gpuVsCpu: gpuVsCpu.map(({ packed, ...rest }) => rest),
    gpuSpatialOrders,
    temporal: temporal.map(({ packed, ...rest }) => rest),
    temporalOrders,
    temporalReference: { height: Ht, dt: finePlan.dt, steps: finePlan.steps, factor: fineFactor },
    failureControl: {
      negatedBuoyancy: {
        description: 'GPU (and CPU twin) replace +Tx with -Tx in CONV_DIFF_FS',
        gpu: wrongGpu, cpu: badVsCont,
        marginOverHonestOmErr: wrongGpu.errOm / fineCpuOmErr,
      },
      halfElapsedTime: {
        description: 'Evolve only floor(steps/2) at the same dt; compare to full-time continuum amplitudes',
        gpu: halfGpu, cpu: halfVsCont,
        marginOverHonestOmErr: halfGpu.errOm / fineCpuOmErr,
      },
      falseDomainRefinement: {
        description: 'Refine H while setting W=H-1 so physical width shrinks from 2 toward 1; reject if Om error shows order-2-like decay vs continuum of the Gamma=2 mode',
        rows: falseDomain,
        observedOrderOm: falseOrderOm,
        rejectedAsHonestOrder2: !(falseOrderOm > 1.5 && falseOrderOm < 2.5),
      },
    },
    limitations: [
      'Below-onset free-slip decay of one small mode; nonlinear onset, no-slip plates, high Ra and turbulent Nu are out of scope.',
      'SOR uses 24 sweeps per step (plus 40 warm); this does not certify the production default of four.',
      'Temperature spatial order vs continuum is reduced relative to vorticity by semi-Lagrangian advection and forward-Euler diffusion. Reported spatialOrders are Float64 CPU twin vs continuum; gpuSpatialOrders are diagnostic only.',
      'Temporal orders are self-convergence against a fine-dt Float64 twin at fixed H=65, not continuum rates.',
      'Float32 GPU only; half precision and print rendering are not covered. GPU/CPU amplitude drift grows with step count (float32 vs float64).',
    ],
  };

  fs.writeFileSync(path.join(root, OUT), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
