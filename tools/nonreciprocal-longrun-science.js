// node tools/nonreciprocal-longrun-science.js [--write]
// Float64 twin of the discrete operators: long-duration exact plane-wave tracking,
// multi-parameter / resolution bands, and deliberate long-run failure controls.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/nonreciprocal.js'), 'utf8');
const TAU = 2 * Math.PI;
const at = (x, y, W, H) => 4 * (((y + H) % H) * W + ((x + W) % W));

function rhsInto(z, p, mu, out) {
  const { W, H, dx, K, a0, a1 } = p;
  const lap = (a, x, y, c) => (a[at(x + 1, y, W, H) + c] + a[at(x - 1, y, W, H) + c] +
    a[at(x, y + 1, W, H) + c] + a[at(x, y - 1, W, H) + c] - 4 * a[at(x, y, W, H) + c]) / (dx * dx);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = at(x, y, W, H), r = z[k], i = z[k + 1], r2 = r * r + i * i;
    mu[k] = -r + r2 * r - a0 * i + a1 * r2 * i - K * lap(z, x, y, 0);
    mu[k + 1] = -i + r2 * i + a0 * r - a1 * r2 * r - K * lap(z, x, y, 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = at(x, y, W, H); out[k] = lap(mu, x, y, 0); out[k + 1] = lap(mu, x, y, 1);
  }
  return out;
}

function heunEvolve(z0, p, dt, steps) {
  const n = z0.length;
  let z = Float64Array.from(z0), stage = new Float64Array(n);
  const mu = new Float64Array(n), a = new Float64Array(n), b = new Float64Array(n);
  let blewAt = null;
  for (let s = 0; s < steps; s++) {
    rhsInto(z, p, mu, a);
    for (let i = 0; i < n; i++) stage[i] = z[i] + dt * a[i];
    rhsInto(stage, p, mu, b);
    for (let i = 0; i < n; i++) {
      const v = z[i] + dt * (a[i] + b[i]) / 2;
      if (!Number.isFinite(v)) { blewAt = s; break; }
      stage[i] = v;
    }
    if (blewAt !== null) return { values: stage, blewAt, finite: false };
    const tmp = z; z = stage; stage = tmp;
  }
  return { values: z, blewAt: null, finite: true };
}

function discreteQ(p, mx, my) {
  return 4 * (Math.sin(Math.PI * mx / p.W) ** 2 + Math.sin(Math.PI * my / p.H) ** 2) / (p.dx * p.dx);
}

function plane(p, mx, my, time = 0, opts = {}) {
  const q = discreteQ(p, mx, my);
  const Kuse = opts.Kdisp == null ? p.K : opts.Kdisp;
  const amp2 = 1 - Kuse * q;
  assert(amp2 > 0, 'plane-wave amplitude must exist');
  const amplitude = Math.sqrt(amp2);
  const omega = (opts.omegaSign == null ? 1 : opts.omegaSign) * q * (p.a0 - p.a1 * amp2);
  const z = new Float64Array(p.W * p.H * 4);
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
    const k = at(x, y, p.W, p.H), phase = TAU * (mx * x / p.W + my * y / p.H) + 0.31 - omega * time;
    z[k] = amplitude * Math.cos(phase); z[k + 1] = amplitude * Math.sin(phase); z[k + 3] = 1;
  }
  return { values: z, q, amplitude, omega, amp2 };
}

function measure(got, expected, initial) {
  let max = 0, sum = 0, ampMax = 0, cells = 0;
  const mean = [0, 0], meanDrift = [0, 0];
  for (let i = 0; i < got.length; i += 4) {
    cells++;
    for (let c = 0; c < 2; c++) {
      const d = got[i + c] - expected[i + c];
      max = Math.max(max, Math.abs(d)); sum += d * d;
      mean[c] += got[i + c];
      meanDrift[c] += got[i + c] - initial[i + c];
    }
    ampMax = Math.max(ampMax, Math.abs(Math.hypot(got[i], got[i + 1]) - Math.hypot(expected[i], expected[i + 1])));
  }
  mean[0] /= cells; mean[1] /= cells;
  meanDrift[0] /= cells; meanDrift[1] /= cells;
  return {
    error: { max, rms: Math.sqrt(sum / (cells * 2)) },
    amplitudeErrorMax: ampMax,
    mean, meanDrift,
    meanAbsMax: Math.max(Math.abs(mean[0]), Math.abs(mean[1])),
    meanDriftAbsMax: Math.max(Math.abs(meanDrift[0]), Math.abs(meanDrift[1])),
  };
}

