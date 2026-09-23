// Independent equilibration / transport checks of the actual molecular module.
// node tools/molecular-equilibration-science.js [--write]
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const started = performance.now();
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const source = fs.readFileSync(path.join(root, 'src/modules/molecular.js'), 'utf8');
assert(source.includes('  Studio.register({'));
let mod;
const Studio = {
  util: { clamp: (v, a, b) => Math.max(a, Math.min(v, b)), makeRng: new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')() },
  PALETTES: new Proxy({}, { get: () => ({ bg: '#000000', colors: ['#ffffff'] }) }),
  register(m) { mod = m; },
};
const hooks = {};
new Function('Studio', 'hooks', source.replace('  Studio.register({', '  Object.assign(hooks,{pair,makeSim,RC,FC,UC});\n  Studio.register({'))(Studio, hooks);
const { makeSim } = hooks;
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const variance = a => { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1); };
const stderr = a => Math.sqrt(variance(a) / a.length);
const image = (d, L) => d - L * Math.round(d / L);

// Grow block size until at least four blocks remain (Flyvbjerg–Petersen style).
function blockStderr(series) {
  const n = series.length;
  assert(n >= 16);
  let best = { blockSize: 1, blocks: n, mean: mean(series), stderr: stderr(series), naiveStderr: stderr(series) };
  for (let b = 2; b * 4 <= n; b *= 2) {
    const blocks = [];
    for (let i = 0; i + b <= n; i += b) blocks.push(mean(series.slice(i, i + b)));
    best = { blockSize: b, blocks: blocks.length, mean: mean(blocks), stderr: stderr(blocks), naiveStderr: stderr(series) };
  }
  return best;
}

function fixture(n, extra = {}) {
  return { ...mod.defaults, n, density: .4, temperature: .8, dt: .002, warmup: 0, running: false, seed: 'molecular-eq-base', ...extra };
}

function runSeed({ n, seed, dt, eqSteps, prodSteps, sampleStride, msdTimes }) {
  const sim = makeSim(fixture(n, { seed, dt }));
  const L = sim.L;
  const ux = new Float64Array(n), uy = new Float64Array(n);
  const prevX = Float64Array.from(sim.x), prevY = Float64Array.from(sim.y);
  const temps = [], energies = [];
  const msdAt = {}, rawAt = {}, freeAt = {};
  let freeVx, freeVy, x0, y0, originStep = 0;

  function accumulate() {
    for (let i = 0; i < n; i++) {
      ux[i] += image(sim.x[i] - prevX[i], L);
      uy[i] += image(sim.y[i] - prevY[i], L);
      prevX[i] = sim.x[i]; prevY[i] = sim.y[i];
    }
  }
  function sampleMsd() {
    const t = (sim.step - originStep) * dt;
    for (const target of msdTimes) {
      if (msdAt[target] != null) continue;
      if (Math.abs(t - target) > .5 * dt) continue;
      let msd = 0, raw = 0, free = 0;
      for (let i = 0; i < n; i++) {
        msd += ux[i] * ux[i] + uy[i] * uy[i];
        // Deliberately wrong: squared coordinate differences without unwrapping wraps.
        const dx = sim.x[i] - x0[i], dy = sim.y[i] - y0[i];
        raw += dx * dx + dy * dy;
        free += (freeVx[i] * t) ** 2 + (freeVy[i] * t) ** 2;
      }
      msdAt[target] = msd / n; rawAt[target] = raw / n; freeAt[target] = free / n;
    }
  }

  for (let s = 0; s < eqSteps; s++) { sim.advance(1); assert.equal(sim.halted, ''); accumulate(); }
  originStep = sim.step;
  ux.fill(0); uy.fill(0);
  x0 = Float64Array.from(sim.x); y0 = Float64Array.from(sim.y);
  freeVx = Float64Array.from(sim.vx); freeVy = Float64Array.from(sim.vy);
  const energy0 = sim.kinetic + sim.potential;
  let peakDrift = 0;
  for (let s = 0; s < prodSteps; s++) {
    sim.advance(1); assert.equal(sim.halted, '');
    accumulate();
    peakDrift = Math.max(peakDrift, Math.abs(sim.kinetic + sim.potential - energy0) / sim.scale);
    if (s % sampleStride === 0) {
      temps.push(sim.temperature);
      energies.push((sim.kinetic + sim.potential) / n);
    }
    sampleMsd();
  }
  for (const target of msdTimes) {
    assert(msdAt[target] != null, 'missed MSD sample at t=' + target + ' seed=' + seed);
  }
  const Tblock = blockStderr(temps), Eblock = blockStderr(energies);
  const tLate = msdTimes[msdTimes.length - 1], tShort = msdTimes[0];
  return {
    seed, n, dt, L, steps: sim.step, eqSteps, prodSteps,
    temperature: Tblock, energyPerParticle: Eblock, peakRelativeEnergyDrift: peakDrift,
    msd: Object.fromEntries(msdTimes.map(t => [String(t), {
      unwrapped: msdAt[t], rawWrappedCoordinates: rawAt[t], freeFlightReference: freeAt[t],
    }])),
    ballisticRelativeError: Math.abs(msdAt[tShort] - freeAt[tShort]) / Math.max(1e-12, freeAt[tShort]),
    diffusionProxy: msdAt[tLate] / (4 * tLate),
    rawWrappedRelativeError: Math.abs(rawAt[tLate] - msdAt[tLate]) / Math.max(1e-12, msdAt[tLate]),
    totalMomentum: Math.hypot(sim.px, sim.py),
  };
}

