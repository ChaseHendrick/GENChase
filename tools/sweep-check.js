// Dependency-free regression fixtures for recipe sweeps; no browser or scientific claims.
'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const S = require('./sweep'), R = require('./run'), F = require('../src/shared/data-formats.js');
const plan = { version: 1, technique: 'fixture', parameters: { temperature: 2, running: false }, cases: [{ label: 'coarse', parameters: { resolution: 8 } }, { label: 'fine', parameters: { resolution: 16 } }], seeds: ['one', 'two'], sampling: { waitMs: 0 }, limits: { caseMs: 5000, totalMs: 10000 }, metrics: [{ name: 'energy', path: 'grid.energy', units: 'dimensionless' }, { name: 'mean', array: 'field', reduce: 'mean', units: 'dimensionless' }], comparison: { metric: 'energy', parameter: 'resolution', physicalConditions: { temperature: 2 }, stateConditions: { 'grid.time': 1 } } };
const copy = v => JSON.parse(JSON.stringify(v));
assert.equal(S.validatePlan(plan), plan);
for (const mutate of [p => p.seeds.push('one'), p => p.seeds[0] = 'x'.repeat(65), p => p.cases[0].parameters.seed = 'bad', p => p.limits.totalMs = Infinity, p => p.sampling.waitMs = -1, p => p.metrics[0].path = 'grid.__proto__.x', p => p.command = 'rm anything', p => p.comparison.stateConditions = {}, p => p.metrics[0].name = p.metrics[1].name]) { const p = copy(plan); mutate(p); assert.throws(() => S.validatePlan(p)); }
assert.throws(() => S.validatePlan(JSON.parse(JSON.stringify(plan).replace('"temperature":2', '"__proto__":2'))));
const requested = R.requestedRecipe('#fixture/with%20space/' + Buffer.from(JSON.stringify({ mode: 'old', gain: 1 })).toString('base64url'), ['mode=segmented', 'gain=2', 'running=false']);
assert.deepEqual(requested, { mode: 'segmented', gain: 2, seed: 'with space', running: false, id: 'fixture' });
assert.deepEqual(R.requestedRecipe(R.recipeHash(requested)), requested);
assert.throws(() => R.parseArgs(['fixture', '--timeout', '-1'])); assert.throws(() => R.requestedRecipe('fixture', ['constructor=3']));
assert.deepEqual(S.statistics([]), { n: 0, mean: null, sampleSD: null, SEM: null }); assert.equal(S.statistics([1]).SEM, null);
assert.equal(S.statistics([1, 3]).mean, 2); assert.ok(Math.abs(S.statistics([1, 3]).SEM - 1) < 1e-12);
assert.equal(S.csvCell('=SUM(A1)'), '"\'=SUM(A1)"'); assert.equal(S.csvCell(-2), '"-2"');
function packageData(actual, energy, data = Float64Array.from([1, 3]), time = 1) {
  const meta = { stateExported: true, arrays: { field: { units: 'dimensionless' } }, grid: { energy, time }, provenance: { recipe: actual, technique: { id: 'fixture', sourceSha256: 'fixture', validation: 'unvalidated' }, compute: { api: 'CPU' } } };
  return F.zipStore([{ name: 'meta.json', data: new TextEncoder().encode(JSON.stringify(meta)) }, { name: 'field.npy', data: F.npy(data, [data.length]) }]);
}
assert.equal(S.readMetrics(packageData({}, 3), plan.metrics).metrics.mean.value, 2);
assert.equal(S.readMetrics(Buffer.from(packageData({}, 3)), plan.metrics).metrics.mean.value, 2, 'Node Buffer offsets must not corrupt NPY values');
assert.equal(S.statistics([1e200, 1e200]).sampleSD, 0);
assert.ok(Number.isFinite(S.statistics([1e200, 2e200]).sampleSD));
assert.match(S.statistics([-Number.MAX_VALUE, Number.MAX_VALUE]).reason, /overflow/);
assert.throws(() => S.readMetrics(packageData({}, 3, Float64Array.of(NaN)), plan.metrics), /nonfinite/);
assert.throws(() => S.readMetrics(packageData({}, 3), [{ name: 'missing', path: 'grid.missing' }]), /missing/);
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-sweep-check-'));
  try {
    const driver = async (requested, sampling, timeout, npz, report) => {
      const actual = { ...requested, gain: 1 };
      fs.writeFileSync(npz, packageData(actual, requested.resolution / 8 + (requested.seed === 'two' ? 2 : 0)));
      fs.writeFileSync(report, JSON.stringify({ actual, recipeStableDuringExport: true, sampling: { exactTemporalStop: false } }));
      return { code: 0, log: 'fixture', timedOut: false };
    };
    const out = path.join(temp, 'success'), result = await S.execute(plan, out, driver);
    assert.equal(result.passed, true); assert.equal(result.rows.length, 4); assert.equal(result.aggregates[0].metrics.energy.mean, 2); assert.equal(result.aggregates[0].metrics.energy.SEM, 1);
    assert.ok(result.comparisons.every(x => x.eligible && x.difference === 1));
    await assert.rejects(S.execute(plan, out, driver), /EEXIST/);
    assert.ok(fs.readFileSync(path.join(out, 'summary.csv'), 'utf8').includes('"coarse"'));
    const badRows = copy(result.rows); badRows[2].meta.grid.time = 2; assert.equal(S.comparisons(plan, badRows)[0].eligible, false);
    badRows[2].meta.grid.time = 1; badRows[2].actual.temperature = 3; assert.equal(S.comparisons(plan, badRows)[0].eligible, false);
    const arrayPlan = copy(plan); arrayPlan.comparison.metric = 'mean'; const shapeRows = copy(result.rows); shapeRows[2].metrics.mean.shape = [4]; assert.equal(S.comparisons(arrayPlan, shapeRows)[0].eligible, false);
    const actualRows = copy(result.rows); actualRows[1].actual.gain = 2; assert.equal(S.aggregates(plan, actualRows)[0].compatible, false); assert.equal(S.aggregates(plan, actualRows)[0].metrics.energy.mean, null);
    const repeatedSeedRows = copy(result.rows); repeatedSeedRows[1].actual.seed = repeatedSeedRows[0].actual.seed;
    assert.equal(S.aggregates(plan, repeatedSeedRows)[0].compatible, false);
    assert.match(S.aggregates(plan, repeatedSeedRows)[0].metrics.energy.reason, /seed repeats/);
    const failures = await S.execute(plan, path.join(temp, 'failed'), async () => ({ code: 124, timedOut: true, log: 'bounded failure' }));
    assert.equal(failures.rows.length, 4); assert.ok(failures.rows.every(x => !x.ok && x.timedOut)); assert.equal(failures.aggregates[0].failed, 2);
    assert.ok(failures.comparisons.every(x => !x.eligible));
    const missing = copy(plan); missing.metrics[0].path = 'grid.missing';
    const retained = await S.execute(missing, path.join(temp, 'missing'), driver);
    assert.ok(retained.rows.every(r => !r.ok && r.file && /missing/.test(r.error)), 'Keep NPZ when metric extraction fails');
    const clampPlan = copy(plan); clampPlan.cases = [{ label: 'clamp', parameters: { resolution: 100 } }]; delete clampPlan.comparison;
    const clamp = await S.execute(clampPlan, path.join(temp, 'clamped'), async (requested, sampling, timeout, npz, report) => {
      const actual = { ...requested, resolution: 16 }; fs.writeFileSync(npz, packageData(actual, 1));
      fs.writeFileSync(report, JSON.stringify({ actual, recipeStableDuringExport: true })); return { code: 0, log: '', timedOut: false };
    });
    assert.deepEqual(clamp.rows[0].requestedChanges.resolution, { requested: 100, actual: 16 });
    let visits = 0;
    const short = copy(plan); short.limits.totalMs = 1000;
    const budget = await S.execute(short, path.join(temp, 'budget'), async () => { visits++; await new Promise(r => setTimeout(r, 15)); return { code: 1, log: 'failed', timedOut: false }; });
    assert.ok(visits <= 1); assert.equal(budget.rows.length, 4); assert.ok(budget.rows.some(r => /budget exhausted/.test(r.error)));
    console.log('SWEEP CHECK OK: plan validation, atomic segmented overrides, independent-seed SEM, sanitization/device grouping, equal-state/shape comparisons, failure retention, budgets and no overwrite');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
