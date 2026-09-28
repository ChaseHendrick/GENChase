// London disk: the plate's own multigrid against an independent I0 series.
//   node tools/meissner-science.js [--write]
// The sign-flip control edits the module source and must miss the I0 profile.
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

function load(mutate) {
  const source = fs.readFileSync(path.join(root, 'src/modules/meissner.js'), 'utf8');
  const hooks = {};
  const Studio = {
    util: { makeRng() { return () => 0; } },
    PALETTES: new Proxy({}, { get: () => ({ bg: '#000000', colors: ['#ffffff'] }) }),
    register() {},
  };
  const body = (mutate || (s => s))(source).replace(
    '  Studio.register({',
    '  Object.assign(hooks, { solveLondon, besselI0, plateSize, DEFAULTS, PRESETS });\n  Studio.register({');
  new Function('Studio', 'hooks', body)(Studio, hooks);
  return {
    hooks,
    source,
    sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  };
}

// Independent series, cut at 1e-18 of the sum, not the module's 1e-16 cutoff.
function besselI0(z) {
  const q = z * z / 4;
  let term = 1, sum = 1;
  for (let k = 1; k < 800; k++) {
    term *= q / (k * k);
    sum += term;
    if (term < 1e-18 * sum) break;
  }
  return sum;
}

// Published anchor, Abramowitz and Stegun 9.8 / the series at z = 1 to 16 digits.
const I0_AT_1 = 1.2660658777520084;

function diskClear(W, H, R) {
  // The open disk stays inside the frame: the frame's inner edge is min(W, H)/2 - 1 from the centre.
  return R < Math.min(W, H) / 2 - 1;
}

function profileError(field, W, H, lam, R) {
  const cx = W / 2, cy = H / 2, denom = besselI0(R / lam);
  let maxAbs = 0, n = 0, nonfinite = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
    const v = field[y * W + x];
    if (!Number.isFinite(v)) { nonfinite++; continue; }
    if (r >= R) continue;
    const err = Math.abs(v - besselI0(r / lam) / denom);
    if (err > maxAbs) maxAbs = err;
    n++;
  }
  return { maxAbs: nonfinite ? Infinity : maxAbs, n, nonfinite };
}

function jacobiReference(W, H, lam, R, steps) {
  const cx = W / 2, cy = H / 2;
  let B = new Float64Array(W * H);
  B.fill(1);
  for (let k = 0; k < steps; k++) {
    const nB = B.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) >= R) { nB[i] = 1; continue; }
      const lap = B[i + 1] + B[i - 1] + B[i + W] + B[i - W] - 4 * B[i];
      nB[i] = B[i] + 0.2 * (lap - B[i] * (1 / (lam * lam)));
      if (nB[i] < 0) nB[i] = 0;
    }
    B = nB;
  }
  return B;
}

function sci(v) { return Number.isFinite(v) ? Number(v.toExponential(6)) : null; }

