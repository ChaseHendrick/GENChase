// Independent exact wet dam-break and linear-wave checks of the actual solver.
// node tools/shallow-science.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(root, 'src/modules/shallow.js'), 'utf8');
const shared = fs.readFileSync(path.join(root, 'src/shared/studio.js'), 'utf8');
const rngSource = shared.slice(shared.indexOf('  function makeRng('), shared.indexOf('  function makeNoise('));
const makeRng = new Function('const TAU=2*Math.PI;' + rngSource + 'return makeRng;')();
function load(text = source) {
  let mod; const hooks = {};
  const Studio = { util: { TAU: 2 * Math.PI, makeRng, clamp: (v, a, b) => Math.max(a, Math.min(v, b)) },
    gl: { GLSL: { bicubic: '', ramp: '' } }, PALETTES: new Proxy({}, { get: () => ({ bg: '#000', colors: ['#fff'] }) }), register(m) { mod = m; } };
  new Function('Studio', 'hooks', text.replace('  Studio.register({', '  Object.assign(hooks,{makeSim,flux});\n  Studio.register({'))(Studio, hooks);
  return { ...hooks, mod };
}
const { makeSim, flux, mod } = load();
const state = extra => ({ ...mod.defaults, seed: 'shallow-science', ...extra });
function until(sim, t) { while (sim.time < t - 1e-13 && !sim.halted) sim.advance(1, t); assert.equal(sim.halted, ''); assert(Math.abs(sim.time - t) < 1e-12); }
const pack = sim => [...sim.h, ...sim.mx, ...sim.my];
const maxDiff = (a, b) => a.reduce((s, v, i) => Math.max(s, Math.abs(v - b[i])), 0);

// Physical flux consistency and wall impermeability, independent arithmetic.
const f = new Float64Array(3);
flux(f, 0, 2, 3, -1, 2, 3, -1); assert.deepEqual(Array.from(f), [3, 6.5, -1.5]);
flux(f, 1, 2, 3, -1, 2, 3, -1); assert.deepEqual(Array.from(f), [-1, -1.5, 2.5]);
flux(f, 0, 2, -3, -1, 2, 3, -1); assert.equal(f[0], 0); assert.equal(f[2], 0);

// Exact 1D wet dam break hL=2,hR=1,uL=uR=0,g=1. Solve the
// rarefaction invariant and Rankine-Hugoniot shock relation, not our flux.
const hl = 2, hr = 1, w = 2 * Math.sqrt(hl);
const equation = h => 2 * (Math.sqrt(h) - Math.sqrt(hl)) + (h - hr) * Math.sqrt(.5 * (1 / h + 1 / hr));
let lo = hr, hi = hl;
for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (equation(m) > 0) hi = m; else lo = m; }
const hs = (lo + hi) / 2, us = w - 2 * Math.sqrt(hs), head = -Math.sqrt(hl), tail = us - Math.sqrt(hs), shock = hs * us / (hs - hr);
const rhMassError = Math.abs(shock * (hs - hr) - hs * us);
const rhMomentumError = Math.abs(shock * hs * us - (hs * us * us + .5 * hs * hs - .5 * hr * hr));
assert(rhMassError < 1e-12 && rhMomentumError < 1e-12 && Math.abs(equation(hs)) < 1e-12);
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
function dam(N, factory = makeSim, axis = 0) {
  const sim = factory(state({ grid: N, boundary: 'walls' }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) sim.h[y * N + x] = (axis ? y : x) < N / 2 ? hl : hr;
  sim.mx.fill(0); sim.my.fill(0); sim.reference(); until(sim, .08);
  let depthL1 = 0, momentumL1 = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const j = axis ? y : x, r = exactCell(j / N, (j + 1) / N, .08), k = y * N + x;
    depthL1 += Math.abs(sim.h[k] - r.h); momentumL1 += Math.abs((axis ? sim.my[k] : sim.mx[k]) - r.momentum);
  }
  return { grid: N, steps: sim.step, time: sim.time, depthL1: depthL1 / N ** 2, momentumL1: momentumL1 / N ** 2,
    massDrift: sim.massDrift, minDepth: sim.minDepth, field: sim };
}
const damBreak = [64, 128, 256].map(N => dam(N));
for (let i = 1; i < damBreak.length; i++) {
  damBreak[i].depthErrorRatio = damBreak[i - 1].depthL1 / damBreak[i].depthL1;
  assert(damBreak[i].depthErrorRatio > 1.25 && damBreak[i].depthErrorRatio < 2.4);
}
assert(damBreak[2].depthL1 < .018 && damBreak[2].momentumL1 < .025);
for (const r of damBreak) { assert(Math.abs(r.massDrift) < 2e-12); assert(r.minDepth > .99); }
const rotated = dam(64, makeSim, 1), original = damBreak[0].field; let rotationError = 0;
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  rotationError = Math.max(rotationError, Math.abs(original.h[y * 64 + x] - rotated.field.h[x * 64 + y]),
    Math.abs(original.mx[y * 64 + x] - rotated.field.my[x * 64 + y]));
}
assert(rotationError < 1e-12);
const pressureMutation = source.replaceAll('.5 * (hl * hl + hr * hr)', '0');
assert.notEqual(pressureMutation, source);
const wrongDam = dam(128, load(pressureMutation).makeSim);
assert(wrongDam.momentumL1 > 3 * damBreak[1].momentumL1);

