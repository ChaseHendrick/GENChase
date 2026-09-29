'use strict';
const assert = require('node:assert/strict');
const { compareEvidence } = require('./lib/evidence-check');
const options = { absolute: 5e-11, relative: 1e-11, exact: ['model', 'schemaVersion'] };
const stored = { model: { dt: 0.5, n: 32 }, schemaVersion: 1, sourceSha256: 'abc', passed: true, residual: 1e-15, points: [0, 1] };
compareEvidence({ ...stored, residual: 2e-15, points: [0, 1 + 2e-12] }, stored, options);
for (const changed of [
  { ...stored, residual: 1e-6 }, { ...stored, residual: NaN }, { ...stored, residual: Infinity },
  { ...stored, residual: '1e-15' }, { ...stored, residual: null }, { ...stored, passed: false },
  { ...stored, sourceSha256: 'def' }, { ...stored, model: { dt: 0.5 + 1e-15, n: 32 } },
  { ...stored, schemaVersion: 1 + 1e-15 }, { ...stored, points: [0] },
  { ...stored, points: { 0: 0, 1: 1 } }, { ...stored, newField: true }
]) assert.throws(() => compareEvidence(changed, stored, options));
assert.throws(() => compareEvidence(stored, stored, { absolute: NaN }));
console.log('Evidence comparison: platform rounding accepted; 13 structural, provenance, model and numerical drift controls rejected');