function runCase(name, p, mx, my, T, dt, tolerance) {
  const start = plane(p, mx, my, 0);
  const end = plane(p, mx, my, T);
  const steps = Math.round(T / dt);
  assert(Math.abs(steps * dt - T) < 1e-12, name + ' T/dt must be integer steps');
  const evolved = heunEvolve(start.values, p, dt, steps);
  assert(evolved.finite, name + ' must remain finite');
  const m = measure(evolved.values, end.values, start.values);
  return {
    name, grid: [p.W, p.H], parameters: { ...p }, mode: [mx, my], time: T, dt, steps,
    q: start.q, amplitude: start.amplitude, omega: start.omega, tolerance,
    ...m,
  };
}

const FIELD_TOL = 1e-5;
const MEAN_TOL = 1e-9;
const AMP_TOL = 1e-5;

// --- Longer-duration exact discrete plane-wave tracking ---
const longRuns = [
  runCase('long-T5-mode21', { W: 32, H: 24, dx: 1, K: 1, a0: 3, a1: 1 }, 2, 1, 5, 0.001, FIELD_TOL),
  runCase('long-T10-mode32', { W: 32, H: 32, dx: 1, K: 0.5, a0: -1, a1: 0.7 }, 3, 2, 10, 0.0005, FIELD_TOL),
  runCase('long-T20-mode12', { W: 48, H: 48, dx: 1, K: 0.8, a0: 2.2, a1: 0.5 }, 1, 2, 20, 0.002, FIELD_TOL),
  runCase('long-T10-mode22', { W: 40, H: 40, dx: 1, K: 0.4, a0: -0.5, a1: 1.2 }, 2, 2, 10, 0.001, FIELD_TOL),
  runCase('long-T8-mode21', { W: 64, H: 32, dx: 0.75, K: 1.5, a0: 1, a1: -1 }, 2, 1, 8, 0.001, FIELD_TOL),
];
for (const row of longRuns) {
  assert(row.error.max < row.tolerance, row.name + ' max ' + row.error.max);
  assert(row.amplitudeErrorMax < AMP_TOL, row.name + ' amplitude');
  assert(row.meanAbsMax < MEAN_TOL, row.name + ' mean');
  assert(row.meanDriftAbsMax < MEAN_TOL, row.name + ' mean drift');
}

// --- Multi-parameter matrix at fixed grid / mode / duration ---
const matrixBase = { W: 32, H: 32, dx: 1 }, matrixMode = [2, 1], matrixT = 5, matrixDt = 0.001;
const matrixParams = [
  { K: 0.6, a0: 1.5, a1: 0.4 },
  { K: 0.6, a0: -1.2, a1: 0.9 },
  { K: 0.6, a0: 2.0, a1: -0.5 },
  { K: 1.0, a0: 1.5, a1: 0.4 },
  { K: 1.0, a0: -1.2, a1: 0.9 },
  { K: 1.0, a0: 2.0, a1: -0.5 },
  { K: 1.2, a0: 0.8, a1: 0.3 },
  { K: 1.2, a0: -0.7, a1: 1.1 },
  { K: 1.2, a0: 1.1, a1: -0.8 },
];
const parameterMatrix = [];
for (const [i, params] of matrixParams.entries()) {
  const p = { ...matrixBase, ...params };
  const q = discreteQ(p, ...matrixMode);
  assert(1 - p.K * q > 0.05, 'matrix amplitude margin');
  const row = runCase('matrix-' + i, p, matrixMode[0], matrixMode[1], matrixT, matrixDt, FIELD_TOL);
  assert(row.error.max < FIELD_TOL, row.name);
  assert(row.meanAbsMax < MEAN_TOL, row.name + ' mean');
  parameterMatrix.push(row);
}

