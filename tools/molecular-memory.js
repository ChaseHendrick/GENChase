// Bounded preparation-sensitivity experiment, not a novelty or equilibrium claim.
// node tools/molecular-memory.js [--write | --controls]
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..'), hash = x => crypto.createHash('sha256').update(x).digest('hex');
const protocol = {
  version: 1, frozenDate: '2026-09-21', n: 256, density: .7, initialKineticScale: .45,
  dt: .002, preparationTime: 4, coherentEnergyFraction: .75, waves: 1,
  seeds: Array.from({ length: 8 }, (_, i) => `molecular-memory-${i}`),
  arms: ['gaussian', 'organized', 'shuffled'], sampleTimes: [0, 2, 4, 6, 8, 10, 12, 14, 16],
  lateTimes: [8, 10, 12, 14, 16], neighborCutoff: 1.45, coordinationRange: [4, 8],
  minimumCoverage: .8, minimumMeanCoordination: 4, minimumEffect: .02,
  studentT975df7: 2.3646242515927844, maximumResidualFlow: .05,
  refinementSeeds: [0, 1], refinementDt: .001, maximumRefinementDifference: .01,
  largerN: 1024, largerWaves: 2, largerSeeds: [0, 1],
  maximumEnergyDrift: .0005, maximumMomentumPerParticle: 1e-10,
};
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const source = fs.readFileSync(path.join(root, 'src/modules/molecular.js'), 'utf8');
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
let mod;
const Studio = { util: { clamp: (v, a, b) => Math.max(a, Math.min(v, b)), makeRng },
  PALETTES: new Proxy({}, { get: () => ({ bg: '#000', colors: ['#fff'] }) }), register(m) { mod = m; } };
const hooks = {}, marker = '  Studio.register({';
assert.equal(source.split(marker).length, 2, 'module hook location must be unambiguous');
new Function('Studio', 'hooks', source.replace(marker, '  hooks.makeSim=makeSim;\n' + marker))(Studio, hooks);
const makeSim = hooks.makeSim, mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const image = (d, L) => d - L * Math.floor(d / L + .5);

