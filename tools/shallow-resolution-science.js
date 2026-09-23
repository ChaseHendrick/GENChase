// Independent resolution, parameter, boundary and long-duration checks of the actual solver.
// Subtract-before-add: wrong acoustic frequency and non-reflecting wall mutant must fail first.
// node tools/shallow-resolution-science.js [--write]
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/shallow.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();

function load(text = source) {
  let mod; const hooks = {};
  const Studio = {
    util: { TAU: 2 * Math.PI, makeRng, clamp: (v, a, b) => Math.max(a, Math.min(v, b)) },
    gl: { GLSL: { bicubic: '', ramp: '' } },
    PALETTES: new Proxy({}, { get: () => ({ bg: '#000', colors: ['#fff'] }) }),
    register(m) { mod = m; },
  };
  new Function('Studio', 'hooks', text.replace('  Studio.register({', '  Object.assign(hooks,{makeSim,flux});\n  Studio.register({'))(Studio, hooks);
  return { ...hooks, mod };
}

const { makeSim, mod } = load();
const state = extra => ({ ...mod.defaults, seed: 'shallow-resolution', warmup: 0, running: false, ...extra });
function until(sim, t) {
  while (sim.time < t - 1e-13 && !sim.halted) sim.advance(1, t);
  assert.equal(sim.halted, '');
  assert(Math.abs(sim.time - t) < 1e-12);
}

// Independent exact 1D wet dam break (Ketcheson/LeVeque/del Razo style), g=1.
const hl = 2, hr = 1, w = 2 * Math.sqrt(hl);
const equation = h => 2 * (Math.sqrt(h) - Math.sqrt(hl)) + (h - hr) * Math.sqrt(.5 * (1 / h + 1 / hr));
let lo = hr, hi = hl;
for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (equation(m) > 0) hi = m; else lo = m; }
const hs = (lo + hi) / 2, us = w - 2 * Math.sqrt(hs), head = -Math.sqrt(hl), tail = us - Math.sqrt(hs), shock = hs * us / (hs - hr);
assert(Math.abs(equation(hs)) < 1e-12);
function exactCell(x0, x1, time) {
  const a = (x0 - .5) / time, b = (x1 - .5) / time;
  const edges = [-Infinity, head, tail, shock, Infinity]; let h = 0, momentum = 0;
  const ih = x => (w * w * x - w * x * x + x ** 3 / 3) / 9;
  const im = x => (w ** 3 * x - w * x ** 3 + .5 * x ** 4) / 27;
  for (let j = 0; j < 4; j++) {
    const l = Math.max(a, edges[j]), r = Math.min(b, edges[j + 1]); if (r <= l) continue;
    if (j === 1) { h += ih(r) - ih(l); momentum += im(r) - im(l); }
    else { h += (r - l) * [hl, 0, hs, hr][j]; if (j === 2) momentum += (r - l) * hs * us; }
  }
  return { h: h * time / (x1 - x0), momentum: momentum * time / (x1 - x0) };
}

function damBreak(N, aspect = '1:1', factory = makeSim, time = .08) {
  const sim = factory(state({ grid: N, aspect, boundary: 'walls', pattern: 'drop', amplitude: 0 }));
  const { nx, ny } = sim;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) sim.h[y * nx + x] = x < nx / 2 ? hl : hr;
  sim.mx.fill(0); sim.my.fill(0); sim.reference();
  const t0 = performance.now();
  until(sim, time);
  let depthL1 = 0, momentumL1 = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const r = exactCell(x / nx, (x + 1) / nx, time), k = y * nx + x;
    depthL1 += Math.abs(sim.h[k] - r.h);
    momentumL1 += Math.abs(sim.mx[k] - r.momentum);
  }
  const cells = nx * ny;
  return {
    grid: N, nx, ny, aspect, steps: sim.step, time: sim.time, milliseconds: performance.now() - t0,
    depthL1: depthL1 / cells, momentumL1: momentumL1 / cells,
    massDrift: sim.massDrift, minDepth: sim.minDepth, energy: sim.energy,
  };
}

// --- Resolution: dam-break refinement through 512² ---
const damGrids = [64, 128, 256, 512];
const damBreakResolution = damGrids.map(N => damBreak(N));
for (let i = 1; i < damBreakResolution.length; i++) {
  damBreakResolution[i].depthErrorRatio = damBreakResolution[i - 1].depthL1 / damBreakResolution[i].depthL1;
  damBreakResolution[i].momentumErrorRatio = damBreakResolution[i - 1].momentumL1 / damBreakResolution[i].momentumL1;
  assert(damBreakResolution[i].depthErrorRatio > 1.2 && damBreakResolution[i].depthErrorRatio < 2.5,
    'depth ratio at N=' + damGrids[i] + ': ' + damBreakResolution[i].depthErrorRatio);
}
assert(damBreakResolution.at(-1).depthL1 < .014 && damBreakResolution.at(-1).momentumL1 < .02);
for (const r of damBreakResolution) {
  assert(Math.abs(r.massDrift) < 3e-12);
  assert(r.minDepth > .99);
}