// --- Refined grid on fixed physical 32×32 box, discrete modal reference ---
const resolution = [];
for (const N of [32, 64]) {
  const p = { W: N, H: N, dx: 32 / N, K: 1, a0: 2, a1: 0.5 };
  const row = runCase('resolution-' + N, p, 2, 1, 5, 0.0005, FIELD_TOL);
  assert(row.error.max < FIELD_TOL, row.name);
  assert(row.meanAbsMax < MEAN_TOL, row.name + ' mean');
  resolution.push(row);
}
// Both refined grids stay inside the same absolute band; order may not improve because the
// reference is the exact discrete mode (spatial truncation is already in the reference).
const resolutionBand = {
  physicalDomain: [32, 32],
  time: 5,
  dt: 0.0005,
  note: 'Errors stay within the stated absolute band; order need not improve vs exact discrete modal reference.',
  maxErrors: resolution.map(r => r.error.max),
};

// --- Failure controls (deliberate wrong long-run claims) ---
const failP = { W: 32, H: 24, dx: 1, K: 1, a0: 3, a1: 1 }, failMx = 2, failMy = 1, failT = 5, failDt = 0.001;
const failStart = plane(failP, failMx, failMy, 0);
const failGood = heunEvolve(failStart.values, failP, failDt, Math.round(failT / failDt));
assert(failGood.finite);
const against = (expected) => measure(failGood.values, expected.values, failStart.values);

const wrongOmega = against(plane(failP, failMx, failMy, failT, { omegaSign: -1 }));
assert(wrongOmega.error.max > 0.1, 'wrong omega sign must fail long-run claim');

const wrongK = against(plane(failP, failMx, failMy, failT, { Kdisp: failP.K * 1.25 }));
assert(wrongK.error.max > 0.01, 'wrong K in dispersion must fail');

const coarse = heunEvolve(failStart.values, failP, 0.05, Math.round(failT / 0.05));
const coarseExpected = plane(failP, failMx, failMy, failT);
let wrongTimestep;
if (!coarse.finite) {
  wrongTimestep = { finite: false, blewAt: coarse.blewAt, dt: 0.05, claimRejected: true };
} else {
  const cm = measure(coarse.values, coarseExpected.values, failStart.values);
  assert(cm.error.max > FIELD_TOL, 'coarse timestep must miss the long-run band');
  wrongTimestep = { finite: true, dt: 0.05, error: cm.error, claimRejected: true };
}
assert(wrongTimestep.claimRejected);

const drifted = Float64Array.from(failGood.values);
for (let i = 0; i < drifted.length; i += 4) { drifted[i] += 0.01; drifted[i + 1] -= 0.007; }
const driftM = measure(drifted, plane(failP, failMx, failMy, failT).values, failStart.values);
assert(driftM.meanAbsMax > 0.001, 'mean-drift injection must be visible');

const controls = {
  wrongOmegaSign: { maxError: wrongOmega.error.max, threshold: 0.1, rejected: true },
  wrongKDispersion: { maxError: wrongK.error.max, Kfactor: 1.25, threshold: 0.01, rejected: true },
  wrongTimestep: wrongTimestep,
  meanDriftInjection: { meanAbsMax: driftM.meanAbsMax, injected: [0.01, -0.007], threshold: 0.001, rejected: true },
};

const result = {
  schemaVersion: 1,
  date: new Date().toISOString().slice(0, 10),
  passed: true,
  source: 'src/modules/nonreciprocal.js',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  harness: 'tools/nonreciprocal-longrun-science.js',
  equation: 'Saha–Golestanian 2025 Eq5; Float64 twin of periodic FD + Heun; discrete plane-wave dispersion from NONRECIPROCAL.md',
  criteria: {
    fieldMax: FIELD_TOL,
    amplitudeMax: AMP_TOL,
    conservedMeanAbsolute: MEAN_TOL,
    longDuration: 'T in {5,8,10,20}',
  },
  longRuns,
  parameterMatrix,
  resolution,
  resolutionBand,
  controls,
  limitations: [
    'Exact discrete modal long runs and a finite parameter/resolution band only; not a nonlinear droplet, chaos or phase-diagram claim.',
    'Node Float64 twin of the discrete operators, not a fresh GPU float32 campaign or spectral-solver comparison.',
    'Periodic boundaries only; no open/absorbing/Neumann variants.',
    'Does not weaken or replace the short-time GPU Heun evidence in nonreciprocal-science.js.',
  ],
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/nonreciprocal-longrun-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