// Measurement uses independent all-pairs geometry, not the linked-cell iterator.
function structure(x, y, L, harmonic = 6, periodic = true) {
  const n = x.length, re = new Float64Array(n), im = new Float64Array(n), z = new Uint16Array(n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    let dx = x[j] - x[i], dy = y[j] - y[i];
    if (periodic) { dx = image(dx, L); dy = image(dy, L); }
    if (dx * dx + dy * dy >= protocol.neighborCutoff ** 2) continue;
    const a = harmonic * Math.atan2(dy, dx), c = Math.cos(a), s = Math.sin(a);
    // All tested harmonics are even: reversing a bond leaves its phase unchanged.
    re[i] += c; im[i] += s; z[i]++; re[j] += c; im[j] += s; z[j]++;
  }
  const values = [], psi = [], coordination = {};
  const perParticle = Array.from(z, (count, i) => {
    coordination[count] = (coordination[count] || 0) + 1;
    const eligible = count >= protocol.coordinationRange[0] && count <= protocol.coordinationRange[1];
    const norm2 = re[i] ** 2 + im[i] ** 2;
    const c6 = eligible ? (norm2 - count) / (count * (count - 1)) : null;
    if (eligible) { values.push(c6); psi.push(Math.sqrt(norm2) / count); }
    return { coordination: count, eligible, c6 };
  });
  return { c6: values.length ? mean(values) : null, psi6: psi.length ? mean(psi) : null,
    eligibleFraction: values.length / n, meanCoordination: mean(Array.from(z)), coordination, perParticle };
}
function basis(y, L, waves) {
  const sin = Float64Array.from(y, v => Math.sin(2 * Math.PI * waves * v / L));
  const cos = Float64Array.from(y, v => Math.cos(2 * Math.PI * waves * v / L));
  const ms = mean(Array.from(sin)), mc = mean(Array.from(cos));
  for (let i = 0; i < y.length; i++) { sin[i] -= ms; cos[i] -= mc; }
  return { sin, cos };
}
function project(v, b) {
  let ss = 0, cc = 0, sc = 0, vs = 0, vc = 0;
  for (let i = 0; i < v.length; i++) {
    ss += b.sin[i] ** 2; cc += b.cos[i] ** 2; sc += b.sin[i] * b.cos[i];
    vs += v[i] * b.sin[i]; vc += v[i] * b.cos[i];
  }
  const determinant = ss * cc - sc * sc;
  assert(determinant > 1e-8, 'sampled flow basis must have rank two');
  const a = (vs * cc - vc * sc) / determinant, c = (vc * ss - vs * sc) / determinant;
  const values = Float64Array.from(v, (_, i) => a * b.sin[i] + c * b.cos[i]);
  return { values, energy: .5 * values.reduce((s, u) => s + u * u, 0) };
}
function energy(v) { return .5 * (v.vx.reduce((s, u) => s + u * u, 0) + v.vy.reduce((s, u) => s + u * u, 0)); }
function normalize(v, K) {
  const mx = mean(Array.from(v.vx)), my = mean(Array.from(v.vy));
  for (let i = 0; i < v.vx.length; i++) { v.vx[i] -= mx; v.vy[i] -= my; }
  const scale = Math.sqrt(K / energy(v));
  for (let i = 0; i < v.vx.length; i++) { v.vx[i] *= scale; v.vy[i] *= scale; }
  return v;
}
function gaussian(n, seed, K) {
  const rng = makeRng(seed), vx = new Float64Array(n), vy = new Float64Array(n);
  for (let i = 0; i < n; i++) { vx[i] = rng.gauss(); vy[i] = rng.gauss(); }
  return normalize({ vx, vy }, K);
}
function velocities(prepared, waves, seed) {
  const { n, L, y, K } = prepared, b = basis(y, L, waves);
  const noise = gaussian(n, seed + '/residual', 1), proj = project(noise.vx, b);
  for (let i = 0; i < n; i++) noise.vx[i] -= proj.values[i];
  normalize(noise, K * (1 - protocol.coherentEnergyFraction));
  const a = Math.sqrt(2 * K * protocol.coherentEnergyFraction / b.sin.reduce((s, u) => s + u * u, 0));
  const organized = { vx: Float64Array.from(noise.vx, (u, i) => u + a * b.sin[i]), vy: noise.vy.slice() };
  normalize(organized, K);
  const indices = Array.from({ length: n }, (_, i) => i), rng = makeRng(seed + '/shuffle');
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
  const shuffled = { vx: Float64Array.from(indices, i => organized.vx[i]), vy: Float64Array.from(indices, i => organized.vy[i]) };
  return { gaussian: gaussian(n, seed + '/gaussian', K), organized, shuffled };
}
function diagnostic(sim, waves) {
  const s = structure(sim.x, sim.y, sim.L); delete s.perParticle;
  return { time: sim.step * sim.dt, ...s, coherentEnergyFraction: project(sim.vx, basis(sim.y, sim.L, waves)).energy / sim.kinetic,
    kineticScale: sim.kinetic / (sim.n - 1), kineticEnergy: sim.kinetic, potentialEnergy: sim.potential,
    energyDrift: sim.drift, momentum: Math.hypot(sim.px, sim.py) };
}
function configuration(n, seed, dt = protocol.dt) {
  return { ...mod.defaults, n, seed, dt, density: protocol.density, temperature: protocol.initialKineticScale };
}
function prepare(n, seed) {
  const sim = makeSim(configuration(n, seed)), count = Math.round(protocol.preparationTime / sim.dt);
  let peakDrift = 0, peakMomentum = 0;
  for (let i = 0; i < count && !sim.halted; i++) {
    sim.advance(1); peakDrift = Math.max(peakDrift, Math.abs(sim.drift)); peakMomentum = Math.max(peakMomentum, Math.hypot(sim.px, sim.py));
  }
  return { n, seed, L: sim.L, x: sim.x.slice(), y: sim.y.slice(), K: sim.kinetic, V: sim.potential,
    preparation: { requestedTime: protocol.preparationTime, completedTime: sim.step * sim.dt,
      halted: sim.halted, peakDrift, peakMomentum, valid: !sim.halted && peakDrift < protocol.maximumEnergyDrift && peakMomentum / n < protocol.maximumMomentumPerParticle } };
}
function run(prepared, v, arm, dt, waves) {
  const sim = makeSim(configuration(prepared.n, prepared.seed, dt));
  sim.x.set(prepared.x); sim.y.set(prepared.y); sim.vx.set(v.vx); sim.vy.set(v.vy); sim.reference();
  const matching = { kineticError: Math.abs(sim.kinetic - prepared.K), potentialError: Math.abs(sim.potential - prepared.V),
    energyError: Math.abs(sim.energy0 - prepared.K - prepared.V), momentum: Math.hypot(sim.px, sim.py) };
  assert(matching.kineticError < 1e-10 && matching.energyError < 1e-9 && matching.momentum < 1e-10);
  const samples = []; let peakDrift = 0, peakMomentum = 0;
  for (const t of protocol.sampleTimes) {
    const target = Math.round(t / dt);
    while (sim.step < target && !sim.halted) {
      sim.advance(1); peakDrift = Math.max(peakDrift, Math.abs(sim.drift)); peakMomentum = Math.max(peakMomentum, Math.hypot(sim.px, sim.py));
    }
    if (sim.step !== target) break;
    samples.push(diagnostic(sim, waves));
  }
  const late = samples.filter(s => protocol.lateTimes.includes(s.time));
  return { seed: prepared.seed, n: sim.n, dt, waves, arm, matching, samples, completedTime: sim.step * dt,
    halted: sim.halted, peakDrift, peakMomentum, lateC6: late.length === protocol.lateTimes.length ? mean(late.map(s => s.c6)) : null,
    lateFlowFraction: late.length ? mean(late.map(s => s.coherentEnergyFraction)) : null,
    validNumerics: !sim.halted && peakDrift < protocol.maximumEnergyDrift && peakMomentum / sim.n < protocol.maximumMomentumPerParticle,
    validNeighborhoods: late.length === protocol.lateTimes.length && late.every(s => s.c6 !== null && s.eligibleFraction >= protocol.minimumCoverage && s.meanCoordination >= protocol.minimumMeanCoordination),
    flowDecayed: late.length === protocol.lateTimes.length && late.every(s => s.coherentEnergyFraction < protocol.maximumResidualFlow) };
}

