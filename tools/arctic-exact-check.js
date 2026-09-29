// Holds src/shared/arctic-exact.js to the expectations already computed in
// research/arctic-finite-size/. Lozenge matches to a rounding error. Aztec is the
// same Krawtchouk formula by inverse iteration, and it is allowed 1e-5 absolute,
// which is below the sampling error of any plate.
'use strict';
const assert = require('node:assert/strict');
const A = require('../src/shared/arctic-exact.js');
const az = require('../research/arctic-finite-size/data/aztec_exact.json');
const reg = require('../research/arctic-finite-size/data/hexagon_exact_regular.json');
const skew = require('../research/arctic-finite-size/data/hexagon_exact_skew.json');

for (const n of [4, 5, 8, 10, 12, 20, 40]) {
  const row = az.rows.find(r => r.n === n);
  assert(row, 'missing aztec n=' + n);
  const q = A.polarFraction(n);
  const err = Math.abs(q - row.polarFraction);
  assert(err < 1e-5, 'aztec n=' + n + ' off by ' + err);
}
for (const box of [[2, 2, 2], [12, 12, 12], [16, 16, 16]]) {
  const row = reg.rows.find(r => r.box[0] === box[0] && r.box[1] === box[1] && r.box[2] === box[2]);
  assert(row, 'missing hexagon ' + box);
  const err = Math.abs(A.freeFraction(box[0], box[1], box[2]) - row.freeFraction);
  assert(err < 1e-9, 'hexagon ' + box + ' off by ' + err);
}
const skewRow = skew.rows.find(r => r.box[0] === 12 && r.box[1] === 20 && r.box[2] === 24);
assert(skewRow, 'missing 12·20·24');
assert(Math.abs(A.freeFraction(12, 20, 24) - skewRow.freeFraction) < 1e-9);
console.log('arctic-exact-check: ok');