// Deliberate pressure omission must fail the dam-break momentum benchmark (subtract-before-add).
const pressureMutation = source.replaceAll('.5 * (hl * hl + hr * hr)', '0');
assert.notEqual(pressureMutation, source);
const pressureOmitted = damBreak(128, '1:1', load(pressureMutation).makeSim);
assert(pressureOmitted.momentumL1 > 3 * damBreakResolution[1].momentumL1,
  'pressure-omit control did not separate: ' + pressureOmitted.momentumL1);


// --- Parameter: CFL and amplitude on independent linearized oblique wave ---
const amplitude = 1e-5, waveTime = .1, k = 2 * Math.PI, omegaCorrect = k * Math.sqrt(2);
function smoothWave(N, { courant = .45, amp = amplitude, omega = omegaCorrect, aspect = '1:1', time = waveTime } = {}) {
  const sim = makeSim(state({ grid: N, aspect, boundary: 'periodic', courant, pattern: 'drop', amplitude: 0 }));
  const { nx, ny } = sim, sincX = Math.sin(Math.PI / nx) / (Math.PI / nx), sincY = Math.sin(Math.PI / ny) / (Math.PI / ny);
  const cellFactor = sincX * sincY;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const i = y * nx + x, a = amp * cellFactor * Math.cos(k * ((x + .5) / nx + (y + .5) / ny));
    sim.h[i] = 1 + a; sim.mx[i] = a / Math.sqrt(2); sim.my[i] = a / Math.sqrt(2);
  }
  sim.reference();
  const px0 = sim.momentumX, py0 = sim.momentumY, mass0 = sim.mass;
  until(sim, time);
  let square = 0;
  for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
    const a = amp * cellFactor * Math.cos(k * ((x + .5) / nx + (y + .5) / ny) - omega * time);
    square += (sim.h[y * nx + x] - 1 - a) ** 2;
  }
  return {
    grid: N, nx, ny, aspect, courant, amplitude: amp, omega, time, steps: sim.step,
    relativeRMS: Math.sqrt(square / (nx * ny)) / amp,
    massDrift: (sim.mass - mass0) / mass0,
    momentumError: Math.hypot(sim.momentumX - px0, sim.momentumY - py0),
    minDepth: sim.minDepth,
  };
}

const cflScan = [.25, .45, .7].map(courant => smoothWave(64, { courant }));
for (const row of cflScan) {
  assert(row.relativeRMS < .12, 'CFL=' + row.courant + ' RMS ' + row.relativeRMS);
  assert(Math.abs(row.massDrift) < 1e-12 && row.momentumError < 1e-12);
}
const cflSpread = Math.max(...cflScan.map(r => r.relativeRMS)) / Math.min(...cflScan.map(r => r.relativeRMS));
assert(cflSpread < 2.5, 'CFL RMS spread ' + cflSpread);

const ampScan = [5e-6, 1e-5, 2e-5].map(amp => smoothWave(64, { amp }));
for (const row of ampScan) {
  assert(row.relativeRMS < .12);
  assert(Math.abs(row.massDrift) < 1e-12);
}
const ampSpread = Math.max(...ampScan.map(r => r.relativeRMS)) / Math.min(...ampScan.map(r => r.relativeRMS));
assert(ampSpread < 1.5, 'amplitude RMS spread ' + ampSpread);

// --- Boundary / aspect: non-square dam and wall impermeability ---
const aspectDam = damBreak(64, '4:5');
assert(aspectDam.ny === 80 && aspectDam.nx === 64);
assert(aspectDam.depthL1 < .04 && Math.abs(aspectDam.massDrift) < 3e-12);
aspectDam.depthErrorRatioVsSquare = damBreakResolution[0].depthL1 / aspectDam.depthL1;

function wallFlow(factory = makeSim, time = .25) {
  const sim = factory(state({ grid: 64, boundary: 'walls', pattern: 'drop', amplitude: 0, courant: .45 }));
  sim.h.fill(1.2); sim.mx.fill(.15); sim.my.fill(0); sim.reference();
  const mass0 = sim.mass, px0 = sim.momentumX, before = Float64Array.from(sim.h);
  until(sim, time);
  return {
    time: sim.time, steps: sim.step, massDrift: (sim.mass - mass0) / mass0,
    initialMomentumX: px0, momentumX: sim.momentumX, momentumY: sim.momentumY, minDepth: sim.minDepth,
    maxDepthChange: before.reduce((m, v, i) => Math.max(m, Math.abs(v - sim.h[i])), 0),
  };
}
const wallImpermeable = wallFlow();
assert(Math.abs(wallImpermeable.massDrift) < 3e-12);
assert(wallImpermeable.minDepth > .5);
assert(Math.abs(wallImpermeable.momentumY) < 1e-14);