function controls() {
  const shell = (angles, rotation = 0, seam = false) => {
    const x = [seam ? .2 : 5], y = [seam ? .2 : 5];
    for (const a of angles) { x.push((x[0] + Math.cos(a + rotation) + 10) % 10); y.push((y[0] + Math.sin(a + rotation) + 10) % 10); }
    return { x, y };
  };
  const hexAngles = Array.from({ length: 6 }, (_, i) => i * Math.PI / 3), squareAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  const read = (angles, rotation = 0, seam = false, harmonic = 6, periodic = true) => {
    const { x, y } = shell(angles, rotation, seam); return structure(x, y, 10, harmonic, periodic).perParticle[0];
  };
  const hex = read(hexAngles), square = read(squareAngles), rotated = read(hexAngles, .3123), seam = read(hexAngles, 0, true);
  const wrongHarmonic = read(hexAngles, 0, false, 4), ignoredSeam = read(hexAngles, 0, true, 6, false), sparse = read([0, Math.PI]);
  assert(Math.abs(hex.c6 - 1) < 1e-12 && Math.abs(square.c6 + 1 / 3) < 1e-12);
  assert(Math.abs(rotated.c6 - 1) < 1e-12 && Math.abs(seam.c6 - 1) < 1e-12 && seam.coordination === 6);
  assert.equal(sparse.c6, null); assert.equal(sparse.eligible, false);
  assert(Math.abs(wrongHarmonic.c6 - 1) > .5); assert(ignoredSeam.coordination !== 6);
  const irregularAngles = [.1, .4, 1.5, 2.9, 4.4];
  const irregular = read(irregularAngles).c6;
  let pairSum = 0;
  for (let i = 0; i < irregularAngles.length; i++) for (let j = 0; j < irregularAngles.length; j++)
    if (i !== j) pairSum += Math.cos(6 * (irregularAngles[i] - irregularAngles[j]));
  const explicitPairs = pairSum / (irregularAngles.length * (irregularAngles.length - 1));
  assert(Math.abs(irregular - explicitPairs) < 1e-12);
  // Independent least-squares fixture with exact orthogonal samples.
  const ys = Float64Array.from({ length: 32 }, (_, i) => i / 32), b = basis(ys, 1, 1);
  const known = Float64Array.from(ys, y => 3 * Math.sin(2 * Math.PI * y) + 2 * Math.cos(2 * Math.PI * y) + .7 * Math.sin(4 * Math.PI * y));
  const flowEnergy = project(known, b).energy;
  assert(Math.abs(flowEnergy - 32 * 13 / 4) < 1e-10);
  const prepared = { n: 32, L: 1, y: ys, K: 37 }, v = velocities(prepared, 1, 'memory-control');
  const exactFlowFraction = project(v.organized.vx, b).energy / energy(v.organized);
  assert(Math.abs(exactFlowFraction - .75) < 1e-12);
  const ordered = a => Array.from(a.vx, (u, i) => [u, a.vy[i]]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(ordered(v.organized), ordered(v.shuffled));
  for (const vv of Object.values(v)) {
    assert(Math.abs(energy(vv) - prepared.K) < 1e-12);
    assert(Math.hypot(vv.vx.reduce((s, u) => s + u, 0), vv.vy.reduce((s, u) => s + u, 0)) < 1e-12);
  }
  return { hex, square, rotated, seam, sparse, irregular, explicitPairs, flowEnergy, expectedFlowEnergy: 104,
    exactFlowFraction, shuffledDistributionExactlyPreserved: true, negativeControls: { wrongHarmonic, ignoredSeam }, passed: true };
}
const controlResults = controls();
if (process.argv.includes('--controls')) { console.log(JSON.stringify(controlResults, null, 2)); process.exit(0); }

function paired(group, comparator) {
  const seeds = [...new Set(group.map(r => r.seed))];
  const differences = seeds.map(seed => {
    const a = group.find(r => r.seed === seed && r.arm === 'organized'), b = group.find(r => r.seed === seed && r.arm === comparator);
    return { seed, difference: a.lateC6 === null || b.lateC6 === null ? null : a.lateC6 - b.lateC6 };
  });
  if (differences.some(r => r.difference === null)) return { differences, mean: null, ci95: null };
  const d = differences.map(r => r.difference), m = mean(d), sd = Math.sqrt(d.reduce((s, v) => s + (v - m) ** 2, 0) / (d.length - 1));
  const se = sd / Math.sqrt(d.length), interval = d.length === 8 ? [m - protocol.studentT975df7 * se, m + protocol.studentT975df7 * se] : null;
  return { differences, mean: m, sd, se, ci95: interval,
    thresholdMet: !!interval && (interval[0] > 0 || interval[1] < 0) && Math.abs(m) >= protocol.minimumEffect };
}
const started = performance.now(), runs = { main: [], halfStep: [], larger: [] }, preparations = [], matchingControls = [];
for (let index = 0; index < protocol.seeds.length; index++) {
  const seed = protocol.seeds[index], prepared = prepare(protocol.n, seed), v = velocities(prepared, protocol.waves, seed);
  preparations.push({ seed, n: prepared.n, ...prepared.preparation });
  for (const arm of protocol.arms) runs.main.push(run(prepared, v[arm], arm, protocol.dt, protocol.waves));
  const initial = runs.main.filter(r => r.seed === seed).map(r => r.samples[0]);
  assert(initial.every(r => r.c6 === initial[0].c6 && r.psi6 === initial[0].psi6));
  assert(Math.abs(initial[1].coherentEnergyFraction - .75) < 1e-12);
  matchingControls.push({ seed, initialC6Identical: true, organizedInitialFlowFraction: initial[1].coherentEnergyFraction,
    shuffledInitialFlowFraction: initial[2].coherentEnergyFraction });
  if (protocol.refinementSeeds.includes(index))
    for (const arm of protocol.arms) runs.halfStep.push(run(prepared, v[arm], arm, protocol.refinementDt, protocol.waves));
  if (protocol.largerSeeds.includes(index)) {
    const large = prepare(protocol.largerN, seed), vl = velocities(large, protocol.largerWaves, seed);
    preparations.push({ seed, n: large.n, ...large.preparation });
    for (const arm of protocol.arms) runs.larger.push(run(large, vl[arm], arm, protocol.dt, protocol.largerWaves));
  }
  console.error(`Completed seed ${index + 1}/${protocol.seeds.length}; elapsed ${((performance.now() - started) / 1000).toFixed(1)} s`);
}
const comparisons = { main: {}, halfStep: {}, larger: {} };
for (const name of Object.keys(runs)) for (const comparator of ['gaussian', 'shuffled']) comparisons[name][comparator] = paired(runs[name], comparator);
const refinement = ['gaussian', 'shuffled'].map(comparator => ({ comparator,
  seeds: comparisons.halfStep[comparator].differences.map(row => {
    const coarse = comparisons.main[comparator].differences.find(r => r.seed === row.seed).difference;
    const change = row.difference === null || coarse === null ? null : row.difference - coarse;
    return { seed: row.seed, coarse, fine: row.difference, change, passed: change !== null && Math.abs(change) < protocol.maximumRefinementDifference };
  }) }));
const allRuns = Object.values(runs).flat(), numericPass = preparations.every(p => p.valid) && allRuns.every(r => r.validNumerics);
const neighborhoodPass = runs.main.every(r => r.validNeighborhoods), refinementPass = refinement.every(r => r.seeds.every(s => s.passed));
const flowDecayed = runs.main.filter(r => r.arm === 'organized').every(r => r.flowDecayed);
const main = comparisons.main, effectSupported = main.gaussian.thresholdMet && main.shuffled.thresholdMet && main.gaussian.mean * main.shuffled.mean > 0;
const supported = numericPass && neighborhoodPass && refinementPass && effectSupported;
const conclusion = !numericPass ? 'Numerical controls failed; structural interpretation invalid.'
  : !neighborhoodPass ? 'Neighborhood coverage guard failed; primary structural test inconclusive.'
  : !effectSupported ? 'No preparation-dependent structural effect met the frozen magnitude and paired-interval criteria.'
  : !refinementPass ? 'An apparent structural difference did not pass the selected timestep-refinement guard.'
  : !flowDecayed ? 'Finite-time preparation-dependent structure detected while residual flow remains; not memory after flow decay.'
  : 'Bounded structural preparation dependence detected after the specified flow-decay threshold; established nonequilibrium behavior, not a novelty claim.';
const document = fs.readFileSync(path.join(root, 'experiments/MOLECULAR-MEMORY.md'), 'utf8');
const frozenProtocolText = document.slice(document.indexOf('## Protocol frozen'), document.indexOf('## Why this is useful'));
const result = { experiment: 'molecular-preparation-memory', timestamp: new Date().toISOString(),
  provenance: { moduleSHA256: hash(source), rngSHA256: hash(rngSource), scriptSHA256: hash(fs.readFileSync(__filename)),
    protocolSHA256: hash(JSON.stringify(protocol)), frozenProtocolTextSHA256: hash(frozenProtocolText) },
  protocol, controls: controlResults, matchingControls, preparations, runs, comparisons, refinement,
  decision: { numericPass, neighborhoodPass, refinementPass, flowDecayed, effectSupported: !!effectSupported,
    supported: !!supported, conclusion, novelty: 'Not claimed: established initial-condition and shear-ordering science.' },
  seconds: (performance.now() - started) / 1000 };
if (process.argv.includes('--write')) {
  const dest = path.join(root, 'experiments/results/molecular-memory.json'); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ provenance: result.provenance, comparisons, refinement, decision: result.decision, seconds: result.seconds }, null, 2));
if (!numericPass) process.exitCode = 1;
