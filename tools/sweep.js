// node tools/sweep.js plan.json --out NEW_DIRECTORY
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { spawn } = require('node:child_process');
const F = require('../src/shared/data-formats.js'), { recipeHash } = require('./run');
const root = path.resolve(__dirname, '..');
const check = (ok, why) => { if (!ok) throw Error(why); };
const plain = o => o && typeof o === 'object' && !Array.isArray(o);
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const lookup = (o, key) => key.split('.').reduce((v, k) => v && own(v, k) ? v[k] : undefined, o);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function keys(o, allowed, where) { check(plain(o), where + ' must be an object'); for (const k of Object.keys(o)) check(allowed.includes(k), 'Unknown ' + where + ' key: ' + k); }
function safeObject(o) {
  check(plain(o), 'Parameters/conditions must be objects');
  for (const [k, v] of Object.entries(o)) {
    check(/^[A-Za-z][A-Za-z0-9_.]*$/.test(k) && !k.split('.').some(x => ['__proto__', 'constructor', 'prototype'].includes(x)), 'Unsafe key: ' + k);
    check(typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 1000), 'Parameter/condition values must be finite numbers, booleans or bounded strings');
  }
}
function validatePlan(p) {
  keys(p, ['version', 'technique', 'parameters', 'cases', 'seeds', 'sampling', 'limits', 'metrics', 'comparison'], 'plan');
  check(p.version === 1, 'Plan version must be 1'); check(/^[a-z][a-z0-9-]*$/.test(p.technique), 'Invalid technique');
  safeObject(p.parameters || {});
  check(Array.isArray(p.seeds) && p.seeds.length > 0 && p.seeds.length <= 32 && p.seeds.every(x => typeof x === 'string' && x.length > 0 && x.length <= 64), 'Use 1..32 bounded seed strings of at most 64 characters');
  check(new Set(p.seeds).size === p.seeds.length, 'Repeated seed strings are not independent replicates');
  check(Array.isArray(p.cases) && p.cases.length > 0 && p.cases.length * p.seeds.length <= 128, 'Use 1..128 total runs');
  const labels = new Set();
  for (const c of p.cases) { keys(c, ['label', 'parameters'], 'case'); check(typeof c.label === 'string' && c.label.length > 0 && c.label.length <= 100 && !labels.has(c.label), 'Case labels must be unique bounded strings'); labels.add(c.label); safeObject(c.parameters || {}); }
  for (const o of [p.parameters || {}, ...p.cases.map(c => c.parameters || {})]) check(!Object.keys(o).some(k => ['id', 'seed'].includes(k)), 'Technique and seed belong to the plan, not parameters');
  keys(p.sampling, ['waitMs', 'minCounter'], 'sampling');
  check(Number.isInteger(p.sampling.waitMs) && p.sampling.waitMs >= 0 && p.sampling.waitMs <= 60000, 'waitMs must be 0..60000');
  check(p.sampling.minCounter === undefined || (Number.isInteger(p.sampling.minCounter) && p.sampling.minCounter > 0), 'minCounter must be a positive integer');
  keys(p.limits, ['caseMs', 'totalMs'], 'limits');
  check(Number.isInteger(p.limits.caseMs) && p.limits.caseMs >= 1000 && p.limits.caseMs <= 600000, 'caseMs must be 1000..600000');
  check(Number.isInteger(p.limits.totalMs) && p.limits.totalMs >= 1000 && p.limits.totalMs <= 1800000, 'totalMs must be 1000..1800000');
  check(p.sampling.waitMs < p.limits.caseMs, 'waitMs must be less than caseMs');
  check(Array.isArray(p.metrics) && p.metrics.length > 0 && p.metrics.length <= 16, 'Use 1..16 explicit metrics');
  const names = new Set();
  for (const m of p.metrics) {
    keys(m, ['name', 'path', 'array', 'reduce', 'units'], 'metric');
    check(typeof m.name === 'string' && /^[a-z][a-z0-9_]*$/.test(m.name) && !names.has(m.name), 'Metric names must be unique identifiers'); names.add(m.name);
    check(typeof m.units === 'string' && m.units.length > 0 && m.units.length <= 100, 'Declare metric units, or dimensionless');
    check(!!m.path !== !!m.array, 'Specify either metadata path or array');
    if (m.path) check(/^(grid|provenance\.witness)\.[A-Za-z0-9_.]+$/.test(m.path) && !m.reduce && !m.path.split('.').some(x => ['__proto__', 'constructor', 'prototype'].includes(x)), 'Use a scalar grid/witness metadata path');
    else check(/^[a-z][a-z0-9_]*$/.test(m.array) && ['mean', 'rms', 'min', 'max', 'first', 'last'].includes(m.reduce), 'Use a named array and explicit reduction');
  }
  if (p.comparison) {
    keys(p.comparison, ['metric', 'parameter', 'physicalConditions', 'stateConditions'], 'comparison');
    check(names.has(p.comparison.metric), 'Unknown comparison metric');
    check(typeof p.comparison.parameter === 'string' && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(p.comparison.parameter), 'Declare resolution/step parameter');
    safeObject(p.comparison.physicalConditions); safeObject(p.comparison.stateConditions);
    check(Object.keys(p.comparison.physicalConditions).length > 0 && Object.keys(p.comparison.stateConditions).length > 0, 'Comparisons require explicit physical and exported state conditions');
    check(Object.keys(p.comparison.stateConditions).every(k => k.startsWith('grid.')), 'State conditions refer to exported grid metadata');
    check(p.cases.length >= 2, 'Comparison requires at least two cases');
  }
  return p;
}
function readMetrics(bytes, definitions) {
  const files = F.readZip(new Uint8Array(bytes)), meta = JSON.parse(new TextDecoder().decode(files['meta.json']));
  check(meta.stateExported, meta.note || 'Technique did not export data');
  const metrics = {};
  for (const m of definitions) {
    let value, shape = null, exportedUnits = null;
    if (m.path) value = lookup(meta, m.path);
    else {
      check(own(files, m.array + '.npy'), 'Missing array: ' + m.array);
      const a = F.readNpy(files[m.array + '.npy']), x = a.data; shape = a.shape; exportedUnits = meta.arrays[m.array]?.units || '';
      check(x.length > 0 && x.every(Number.isFinite), 'Array empty or nonfinite: ' + m.array);
      if (m.reduce === 'first') value = x[0]; else if (m.reduce === 'last') value = x[x.length - 1];
      else if (m.reduce === 'min') value = x.reduce((a, b) => Math.min(a, b), Infinity);
      else if (m.reduce === 'max') value = x.reduce((a, b) => Math.max(a, b), -Infinity);
      else if (m.reduce === 'mean') value = x.reduce((sum, v) => sum + v / x.length, 0);
      else { const scale = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0); value = scale ? scale * Math.sqrt(x.reduce((sum, v) => sum + (v / scale) ** 2 / x.length, 0)) : 0; }
    }
    check(typeof value === 'number' && Number.isFinite(value), 'Metric missing or nonfinite: ' + m.name);
    metrics[m.name] = { value, units: m.units, shape, exportedUnits };
  }
  return { metrics, meta };
}
function statistics(values) {
  const n = values.length; if (!n) return { n: 0, mean: null, sampleSD: null, SEM: null };
  const mean = values.reduce((a, b) => a + b / n, 0);
  if (!Number.isFinite(mean)) return { n, mean: null, sampleSD: null, SEM: null, reason: 'Summary arithmetic overflow' };
  const scale = values.reduce((m, v) => Math.max(m, Math.abs(v - mean)), 0);
  const sampleSD = n > 1 ? (scale ? scale * Math.sqrt(values.reduce((s, v) => s + ((v - mean) / scale) ** 2, 0) / (n - 1)) : 0) : null;
  if (sampleSD !== null && !Number.isFinite(sampleSD)) return { n, mean, sampleSD: null, SEM: null, reason: 'Summary arithmetic overflow' };
  return { n, mean, sampleSD, SEM: sampleSD === null ? null : sampleSD / Math.sqrt(n) };
}
function aggregates(plan, rows) {
  return plan.cases.map(c => {
    const group = rows.filter(r => r.case === c.label), successful = group.filter(r => r.ok);
    // A seed may change simulation state, but never silently pool different sanitized recipes or devices.
    const signatures = successful.map(r => { const actual = { ...r.actual }; delete actual.seed; return JSON.stringify({ actual, compute: r.provenance.compute, source: r.provenance.technique.sourceSha256 }); });
    const actualSeeds = successful.map(r => r.actual?.seed).filter(x => x !== undefined);
    const compatible = new Set(signatures).size <= 1 && new Set(actualSeeds).size === actualSeeds.length;
    const incompatibility = new Set(signatures).size > 1 ? 'Sanitized recipe, source or compute differs across seeds' : new Set(actualSeeds).size !== actualSeeds.length ? 'Sanitized seed repeats across requested replicates' : null;
    return { case: c.label, total: group.length, failed: group.filter(r => !r.ok).length, compatible, metrics: Object.fromEntries(plan.metrics.map(m => [m.name, compatible ? statistics(successful.map(r => r.metrics[m.name].value)) : { n: successful.length, mean: null, sampleSD: null, SEM: null, reason: incompatibility }])) };
  });
}
function comparisons(plan, rows) {
  if (!plan.comparison) return [];
  const spec = plan.comparison, result = [];
  for (const seed of plan.seeds) for (let i = 1; i < plan.cases.length; i++) {
    const a = rows.find(r => r.case === plan.cases[i - 1].label && r.seed === seed), b = rows.find(r => r.case === plan.cases[i].label && r.seed === seed);
    let reason = '';
    if (!a?.ok || !b?.ok) reason = 'At least one run failed';
    else {
      for (const [key, expected] of Object.entries(spec.physicalConditions)) if (!same(a.actual[key], expected) || !same(b.actual[key], expected)) reason = 'Physical condition differs: ' + key;
      for (const [key, expected] of Object.entries(spec.stateConditions)) if (!same(lookup(a.meta, key), expected) || !same(lookup(b.meta, key), expected)) reason = 'Exported state condition differs: ' + key;
      const keys = new Set([...Object.keys(a.actual), ...Object.keys(b.actual)]);
      for (const key of keys) if (key !== spec.parameter && key !== 'seed' && !same(a.actual[key], b.actual[key])) reason = 'Other recipe parameter differs: ' + key;
      if (typeof a.actual[spec.parameter] !== 'number' || typeof b.actual[spec.parameter] !== 'number' || a.actual[spec.parameter] === b.actual[spec.parameter]) reason = 'Resolution/step parameter is not distinct numeric values';
      const ma = a.metrics[spec.metric], mb = b.metrics[spec.metric];
      if (!same(ma.shape, mb.shape) || ma.units !== mb.units || ma.exportedUnits !== mb.exportedUnits) reason = 'Metric shape or units differ';
      if (!same(a.provenance.compute, b.provenance.compute) || a.provenance.technique.sourceSha256 !== b.provenance.technique.sourceSha256) reason = 'Compute or source differs';
    }
    if (!reason && !Number.isFinite(b.metrics[spec.metric].value - a.metrics[spec.metric].value)) reason = 'Difference arithmetic overflow';
    result.push({ seed, from: plan.cases[i - 1].label, to: plan.cases[i].label, eligible: !reason, reason: reason || null, difference: reason ? null : b.metrics[spec.metric].value - a.metrics[spec.metric].value, interpretation: 'Paired scalar difference only; no inferred convergence order, error bound or validation verdict.' });
  }
  return result;
}
function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function childRun(requested, sampling, timeout, npz, report) {
  return new Promise(resolve => {
    const args = [...process.execArgv, path.join(__dirname, 'run.js'), '#' + recipeHash(requested), '--out', npz, '--report', report, '--wait', String(sampling.waitMs), '--timeout', String(Math.max(100, timeout - 500)), ...(sampling.minCounter ? ['--steps', String(sampling.minCounter)] : [])];
    const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    let log = '', timedOut = false;
    const capture = data => { log = (log + data.toString()).slice(-20000); };
    child.stdout.on('data', capture); child.stderr.on('data', capture);
    const kill = () => { timedOut = true; try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch {} };
    const timer = setTimeout(kill, timeout);
    child.on('error', e => { clearTimeout(timer); resolve({ code: -1, log: e.message, timedOut }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, log, timedOut }); });
  });
}
async function execute(plan, out, driver = childRun) {
  validatePlan(plan); fs.mkdirSync(out); // Exclusive creation: no overwriting or mixing previous experiments.
  const write = (name, value) => fs.writeFileSync(path.join(out, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  write('plan.json', plan);
  const started = Date.now(), rows = [], deadline = started + plan.limits.totalMs;
  let index = 0;
  for (const c of plan.cases) for (const seed of plan.seeds) {
    const stem = String(++index).padStart(3, '0'), requested = { ...(plan.parameters || {}), ...(c.parameters || {}), seed, id: plan.technique };
    const row = { index, case: c.label, seed, requested, ok: false, file: null, actual: null, metrics: {}, error: null };
    const npz = path.join(out, stem + '.npz'), report = path.join(out, stem + '-recipe.json');
    try {
      const left = deadline - Date.now(); check(left >= 1000, 'Whole sweep time budget exhausted; case not started');
      const outcome = await driver(requested, plan.sampling, Math.min(plan.limits.caseMs, left), npz, report);
      row.log = outcome.log; row.timedOut = outcome.timedOut;
      if (fs.existsSync(npz)) row.file = stem + '.npz';
      if (fs.existsSync(report)) { const r = JSON.parse(fs.readFileSync(report, 'utf8')); row.actual = r.actual; row.sampling = r.sampling; row.requestedChanges = Object.fromEntries(Object.entries(requested).filter(([k, v]) => !same(v, r.actual[k])).map(([k, v]) => [k, { requested: v, actual: r.actual[k] ?? null }])); check(r.recipeStableDuringExport, 'Recipe changed during export'); }
      check(outcome.code === 0, outcome.timedOut ? 'Case time budget exceeded' : 'Runner failed with exit code ' + outcome.code);
      check(row.actual, 'Missing sanitized recipe report');
      const measured = readMetrics(fs.readFileSync(npz), plan.metrics); row.metrics = measured.metrics; row.meta = measured.meta; row.provenance = measured.meta.provenance;
      check(row.provenance?.technique?.id === plan.technique, 'Export technique differs from requested technique');
      row.ok = true;
    } catch (error) { row.error = error.message; }
    rows.push(row); write(stem + '-case.json', row);
  }
  const summary = { version: 1, startedAt: new Date(started).toISOString(), elapsedMs: Date.now() - started, planSha256: crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex'), runnerSha256: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'), passed: rows.every(r => r.ok), rows, aggregates: aggregates(plan, rows), comparisons: comparisons(plan, rows), limitations: ['Unique seed labels are replicates, not proof of statistical independence. SEM describes successful seed replicates only; failures are retained and may bias that subset.', 'Repeated snapshots of one trajectory are not independent samples. No confidence interval, capacity estimate or scientific status promotion is inferred.', 'A counter threshold is not an exact temporal stop. Comparison eligibility checks declared conditions only; choosing physically appropriate conditions remains the researcher responsibility.'] };
  write('summary.json', summary);
  const columns = ['case', 'seed', 'ok', 'error', 'npz', ...plan.metrics.map(m => m.name)];
  write('summary.csv', [columns.map(csvCell).join(','), ...rows.map(r => [r.case, r.seed, r.ok, r.error, r.file, ...plan.metrics.map(m => r.metrics[m.name]?.value)].map(csvCell).join(','))].join('\n') + '\n');
  return summary;
}
if (require.main === module) (async () => {
  const args = process.argv.slice(2); check(args.length === 3 && args[1] === '--out', 'Usage: node tools/sweep.js plan.json --out NEW_DIRECTORY');
  const bytes = fs.readFileSync(args[0]); check(bytes.length <= 65536, 'Plan exceeds 64 KiB');
  const result = await execute(JSON.parse(bytes.toString('utf8')), path.resolve(args[2]));
  console.log(JSON.stringify({ passed: result.passed, cases: result.rows.length, failed: result.rows.filter(r => !r.ok).length, out: path.resolve(args[2]) }));
  if (!result.passed) process.exitCode = 1;
})().catch(e => { console.error(e.message); process.exitCode = 1; });
module.exports = { validatePlan, readMetrics, statistics, aggregates, comparisons, execute, childRun, lookup, csvCell };
