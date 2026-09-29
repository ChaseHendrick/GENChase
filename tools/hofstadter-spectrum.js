// node tools/hofstadter-spectrum.js [--write]
//
// The plate's own Harper builder and symmetric QL, loaded from
// src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js, against an
// independent matrix (each site adds its own +1 and -1 hop) and an independent
// cyclic Jacobi solve. Every coprime p/q with q from 1 to 56, which is as far as
// sanitize will accept. The slider itself stops at 48. Closed forms: q = 1
// is 4, q = 2 is plus or minus 2 sqrt(2).
//
// Failure controls, which must miss the round-off gate: the plate's capped Jacobi
// and its old q <= 2 matrix (the path recipes older than v7 still reprint), the
// same cap on the corrected matrix at q = 7, and a wrong flux.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const MODULE = 'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js';
const source = fs.readFileSync(path.join(root, MODULE), 'utf8');
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const sourceSha256 = sha(source);
const QMAX = 56;
const GATE = 1e-8;
const started = Date.now();

const marker = "  Studio.register({\n    id: 'hofstadter',";
const hooked = source.replace(marker, '  Object.assign(hooks, { harperMatrix, harperMatrixLegacy, symmetricEV, jacobiCapped, harperEV, harperLegacy });\n' + marker);
assert.notEqual(hooked, source, 'hook point not found');
assert.equal(hooked.split(marker).length, 2, 'hofstadter registration is not unique');
const hooks = {};
const pal = { colors: ['#000000'], bg: '#111111' };
new Function('Studio', 'hooks', hooked)({
  util: { TAU: Math.PI * 2 },
  gl: { GLSL: new Proxy({}, { get: () => '' }) },
  PALETTES: new Proxy({}, { get: () => pal }),
  register() {},
}, hooks);
for (const name of ['harperMatrix', 'harperMatrixLegacy', 'symmetricEV', 'jacobiCapped', 'harperEV', 'harperLegacy']) {
  assert.equal(typeof hooks[name], 'function', 'plate did not export ' + name);
}

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a; }
function independentMatrix(p, q) {
  const n = q;
  const H = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) {
    H[i][i] += 2 * Math.cos(2 * Math.PI * p * i / q);
    H[i][(i + 1) % n] += 1;
    H[i][(i + n - 1) % n] += 1;
  }
  return H;
}
// Cyclic Jacobi, a different algorithm from the plate's Householder plus QL.
// One rotation of every pair per sweep, until the off-diagonal mass is at round-off.
function jacobiEigen(H) {
  const n = H.length;
  const A = H.map(row => Float64Array.from(row));
  const scale = 1 + Math.hypot(...A.map((row, i) => row[i]));
  for (let sweep = 0; sweep < 80; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (Math.sqrt(2 * off) < 1e-14 * scale) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      const apq = A[p][q];
      if (Math.abs(apq) < 1e-15) continue;
      const app = A[p][p], aqq = A[q][q];
      const tau = (aqq - app) / (2 * apq);
      const t = (tau >= 0 ? 1 : -1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      const c = 1 / Math.sqrt(1 + t * t), s = t * c;
      for (let i = 0; i < n; i++) {
        if (i === p || i === q) continue;
        const aip = A[i][p], aiq = A[i][q];
        A[i][p] = A[p][i] = c * aip - s * aiq;
        A[i][q] = A[q][i] = s * aip + c * aiq;
      }
      A[p][p] = app - t * apq;
      A[q][q] = aqq + t * apq;
      A[p][q] = A[q][p] = 0;
    }
  }
  return Array.from({ length: n }, (_, i) => A[i][i]).sort((a, b) => a - b);
}
function sorted(ev) { return Array.from(ev).sort((a, b) => a - b); }
function maxDiff(a, b) {
  assert.equal(a.length, b.length);
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}
function entryDiff(flat, H) {
  const n = H.length;
  let m = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) m = Math.max(m, Math.abs(flat[i * n + j] - H[i][j]));
  return m;
}
function sumSq(a) { let s = 0; for (const x of a) s += x * x; return s; }
function frobenius(H) {
  let s = 0;
  for (const row of H) for (const x of row) s += x * x;
  return s;
}

