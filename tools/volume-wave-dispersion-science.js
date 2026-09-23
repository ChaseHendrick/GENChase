// node tools/volume-wave-dispersion-science.js [--write]
// Float64 twin of the seven-point leapfrog stencil: long-time discrete modal phase
// fidelity, continuum dispersion error under refinement (incl. >64³), and failure controls.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/volume-wave.js'), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');

const idx = (x, y, z, n) => ((z + n) % n) * n * n + ((y + n) % n) * n + ((x + n) % n);
function lap(a, x, y, z, n, sign = 1) {
  return sign * (a[idx(x + 1, y, z, n)] + a[idx(x - 1, y, z, n)] + a[idx(x, y + 1, z, n)] + a[idx(x, y - 1, z, n)] + a[idx(x, y, z + 1, n)] + a[idx(x, y, z - 1, n)] - 6 * a[idx(x, y, z, n)]);
}
function wave(n, m, phase = 0.31) {
  return Float64Array.from({ length: n ** 3 }, (_, i) => {
    const x = i % n, y = Math.floor(i / n) % n, z = Math.floor(i / (n * n));
    return Math.cos(2 * Math.PI * (m[0] * x + m[1] * y + m[2] * z) / n + phase);
  });
}
function discreteTheta(n, m, courant) {
  const s = m.reduce((sum, k) => sum + Math.sin(Math.PI * k / n) ** 2, 0);
  const arg = courant / Math.sqrt(3) * Math.sqrt(s);
  assert(arg >= 0 && arg <= 1 + 1e-15, 'discrete mode must be stable: ' + arg);
  return 2 * Math.asin(Math.min(1, arg));
}
function continuumOmega(m) {
  return 2 * Math.PI * Math.hypot(...m);
}
function errorStats(a, b) {
  let max = 0, sum = 0;
  for (let i = 0; i < a.length; i++) {
    assert(Number.isFinite(a[i]), 'nonfinite field');
    const d = a[i] - b[i];
    max = Math.max(max, Math.abs(d));
    sum += d * d;
  }
  return { max, rms: Math.sqrt(sum / a.length) };
}
function projectCos(u, n, m, phase = 0.31) {
  let num = 0, den = 0;
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const phi = Math.cos(2 * Math.PI * (m[0] * x + m[1] * y + m[2] * z) / n + phase);
    num += u[idx(x, y, z, n)] * phi;
    den += phi * phi;
  }
  return num / den;
}
function evolve(n, courant, steps, initial, { lapSign = 1 } = {}) {
  const r2 = courant * courant / 3;
  let current = Float64Array.from(initial);
  let previous = new Float64Array(initial.length);
  for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = idx(x, y, z, n);
    previous[i] = current[i] + 0.5 * r2 * lap(current, x, y, z, n, lapSign);
  }
  for (let t = 0; t < steps; t++) {
    const next = new Float64Array(initial.length);
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = idx(x, y, z, n);
      next[i] = 2 * current[i] - previous[i] + r2 * lap(current, x, y, z, n, lapSign);
    }
    previous = current;
    current = next;
  }
  return current;
}
function unwrapPhase(cosAmp, steps, thetaHint) {
  // Standing-wave amplitude is cos(θ steps). Recover phase near thetaHint*steps.
  const c = Math.max(-1, Math.min(1, cosAmp));
  const base = Math.acos(c);
  const target = thetaHint * steps;
  // Candidates: ±base + 2π k
  let best = base, bestDist = Infinity;
  for (let k = -2; k <= Math.ceil(target / Math.PI) + 2; k++) {
    for (const sign of [1, -1]) {
      const cand = sign * base + 2 * Math.PI * k;
      const d = Math.abs(cand - target);
      if (d < bestDist) { bestDist = d; best = cand; }
    }
  }
  return best;
}

const FIELD_TOL = 5e-5;
const PHASE_REL_TOL = 1e-10;
const started = performance.now();

