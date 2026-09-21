// Independent finite-difference Poisson, cold-sheet solution, refinement and sampling-noise checks.
// Node only: node tools/plasma-science.js > validation/results/plasma-science.json
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(root, 'src/modules/plasma.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/studio.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
function load(text) {
  const hooks = {}, marker = '  Studio.register({'; let mod;
  assert.equal(text.split(marker).length, 2);
  const Studio = { util: { makeRng, clamp: (x, a, b) => Math.max(a, Math.min(x, b)) }, gl: { GLSL: { bicubic: '', ramp: '' } }, PALETTES: new Proxy({}, { get: () => ({ bg: '#000', colors: ['#fff'] }) }), register(m) { mod = m; } };
  new Function('Studio', 'hooks', text.replace(marker, '  Object.assign(hooks,{makeSim,deposit,solveField,gather,L});\n' + marker))(Studio, hooks);
  return { ...hooks, mod };
}
const A = load(source), { L } = A, wrap = x => x - L * Math.floor(x / L), image = x => x - L * Math.floor(x / L + .5);
function config(overrides = {}) { return { ...A.mod.defaults, running: false, ...overrides }; }
function valid(sim) { assert.equal(sim.halted, ''); assert(Number.isFinite(sim.kinetic + sim.electric + sim.momentum)); assert(Math.abs(sim.charge) < 2e-11); assert(sim.gauss < 2e-11); }
function maxError(a, b) { return Math.max(...Array.from(a, (v, i) => Math.abs(v - b[i]))); }
function densePoisson(rho) {
  const M = rho.length, dx = L / M, mean = rho.reduce((a, b) => a + b, 0) / M;
  const rows = Array.from({ length: M }, (_, j) => {
    const row = new Float64Array(M + 1); row[j] = 2 / dx ** 2; row[(j + M - 1) % M] = -1 / dx ** 2; row[(j + 1) % M] = -1 / dx ** 2; row[M] = rho[j] - mean; return row;
  });
  rows[M - 1].fill(1); rows[M - 1][M] = 0;
  for (let j = 0; j < M; j++) {
    let pivot = j; for (let k = j + 1; k < M; k++) if (Math.abs(rows[k][j]) > Math.abs(rows[pivot][j])) pivot = k;
    [rows[j], rows[pivot]] = [rows[pivot], rows[j]];
    const d = rows[j][j]; assert(Math.abs(d) > 1e-13); for (let k = j; k <= M; k++) rows[j][k] /= d;
    for (let i = 0; i < M; i++) if (i !== j) { const f = rows[i][j]; for (let k = j; k <= M; k++) rows[i][k] -= f * rows[j][k]; }
  }
  const phi = rows.map(row => row[M]), edge = Float64Array.from(phi, (v, j) => -(v - phi[(j + M - 1) % M]) / dx);
  return { edge, center: Float64Array.from(edge, (v, j) => .5 * (v + edge[(j + 1) % M])) };
}
const started = performance.now(), rng = makeRng('poisson-independent');
const x = Float64Array.from({ length: 47 }, (_, i) => i === 0 ? 0 : i === 1 ? L - 1e-12 : rng() * L), grid = 16, dx = L / grid;
const rho = new Float64Array(grid), edge = new Float64Array(grid), field = new Float64Array(grid);
A.deposit(x, grid, rho); const charge = A.solveField(rho, edge, field);
const independentRho = Float64Array.from({ length: grid }, (_, j) => 1 - grid / x.length * x.reduce((sum, v) => sum + Math.max(0, 1 - Math.abs(image(v - (j + .5) * dx)) / dx), 0));
const ref = densePoisson(independentRho), depositionError = maxError(rho, independentRho), edgeError = maxError(edge, ref.edge), fieldError = maxError(field, ref.center);
assert(depositionError < 1e-13 && edgeError < 1e-12 && fieldError < 1e-12 && Math.abs(charge) < 1e-12);
let gatheredForce = 0; for (const value of x) gatheredForce -= A.gather(value, field) * L / x.length;
assert(Math.abs(gatheredForce) < 1e-12);
const poisson = { particles: x.length, cells: grid, depositionMaxError: depositionError, edgeMaxError: edgeError, centeredFieldMaxError: fieldError, netCharge: charge, totalParticleForce: gatheredForce };

// Before trajectories cross, a cold 1D sheet displaced from uniform q obeys x=q+d(q)cos(t).
function cold(N, M, dt) { return A.makeSim(config({ n: N, grid: M, beam: 0, thermal: 0, amplitude: .02, mode: 1, dt, seed: 'cold-sheet' })); }
function coldError(sim, displacement) {
  let squared = 0;
  for (let i = 0; i < sim.n; i++) {
    const q = (i + .5) * L / sim.n, expectedX = wrap(q + displacement[i] * Math.cos(sim.time)), expectedV = -displacement[i] * Math.sin(sim.time);
    squared += image(sim.x[i] - expectedX) ** 2 + (sim.v[i] - expectedV) ** 2;
  }
  return Math.sqrt(squared / (2 * sim.n));
}
const displacement = sim => Float64Array.from(sim.x, (v, i) => image(v - (i + .5) * L / sim.n));
const oscillator = cold(8192, 128, .01), d0 = displacement(oscillator), samples = [], crossings = [];
let previous = 1, maxColdError = 0, maxColdEnergy = 0, momentumMax = 0;
const denominator = d0.reduce((sum, d) => sum + d * d, 0);
for (let k = 1; k <= 1300; k++) {
  oscillator.advance(1); valid(oscillator);
  let projection = 0; for (let i = 0; i < oscillator.n; i++) projection += image(oscillator.x[i] - (i + .5) * L / oscillator.n) * d0[i];
  projection /= denominator;
  if (previous * projection < 0) crossings.push(oscillator.time - oscillator.dt + oscillator.dt * previous / (previous - projection));
  previous = projection; maxColdError = Math.max(maxColdError, coldError(oscillator, d0));
  maxColdEnergy = Math.max(maxColdEnergy, Math.abs(oscillator.drift)); momentumMax = Math.max(momentumMax, Math.abs(oscillator.momentum));
  if (k % 100 === 0) samples.push({ time: oscillator.time, normalizedDisplacement: projection, continuumReference: Math.cos(oscillator.time) });
}
assert(crossings.length >= 4);
const omega = Math.PI / ((crossings.at(-1) - crossings[0]) / (crossings.length - 1));
assert(Math.abs(omega - 1) < .002); assert(maxColdError < .00015); assert(maxColdEnergy < .005); assert(momentumMax < 1e-11);
const oscillation = { cells: 128, particles: 8192, dt: .01, time: oscillator.time, omega, theoreticalOmega: 1, relativeFrequencyError: Math.abs(omega - 1), crossingTimes: crossings, maxPhaseSpaceRmsError: maxColdError, maximumEnergyRelativeDrift: maxColdEnergy, maximumMomentum: momentumMax, samples };

const space = [];
for (const M of [32, 64, 128]) {
  const sim = cold(16384, M, .001), d = displacement(sim); sim.advance(1000); valid(sim);
  space.push({ cells: M, particles: sim.n, dt: sim.dt, time: sim.time, rmsError: coldError(sim, d) });
}
for (let i = 1; i < space.length; i++) { space[i].errorReduction = space[i - 1].rmsError / space[i].rmsError; assert(space[i].errorReduction > 3.5 && space[i].errorReduction < 4.5); }
const temporalReference = cold(4096, 64, .0025); temporalReference.advance(480); valid(temporalReference);
const time = [];
for (const dt of [.08, .04, .02]) {
  const sim = cold(4096, 64, dt); sim.advance(Math.round(1.2 / dt)); valid(sim);
  let sum = 0; for (let i = 0; i < sim.n; i++) sum += image(sim.x[i] - temporalReference.x[i]) ** 2 + (sim.v[i] - temporalReference.v[i]) ** 2;
  time.push({ dt, physicalTime: sim.time, rmsDifferenceFromSmallStep: Math.sqrt(sum / (2 * sim.n)) });
}
for (let i = 1; i < time.length; i++) { time[i].errorReduction = time[i - 1].rmsDifferenceFromSmallStep / time[i].rmsDifferenceFromSmallStep; assert(time[i].errorReduction > 3.5 && time[i].errorReduction < 4.6); }

// A deposit-only stochastic benchmark: expected spatial mean rho² for independent uniform particles.
// For periodic linear CIC and grid>2 it is (2*grid/3-1)/N; no temporal independence is assumed.
const noise = [];
for (const N of [2048, 8192]) {
  const estimates = [], M = 64;
  for (let seed = 0; seed < 24; seed++) {
    const random = makeRng('charge-noise-' + N + '-' + seed), px = Float64Array.from({ length: N }, () => L * random()), q = new Float64Array(M);
    A.deposit(px, M, q); estimates.push(q.reduce((sum, v) => sum + v * v, 0) / M);
  }
  const mean = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  const sd = Math.sqrt(estimates.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (estimates.length - 1));
  const se = sd / Math.sqrt(estimates.length), expected = (2 * M / 3 - 1) / N;
  assert(Math.abs(mean - expected) < 4 * se); noise.push({ particles: N, cells: M, independentSeeds: 24, estimates, mean, standardErrorAcrossSeeds: se, expectedVariance: expected, sigmaDifference: (mean - expected) / se });
}
assert(noise[0].mean / noise[1].mean > 3 && noise[0].mean / noise[1].mean < 5);

const presetRuns = [];
for (const [name, preset] of [['default', { p: {} }], ...Object.entries(A.mod.presets)]) {
  const settings = config(preset.p), sim = A.makeSim(settings); sim.advance(settings.warmup); valid(sim);
  assert.equal(sim.step, settings.warmup);
  presetRuns.push({ name, particles: sim.n, cells: sim.grid, steps: sim.step, time: sim.time, energyRelativeDrift: sim.drift, maximumEnergyRelativeDrift: sim.peakDrift, netCharge: sim.charge, gaussResidual: sim.gauss, momentum: sim.momentum });
}
const heavyStart = performance.now(), heavy = A.makeSim(config({ n: 262144, grid: 1024 })); const preparationMs = performance.now() - heavyStart;
const stepStart = performance.now(); heavy.advance(4); valid(heavy);
const highLoad = { particles: heavy.n, cells: heavy.grid, steps: heavy.step, initializationMs: preparationMs, fourStepsMs: performance.now() - stepStart, energyRelativeDrift: heavy.drift, gaussResidual: heavy.gauss, arraysBytes: (4 * heavy.n + 3 * heavy.grid) * 8 };

const badText = source.replaceAll('v[i] -= .5 * dt * gather', 'v[i] += .5 * dt * gather'); assert.notEqual(badText, source);
const bad = load(badText).makeSim(config({ n: 4096, grid: 64, beam: 0, thermal: 0, amplitude: .02, dt: .02 }));
let rollback = null;
for (let i = 0; i < 100 && !bad.halted; i++) {
  const before = { step: bad.step, time: bad.time, arrays: [bad.x, bad.v, bad.rho, bad.edge, bad.field].map(a => a.slice()), diagnostics: [bad.kinetic, bad.electric, bad.momentum, bad.charge, bad.gauss, bad.drift, bad.peakDrift] };
  bad.advance(1);
  if (bad.halted) {
    assert.equal(bad.step, before.step); assert.equal(bad.time, before.time);
    [bad.x, bad.v, bad.rho, bad.edge, bad.field].forEach((a, k) => assert.deepEqual(a, before.arrays[k]));
    assert.deepEqual([bad.kinetic, bad.electric, bad.momentum, bad.charge, bad.gauss, bad.drift, bad.peakDrift], before.diagnostics);
    rollback = { rejectedTrialRestoredArraysAndDiagnostics: true, lastAcceptedStep: bad.step };
  }
}
assert(bad.halted, 'Wrong-force sign escaped the independent energy check');
const altered = Float64Array.from(rho); altered[0] += .02;
const badCharge = A.solveField(altered, new Float64Array(grid), new Float64Array(grid)); assert(Math.abs(badCharge) > .001);
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
console.log(JSON.stringify({ sourceSha256: hash(source), rngSha256: hash(rngSource), harnessSha256: hash(fs.readFileSync(__filename)),
  command: 'node tools/plasma-science.js > validation/results/plasma-science.json',
  scope: 'Periodic normalized 1D1V CIC: independent all-pairs deposition and dense finite-difference Poisson; cold-sheet continuum oscillation; same-domain/time spatial and temporal refinement; independent-seed deposition noise; shipped presets; four-step largest setting.',
  poisson, oscillation, spatialRefinement: space, temporalRefinement: time, particleNumberNoise: noise, presetRuns, highLoad,
  failureControls: { wrongForceSignStopped: bad.halted, rollback, nonneutralChargeDetected: badCharge }, seconds: (performance.now() - started) / 1000,
  limitations: 'Momentum-conserving CIC is not exactly energy conserving. Gauss/charge diagnostics are algebraic solver checks, not independent physical discoveries. No measured Landau damping rate, general two-stream growth-rate accuracy, arbitrary cold-drifting stability, long-time thermodynamics, higher-dimensional or physical-experiment validation. Noise result tests deposition only; high load covers four steps.' }, null, 2));
