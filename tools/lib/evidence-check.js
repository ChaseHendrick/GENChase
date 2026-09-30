'use strict';
const assert = require('node:assert/strict');

// Compare derived finite floating-point evidence across JS runtimes. Callers
// still check scientific acceptance thresholds independently. Model inputs and
// counters can be designated exact; types, structure and non-numeric fields are
// always exact. Never rewrite a stored report just to match platform rounding.
function compareEvidence(actual, expected, { absolute, relative = 0, exact = [] }) {
  assert.ok(Number.isFinite(absolute) && absolute >= 0);
  assert.ok(Number.isFinite(relative) && relative >= 0);
  const visit = (a, e, location) => {
    if (exact.includes(location)) { assert.deepEqual(a, e, location); return; }
    if (typeof a === 'number' && typeof e === 'number') {
      assert.ok(Number.isFinite(a) && Number.isFinite(e), location + ': non-finite evidence');
      assert.ok(Math.abs(a - e) <= absolute + relative * Math.max(Math.abs(a), Math.abs(e)), location + ': numerical evidence drift');
    } else if (Array.isArray(a) || Array.isArray(e)) {
      assert.ok(Array.isArray(a) && Array.isArray(e), location + ': array type');
      assert.equal(a.length, e.length, location + ': array length');
      a.forEach((value, i) => visit(value, e[i], location + '.' + i));
    } else if (a && e && typeof a === 'object' && typeof e === 'object') {
      assert.deepEqual(Object.keys(a).sort(), Object.keys(e).sort(), location + ': object fields');
      for (const key of Object.keys(a)) visit(a[key], e[key], location ? location + '.' + key : key);
    } else assert.equal(a, e, location);
  };
  visit(actual, expected, '');
}
module.exports = { compareEvidence };