// --- Long-time discrete modal fidelity (hundreds of steps, grids through 96³) ---
const longFixtures = [
  { grid: 32, mode: [2, 1, 1], courant: 0.8, steps: 400 },
  { grid: 48, mode: [3, 2, 1], courant: 0.7, steps: 500 },
  { grid: 64, mode: [1, 2, 2], courant: 0.85, steps: 600 },
  { grid: 96, mode: [2, 3, 1], courant: 0.75, steps: 400 },
];
const longTime = [];
for (const fix of longFixtures) {
  const { grid: n, mode: m, courant, steps } = fix;
  const theta = discreteTheta(n, m, courant);
  const initial = wave(n, m);
  const t0 = performance.now();
  const end = evolve(n, courant, steps, initial);
  const expected = Float64Array.from(initial, v => v * Math.cos(theta * steps));
  const err = errorStats(end, expected);
  const cosAmp = projectCos(end, n, m);
  const measuredPhase = unwrapPhase(cosAmp, steps, theta);
  const expectedPhase = theta * steps;
  const phaseError = measuredPhase - expectedPhase;
  const measuredTheta = measuredPhase / steps;
  const relativeThetaError = Math.abs(measuredTheta - theta) / Math.max(theta, 1e-15);
  assert(err.max < FIELD_TOL, 'long discrete max ' + JSON.stringify({ n, m, err }));
  assert(relativeThetaError < PHASE_REL_TOL, 'long discrete phase ' + relativeThetaError);
  longTime.push({
    grid: n, mode: m, courant, steps, theta, measuredTheta,
    expectedPhase, measuredPhase, phaseError, relativeThetaError,
    cosAmplitude: cosAmp, expectedCosAmplitude: Math.cos(expectedPhase),
    error: err, elapsedMs: Math.round(performance.now() - t0),
  });
}

// Extra longest-time stress at 64³ (beyond short-campaign ≤80 steps)
{
  const n = 64, m = [1, 1, 2], courant = 0.8, steps = 1200;
  const theta = discreteTheta(n, m, courant);
  const initial = wave(n, m);
  const t0 = performance.now();
  const end = evolve(n, courant, steps, initial);
  const expected = Float64Array.from(initial, v => v * Math.cos(theta * steps));
  const err = errorStats(end, expected);
  const cosAmp = projectCos(end, n, m);
  const measuredPhase = unwrapPhase(cosAmp, steps, theta);
  const relativeThetaError = Math.abs(measuredPhase / steps - theta) / theta;
  assert(err.max < FIELD_TOL, 'longest 64³ max ' + err.max);
  assert(relativeThetaError < PHASE_REL_TOL, 'longest 64³ phase');
  longTime.push({
    grid: n, mode: m, courant, steps, theta, measuredTheta: measuredPhase / steps,
    expectedPhase: theta * steps, measuredPhase, phaseError: measuredPhase - theta * steps,
    relativeThetaError, cosAmplitude: cosAmp, expectedCosAmplitude: Math.cos(theta * steps),
    error: err, elapsedMs: Math.round(performance.now() - t0), label: 'longest-64',
  });
}

// --- Continuum dispersion error vs grid at fixed physical time (incl. 96³) ---
// c = 1 on the unit cube; compare to continuum standing wave cos(ω T) φ(x).
const T = 0.25, mCont = [1, 2, 1], courantFrac = 0.6;
const dispersion = [];
for (const N of [32, 48, 64, 96]) {
  const initial = wave(N, mCont);
  const steps = Math.ceil(T * Math.sqrt(3) * N / courantFrac);
  const dt = T / steps;
  // Module courant fraction C satisfies dt = C/(sqrt(3)*N) at unit speed, so r2 = C^2/3.
  const C = dt * Math.sqrt(3) * N;
  const t0 = performance.now();
  const end = evolve(N, C, steps, initial);
  const omega = continuumOmega(mCont);
  const expected = Float64Array.from(initial, v => v * Math.cos(omega * T));
  const err = errorStats(end, expected);
  const theta = discreteTheta(N, mCont, C);
  const discreteExpected = Float64Array.from(initial, v => v * Math.cos(theta * steps));
  const discreteErr = errorStats(end, discreteExpected);
  assert(discreteErr.max < FIELD_TOL, 'dispersion discrete twin ' + N);
  dispersion.push({
    grid: N, domain: [1, 1, 1], time: T, mode: mCont, steps, dt, courant: C,
    continuumOmega: omega, discreteTheta: theta,
    continuumError: err, discreteError: discreteErr,
    elapsedMs: Math.round(performance.now() - t0),
  });
}
for (let i = 1; i < dispersion.length; i++) {
  const ratio = dispersion[i - 1].continuumError.rms / dispersion[i].continuumError.rms;
  dispersion[i].refinementRatio = ratio;
  // Second-order space/time: ratio roughly (N_i/N_{i-1})^2; allow broad band.
  assert(ratio > 1.5, 'dispersion must shrink under refinement: ' + ratio);
}
assert(dispersion.at(-1).continuumError.rms < dispersion[0].continuumError.rms / 4,
  '96³ continuum RMS must be well below 32³');