const seeds = ['eq-a', 'eq-b', 'eq-c', 'eq-d', 'eq-e', 'eq-f', 'eq-g', 'eq-h'];
const msdTimes = [.02, .05, .2, 1, 5];
const eqSteps = 1500, prodSteps = 3000, sampleStride = 5;

const primary = seeds.map(seed => runSeed({
  n: 64, seed: 'molecular-eq/' + seed, dt: .002, eqSteps, prodSteps, sampleStride, msdTimes,
}));
const finite = seeds.slice(0, 4).map(seed => runSeed({
  n: 144, seed: 'molecular-eq-fs/' + seed, dt: .002, eqSteps, prodSteps, sampleStride, msdTimes,
}));
const fineDt = seeds.slice(0, 4).map(seed => runSeed({
  n: 64, seed: 'molecular-eq-dt/' + seed, dt: .001,
  eqSteps: eqSteps * 2, prodSteps: prodSteps * 2, sampleStride: sampleStride * 2, msdTimes,
}));

function summarize(runs, keyFn) {
  const values = runs.map(keyFn);
  return { values, mean: mean(values), stderrAcrossSeeds: stderr(values), nSeeds: values.length };
}

const Tsummary = summarize(primary, r => r.temperature.mean);
const Esummary = summarize(primary, r => r.energyPerParticle.mean);
const Dsummary = summarize(primary, r => r.diffusionProxy);
const ballistic = summarize(primary, r => r.ballisticRelativeError);
const rawFail = summarize(primary, r => r.rawWrappedRelativeError);
const Tfinite = summarize(finite, r => r.temperature.mean);
const Efinite = summarize(finite, r => r.energyPerParticle.mean);
const Tfine = summarize(fineDt, r => r.temperature.mean);
const Efine = summarize(fineDt, r => r.energyPerParticle.mean);

const correlationRatios = primary.map(r => r.temperature.stderr / Math.max(1e-15, r.temperature.naiveStderr));
assert(mean(correlationRatios) > 1.05, 'Block SE should exceed naive SE for autocorrelated MD temperatures');
assert(ballistic.mean < .2, 'Short-time MSD should track free-flight reference, got ' + ballistic.mean);
assert(primary.every(r => r.peakRelativeEnergyDrift < .02));
assert(primary.every(r => r.totalMomentum < 1e-10));

const tDiffFS = Math.abs(Tsummary.mean - Tfinite.mean);
const tCombinedFS = Math.hypot(Tsummary.stderrAcrossSeeds, Tfinite.stderrAcrossSeeds);
const eDiffFS = Math.abs(Esummary.mean - Efinite.mean);
const eCombinedFS = Math.hypot(Esummary.stderrAcrossSeeds, Efinite.stderrAcrossSeeds);
const tDiffDt = Math.abs(Tsummary.mean - Tfine.mean);
const tCombinedDt = Math.hypot(Tsummary.stderrAcrossSeeds, Tfine.stderrAcrossSeeds);
const eDiffDt = Math.abs(Esummary.mean - Efine.mean);
const eCombinedDt = Math.hypot(Esummary.stderrAcrossSeeds, Efine.stderrAcrossSeeds);
assert(tDiffFS < 8 * Math.max(tCombinedFS, 1e-4), 'Finite-size T shift unexpectedly large: ' + tDiffFS);
assert(tDiffDt < 8 * Math.max(tCombinedDt, 1e-4), 'Timestep T shift unexpectedly large: ' + tDiffDt);