// --- Long-duration: conservation stress and multi-period acoustic wave ---
const longTime = 1.0;
const longStress = [];
for (const boundary of ['periodic', 'walls']) {
  const sim = makeSim(state({ grid: 64, boundary, courant: .6, pattern: 'drop', amplitude: 0 }));
  const rng = makeRng('shallow-resolution/long/' + boundary);
  for (let i = 0; i < sim.h.length; i++) {
    sim.h[i] = rng.range(.2, 2.5);
    sim.mx[i] = sim.h[i] * rng.range(-1.2, 1.2);
    sim.my[i] = sim.h[i] * rng.range(-1.2, 1.2);
  }
  sim.reference();
  const e0 = sim.energy, px0 = sim.momentumX, py0 = sim.momentumY, t0 = performance.now();
  until(sim, longTime);
  const row = {
    boundary, time: sim.time, steps: sim.step, milliseconds: performance.now() - t0,
    minDepth: sim.minDepth, massDrift: sim.massDrift, energyRatio: sim.energy / e0,
    momentumError: Math.hypot(sim.momentumX - px0, sim.momentumY - py0),
  };
  assert(sim.minDepth > 0 && Math.abs(sim.massDrift) < 3e-12 && sim.energy <= e0 * (1 + 1e-12));
  if (boundary === 'periodic') assert(row.momentumError < 1e-12);
  longStress.push(row);
}

const longWave = [64, 128].map(N => smoothWave(N, { time: longTime, courant: .45 }));
for (let i = 1; i < longWave.length; i++) {
  longWave[i].order = Math.log2(longWave[i - 1].relativeRMS / longWave[i].relativeRMS);
  assert(longWave[i].order > .7 && longWave[i].order < 1.4, 'long-wave order ' + longWave[i].order);
  assert(Math.abs(longWave[i].massDrift) < 1e-12 && longWave[i].momentumError < 1e-12);
}
assert(longWave[1].relativeRMS < .35, 'long-wave fine RMS ' + longWave[1].relativeRMS);

// --- Failure controls (subtract before add) ---
// 1) Wrong acoustic frequency ω=2π (missing √2) must miss the long-wave acceptance.
const wrongOmega = smoothWave(128, { time: longTime, omega: k });
assert(wrongOmega.relativeRMS > .5, 'wrong-omega control did not separate: ' + wrongOmega.relativeRMS);
assert(wrongOmega.relativeRMS > 2 * longWave[1].relativeRMS);

// 2) Walls implemented as periodic wrap must conserve streamwise momentum, unlike true walls.
const wallMutation = source.replace(
  "} else if (s.boundary === 'walls') {",
  "} else if (s.boundary === 'walls') {\n"
  + "          for (let y = 0; y < ny; y++) face(y * nx + nx - 1, y * nx, 0);\n"
  + "          for (let x = 0; x < nx; x++) face((ny - 1) * nx + x, x, 1);\n"
  + "        } else if (false && s.boundary === 'walls') {"
);
assert.notEqual(wallMutation, source);
const fakeWalls = load(wallMutation).makeSim;
const wallAsPeriodic = wallFlow(fakeWalls);
assert(Math.abs(wallAsPeriodic.massDrift) < 3e-12);
assert(Math.abs(wallAsPeriodic.momentumX - wallImpermeable.momentumX) > 1e-3,
  'walls-as-periodic control did not separate momentum: correct='
  + wallImpermeable.momentumX + ' fake=' + wallAsPeriodic.momentumX);
// Correct reflecting walls must remove streamwise momentum relative to the periodic impostor.
assert(Math.abs(wallImpermeable.momentumX) < Math.abs(wallAsPeriodic.momentumX));

const result = {
  scope: 'Float64 wet flat-bed Saint-Venant: dam-break resolution through 512² vs independent exact Riemann cell averages; CFL/amplitude parameter scans and non-square aspect on the linearized oblique wave / dam; long-duration (t=1) periodic/wall positivity+conservation and multi-period acoustic RMS. No dry-bed, bathymetry, viscosity or flood-forecast claim.',
  sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'),
  command: 'node tools/shallow-resolution-science.js',
  domain: {
    damGrids, damTime: .08, cflValues: cflScan.map(r => r.courant), amplitudes: ampScan.map(r => r.amplitude),
    aspects: ['1:1', '4:5'], longTime, waveMode: '(1,1)', omega: omegaCorrect,
    precision: 'Float64Array conserved fields; independent rarefaction/shock and linearized acoustic references in Float64',
  },
  exact: { hl, hr, hs, us, head, tail, shock },
  damBreakResolution,
  aspectDam,
  cflScan,
  ampScan,
  cflSpread,
  ampSpread,
  wallImpermeable,
  longStress,
  longWave,
  failureControls: {
    pressureOmittedDam: pressureOmitted,
    wrongOmega: { omega: k, relativeRMS: wrongOmega.relativeRMS, correctRelativeRMS: longWave[1].relativeRMS },
    wallsAsPeriodic: wallAsPeriodic,
  },
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/shallow-resolution-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify(result, null, 2));
