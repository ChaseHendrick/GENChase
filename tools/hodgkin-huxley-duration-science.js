// Parameter-domain and long-duration Float64 checks of the actual HH solver.
// Subtract-before-add: wrong sodium exponent and swapped reversal potentials must fail first.
// node tools/hodgkin-huxley-duration-science.js [--write]
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/hodgkin-huxley.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
const started = performance.now();

function load(text = source) {
  const hooks = {}, marker = '  Studio.register({';
  assert.equal(text.split(marker).length, 2);
  let mod;
  const Studio = {
    util: { makeRng, clamp: (x, a, b) => Math.max(a, Math.min(x, b)) },
    gl: { GLSL: { bicubic: '', ramp: '' } },
    PALETTES: new Proxy({}, { get: () => ({}) }),
    register(m) { mod = m; },
  };
  new Function('Studio', 'hooks', text.replace(marker, '  Object.assign(hooks,{P,exprel,rates,rhs,rk4,makeSim});\n' + marker))(Studio, hooks);
  return { ...hooks, mod };
}

const A = load();
const config = p => ({ ...A.mod.defaults, ...p });

// Independent modern-voltage formulas (depolarization relative to -65 mV rest). Not the production RHS.
const trap = z => Math.abs(z) < 1e-7 ? 1 - z / 2 + z * z / 12 : z / (Math.exp(z) - 1);
function referenceRates(V) {
  const u = V + 65;
  return [
    trap((25 - u) / 10), 4 * Math.exp(-u / 18),
    .07 * Math.exp(-u / 20), 1 / (1 + Math.exp((30 - u) / 10)),
    .1 * trap((10 - u) / 10), .125 * Math.exp(-u / 80),
  ];
}
function referenceRhs(y, I, rev = { ENa: 50, EK: -77, EL: -54.387 }) {
  const [V, m, h, n] = y, r = referenceRates(V);
  return [
    I - 120 * m * m * m * h * (V - rev.ENa) - 36 * n * n * n * n * (V - rev.EK) - .3 * (V - rev.EL),
    r[0] - (r[0] + r[1]) * m,
    r[2] - (r[2] + r[3]) * h,
    r[4] - (r[4] + r[5]) * n,
  ];
}
const maxError = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

// Dormand–Prince 5(4), independent stages/RHS. Sample every 0.1 ms.
const B = [
  [], [1 / 5], [3 / 40, 9 / 40], [44 / 45, -56 / 15, 32 / 9],
  [19372 / 6561, -25360 / 2187, 64448 / 6561, -212 / 729],
  [9017 / 3168, -355 / 33, 46732 / 5247, 49 / 176, -5103 / 18656],
  [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84],
];
const W5 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0];
const W4 = [5179 / 57600, 0, 7571 / 16695, 393 / 640, -92097 / 339200, 187 / 2100, 1 / 40];

function dopri(opts) {
  const {
    duration = 30, start = 5, pulse = 20, current = 10, tolerance = 2e-12,
    V0 = -65, rhs = referenceRhs, sampleDt = .1,
  } = opts;
  const r0 = referenceRates(V0);
  let y = [V0, r0[0] / (r0[0] + r0[1]), r0[2] / (r0[2] + r0[3]), r0[4] / (r0[4] + r0[5])];
  let t = 0, h = .01, accepted = 0, rejected = 0;
  const samples = [y.slice()], spikes = [];
  const nSamples = Math.round(duration / sampleDt);
  for (let sample = 1; sample <= nSamples; sample++) {
    const target = sample * sampleDt;
    while (t < target - 1e-12) {
      h = Math.min(h, target - t);
      const I = t >= start - 1e-12 && t < start + pulse - 1e-12 ? current : 0;
      const k = [];
      for (let stage = 0; stage < 7; stage++) {
        const state = y.map((v, j) => v + h * B[stage].reduce((sum, b, i) => sum + b * k[i][j], 0));
        k.push(rhs(state, I));
      }
      const high = y.map((v, j) => v + h * W5.reduce((sum, b, i) => sum + b * k[i][j], 0));
      const low = y.map((v, j) => v + h * W4.reduce((sum, b, i) => sum + b * k[i][j], 0));
      const norm = Math.max(...high.map((v, j) => Math.abs(v - low[j]) / (tolerance * (1 + Math.max(Math.abs(v), Math.abs(y[j]))))));
      if (norm <= 1) {
        if (y[0] < 0 && high[0] >= 0) spikes.push(t + h * (-y[0]) / (high[0] - y[0]));
        y = high; t += h; accepted++;
      } else rejected++;
      h *= Math.max(.2, Math.min(4, .9 * Math.max(norm, 1e-16) ** (-.2)));
      assert(h > 1e-12 && accepted + rejected < 5e6, 'DOPRI stall');
    }
    samples.push(y.slice());
  }
  return { samples, spikes, accepted, rejected, tolerance, final: y, minV: Math.min(...samples.map(s => s[0])), maxV: Math.max(...samples.map(s => s[0])) };
}

