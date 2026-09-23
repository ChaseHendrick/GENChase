'use strict';
// Large-N force accuracy, multi-dt/ε energy-drift band, and failure controls for production kernels.
// Node only: node tools/direct-gravity-largen-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/direct-gravity.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();

function load(mutate = s => s) {
  const api = {}, Studio = { util: { makeRng }, PALETTES: {}, register() {} };
  const marker = '  Studio.register({'; assert.equal(source.split(marker).length, 2);
  new Function('Studio', 'api', mutate(source).replace(marker, '  Object.assign(api,{allocate,forces,verlet,timeStep,initial});\n' + marker))(Studio, api);
  return api;
}
const api = load();
function finish(it) { let count = 0; while (!it.next().done) count++; return count; }

// Independent directed all-pairs Plummer force (Float64). Same physics as production unordered pairs;
// different loop order and formula layout so agreement is a genuine cross-check, not a shared line copy.
function referenceForces(b, eps, G = 1) {
  const ax = new Float64Array(b.n), ay = new Float64Array(b.n);
  // Reverse partner order vs production (small-then-large) so agreement is not bit-identical by construction.
  for (let i = 0; i < b.n; i++) {
    let axi = 0, ayi = 0;
    const xi = b.x[i], yi = b.y[i];
    for (let j = b.n - 1; j >= 0; j--) {
      if (j === i) continue;
      const dx = b.x[j] - xi, dy = b.y[j] - yi;
      const soft2 = eps * eps;
      const r2 = dx * dx + dy * dy + soft2;
      const invR3 = 1 / Math.pow(r2, 1.5);
      axi += G * b.mass[j] * dx * invR3;
      ayi += G * b.mass[j] * dy * invR3;
    }
    ax[i] = axi; ay[i] = ayi;
  }
  return { ax, ay };
}

function compareForces(prod, ref) {
  const n = prod.n;
  let maxAbs = 0, sumSqDiff = 0, sumSqRef = 0, sumAbsRef = 0;
  for (let i = 0; i < n; i++) {
    const dx = prod.ax[i] - ref.ax[i], dy = prod.ay[i] - ref.ay[i];
    const abs = Math.hypot(dx, dy);
    maxAbs = Math.max(maxAbs, abs);
    sumSqDiff += dx * dx + dy * dy;
    sumSqRef += ref.ax[i] * ref.ax[i] + ref.ay[i] * ref.ay[i];
    sumAbsRef += Math.hypot(ref.ax[i], ref.ay[i]);
  }
  const relL2 = Math.sqrt(sumSqDiff) / Math.max(Math.sqrt(sumSqRef), 1e-300);
  const relLinf = maxAbs / Math.max(sumAbsRef / n, 1e-300);
  return { maxAbsDeltaA: maxAbs, relativeL2: relL2, relativeLinfVsMean: relLinf, refAccelNorm: Math.sqrt(sumSqRef) };
}

function diskBodies(n, seed, opts = {}) {
  const s = { layout: 'disk', count: n, spin: opts.spin ?? 0.62, heat: opts.heat ?? 0.08 };
  return api.initial(s, makeRng(seed + '/direct-gravity'));
}

function energy(b, eps) {
  let E = 0;
  for (let i = 0; i < b.n; i++) {
    E += b.mass[i] * (b.vx[i] ** 2 + b.vy[i] ** 2) / 2;
    for (let j = i + 1; j < b.n; j++) E -= b.mass[i] * b.mass[j] / Math.hypot(b.x[i] - b.x[j], b.y[i] - b.y[j], eps);
  }
  return E;
}

