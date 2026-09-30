// node tools/hopfield-science.js [--write]
// Actual overlap implementation checked against an independently assembled dense matrix.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const source = read('src/modules/hopfield.js'), engine = read('src/shared/engine.js');
const rngSource = engine.slice(engine.indexOf('  function makeRng('), engine.indexOf('  function makeNoise('));
const makeRng = vm.runInNewContext('(function(){ const TAU=2*Math.PI; ' + rngSource + '; return makeRng; })()');
function load(code = source) {
  const context = { Studio: { util: { makeRng }, PALETTES: {}, register: m => { context.mod = m; } } };
  vm.runInNewContext(code.replace('  Studio.register({', '  globalThis.kernels = { recall, simulate };\n  Studio.register({'), context);
  return context;
}
const model = load();
function matrix(patterns) {
  const N = patterns[0].length, W = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (i !== j) {
    let w = 0; for (const p of patterns) w += p[i] * p[j]; W[i * N + j] = w / N;
  }
  return W;
}
function energy(W, x) {
  let E = 0; for (let i = 0; i < x.length; i++) for (let j = 0; j < x.length; j++) E -= W[i * x.length + j] * x[i] * x[j] / 2;
  return E;
}
function replay(patterns, cue, sweeps, seed, kernels = model.kernels) {
  const N = cue.length, W = matrix(patterns), state = new Int8Array(cue);
  let previous = energy(W, state), updates = 0, maxEnergyError = 0;
  const got = kernels.recall(patterns, cue, sweeps, makeRng(seed), (i, actual, field, reported) => {
    let h = 0; for (let j = 0; j < N; j++) h += W[i * N + j] * state[j];
    assert.ok(Math.abs(h * N - field) < 1e-8, 'independent dense field');
    state[i] = h > 0 ? 1 : h < 0 ? -1 : state[i];
    assert.deepEqual(Array.from(actual), Array.from(state), 'asynchronous dense update');
    // Full quadratic energy per flip, not the module overlap identity or delta shortcut.
    const E = energy(W, state); maxEnergyError = Math.max(maxEnergyError, Math.abs(E - reported));
    assert.ok(E <= previous + 1e-9, 'energy must not increase'); assert.ok(Math.abs(E - reported) < 1e-8, 'dense energy'); previous = E; updates++;
  });
  return { got, updates, maxEnergyError };
}
const fixtures = [];
for (const seed of ['hopfield-audit/0', 'hopfield-audit/1', 'hopfield-audit/2']) {
  for (const [label, recipe] of Object.entries({ one: { count: 1, corruption: 25 }, four: { count: 4, corruption: 20 }, overloaded: { count: 64, corruption: 25 }, inverse: { count: 1, corruption: 80 }, geometric: { count: 6, corruption: 25, patterns: 'stripes' }, untouched: { count: 1, corruption: 0 }, noUpdates: { count: 4, corruption: 40, sweeps: 0 } })) {
    const s = { ...model.mod.defaults, side: 8, sweeps: 25, ...recipe, seed }, result = model.kernels.simulate(s);
    const checked = replay(result.patterns, result.cue, s.sweeps, seed + '/hopfield/updates');
    assert.deepEqual(Array.from(checked.got.state), Array.from(result.state));
    const mismatches = result.state.reduce((n, x, i) => n + (x !== result.patterns[0][i]), 0);
    if (label === 'one' || label === 'untouched') assert.equal(mismatches, 0, 'single-pattern positive-overlap oracle');
    if (label === 'inverse') assert.equal(mismatches, 64, 'single-pattern negative-overlap oracle');
    if (label === 'overloaded') assert.ok(mismatches > 0, 'retain overloaded recall failure');
    fixtures.push({ label, seed, parameters: s, mismatches, fixedPoint: result.settled, sweeps: result.sweeps, updates: checked.updates, energyError: checked.maxEnergyError, energy: result.energies });
  }
}
// For one pattern on N=4, exhaust every cue with positive overlap greater than 1.
const pattern = Int8Array.from([1, -1, 1, -1]); let exhaustive = 0;
for (let mask = 0; mask < 16; mask++) {
  const cue = Int8Array.from(pattern, (x, i) => (mask >> i & 1) ? -x : x);
  if (cue.reduce((m, x, i) => m + x * pattern[i], 0) <= 1) continue;
  const r = replay([pattern], cue, 5, 'exhaustive/' + mask); assert.deepEqual(Array.from(r.got.state), Array.from(pattern)); exhaustive++;
}
assert.ok(source.includes('const next = field > 0 ? 1 : field < 0 ? -1 : state[i]'));
assert.ok(source.includes('let field = -P * state[i];'));
// Deliberately corrupt the actual update rule. The independent replay must reject it.
let mutationRejected = false;
try { replay([pattern], Int8Array.from(pattern, (x, i) => i ? x : -x), 5, 'bad-rule', load(source.replace('const next = field > 0 ? 1 : field < 0 ? -1 : state[i]', 'const next = field > 0 ? -1 : field < 0 ? 1 : state[i]')).kernels); } catch { mutationRejected = true; }
assert.ok(mutationRejected);
// A separate sign-reversed move from the exact stored pattern raises the independently computed energy.
const W = matrix([pattern]), bad = new Int8Array(pattern); bad[0] *= -1;
const badEnergyIncrease = energy(W, bad) - energy(W, pattern); assert.ok(badEnergyIncrease > 0);
// Dropping the diagonal subtraction changes a zero local field, rejected even if a final image looks plausible.
let diagonalRejected = false;
try { replay([pattern], Int8Array.from([1, 1, 1, 1]), 3, 'bad-diagonal', load(source.replace('let field = -P * state[i];', 'let field = 0;')).kernels); } catch { diagonalRejected = true; }
assert.ok(diagonalRejected);
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const result = { technique: 'hopfield', reviewed: '2026-09-29', sourceSha256: sha(source), harnessSha256: sha(read('tools/hopfield-science.js')), rngSha256: sha(rngSource), reference: 'https://doi.org/10.1073/pnas.79.8.2554', node: process.version, platform: process.platform, passed: true, exhaustivePositiveOverlapCues: exhaustive, failureControls: { mutationRejected, diagonalRejected, badEnergyIncrease }, fixtures, limitations: ['Bounded finite fixtures, not a capacity curve or general basin-volume estimate.', 'Energy descent is an invariant of symmetric asynchronous dynamics, not proof of correct recall.', 'Overloaded and negative-overlap failures remain in the report.'] };
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/hopfield-science.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: true, fixtures: fixtures.length, exhaustive, failureControls: result.failureControls, overloadedMismatches: fixtures.filter(x => x.label === 'overloaded').map(x => x.mismatches) }));