// Smooth, oblique, right-traveling acoustic perturbation. Analytic cell
// averages of the linearized equations; nonlinear correction is O(A^2).
const amplitude = 1e-5, smooth = [];
for (const N of [32, 64, 128]) {
  const sim = makeSim(state({ grid: N, boundary: 'periodic' })), k = 2 * Math.PI, time = .1;
  const sinc = Math.sin(Math.PI / N) / (Math.PI / N), cellFactor = sinc * sinc;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, a = amplitude * cellFactor * Math.cos(k * (x + y + 1) / N);
    sim.h[i] = 1 + a; sim.mx[i] = a / Math.sqrt(2); sim.my[i] = a / Math.sqrt(2);
  }
  sim.reference(); const px0 = sim.momentumX, py0 = sim.momentumY; until(sim, time);
  let square = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const a = amplitude * cellFactor * Math.cos(k * (x + y + 1) / N - k * Math.sqrt(2) * time);
    square += (sim.h[y * N + x] - 1 - a) ** 2;
  }
  smooth.push({ grid: N, relativeRMS: Math.sqrt(square / N ** 2) / amplitude, massDrift: sim.massDrift,
    momentumError: Math.hypot(sim.momentumX - px0, sim.momentumY - py0) });
}
for (let i = 1; i < smooth.length; i++) {
  smooth[i].order = Math.log2(smooth[i - 1].relativeRMS / smooth[i].relativeRMS);
  assert(smooth[i].order > .8 && smooth[i].order < 1.2);
  assert(Math.abs(smooth[i].massDrift) < 1e-12 && smooth[i].momentumError < 1e-12);
}
assert(smooth[2].relativeRMS < .05);

const stress = [];
for (const boundary of ['periodic', 'walls']) {
  const sim = makeSim(state({ grid: 64, boundary, courant: .8 })), rng = makeRng('shallow-positive/' + boundary);
  for (let i = 0; i < sim.h.length; i++) { sim.h[i] = rng.range(.05, 3); sim.mx[i] = sim.h[i] * rng.range(-2, 2); sim.my[i] = sim.h[i] * rng.range(-2, 2); }
  sim.reference(); const e0 = sim.energy, px0 = sim.momentumX, py0 = sim.momentumY; until(sim, .12);
  stress.push({ boundary, minDepth: sim.minDepth, massDrift: sim.massDrift, energyRatio: sim.energy / e0,
    momentumError: Math.hypot(sim.momentumX - px0, sim.momentumY - py0) });
  assert(sim.minDepth > 0 && Math.abs(sim.massDrift) < 1e-12 && sim.energy <= e0);
  if (boundary === 'periodic') assert(stress.at(-1).momentumError < 1e-12);
}
const rest = makeSim(state({ grid: 64, boundary: 'walls' })); rest.h.fill(1.3); rest.mx.fill(0); rest.my.fill(0); rest.reference();
const restBefore = pack(rest); until(rest, .2); assert(maxDiff(pack(rest), restBefore) < 1e-14);
const bad = makeSim(state({ grid: 64, courant: 1.2 })), before = pack(bad); bad.advance(1);
assert(bad.halted.includes('CFL')); assert.equal(bad.step, 0); assert.deepEqual(pack(bad), before);
const dry = makeSim(state({ grid: 64 })); dry.h[0] = 0; const dryBefore = pack(dry); dry.advance(1);
assert(dry.halted.includes('dry')); assert.equal(dry.step, 0); assert.deepEqual(pack(dry), dryBefore);
const presets = [];
for (const [name, p] of [['default', {}], ...Object.entries(mod.presets).map(([k, v]) => [k, v.p])]) {
  const s = state(p), sim = makeSim(s), t = performance.now(); sim.advance(s.warmup);
  assert.equal(sim.halted, ''); assert.equal(sim.step, s.warmup); assert(Math.abs(sim.massDrift) < 1e-12);
  presets.push({ name, grid: sim.nx, steps: sim.step, time: sim.time, minDepth: sim.minDepth, maxDepth: sim.maxDepth,
    massDrift: sim.massDrift, milliseconds: performance.now() - t });
}
const heavy = makeSim(state({ grid: 512 })), timings = [];
for (let i = 0; i < 5; i++) { const t = performance.now(); heavy.advance(1); timings.push(performance.now() - t); }
assert.equal(heavy.halted, '');
for (const row of damBreak) delete row.field; delete wrongDam.field;
const result = { scope: 'Float64 first-order 2D wet flat-bed Saint-Venant, g=1. Exact wet dam break, linearized small-amplitude oblique wave, positive wet states, periodic and reflected boundaries. No bathymetry/dry-bed/continuum universal validation.',
  sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'), exact: { hl, hr, hs, us, head, tail, shock, rhMassError, rhMomentumError },
  damBreak, smooth, rotationError, pressureOmittedControl: wrongDam, stress, restMaximumChange: maxDiff(pack(rest), restBefore),
  stops: { oversizedCFL: bad.halted, dryInput: dry.halted }, presets,
  heavy: { grid: 512, cells: heavy.h.length, steps: heavy.step, meanStepMilliseconds: timings.reduce((a, b) => a + b, 0) / timings.length, maxStepMilliseconds: Math.max(...timings) } };
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/shallow-science.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