const byQ = [];
let matrices = 0;
let maxAbsError = 0;
let maxAt = null;
let legacyMax = 0;
let legacyAt = null;
for (let q = 1; q <= QMAX; q++) {
  let qErr = 0, qLegacy = 0, qLegacyAt = null, nMat = 0;
  for (let p = 0; p <= q; p++) {
    if (q > 1 && gcd(p, q) !== 1) continue;
    const H = independentMatrix(p, q);
    const built = hooks.harperMatrix(p, q);
    const builtOld = hooks.harperMatrixLegacy(p, q);
    assert.equal(entryDiff(built, H), 0, 'plate matrix disagrees with the independent builder at ' + p + '/' + q);
    if (q >= 3) assert.equal(entryDiff(builtOld, H), 0, 'legacy matrix should match for q >= 3 at ' + p + '/' + q);
    const ref = jacobiEigen(H);
    const got = sorted(hooks.harperEV(p, q));
    const again = sorted(hooks.harperEV(p, q));
    for (let i = 0; i < got.length; i++) assert.equal(got[i], again[i], 'solver is not deterministic at ' + p + '/' + q);
    const err = maxDiff(got, ref);
    const specSq = Math.abs(sumSq(got) - frobenius(H));
    assert.ok(specSq < 1e-8, 'eigenvalue squares miss the matrix at ' + p + '/' + q + ': ' + specSq);
    const legErr = q <= 24 ? maxDiff(sorted(hooks.harperLegacy(p, q)), ref) : 0;
    if (err > maxAbsError) { maxAbsError = err; maxAt = { p, q }; }
    if (legErr > legacyMax) { legacyMax = legErr; legacyAt = { p, q, legErr }; }
    qErr = Math.max(qErr, err);
    if (legErr > qLegacy) { qLegacy = legErr; qLegacyAt = p; }
    nMat++;
    matrices++;
  }
  byQ.push({
    q, matrices: nMat, maxAbsError: qErr,
    legacyMaxAbsError: q <= 24 ? qLegacy : null,
    legacyWorstP: q <= 24 ? qLegacyAt : null,
  });
}
assert.ok(maxAbsError < GATE, 'symmetric QL is not at round-off: ' + maxAbsError);
assert.ok(maxAbsError < 1e-9, 'q <= 56 left round-off: ' + maxAbsError);
const through24 = Math.max(...byQ.filter(r => r.q <= 24).map(r => r.maxAbsError));
assert.ok(through24 < 1e-9, 'q <= 24 left the previous round-off: ' + through24);

const q1 = byQ.find(r => r.q === 1);
const q2 = byQ.find(r => r.q === 2);
const q7 = byQ.find(r => r.q === 7);
const q1Plate = sorted(hooks.harperEV(0, 1));
const q1Legacy = sorted(hooks.harperLegacy(0, 1));
const q2Plate = sorted(hooks.harperEV(1, 2));
const q2Legacy = sorted(hooks.harperLegacy(1, 2));
const twoSqrt2 = 2 * Math.SQRT2;
const sqrt5 = Math.sqrt(5);
assert.equal(q1Plate.length, 1);
assert.ok(Math.abs(q1Plate[0] - 4) < 1e-12, 'q = 1 plate eigenvalue ' + q1Plate[0]);
assert.ok(Math.abs(q1Legacy[0] - 1) < 1e-12, 'q = 1 legacy eigenvalue ' + q1Legacy[0]);
assert.ok(Math.abs(q2Plate[0] + twoSqrt2) < 1e-12 && Math.abs(q2Plate[1] - twoSqrt2) < 1e-12, 'q = 2 plate ' + q2Plate);
assert.ok(Math.abs(q2Legacy[0] + sqrt5) < 1e-12 && Math.abs(q2Legacy[1] - sqrt5) < 1e-12, 'q = 2 legacy ' + q2Legacy);
const q1Error = Math.abs(q1Legacy[0] - 4);
const q2Error = maxDiff(q2Legacy, [-twoSqrt2, twoSqrt2]);
assert.ok(q1Error > GATE && q2Error > GATE && q7.legacyMaxAbsError > GATE, 'a failure control passed the round-off gate');
assert.ok(q7.legacyMaxAbsError > 0.1, 'q = 7 capped Jacobi did not miss by tenths: ' + q7.legacyMaxAbsError);

