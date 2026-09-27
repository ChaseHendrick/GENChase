// Partition the existing complete-PDE evidence across independent CI runners.
// Browser checks remain sequential within each runner. No result or validation label is written.
'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const assert = require('node:assert/strict'), os = require('node:os');
const { createPlan, parseArgs } = require('./verify');
const HALF_TABS = require('./lib/half-float-tabs');
const ROOT = path.resolve(__dirname, '..');
const IDS = ['cahn', 'ohta', 'amb', 'swift', 'ks', 'pfc'];
const FIELD = 'tools/pde-field-review.js', HALF = 'tools/half-float-check.js';
const WORKERS = ['numerical', 'fields', 'half-1', 'half-2'];

function validateWorkers(workers, evidence, halfTabs = HALF_TABS) {
  assert.equal(evidence.gaps.length, 0, 'Complete PDE CI requires every numerical and print evidence list');
  assert.deepEqual(workers.map(worker => worker.id), WORKERS, 'Every CI worker must be present exactly once');
  assert(halfTabs.length >= 2 && new Set(halfTabs).size === halfTabs.length, 'Half-float tab list must be nonempty and unique');
  const assigned = [], halfAssigned = [];
  for (const worker of workers) {
    assert(worker.tests.length > 0, worker.id + ': empty worker');
    for (const test of worker.tests) {
      assigned.push(test.path);
      if (test.path === HALF) {
        assert(worker.id.startsWith('half-'), 'Half-float cases belong to the half-float workers');
        assert.equal(test.args.length, 2, 'Half-float partitions must keep default steps and all controls');
        assert.equal(test.args[0], '--only', 'Only tab selection may differ from the full half-float review');
        const ids = test.args[1].split(',');
        assert(ids.length && ids.every(id => halfTabs.includes(id)), 'Unknown or empty half-float partition');
        halfAssigned.push(...ids);
      } else {
        assert.deepEqual(test.args, [], 'Registered checks keep their original arguments');
        assert.equal(worker.id, test.path === FIELD ? 'fields' : 'numerical', 'Registered check assigned to the wrong worker');
      }
    }
  }
  const expected = evidence.tests.map(test => test.path);
  assert(expected.includes(FIELD) && expected.includes(HALF), 'Both slow suites must remain registered evidence');
  // HALF is the sole split script. Every other registered script runs exactly once.
  assert.deepEqual(assigned.sort(), [...expected, HALF].sort(), 'Missing, duplicate, or unregistered evidence in CI');
  assert.deepEqual(halfAssigned.sort(), [...halfTabs].sort(), 'Half-float partitions must be disjoint and exhaustive');
  for (const id of ['half-1', 'half-2']) {
    assert.equal(workers.find(worker => worker.id === id).tests.length, 1, 'Each half-float worker runs one partition');
  }
  return workers;
}

function plan(root = ROOT) {
  const records = JSON.parse(fs.readFileSync(path.join(root, 'validation/techniques.json'), 'utf8'));
  const evidence = createPlan(root, records, parseArgs(['--print', ...IDS]));
  const plain = test => ({ path: test.path, args: [] });
  const workers = [
    { id: 'numerical', tests: evidence.tests.filter(test => ![FIELD, HALF].includes(test.path)).map(plain) },
    { id: 'fields', tests: evidence.tests.filter(test => test.path === FIELD).map(plain) },
    ...[0, 1].map(index => ({ id: 'half-' + (index + 1), tests: [{ path: HALF,
      args: ['--only', HALF_TABS.filter((_, i) => i % 2 === index).join(',')] }] })),
  ];
  validateWorkers(workers, evidence);
  return { workers, evidence };
}

function execute(root, test) {
  console.log('Running ' + [test.path, ...test.args].join(' '));
  const result = cp.spawnSync(process.execPath, [test.path, ...test.args], {
    cwd: root, stdio: 'inherit', shell: false, timeout: 900000, killSignal: 'SIGKILL',
  });
  if (result.error) { console.error(test.path + ': ' + result.error.message); return 1; }
  if (result.signal) return 128 + (os.constants.signals[result.signal] || 0);
  return result.status === null ? 1 : result.status;
}

function main(args = process.argv.slice(2), root = ROOT) {
  try {
    assert(args.length === 1 && ['--matrix', '--check', ...WORKERS].includes(args[0]),
      'Usage: node tools/pde-ci.js --matrix|--check|numerical|fields|half-1|half-2');
    const { workers, evidence } = plan(root);
    if (args[0] === '--matrix') {
      console.log(JSON.stringify({ include: workers.map(({ id }) => ({ id })) }));
      return 0;
    }
    if (args[0] === '--check') {
      console.log('PASS CI coverage: ' + evidence.tests.length + ' registered scripts, ' + HALF_TABS.length + ' half-float tabs; no browser checks ran.');
      return 0;
    }
    const worker = workers.find(({ id }) => id === args[0]);
    for (const test of [{ path: 'tools/build.js', args: ['--check'] }, { path: 'tools/science.js', args: [] }, ...worker.tests]) {
      const code = execute(root, test);
      if (code) { console.error('FAILED ' + worker.id + ': ' + test.path + '; remaining checks did not run.'); return code; }
    }
    console.log('PASS worker ' + worker.id + '. Complete PDE coverage requires every worker to pass.');
    return 0;
  } catch (error) { console.error(error.message); return 2; }
}

module.exports = { IDS, FIELD, HALF, WORKERS, validateWorkers, plan, main };
if (require.main === module) process.exitCode = main();
