// Execute the actual Aubry relaxation and compare its claimed ground state with
// an independent dense Jacobi eigensolve of the same finite periodic operator.
// A completed audit is distinct from passing the ground-state criteria.
// node tools/aubry-relaxation.js [--write]
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { jacobiEigen } = require('./lib/ssh-reference');
const root = path.resolve(__dirname, '..');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const source = fs.readFileSync(path.join(root, 'src/modules/aubry.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const rngStart = engine.indexOf('  function makeRng(seedStr) {');
const rngEnd = engine.indexOf('  function makeNoise(rng)', rngStart);
assert(rngStart >= 0 && rngEnd > rngStart, 'engine RNG extraction');
const makeRng = new Function('const TAU = 2 * Math.PI;\n' + engine.slice(rngStart, rngEnd) + '\nreturn makeRng;')();
function replaceOnce(s, from, to) {
  assert.equal(s.split(from).length, 2, 'unique instrumentation marker');
  return s.replace(from, to);
}
function load(mutate = s => s) {
  const hooks = {};
  let mod;
  const Studio = { util: { makeRng }, PALETTES: {}, register(m) { mod = m; } };
  let body = mutate(source);
  body = replaceOnce(body, '        let ipr = 0;', '        hooks.psi = psi.slice();\n        let ipr = 0;');
  body = replaceOnce(body, "        buf = document.createElement('canvas');", '        hooks.field = field.slice(); hooks.metric = metric; hooks.W = W; hooks.H = H; return;\n        buf = document.createElement(\'canvas\');');
  body = replaceOnce(body, '      return {\n        aspect(s)', '      hooks.compute = compute;\n      return {\n        aspect(s)');
  new Function('Studio', 'hooks', body)(Studio, hooks);
  return {
    mod,
    compute(p) {
      const s = { ...mod.defaults, seed: 'aubry-relaxation/0', ...p };
      mod.sanitize(s);
      mod.create({ canvas: { getContext: () => ({}) }, getState: () => s });
      hooks.compute();
      return { psi: hooks.psi, field: hooks.field, metric: hooks.metric, W: hooks.W, H: hooks.H, settings: s };
    },
  };
}
function matrix(N, lambda) {
  const A = Array.from({ length: N }, () => new Float64Array(N));
  const beta = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < N; i++) {
    A[i][i] = 2 + 2 * lambda * Math.cos(2 * Math.PI * beta * i);
    A[i][(i + 1) % N] = -1;
    A[(i + 1) % N][i] = -1;
  }
  return A;
}
function norm2(v) { return v.reduce((s, x) => s + x * x, 0); }
function diagnostic(A, v) {
  const Hv = A.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
  const n = norm2(v), energy = Hv.reduce((s, x, i) => s + x * v[i], 0) / n;
  return { norm2: n, energy, residual: Math.sqrt(Hv.reduce((s, x, i) => s + (x - energy * v[i]) ** 2, 0) / n) };
}
function ipr(v) { return v.reduce((s, x) => s + x ** 4, 0) / norm2(v) ** 2; }
const criteria = { residualMax: 1e-6, groundEnergyAbsMax: 1e-6, densityL1Max: 1e-3 };
function assess(A, got, ref) {
  const d = diagnostic(A, got.psi);
  const energyError = d.energy - ref.values[0];
  const densityL1 = got.psi.reduce((s, x, i) => s + Math.abs(x * x - ref.vectors[0][i] ** 2), 0);
  return { ...d, groundEnergy: ref.values[0], groundEnergyError: energyError, densityL1,
    ipr: got.metric, groundIpr: ipr(ref.vectors[0]),
    groundStatePass: d.residual <= criteria.residualMax && Math.abs(energyError) <= criteria.groundEnergyAbsMax && densityL1 <= criteria.densityL1Max };
}
const subject = load();
const cache = new Map();
let oracleMaxResidual = 0;
let finiteStepMaxL2 = 0;
// Spectral application of (I - dt A)^steps is independent of the module's
// nearest-neighbor iteration. Intermediate scalar normalizations cancel.
function finiteStepReference(settings, ref) {
  const rng = makeRng(settings.seed + '/x');
  const initial = Float64Array.from({ length: settings.grid }, () => rng.gauss());
  const dt = 0.08 / (5 + Math.abs(settings.lambda));
  const expected = new Float64Array(initial.length);
  for (let k = 0; k < initial.length; k++) {
    const v = ref.vectors[k];
    const c = v.reduce((s, x, i) => s + x * initial[i], 0) * (1 - dt * ref.values[k]) ** settings.relax;
    for (let i = 0; i < initial.length; i++) expected[i] += c * v[i];
  }
  const norm = Math.sqrt(norm2(expected));
  return Float64Array.from(expected, x => x / norm);
}
function vectorL2(a, b) { return Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0)); }
function reference(N, lambda) {
  const key = N + '/' + lambda;
  if (!cache.has(key)) {
    const A = matrix(N, lambda), ref = jacobiEigen(A);
    const residual = diagnostic(A, ref.vectors[0]).residual;
    oracleMaxResidual = Math.max(oracleMaxResidual, residual);
    assert(residual < 1e-10, 'reference ground-state residual');
    cache.set(key, { A, ref });
  }
  return cache.get(key);
}
const free = reference(96, 0);
assert(Math.abs(free.ref.values[0]) < 1e-12, 'free-ring energy is zero');
assert(Math.abs(ipr(free.ref.vectors[0]) - 1 / 96) < 1e-12, 'free-ring ground density is uniform');
const fixtures = [{ name: 'default', p: {} }, ...Object.entries(subject.mod.presets).map(([name, p]) => ({ name, p: p.p })),
  { name: 'free-ring', p: { grid: 96, lambda: 0 } },
  { name: 'maximum-relax', p: { relax: 300 } }];