// The cap alone, on the corrected matrix, still misses. This is not the q <= 2 overwrite.
const capOnly = sorted(hooks.jacobiCapped(hooks.harperMatrix(q7.legacyWorstP, 7), 7));
const capOnlyErr = maxDiff(capOnly, jacobiEigen(independentMatrix(q7.legacyWorstP, 7)));
assert.ok(capOnlyErr > 0.1, 'capped Jacobi on the corrected q = 7 matrix did not fail: ' + capOnlyErr);

// Wrong flux: p = 2 against the p = 1 reference at q = 7. Must miss.
const wrongFluxErr = maxDiff(sorted(hooks.harperEV(2, 7)), jacobiEigen(independentMatrix(1, 7)));
assert.ok(wrongFluxErr > 0.1, 'wrong flux did not fail: ' + wrongFluxErr);

const result = {
  source: MODULE,
  sourceSha256,
  harness: 'tools/hofstadter-spectrum.js',
  harnessSha256: sha(fs.readFileSync(__filename)),
  command: 'node tools/hofstadter-spectrum.js --write',
  scope: 'Every coprime p/q with q from 1 to 56. The plate builds the Harper matrix at zero crystal momentum and diagonalizes it with symmetric QL. The reference builds that matrix by adding each site\'s own forward and backward hop and diagonalizes it with cyclic Jacobi. The capped Jacobi failure control is compared through q = 24, where it was already shown to miss.',
  roundoffGate: GATE,
  matrices,
  maxAbsError,
  through24,
  maxAt,
  byQ,
  closedForms: {
    q1: { plate: q1Plate[0], legacy: q1Legacy[0], reference: 4, legacyAbsError: q1Error },
    q2: { plate: q2Plate, legacy: q2Legacy, reference: [-twoSqrt2, twoSqrt2], legacyAbsError: q2Error },
  },
  failureControls: {
    cappedJacobiAndOldMatrix: {
      q1AbsError: q1Error,
      q2AbsError: q2Error,
      q7AbsError: q7.legacyMaxAbsError,
      q7WorstP: q7.legacyWorstP,
      legacyMaxAbsError: legacyMax,
      legacyAt,
    },
    cappedJacobiOnCorrectMatrix: { q: 7, p: q7.legacyWorstP, absError: capOnlyErr },
    wrongFlux: { plate: '2/7', reference: '1/7', absError: wrongFluxErr },
    allMissedRoundoffGate: true,
  },
  q1: { maxAbsError: q1.maxAbsError, legacyMaxAbsError: q1.legacyMaxAbsError },
  q2: { maxAbsError: q2.maxAbsError, legacyMaxAbsError: q2.legacyMaxAbsError },
  q7: { maxAbsError: q7.maxAbsError, legacyMaxAbsError: q7.legacyMaxAbsError, legacyWorstP: q7.legacyWorstP },
  elapsedMs: Date.now() - started,
};
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/hofstadter-spectrum.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({
  matrices,
  maxAbsError,
  maxAt,
  through24,
  q1Error,
  q2Error,
  q7Error: q7.legacyMaxAbsError,
  q7Plate: q7.maxAbsError,
  capOnlyErr,
  wrongFluxErr,
  elapsedMs: result.elapsedMs,
}, null, 2));