// Failure controls that must separate from the correct analysis.
assert(rawFail.mean > .3, 'Raw wrapped-coordinate MSD failure control did not separate, got ' + rawFail.mean);
const wrong = makeSim(fixture(64, { seed: 'molecular-eq/wrong-dof' }));
wrong.advance(500);
const independentT = wrong.kinetic / (wrong.n - 1), wrongT = wrong.kinetic / wrong.n;
const wrongDofError = Math.abs(wrongT - independentT);
assert(wrongDofError > 1e-4);
assert(Math.abs(wrong.temperature - independentT) < 1e-12);
const transient = makeSim(fixture(64, { seed: 'molecular-eq/transient' }));
const early = [];
for (let i = 0; i < 200; i++) { transient.advance(1); if (i % 5 === 0) early.push(transient.temperature); }
const earlyMean = mean(early);
assert(Math.abs(earlyMean - Tsummary.mean) > 2 * Tsummary.stderrAcrossSeeds);

const result = {
  scope: 'Actual Float64 2D force-shifted LJ NVE module: multi-seed equilibration of kinetic temperature and energy per particle with block-averaged uncertainty, short-time ballistic MSD against an independent force-free Float64 free-flight reference, late-time MSD/(4t) diffusion proxy, N=64 vs N=144 finite-size and dt=.002 vs .001 timestep controls. No EOS, melting, phase coexistence or experimental transport claim.',
  sourceSha256,
  command: 'node tools/molecular-equilibration-science.js',
  domain: {
    density: .4, initialTemperature: .8, nPrimary: 64, nFiniteSize: 144,
    dt: .002, dtFine: .001, eqSteps, prodSteps, sampleStride, msdTimes,
    independentSeeds: seeds.length,
    precision: 'Float64Array positions/velocities/forces; independent free-flight reference in Float64',
  },
  primary: {
    runs: primary.map(r => ({
      seed: r.seed, temperature: r.temperature, energyPerParticle: r.energyPerParticle,
      diffusionProxy: r.diffusionProxy, ballisticRelativeError: r.ballisticRelativeError,
      peakRelativeEnergyDrift: r.peakRelativeEnergyDrift, msd: r.msd,
      rawWrappedRelativeError: r.rawWrappedRelativeError,
    })),
    temperature: Tsummary, energyPerParticle: Esummary, diffusionProxy: Dsummary,
    ballisticRelativeError: ballistic, meanBlockOverNaiveSE: mean(correlationRatios),
  },
  finiteSize: {
    n: 144, seeds: finite.length, temperature: Tfinite, energyPerParticle: Efinite,
    temperatureDifference: tDiffFS, temperatureCombinedStderr: tCombinedFS,
    energyDifference: eDiffFS, energyCombinedStderr: eCombinedFS,
  },
  timestep: {
    dt: .001, seeds: fineDt.length, temperature: Tfine, energyPerParticle: Efine,
    temperatureDifference: tDiffDt, temperatureCombinedStderr: tCombinedDt,
    energyDifference: eDiffDt, energyCombinedStderr: eCombinedDt,
  },
  failureControls: {
    rawWrappedMsdRelativeErrorMean: rawFail.mean,
    wrongTemperatureDivisorError: wrongDofError,
    transientMeanTemperature: earlyMean,
    transientVersusEquilibratedGap: Math.abs(earlyMean - Tsummary.mean),
    moduleMatchesIndependentDoF: true,
  },
  limitations: [
    'Bounded fluid-density NVE fixtures only; not an equation of state, melting point, or phase diagram.',
    'Diffusion proxy is MSD/(4t) at a single late time, not a plateaued Green–Kubo integral or continuum experimental D.',
    'Finite-size and timestep comparisons use four seeds each; residual shifts within a few combined standard errors are reported, not eliminated.',
    'No thermostat: kinetic temperature is an NVE observable, not a canonical control parameter.',
  ],
  elapsedSeconds: (performance.now() - started) / 1000,
  pass: true,
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/molecular-equilibration-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({
  pass: result.pass,
  temperature: result.primary.temperature,
  energyPerParticle: result.primary.energyPerParticle,
  diffusionProxy: result.primary.diffusionProxy,
  ballisticRelativeError: result.primary.ballisticRelativeError,
  meanBlockOverNaiveSE: result.primary.meanBlockOverNaiveSE,
  finiteSize: { T: result.finiteSize.temperature, dT: result.finiteSize.temperatureDifference, se: result.finiteSize.temperatureCombinedStderr },
  timestep: { T: result.timestep.temperature, dT: result.timestep.temperatureDifference, se: result.timestep.temperatureCombinedStderr },
  failureControls: result.failureControls,
  elapsedSeconds: result.elapsedSeconds,
}, null, 2));
if (process.argv.includes('--write')) {
  // full artifact already written
} else {
  // still emit full when not writing? keep quiet summary above; full via --write path only for size
}
