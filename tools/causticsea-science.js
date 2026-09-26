'use strict';
// Independent Float64 twin of the causticsea wavelength estimator and linear operator.
// node tools/causticsea-science.js [--write]
//
// 1. The estimator (power-weighted mean of the 5-point Laplacian symbol, as in measure()) recovers the lattice
//    wavelength of periodic stripes at every orientation; the row zero-crossing estimator it replaced reads
//    lambda / |cos theta| and is the negative control.
// 2. Recipes from v6 on use the Swift-Hohenberg -(lap + q)^2 of the displayed equation, growth r - (q - Q)^2.
//    Recipes before v6 keep the operator the module coded until then, -lap4(lap4(h) + q h), with symbol
//    Q (q - Q), so a mode of symbol Q grows at r + Q (q - Q). This twin evaluates both on single modes and
//    records where each peaks.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/modules/causticsea.js'), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');

// The module still encodes what this twin reproduces.
assert(source.includes('a[i] = -c * lap4(hh, x, y); b[i] = c * c; A += a[i]; B += b[i];'));
assert(source.includes('lam = 2 * Math.PI / Math.acos(1 - Q / 2);'));
assert(source.includes('for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lin[idx(x, y)] = lap4(hh, x, y) + q * hh[idx(x, y)];'));
assert(source.includes('const bi = lap4(lin, x, y) + (sh ? q * lin[i] : 0);'));
assert(source.includes("legacy: { 6: { operator: 'pre6' } },"));

const W = 128, H = 128;
const at = (h, x, y) => h[((y + H) % H) * W + ((x + W) % W)];
const lap = (h, x, y) => at(h, x + 1, y) + at(h, x - 1, y) + at(h, x, y + 1) + at(h, x, y - 1) - 4 * at(h, x, y);
function symbolLambda(h) {
  let m = 0; for (let i = 0; i < h.length; i++) m += h[i]; m /= h.length;
  let A = 0, B = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = at(h, x, y) - m; A += -c * lap(h, x, y); B += c * c; }
  return 2 * Math.PI / Math.acos(1 - (A / B) / 2);
}
function rowCrossing(h) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    let c = 0, last = h[y * W];
    for (let x = 1; x < W; x++) { const v = h[y * W + x]; if ((last < 0 && v >= 0) || (last > 0 && v <= 0)) c++; last = v; }
    if (c > 1) rows.push(2 * W / c);
  }
  return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : NaN;
}
const axisLambda = (kx, ky) => 2 * Math.PI / Math.acos(1 - ((2 - 2 * Math.cos(kx)) + (2 - 2 * Math.cos(ky))) / 2);

const stripes = [];
for (const [n, m] of [[13, 0], [12, 3], [11, 6], [9, 9], [6, 11], [3, 12]]) {
  const kx = 2 * Math.PI * n / W, ky = 2 * Math.PI * m / H, h = new Float64Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) h[y * W + x] = Math.cos(kx * x + ky * y + 0.3);
  const angle = Math.atan2(ky, kx) * 180 / Math.PI, expected = axisLambda(kx, ky), euclid = 2 * Math.PI / Math.hypot(kx, ky);
  const est = symbolLambda(h), rc = rowCrossing(h);
  stripes.push({ angleDeg: +angle.toFixed(2), euclideanLambda: +euclid.toFixed(4), latticeLambda: +expected.toFixed(4),
    estimator: +est.toFixed(6), rowCrossing: +rc.toFixed(4), rowCrossingOverEuclid: +(rc / euclid).toFixed(4),
    inverseCos: +(1 / Math.abs(Math.cos(Math.atan2(ky, kx)))).toFixed(4) });
  assert(Math.abs(est - expected) < 1e-9 * expected, 'estimator recovers the lattice wavelength at ' + angle.toFixed(1) + ' deg');
}
// Failure control: the replaced row estimator is biased high by about 1/|cos theta| once stripes tilt.
const tilted = stripes.find(s => Math.abs(s.angleDeg - 45) < 1);
assert(tilted.rowCrossingOverEuclid > 1.35, 'row crossings must read high at 45 degrees');

// Operators: growth of a single mode with symbol Q under each linear part, with q for 'waves' = 10.
const q = 2 - 2 * Math.cos(2 * Math.PI / 10);
const coded = Q => -(Q * Q - q * Q);      // pre-v6: -lap4(lap4 h + q h), symbol -(Q^2 - q Q)
const swiftHohenberg = Q => -((q - Q) ** 2); // -(lap + q)^2
let best = { coded: [0, -Infinity], sh: [0, -Infinity] };
for (let i = 0; i <= 8000; i++) {
  const Q = i / 1000;
  if (coded(Q) > best.coded[1]) best.coded = [Q, coded(Q)];
  if (swiftHohenberg(Q) > best.sh[1]) best.sh = [Q, swiftHohenberg(Q)];
}
const lamOf = Q => 2 * Math.PI / Math.acos(1 - Q / 2);
const operators = {
  waves: 10, q: +q.toFixed(6),
  coded: { form: '-lap(lap + q), recipes before v6', peakSymbol: best.coded[0], peakLambda: +lamOf(best.coded[0]).toFixed(3), growthAtQ0: coded(0), note: 'the uniform mode (Q = 0) has growth r, unstable for every r > 0' },
  swiftHohenberg: { form: '-(lap + q)^2, recipes from v6', peakSymbol: best.sh[0], peakLambda: +lamOf(best.sh[0]).toFixed(3), growthAtQ0: -(q * q) },
};
assert(Math.abs(operators.coded.peakLambda - 14.26) < 0.05 && Math.abs(operators.swiftHohenberg.peakLambda - 10) < 0.05);

const result = {
  test: 'tools/causticsea-science.js', command: 'node tools/causticsea-science.js --write',
  sourceSha256: hash(source), stripes, operators,
  passed: true,
};
console.log(JSON.stringify(result, null, 2));
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'validation/results/causticsea-science.json'), JSON.stringify(result, null, 2) + '\n');
}