function trajectory(dt, fixture, solver = A) {
  const sim = solver.makeSim(config({
    n: 1, spread: 0, jitter: 0, seed: 'hh-duration',
    current: fixture.current, start: fixture.start, pulse: fixture.pulse,
    duration: fixture.duration, dt,
  }));
  const samples = [Array.from(sim.state)], stride = Math.round(.1 / dt);
  const nSamples = Math.round(fixture.duration / .1);
  for (let i = 0; i < nSamples; i++) {
    sim.advance(stride);
    assert.equal(sim.halted, '');
    samples.push(Array.from(sim.state));
  }
  assert.equal(sim.step, sim.totalSteps);
  return { sim, samples, spikes: sim.events[0].slice() };
}

function compare(run, ref) {
  let voltage = 0, gates = 0, squared = 0;
  run.samples.forEach((row, i) => row.forEach((v, j) => {
    const error = Math.abs(v - ref.samples[i][j]);
    if (j === 0) voltage = Math.max(voltage, error); else gates = Math.max(gates, error);
    squared += (error / (j === 0 ? 100 : 1)) ** 2;
  }));
  const spikeCountDelta = Math.abs(run.spikes.length - ref.spikes.length);
  let spikeTimeMax = 0;
  const n = Math.min(run.spikes.length, ref.spikes.length);
  for (let i = 0; i < n; i++) spikeTimeMax = Math.max(spikeTimeMax, Math.abs(run.spikes[i] - ref.spikes[i]));
  return {
    maxVoltageErrorMv: voltage,
    maxGateError: gates,
    normalizedRmsError: Math.sqrt(squared / (4 * run.samples.length)),
    spikeCount: run.spikes.length,
    refSpikeCount: ref.spikes.length,
    spikeCountDelta,
    spikeTimeMaxMs: spikeTimeMax,
    minVoltageMv: run.sim.minV,
    maxVoltageMv: run.sim.maxV,
    timeMs: run.sim.time,
  };
}

const short = { current: 10, start: 5, pulse: 20, duration: 40 };
const long = { current: 10, start: 5, pulse: 160, duration: 200 };
const quietLong = { current: 0, start: 5, pulse: 20, duration: 200 };

// --- Failure controls first (subtract before add) ---
const refShort = dopri({ ...short, tolerance: 2e-12 });
assert(refShort.spikes.length >= 2);

const wrongNa = load(source.replace('p.gNa * m ** 3', 'p.gNa * m ** 2'));
assert.notEqual(wrongNa === A, true);
const wrongNaRun = trajectory(.01, short, wrongNa);
const wrongNaCmp = compare(wrongNaRun, refShort);
assert(wrongNaCmp.maxVoltageErrorMv > 5,
  'wrong-Na control did not separate: ' + wrongNaCmp.maxVoltageErrorMv);
assert(wrongNaCmp.spikeCountDelta > 0 || wrongNaCmp.maxVoltageErrorMv > 20,
  'wrong-Na must disagree on spikes or voltage');

const swappedRev = (y, I) => referenceRhs(y, I, { ENa: -77, EK: 50, EL: -54.387 });
const swappedRef = dopri({ ...short, tolerance: 1e-10, rhs: swappedRev });
const correctShort = trajectory(.01, short);
const swappedCmp = compare(correctShort, swappedRef);
assert(swappedCmp.maxVoltageErrorMv > 20,
  'swapped-reversal control did not separate: ' + swappedCmp.maxVoltageErrorMv);