const TOL = 1e-3;
const mod = load();
assert(Math.abs(besselI0(0) - 1) < 1e-15, 'I0(0)');
assert(Math.abs(besselI0(1) - I0_AT_1) < 1e-15, 'I0(1) against the published anchor');
assert(Math.abs(mod.hooks.besselI0(1) - besselI0(1)) < 1e-14, 'module series agrees with the independent series');
assert(mod.hooks.DEFAULTS.solver === 'mg', 'the plate default is the multigrid');
assert(fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8').includes('const RECIPE_V = 8;'), 'recipe version 8');
assert(/legacy:\s*\{\s*7:\s*\{\s*solver:\s*'jacobi'\s*\}/.test(mod.source), 'older recipes keep Jacobi');

const { solveLondon, plateSize, DEFAULTS, PRESETS } = mod.hooks;

function runPlate(partial, mode) {
  const s = Object.assign({}, DEFAULTS, partial);
  const sz = plateSize(s.grid, s.aspect);
  assert(diskClear(sz.W, sz.H, s.R), 'fixture leaves the disk: ' + JSON.stringify(s));
  assert(s.relax >= 40 && s.relax <= 240, 'relax outside the slider');
  assert(s.grid >= 96 && s.grid <= 224 && s.lambda >= 4 && s.lambda <= 40 && s.R >= 16 && s.R <= 80, 'outside the sliders');
  const t0 = performance.now();
  const solved = solveLondon(sz.W, sz.H, s.lambda, s.R, s.relax, mode || s.solver);
  const ms = performance.now() - t0;
  const err = profileError(solved.field, sz.W, sz.H, Math.max(2, s.lambda), s.R);
  return {
    grid: s.grid, aspect: s.aspect, W: sz.W, H: sz.H, lambda: s.lambda, R: s.R, relax: s.relax,
    mode: solved.solver, cycles: solved.cycles, residual: sci(solved.residual), ms: Math.round(ms * 10) / 10,
    maxAbs: sci(err.maxAbs), n: err.n, pass: err.maxAbs <= TOL && solved.cycles <= s.relax && solved.residual < 1e-8,
  };
}

const plates = [];
plates.push(Object.assign({ name: 'default' }, runPlate({})));
plates.push(Object.assign({ name: 'default-at-cap-floor' }, runPlate({ relax: 40 })));
for (const [name, preset] of Object.entries(PRESETS)) {
  plates.push(Object.assign({ name }, runPlate(preset.p)));
}
const corners = [
  { name: 'min-grid', grid: 96, lambda: 4, R: 16, relax: 40 },
  { name: 'deep-large', grid: 224, aspect: '1:1', lambda: 40, R: 80, relax: 40 },
  { name: 'portrait', grid: 160, aspect: '4:5', lambda: 10, R: 48, relax: 40 },
  { name: 'landscape', grid: 160, aspect: '5:4', lambda: 12, R: 40, relax: 40 },
  { name: 'wide', grid: 224, aspect: '16:9', lambda: 10, R: 40, relax: 40 },
  { name: 'refine-8', grid: 96, lambda: 8, R: 32, relax: 40 },
  { name: 'refine-16', grid: 160, lambda: 16, R: 64, relax: 40 },
  { name: 'refine-20', grid: 224, lambda: 20, R: 80, relax: 40 },
];
for (const c of corners) plates.push(Object.assign({ name: c.name }, runPlate(c)));

const maxError = Math.max(...plates.map(p => p.maxAbs));
for (const p of plates) assert(p.pass, 'plate missed I0: ' + JSON.stringify(p));

const refine = ['refine-8', 'refine-16', 'refine-20'].map(name => plates.find(p => p.name === name));
const order816 = Math.log(refine[0].maxAbs / refine[1].maxAbs) / Math.log(2);
const ratio1620 = refine[1].maxAbs / refine[2].maxAbs;
const expect1620 = (20 / 16) * (20 / 16);
assert(order816 > 1.5 && order816 < 2.5, 'refinement 8 to 16 is not second order: ' + order816);
assert(Math.abs(ratio1620 / expect1620 - 1) < 0.25, 'refinement 16 to 20 is not second order: ' + ratio1620);

// Legacy Jacobi, at the top of the slider, is the update old recipes still run. It must miss I0.
const legacy = solveLondon(160, 160, 10, 48, 240, 'jacobi');
const legacyErr = profileError(legacy.field, 160, 160, 10, 48).maxAbs;
const legacyCopy = jacobiReference(160, 160, 10, 48, 240);
let legacyDrift = 0;
for (let i = 0; i < legacy.field.length; i++) legacyDrift = Math.max(legacyDrift, Math.abs(legacy.field[i] - legacyCopy[i]));
assert(legacyDrift === 0, 'Jacobi drifted from the pre-v7 sweep');
assert(legacyErr > 0.2, 'Jacobi at 240 sweeps unexpectedly reached I0');

// Failure control: ∇²B = -B/λ². The same acceptance test must fail.
const flipped = load(s => s.replace('const london = 1;', 'const london = -1;'));
const badSolve = flipped.hooks.solveLondon(160, 160, 10, 48, 40, 'mg');
const signFlip = profileError(badSolve.field, 160, 160, 10, 48);
const signFlipFails = !(signFlip.maxAbs <= TOL && Number.isFinite(badSolve.residual) && badSolve.residual < 1e-8);
assert(signFlipFails, 'sign flip still passed the I0 test');
assert(signFlip.maxAbs > 0.05, 'sign flip stayed near I0: ' + signFlip.maxAbs);

const outside = { name: 'disk-cut-by-frame', grid: 96, R: 80, lambda: 10, note: 'R = 80 on a 96 grid crosses the frame, so the boundary is not the circle. Not compared to I0.' };

const result = {
  pass: true,
  date: new Date().toISOString().slice(0, 10),
  source: 'src/modules/meissner.js',
  sourceSha256: mod.sourceSha256,
  harness: 'tools/meissner-science.js',
  harnessSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
  command: 'node tools/meissner-science.js --write',
  criteria: {
    maxAbs: TOL,
    residual: 1e-8,
    cyclesWithinRelax: true,
    refinementOrder: 'about 2 when λ and R double inside the slider',
    signFlip: '∇²B = -B/λ² must miss max |B - I0| <= 1e-3',
  },
  independentI0: { at0: 1, at1: I0_AT_1, moduleDeltaAt1: Math.abs(mod.hooks.besselI0(1) - besselI0(1)) },
  maxError,
  signFlipError: sci(signFlip.maxAbs),
  signFlipResidual: sci(badSolve.residual),
  signFlipFailsAcceptance: signFlipFails,
  legacyJacobi: { relax: 240, maxAbs: sci(legacyErr), bitMatch: legacyDrift === 0, missesI0: legacyErr > 0.2 },
  refinement: { order8to16: order816, ratio16to20: ratio1620, expectedRatio16to20: expect1620 },
  plates,
  outsideDomain: outside,
  print: { executed: false, reason: 'No browser step. The default and every preset above are inside the converged disk, which is the fixture a later print would have to use.' },
  limitations: [
    'The circle must clear the frame (R < min(W, H)/2 - 1). A disk that runs into the edge is a different boundary and is outside this comparison.',
    'Agreement is the 5-point Shortley-Weller disk at h = 1 cell, not a continuum limit past the slider. The observed gap is second order in 1/λ.',
    'Print was not executed. Status stays partially validated.',
    'Recipes older than v7 keep Jacobi and are not in this domain.',
  ],
  environment: { node: process.version, platform: process.platform },
};

if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/meissner-science.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({
  pass: true, maxError, signFlipError: result.signFlipError, legacyJacobi: result.legacyJacobi,
  refinement: result.refinement, plates: plates.map(p => ({ name: p.name, maxAbs: p.maxAbs, cycles: p.cycles, residual: p.residual, ms: p.ms })),
}, null, 1));