const started = performance.now();
const SEED = 'largen-direct-gravity';
const EPS_FORCE = 0.12;
const Ns = [256, 1024, 4096];
const forceAccuracy = [];
for (const n of Ns) {
  const b = diskBodies(n, SEED + '/force/' + n);
  const t0 = performance.now();
  finish(api.forces(b, EPS_FORCE, 2048));
  const prodMs = performance.now() - t0;
  const t1 = performance.now();
  const ref = referenceForces(b, EPS_FORCE, 1);
  const refMs = performance.now() - t1;
  const stats = compareForces(b, ref);
  forceAccuracy.push({ n, pairs: n * (n - 1) / 2, eps: EPS_FORCE, prodMs, refMs, ...stats });
  // Float64 accumulation-order noise grows gently with N; keep honest but tight.
  assert(stats.maxAbsDeltaA < 1e-12, 'max |Δa| at N=' + n + ': ' + stats.maxAbsDeltaA);
  assert(stats.relativeL2 < 1e-14, 'rel L2 at N=' + n + ': ' + stats.relativeL2);
}

// --- Timestep / softening regime on a reproducible equal-mass disk (moderate N) ---
const REGIME_N = 64, REGIME_T = 0.4, REGIME_EPS = 0.12;
function evolveDisk(h, eps, nSteps, seed = SEED + '/regime') {
  const b = diskBodies(REGIME_N, seed);
  finish(api.forces(b, eps, 256));
  const E0 = energy(b, eps);
  let maxDrift = 0;
  for (let k = 0; k < nSteps; k++) {
    finish(api.verlet(b, eps, h, 256));
    maxDrift = Math.max(maxDrift, Math.abs(energy(b, eps) - E0));
  }
  return {
    h, eps, n: REGIME_N, steps: nSteps, time: h * nSteps, E0,
    maxEnergyDrift: maxDrift, relativeEnergyDrift: Math.abs(E0) > 0 ? maxDrift / Math.abs(E0) : maxDrift,
    finalHash: crypto.createHash('sha256').update(Buffer.from(b.x.buffer)).update(Buffer.from(b.y.buffer)).digest('hex').slice(0, 16),
  };
}

const dtRows = [0.004, 0.002, 0.001].map(h => evolveDisk(h, REGIME_EPS, Math.round(REGIME_T / h)));
for (const row of dtRows) {
  assert(row.E0 < 0, 'disk should be bound for this fixture');
  assert(row.relativeEnergyDrift < 5e-4, 'dt energy drift ' + row.h + ': ' + row.relativeEnergyDrift);
}
// Finer dt must not worsen relative drift by more than a small factor (Verlet energy oscillation shrinks).
assert(dtRows[2].relativeEnergyDrift <= dtRows[0].relativeEnergyDrift * 1.05 + 1e-15);
const dtDriftRatio = dtRows[0].relativeEnergyDrift / Math.max(dtRows[2].relativeEnergyDrift, 1e-300);

const epsRows = [0.06, 0.12, 0.24].map(eps => {
  const h = api.timeStep(eps, 1, 0.004);
  return { ...evolveDisk(h, eps, Math.round(REGIME_T / h)), requestedDt: 0.004, cappedDt: h };
});
for (const row of epsRows) {
  assert(row.relativeEnergyDrift < 2e-3, 'eps energy drift ' + row.eps + ': ' + row.relativeEnergyDrift);
  assert(row.cappedDt <= 0.15 * Math.sqrt(row.eps ** 3 / 2) * (1 + 1e-15));
}

// Self-convergence of positions: coarse vs fine dt on same seed / same T.
function positionsAt(h, eps, T, seed) {
  const b = diskBodies(REGIME_N, seed);
  finish(api.forces(b, eps, 256));
  const nSteps = Math.round(T / h);
  for (let k = 0; k < nSteps; k++) finish(api.verlet(b, eps, h, 256));
  return { x: Float64Array.from(b.x), y: Float64Array.from(b.y), steps: nSteps };
}
const posCoarse = positionsAt(0.004, REGIME_EPS, REGIME_T, SEED + '/regime');
const posFine = positionsAt(0.001, REGIME_EPS, REGIME_T, SEED + '/regime');
const posMid = positionsAt(0.002, REGIME_EPS, REGIME_T, SEED + '/regime');
function posDiff(a, b) {
  let max = 0, sum = 0;
  for (let i = 0; i < a.x.length; i++) {
    const d = Math.hypot(a.x[i] - b.x[i], a.y[i] - b.y[i]);
    max = Math.max(max, d); sum += d * d;
  }
  return { maxAbs: max, rms: Math.sqrt(sum / a.x.length) };
}
const coarseVsFine = posDiff(posCoarse, posFine);
const midVsFine = posDiff(posMid, posFine);
assert(coarseVsFine.maxAbs > midVsFine.maxAbs, 'dt refinement should reduce position difference to fine reference');
const positionRefinementRatio = coarseVsFine.rms / Math.max(midVsFine.rms, 1e-300);
assert(positionRefinementRatio > 4.5 && positionRefinementRatio < 5.5, 'expected ~(0.004^2-0.001^2)/(0.002^2-0.001^2)=5 vs fine: ' + positionRefinementRatio);

