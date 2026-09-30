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
// Actual status producer shapes: standalone spans or a middle-dot phase.
for (const parts of [
  ['sweep 900 / 900', 'coarsening'], // Potts phase remains authoritative at a target.
  ['grid 256×256 · dx 0.1', 'step 2,000', 'relaxing'], // BEC
  ['step 100', 'warming up'], // RDX
  ['dt 1.0e-3 · 128 queued'], // volume-wave
  ['step 0/100 · initial forces'], // direct-gravity
  ['step 100', 'building…'], // Sandpile
  ['checksum 12 · building'], // Growdomain
  ['t 0.50 · computing'], // Flow matching
  ['t 5.0/10 · step 50 · preparing, computing'], // neural-field
  ['computing 50%'], // SLE
  ['computing 1,024 quasiparticle modes'] // Kitaev
]) {
  const m = { ...plate(parts.join(' ')), statusParts: parts };
  assert.equal(pendingWork(m).pending, true, JSON.stringify(parts));
  assert.equal(compareReplay(m, m, 'still', 'still').comparable, false);
}
// This is explanatory prose from the failed Ising CI capture, not a finite target.
const isingParts = ['grid 256×256', 'T 1.20 · 0.53 Tc · ordered', 'm +0.12',
  '|m| 0.1501 · error bar pending: run shorter than 50 τ_int (τ_int ≈ 42 sweeps) · not a Yang comparison: a hot or split start is still coarsening; start Cold to compare',
  'sweep 1,408', 'seed check-ising'];
const ising = { ...plate(isingParts.join(' ')), statusParts: isingParts };
assert.equal(pendingWork(ising).pending, false);
assert.equal(classifyPlate(ising).kind, 'ready');
assert.equal(compareReplay(ising, ising, 'warmed', 'warmed').same, true);
assert.equal(compareReplay(ising, { ...ising, status: ising.status.replace('1,408', '1,409') }, 'warmed', 'warmed').comparable, false);
for (const status of ['coarsening changes the physical morphology', 'error bar pending: the field is still relaxing', 'not computing a validated comparison'])
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