const failureControls = {
  wrongSodiumExponent: {
    mutation: 'gNa m**3 -> m**2',
    maxVoltageErrorMv: wrongNaCmp.maxVoltageErrorMv,
    spikeCountDelta: wrongNaCmp.spikeCountDelta,
    separated: true,
  },
  swappedReversalPotentials: {
    mutation: 'ENa <-> EK in independent reference',
    maxVoltageErrorMv: swappedCmp.maxVoltageErrorMv,
    spikeCountDelta: swappedCmp.spikeCountDelta,
    separated: true,
  },
};

// --- Parameter domain: current amplitudes across the UI half-range ---
const currents = [-4, 0, 5, 10, 15, 25];
const currentScan = [];
for (const current of currents) {
  const fixture = { current, start: 5, pulse: 25, duration: 50 };
  const ref = dopri({ ...fixture, tolerance: 2e-12 });
  const run = trajectory(.005, fixture);
  const cmp = compare(run, ref);
  assert(cmp.maxVoltageErrorMv < .05, 'current=' + current + ' voltage error ' + cmp.maxVoltageErrorMv);
  assert(cmp.maxGateError < 1e-4, 'current=' + current + ' gate error ' + cmp.maxGateError);
  assert(cmp.spikeCountDelta === 0, 'current=' + current + ' spike count delta ' + cmp.spikeCountDelta);
  if (cmp.spikeCount > 0) assert(cmp.spikeTimeMaxMs < .05, 'current=' + current + ' spike time ' + cmp.spikeTimeMaxMs);
  currentScan.push({
    currentDensity: current, durationMs: fixture.duration, pulseMs: fixture.pulse, dtMs: .005,
    ...cmp, refSpikes: ref.spikes, acceptedSteps: ref.accepted, rejectedSteps: ref.rejected,
  });
}
assert(currentScan.find(r => r.currentDensity === 0).spikeCount === 0);
assert(currentScan.find(r => r.currentDensity === 10).spikeCount >= 2);
// Inhibitory steps may rebound after release; require DOPRI5 agreement only (already asserted).
const inhib = currentScan.find(r => r.currentDensity === -4);
assert(inhib.spikeCountDelta === 0 && inhib.maxVoltageErrorMv < .05);

// --- Parameter domain: shipped RK4 steps on the short driven fixture ---
const dtScan = [];
const refFineShort = dopri({ ...short, tolerance: 1e-12 });
for (const dt of [.01, .005, .0025]) {
  const run = trajectory(dt, short);
  const cmp = compare(run, refFineShort);
  assert(cmp.maxVoltageErrorMv < .002, 'dt=' + dt + ' voltage ' + cmp.maxVoltageErrorMv);
  assert(cmp.spikeCountDelta === 0);
  dtScan.push({ dtMs: dt, ...cmp });
}
for (let i = 1; i < dtScan.length; i++) {
  const ratio = dtScan[i - 1].normalizedRmsError / dtScan[i].normalizedRmsError;
  dtScan[i].errorReduction = ratio;
  assert(ratio > 8 && ratio < 30, 'dt refinement ratio ' + ratio);
}

// --- Parameter domain: pulse lengths ---
const pulses = [1, 20, 80];
const pulseScan = [];
for (const pulse of pulses) {
  const fixture = { current: 12, start: 5, pulse, duration: Math.max(40, pulse + 20) };
  const ref = dopri({ ...fixture, tolerance: 2e-12 });
  const run = trajectory(.005, fixture);
  const cmp = compare(run, ref);
  assert(cmp.maxVoltageErrorMv < .05 && cmp.spikeCountDelta === 0, 'pulse=' + pulse);
  pulseScan.push({ pulseMs: pulse, durationMs: fixture.duration, dtMs: .005, ...cmp, refSpikeCount: ref.spikes.length });
}
assert(pulseScan[0].spikeCount >= 1); // brief strong pulse still spikes
assert(pulseScan[2].spikeCount >= pulseScan[0].spikeCount);

// --- Long duration: 200 ms sustained drive and quiet rest ---
const refLong = dopri({ ...long, tolerance: 2e-12 });
assert(refLong.spikes.length >= 8, 'expected many spikes on long drive, got ' + refLong.spikes.length);

