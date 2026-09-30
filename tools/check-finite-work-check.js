'use strict';
// Finite-work completion must gate replay even when a partial preview has stopped changing.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pendingWork, compareReplay, classifyPlate } = require(process.env.CHECK_HARNESS ? path.resolve(process.env.CHECK_HARNESS) : './check');
const plate = status => ({ status, canvas: '472x472', fp: 'fixed-preview',
  lum: { p01: 0, p99: 200, min: 0, max: 200, ink: 0.2 } });
for (const status of ['sweep 897 / 900 coarsening', 'sweeps 1,200 / 1,400', 'step 299 / 300', 'iteration 9 / 10']) {
  const m = plate(status);
  assert.equal(pendingWork(m).pending, true, status);
  assert.equal(compareReplay(m, m, 'still', 'still').comparable, false,
    'Identical partial pixels and counters must not establish completion: ' + status);
}
for (const status of ['sweep 900 / 900', 'step 300 / 300', 'step 100 running'])
  assert.equal(pendingWork(plate(status)).pending, false, status);
const finished = plate('sweep 900 / 900');
assert.equal(compareReplay(finished, finished, 'still', 'still').same, true);
assert.equal(compareReplay(finished, { ...finished, fp: 'changed-state' }, 'still', 'still').same, false);
assert.equal(compareReplay(finished, { ...finished, status: 'sweep 901 / 901' }, 'still', 'still').comparable, false);
assert.equal(compareReplay(plate('sweeps 1,200 / 1,200'), plate('sweeps 1,201 / 1,201'), 'still', 'still').comparable, false);
for (const status of ['sweep 900 / 900', 'unknown state']) {
  const blank = { ...plate(status), lum: { p01: 0, p99: 0, min: 0, max: 0, ink: 0 } };
  assert.equal(compareReplay(blank, blank, 'still', 'still').comparable, false,
    'A completed or unknown flat plate must remain invalid: ' + status);
}
const missing = { ...plate('sweep 897 / 900 coarsening'), err: 'no visible canvas' };
assert.equal(compareReplay(missing, missing, 'still', 'still').comparable, false);
assert.match(compareReplay(missing, missing, 'still', 'still').reason, /missing plate/);
assert.match(compareReplay(plate('sweep 897 / 900'), plate('sweep 897 / 900'), 'still', 'still').reason, /unfinished computation/);
const map = plate('hits 499,200 kicks 528,000');
assert.equal(compareReplay(map, map, 'still', 'still').same, true);
assert.equal(compareReplay(map, plate('hits 499,200 kicks 528,001'), 'still', 'still').comparable, false);
assert.equal(compareReplay(map, plate('hits 499,201 kicks 528,000'), 'still', 'still').comparable, false);
assert.equal(compareReplay(map, plate('hits 499,200'), 'still', 'still').comparable, false);
assert.deepEqual(compareReplay(plate('hits 19.90M'), plate('hits 19.90M'), 'still', 'still').counters, [{}, {}]);
assert.equal(classifyPlate(missing).kind, 'fail');
const unstable = { ...plate('sweep 897 / 900 coarsening'), nyq: -.8 };
assert.equal(classifyPlate(unstable).kind, 'fail');
assert.equal(compareReplay(unstable, unstable, 'still', 'still').comparable, false);
assert.match(compareReplay(unstable, unstable, 'still', 'still').reason, /checkerboard/);
assert.equal(classifyPlate(plate('sweep 897 / 900 coarsening')).kind, 'incomplete');
const partialBlank = { ...plate('sweep 897 / 900'), lum: { p01: 0, p99: 0, min: 0, max: 0, ink: 0 } };
assert.equal(classifyPlate(partialBlank).kind, 'incomplete');
assert.equal(classifyPlate({ ...partialBlank, status: 'sweep 900 / 900' }).kind, 'flat');
console.log('PASS finite-work completion and changed-state controls');
