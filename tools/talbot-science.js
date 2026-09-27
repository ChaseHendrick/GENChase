'use strict';
// Talbot carpet: the truncated Fourier sum at the phase the plate actually uses.
// Depth z is in units of d^2/lambda, which is z_T/2. With phase 2*pi*n*u - pi*n^2*z,
// exp(-i*pi*n^2*z) is 1 at z = 2 (full revival, one Talbot length z_T = 2 d^2/lambda)
// and equals (-1)^n at z = 1 (half-period image). A half-period shift of the grating
// is Delta u = 0.5, because the plate's u is already in periods.
// node tools/talbot-science.js [--write]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const sourceFile = 'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js';
const sourceBytes = fs.readFileSync(path.join(root, sourceFile));
const source = sourceBytes.toString('utf8');
const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');

const PHASE = 'TAU*n*u - PI*n*n*z';
const COEFF = 'an[n+M] = n===0 ? fill : Math.sin(n*PI*fill)/(n*PI);';
const U_LINE = 'const u=(x/(w-1)-0.5)*P;';
const Z_LINE = 'const z=(y/(h-1))*zMax;';
const EQUATION = 'I(x,z) = |Σₙ aₙ exp(i 2π n x/d − i π n² z)|²,   z in d²/λ, revival at 2,   z_T = 2 d²/λ';

assert.equal(source.split(PHASE).length - 1, 1, 'the plate phase must appear exactly once');
assert.equal(source.split(COEFF).length - 1, 1, 'the coefficient loop must appear exactly once');
assert.equal(source.split(U_LINE).length - 1, 1, 'the plate u coordinate must appear exactly once');
assert.equal(source.split(Z_LINE).length - 1, 1, 'the plate depth map must appear exactly once');
assert.ok(source.includes(EQUATION), 'catalog equation must state depth in d^2/lambda with revival at 2');
assert.equal(source.includes('n² z/z_T'), false, 'the exponent must not divide z by z_T');
assert.equal(source.includes("label: 'Depth in z_T'"), false, 'the slider must not be labeled as z/z_T');
assert.equal(source.includes('z<sub>T</sub>'), false, 'the status line must not call the slider reading a Talbot length');

const TAU = 2 * Math.PI;
const PI = Math.PI;
const SAMPLES = 4096;
const REVIVAL_TOL = 1e-9;

function coefficients(fill, M) {
  const a = new Float64Array(2 * M + 1);
  for (let n = -M; n <= M; n++) a[n + M] = n === 0 ? fill : Math.sin(n * PI * fill) / (n * PI);
  return a;
}

// phaseScale 1 is the plate. phaseScale 0.5 is the old exponent, as if the same number were z/z_T.
function intensity(u, z, a, M, phaseScale) {
  let re = 0, im = 0;
  for (let n = -M; n <= M; n++) {
    const c = a[n + M];
    if (!c) continue;
    const ph = TAU * n * u - phaseScale * PI * n * n * z;
    re += c * Math.cos(ph);
    im += c * Math.sin(ph);
  }
  return re * re + im * im;
}

function maxOverU(fill, M, phaseScale, diffAt) {
  const a = coefficients(fill, M);
  let max = 0, at = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const u = i / SAMPLES;
    const d = Math.abs(diffAt(u, a, M, phaseScale));
    if (d > max) { max = d; at = u; }
  }
  return { max, at };
}

const revivalDiff = (u, a, M, phaseScale) => intensity(u, 2, a, M, phaseScale) - intensity(u, 0, a, M, phaseScale);
const halfDiff = (u, a, M, phaseScale) => intensity(u, 1, a, M, phaseScale) - intensity(u + 0.5, 0, a, M, phaseScale);
const unshiftedDiff = (u, a, M, phaseScale) => intensity(u, 1, a, M, phaseScale) - intensity(u, 0, a, M, phaseScale);

const cases = [
  { name: 'default', fill: 0.22, M: 18 },
  { name: 'binary', fill: 0.5, M: 16 },
  { name: 'dense', fill: 0.12, M: 28 },
  { name: 'narrow', fill: 0.08, M: 6 },
  { name: 'wide', fill: 0.7, M: 40 },
  { name: 'deep-preset', fill: 0.18, M: 22 },
  { name: 'mid', fill: 0.35, M: 12 },
];

const rows = cases.map(row => {
  const revival = maxOverU(row.fill, row.M, 1, revivalDiff);
  const half = maxOverU(row.fill, row.M, 1, halfDiff);
  const unshifted = maxOverU(row.fill, row.M, 1, unshiftedDiff);
  assert(revival.max < REVIVAL_TOL, row.name + ' revival error ' + revival.max);
  assert(half.max < REVIVAL_TOL, row.name + ' half-period error ' + half.max);
  return {
    name: row.name, fill: row.fill, orders: row.M, samples: SAMPLES,
    revivalMaxAbs: revival.max, revivalAtU: revival.at,
    halfPeriodMaxAbs: half.max, halfPeriodAtU: half.at,
    unshiftedHalfMaxAbs: unshifted.max,
  };
});

// The half-period plane is a real shift, not a copy of z = 0. Binary 50% makes that obvious.
const binary = rows.find(row => row.name === 'binary');
assert(binary.unshiftedHalfMaxAbs > 0.1, 'binary half-period image must differ from the unshifted grating');

// Failure control: the missing factor of 2, phase TAU*n*u - 0.5*PI*n*n*z, treats the slider as z/z_T.
const wrong = maxOverU(0.5, 16, 0.5, revivalDiff);
const wrongPasses = wrong.max < REVIVAL_TOL;
assert.equal(wrongPasses, false, 'the half-coefficient phase must fail the z=2 revival predicate');
assert(wrong.max > 0.1, 'binary fill 0.5 with the missing factor must miss revival by more than 0.1, got ' + wrong.max);
const correctBinary = maxOverU(0.5, 16, 1, revivalDiff);
assert(correctBinary.max < REVIVAL_TOL, 'the same predicate must accept the plate phase');

const result = {
  test: 'tools/talbot-science.js',
  command: 'node tools/talbot-science.js --write',
  source: sourceFile,
  sourceSha256,
  phase: PHASE,
  phaseCount: 1,
  unit: 'd^2/lambda',
  talbotLength: 'z_T = 2 d^2/lambda; slider value 2 is one Talbot length; half-period image at 1',
  samplesPerPeriod: SAMPLES,
  tolerance: REVIVAL_TOL,
  cases: rows,
  failureControl: {
    phase: 'TAU*n*u - 0.5*PI*n*n*z',
    fill: 0.5,
    orders: 16,
    predicate: 'max_u |I(u, 2) - I(u, 0)| < 1e-9',
    correctMaxAbs: correctBinary.max,
    correctPasses: correctBinary.max < REVIVAL_TOL,
    wrongMaxAbs: wrong.max,
    wrongPasses,
    wrongRejected: wrong.max > 0.1 && !wrongPasses,
  },
  passed: true,
};

if (process.argv.includes('--write')) {
  const out = path.join(root, 'validation/results/talbot-science.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({
  sourceSha256,
  revivalMax: rows.map(row => [row.name, row.revivalMaxAbs]),
  halfMax: rows.map(row => [row.name, row.halfPeriodMaxAbs]),
  failureWrongMax: wrong.max,
  failureCorrectMax: correctBinary.max,
  passed: true,
}, null, 2));