// Optional 128³ single-mode short discrete check (allocation / work feasibility in Float64)
let highGrid = null;
{
  const N = 128, m = [2, 1, 1], courant = 0.8, steps = 80;
  const theta = discreteTheta(N, m, courant);
  const initial = wave(N, m);
  const t0 = performance.now();
  const end = evolve(N, courant, steps, initial);
  const expected = Float64Array.from(initial, v => v * Math.cos(theta * steps));
  const err = errorStats(end, expected);
  assert(err.max < FIELD_TOL, '128³ discrete max ' + err.max);
  highGrid = {
    grid: N, mode: m, courant, steps, theta, error: err,
    elapsedMs: Math.round(performance.now() - t0),
    note: 'Float64 twin allocation and short discrete fidelity at 128³; not a GPU SwiftShader allocation certificate.',
  };
}

// --- Failure controls ---
const failN = 48, failM = [2, 1, 1], failC = 0.8, failSteps = 400;
const failTheta = discreteTheta(failN, failM, failC);
const failInitial = wave(failN, failM);
const failEnd = evolve(failN, failC, failSteps, failInitial);
const failGood = Float64Array.from(failInitial, v => v * Math.cos(failTheta * failSteps));
const goodErr = errorStats(failEnd, failGood);
assert(goodErr.max < FIELD_TOL, 'failure baseline');

// Wrong Courant inside analytic θ (claim 0.5 instead of the true 0.8) must miss the long-time phase claim.
// A nearby wrong value such as 0.9 can land near the same cosine branch after many 2π wraps, so the
// control uses a clearly incorrect Courant and checks both field error and accumulated phase gap.
const claimedCourant = 0.5;
const wrongTheta = discreteTheta(failN, failM, claimedCourant);
const wrongClaim = Float64Array.from(failInitial, v => v * Math.cos(wrongTheta * failSteps));
const wrongCourantErr = errorStats(failEnd, wrongClaim);
assert(wrongCourantErr.max > 0.1, 'wrong Courant in θ must fail: ' + wrongCourantErr.max);
const wrongCos = projectCos(failEnd, failN, failM);
const wrongPhase = unwrapPhase(wrongCos, failSteps, wrongTheta);
const wrongPhaseGap = Math.abs(wrongPhase - wrongTheta * failSteps);
assert(wrongPhaseGap > 1, 'wrong Courant phase gap ' + wrongPhaseGap);

// Reverse Laplacian must leave the exact discrete standing-wave claim.
const reversed = evolve(failN, failC, Math.min(40, failSteps), failInitial, { lapSign: -1 });
const revExpected = Float64Array.from(failInitial, v => v * Math.cos(failTheta * Math.min(40, failSteps)));
const reverseLapErr = errorStats(reversed, revExpected);
assert(reverseLapErr.max > 0.1, 'reverse Laplacian must fail: ' + reverseLapErr.max);

const controls = {
  wrongCourantInTheta: {
    actualCourant: failC, claimedCourant, steps: failSteps, grid: failN, mode: failM,
    maxError: wrongCourantErr.max, phaseGap: wrongPhaseGap, threshold: 0.1, rejected: true,
  },
  reverseLaplacian: {
    steps: Math.min(40, failSteps), grid: failN, mode: failM,
    maxError: reverseLapErr.max, threshold: 0.1, rejected: true,
  },
};

const result = {
  schemaVersion: 1,
  date: new Date().toISOString().slice(0, 10),
  passed: true,
  source: 'src/modules/volume-wave.js',
  sourceSha256,
  harness: 'tools/volume-wave-dispersion-science.js',
  scope: 'Node Float64 twin of the maintained seven-point leapfrog on the periodic unit cube with zero initial velocity. Long-time discrete modal phase/frequency fidelity (hundreds to 1200 steps, grids 32–96³), continuum dispersion error under 32/48/64/96 refinement at fixed T=0.25, and a 128³ short discrete fixture.',
  criteria: {
    discreteFieldMax: FIELD_TOL,
    relativeThetaError: PHASE_REL_TOL,
    continuumRefinement: 'RMS must shrink under refinement; 96³ RMS below 1/4 of 32³',
    failureControl: 'Wrong Courant in analytic θ and reverse Laplacian each exceed max error 0.1',
  },
  longTime,
  dispersion,
  highGrid,
  controls,
  elapsedMs: Math.round(performance.now() - started),
  limitations: [
    'Node Float64 twin of the discrete stencil, not a fresh GPU float32 / SwiftShader long-time campaign or cross-device certificate.',
    'Prepared single Fourier modes only; pulse continuum error, arbitrary controls and print fidelity remain outside this package.',
    'Continuum dispersion refinement identifies combined space/time second-order trend, not separately identified spatial vs temporal orders.',
    'Does not weaken or replace the short-time GPU atlas evidence in volume-wave-science.js. Extreme 192–256 GPU allocation across hardware remains unaudited.',
  ],
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/volume-wave-dispersion-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