const rows = [];
for (const f of fixtures) for (const seed of ['aubry-relaxation/0', 'aubry-relaxation/1', 'aubry-relaxation/2', 'aubry-print-state/default']) {
  const got = subject.compute({ ...f.p, seed });
  assert(Math.abs(norm2(got.psi) - 1) < 1e-12, 'normalization');
  assert(Math.abs(got.metric - ipr(got.psi)) < 1e-12, 'IPR computed from actual state');
  const { A, ref } = reference(got.W, got.settings.lambda);
  const d = assess(A, got, ref);
  const finiteStepL2 = vectorL2(got.psi, finiteStepReference(got.settings, ref));
  finiteStepMaxL2 = Math.max(finiteStepMaxL2, finiteStepL2);
  assert(finiteStepL2 < 1e-10, 'actual Euler relaxation against independent spectral propagation');
  assert(d.energy >= ref.values[0] - 1e-10, 'Rayleigh variational lower bound');
  for (const y of [0, got.H >> 1, got.H - 1]) for (let x = 0; x < got.W; x++) {
    const envelope = 0.35 + 0.65 * Math.exp(-8 * Math.abs(y / (got.H - 1) - 0.5));
    assert.equal(got.field[y * got.W + x], Math.fround(got.psi[x] ** 2 * envelope), 'display field matches evolved state');
  }
  rows.push({ fixture: f.name, grid: got.W, lambda: got.settings.lambda, relax: got.settings.relax, seed, finiteStepL2, ...d });
}
// The exact finite-ring ground vector must pass the same acceptance predicate.
const { A, ref } = reference(128, 2.4);
const exactControl = assess(A, { psi: ref.vectors[0], metric: ipr(ref.vectors[0]) }, ref);
assert(exactControl.groundStatePass, 'oracle vector accepted');
// A normalized wrong vector is insufficient: moving the exact density one site
// must fail the same residual, energy and density criteria.
const shifted = Float64Array.from(ref.vectors[0], (_, i) => ref.vectors[0][(i + 1) % 128]);
const wrongControl = assess(A, { psi: shifted, metric: ipr(shifted) }, ref);
assert(!wrongControl.groundStatePass, 'one-site shifted ground vector rejected');
const wrongModule = load(s => replaceOnce(s, '-(L + R)', '(L + R)'));
const wrongHop = wrongModule.compute({ seed: 'aubry-relaxation/0' });
const wrongHopL2 = vectorL2(wrongHop.psi, finiteStepReference(wrongHop.settings, ref));
assert(wrongHopL2 > 0.1, 'wrong module hopping rejected by spectral propagation');
const repeated = subject.compute({ seed: 'aubry-relaxation/0' });
assert.equal(repeated.metric, rows[0].ipr, 'deterministic repeated actual module');
const result = {
  auditCompleted: true, groundStatePassed: rows.every(r => r.groundStatePass),
  reviewed: '2026-09-29', source: 'src/modules/aubry.js', sourceSha256: sha(source),
  harness: 'tools/aubry-relaxation.js', harnessSha256: sha(fs.readFileSync(__filename)),
  rngSource: 'src/shared/engine.js', rngSourceSha256: sha(engine),
  referenceSource: 'tools/lib/ssh-reference.js', referenceSourceSha256: sha(fs.readFileSync(path.join(root, 'tools/lib/ssh-reference.js'))),
  command: 'node tools/aubry-relaxation.js --write', environment: { node: process.version, platform: process.platform },
  scope: 'Actual maintained fixed-step relaxation on finite periodic even rings. Default and six presets, free ring at grid96, and maximum300-step default; four reproducible initial vectors each, including the browser export seed. No infinite-line localization claim.',
  operator: 'A = 2I - nearest-neighbor ring adjacency + diag(2 lambda cos(2 pi beta n)). On even rings the hopping sign changes by multiplying alternate sites by -1; the 2I shift changes energy only. The probability density is gauge-invariant.',
  criteria, oracleMaxResidual, finiteStepMaxL2, finiteStepL2Tolerance: 1e-10, rows,
  failureControls: { exactGroundVector: exactControl, oneSiteShift: wrongControl, wrongModuleHop: { vectorL2: wrongHopL2, rejected: wrongHopL2 > 0.1 } },
  distinction: 'Normalization, IPR reconstruction, deterministic replay and field-envelope checks are regression diagnostics. The independently diagonalized finite matrix supplies the ground-energy and density oracle; its spectral propagation independently verifies the actual finite Euler iteration, while the residual tests eigenvector convergence.',
  limitations: ['Passing the audit command records both passing and failing scientific criteria. It does not imply that the plate reaches its claimed ground state.', 'Four seeds are explicit fixtures, not a confidence interval or exhaustive ensemble.', 'This command does not render or export. Browser state preservation is separately recorded in aubry-print-state.json.'],
};
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/aubry-relaxation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ auditCompleted: true, groundStatePassed: result.groundStatePassed, fixtures: rows.length, passed: rows.filter(r => r.groundStatePass).length, oracleMaxResidual, defaultRows: rows.filter(r => r.fixture === 'default'), maximumRows: rows.filter(r => r.fixture === 'maximum-relax') }, null, 2));