const longRefinement = [];
for (const dt of [.01, .005]) {
  const t0 = performance.now();
  const run = trajectory(dt, long);
  const cmp = compare(run, refLong);
  assert(cmp.maxVoltageErrorMv < .05, 'long dt=' + dt + ' voltage ' + cmp.maxVoltageErrorMv);
  assert(cmp.maxGateError < 2e-4, 'long dt=' + dt + ' gates ' + cmp.maxGateError);
  assert(cmp.spikeCountDelta === 0, 'long dt=' + dt + ' spike delta ' + cmp.spikeCountDelta);
  assert(cmp.spikeTimeMaxMs < .05, 'long dt=' + dt + ' spike time ' + cmp.spikeTimeMaxMs);
  assert(run.sim.maxV > 30 && run.sim.maxV < 50);
  assert(run.sim.minV > -90 && run.sim.minV < -50);
  longRefinement.push({
    dtMs: dt, milliseconds: performance.now() - t0,
    ...cmp, spikes: run.spikes, refSpikes: refLong.spikes,
  });
}
{
  const ratio = longRefinement[0].normalizedRmsError / longRefinement[1].normalizedRmsError;
  longRefinement[1].errorReduction = ratio;
  assert(ratio > 8 && ratio < 30, 'long refinement ratio ' + ratio);
}

const quiet = trajectory(.01, quietLong);
assert.equal(quiet.sim.totalSpikes, 0);
assert(Math.abs(quiet.sim.state[0] + 65) < .02);
assert(quiet.sim.maxV < -60 && quiet.sim.minV > -70);
const quietResult = {
  durationMs: quietLong.duration, dtMs: .01, spikes: quiet.sim.totalSpikes,
  finalVoltageMv: quiet.sim.state[0], minVoltageMv: quiet.sim.minV, maxVoltageMv: quiet.sim.maxV,
};

// Cross-check: independent DOPRI5 vs itself at two tolerances on the long fixture
const refLongLoose = dopri({ ...long, tolerance: 1e-11 });
const referenceUncertainty = Math.max(...refLong.samples.map((row, i) => maxError(row, refLongLoose.samples[i])));
assert(referenceUncertainty < 1e-6, 'long reference uncertainty ' + referenceUncertainty);

const result = {
  scope: 'Float64 classical squid HH at 6.3 C: parameter-domain current/dt/pulse scans and long-duration (200 ms) sustained-drive convergence versus an independently expressed modern-voltage Dormand–Prince 5(4) reference. Single-compartment only; no spatial axon exists in the module.',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  harnessSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
  command: 'node tools/hodgkin-huxley-duration-science.js',
  domain: {
    currentsUA: currents,
    dtMs: [.01, .005, .0025],
    pulseMs: pulses,
    shortFixture: short,
    longFixture: long,
    quietFixture: quietLong,
    precision: 'Float64Array membrane state; independent DOPRI5 trajectory reference in Float64',
    spatialAxon: false,
  },
  failureControls,
  currentScan: currentScan.map(({ refSpikes, ...row }) => ({ ...row, refSpikeCount: row.refSpikeCount })),
  dtScan,
  pulseScan,
  longDuration: {
    fixture: long,
    reference: {
      method: 'Independently expressed modern-voltage RHS and Dormand-Prince 5(4)',
      tolerance: refLong.tolerance,
      acceptedSteps: refLong.accepted,
      rejectedSteps: refLong.rejected,
      spikeCount: refLong.spikes.length,
      minVoltageMv: refLong.minV,
      maxVoltageMv: refLong.maxV,
      uncertaintyVsLooserTol: referenceUncertainty,
    },
    refinement: longRefinement.map(({ spikes, refSpikes, ...row }) => ({
      ...row, spikeCount: row.spikeCount, firstSpikeMs: spikes[0], lastSpikeMs: spikes.at(-1),
    })),
    quiet: quietResult,
  },
  seconds: (performance.now() - started) / 1000,
  limitations: 'Bounded deterministic single-compartment ODE evidence only. No spatial axon, synapses, stochastic channels, temperature sweep, network, or experimental validation. Parameter scans cover stated currents, shipped timesteps and pulse lengths; not every UI combination. Long-duration fixture is 200 ms sustained drive, not an infinite-time stability proof.',
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/hodgkin-huxley-duration-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