// --- failureControl: wrong G / force scale, broken reciprocity, wrong softening ---
const probe = diskBodies(128, SEED + '/fail');
finish(api.forces(probe, EPS_FORCE, 512));
const wrongG = compareForces(probe, referenceForces(probe, EPS_FORCE, 1.01));
assert(wrongG.maxAbsDeltaA > 1e-4, 'wrong-G control must separate: ' + wrongG.maxAbsDeltaA);
assert(wrongG.relativeL2 > 1e-3, 'wrong-G relative L2: ' + wrongG.relativeL2);

const wrongEps = compareForces(probe, referenceForces(probe, EPS_FORCE * 1.05, 1));
assert(wrongEps.maxAbsDeltaA > 1e-5, 'wrong-softening control must separate: ' + wrongEps.maxAbsDeltaA);

const nonreciprocal = load(s => s.replace('b.ax[j] -= b.mass[i] * fx', 'b.ax[j] -= 0.99 * b.mass[i] * fx'));
const brokenB = nonreciprocal.initial({ layout: 'disk', count: 64, spin: 0.62, heat: 0.08 }, makeRng(SEED + '/recip/direct-gravity'));
finish(nonreciprocal.forces(brokenB, EPS_FORCE, 256));
let forceX = 0, forceY = 0;
for (let i = 0; i < brokenB.n; i++) { forceX += brokenB.mass[i] * brokenB.ax[i]; forceY += brokenB.mass[i] * brokenB.ay[i]; }
const brokenMomentum = Math.hypot(forceX, forceY);
assert(brokenMomentum > 1e-4, 'broken reciprocity must produce net force: ' + brokenMomentum);
const vsGood = compareForces(brokenB, referenceForces(brokenB, EPS_FORCE, 1));
assert(vsGood.maxAbsDeltaA > 1e-6, 'broken reciprocity must disagree with independent reference');

const result = {
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  pass: true,
  milliseconds: performance.now() - started,
  forceAccuracy: { seed: SEED, eps: EPS_FORCE, rows: forceAccuracy },
  regime: {
    seed: SEED + '/regime', n: REGIME_N, time: REGIME_T, eps: REGIME_EPS,
    dtRows, dtDriftRatio, epsRows,
    positionSelfConvergence: { coarseVsFine, midVsFine, positionRefinementRatio },
  },
  failureControl: {
    wrongG: { maxAbsDeltaA: wrongG.maxAbsDeltaA, relativeL2: wrongG.relativeL2 },
    wrongSoftening: { maxAbsDeltaA: wrongEps.maxAbsDeltaA, relativeL2: wrongEps.relativeL2 },
    brokenReciprocity: { netForce: brokenMomentum, maxAbsDeltaAVsReference: vsGood.maxAbsDeltaA },
  },
  limitations: [
    'Planar Plummer-softened G=1 Float64 fixtures only. No galaxy equilibrium, unsoftened collision, or chaotic long-time accuracy claim.',
    'Large-N check is force-kernel agreement vs an independent all-pairs reference at fixed snapshot, not a statistical N-body convergence study.',
    'Timestep/ε band is finite-time energy drift and self-convergence on one equal-mass disk seed at N=64; not a global stability proof.',
    'Print and browser scheduling checks are separate from this numerical evidence.',
  ],
};
assert(result.pass);
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/direct-gravity-largen-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
