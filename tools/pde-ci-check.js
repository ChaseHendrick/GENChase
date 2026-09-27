// Fast coverage and failure controls for the complete-PDE CI split. No browser required.
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const cp = require('node:child_process'), assert = require('node:assert/strict');
const { IDS, FIELD, HALF, WORKERS, plan, validateWorkers } = require('./pde-ci');
const HALF_TABS = require('./lib/half-float-tabs');
const root = path.resolve(__dirname, '..'), clone = value => JSON.parse(JSON.stringify(value));
const actual = plan(root);
validateWorkers(actual.workers, actual.evidence);
for (const mutate of [
  workers => workers.pop(),
  workers => workers[0].tests.pop(),
  workers => workers[0].tests.push(clone(workers[0].tests[0])),
  workers => workers[0].tests.push({ path: 'tools/unregistered.js', args: [] }),
  workers => workers[1].tests[0].args.push('--write'),
  workers => workers[2].tests[0].args.push('--no-controls'),
  workers => { workers[2].tests[0].args[0] = '--steps'; },
  workers => { workers[2].tests[0].args[1] = ''; },
  workers => { workers[2].tests[0].args[1] += ',unknown'; },
  workers => { workers[2].tests[0].args[1] += ',' + workers[3].tests[0].args[1].split(',')[0]; },
  workers => { workers[2].tests[0].args[1] = workers[2].tests[0].args[1].split(',').slice(1).join(','); },
]) {
  const workers = clone(actual.workers);
  mutate(workers);
  assert.throws(() => validateWorkers(workers, actual.evidence), 'Coverage mutation must fail');
}
assert.throws(() => validateWorkers(clone(actual.workers), { ...actual.evidence, gaps: [{ id: 'amb', kind: 'print' }] }), /evidence list/);
assert.throws(() => validateWorkers(clone(actual.workers), actual.evidence, [...HALF_TABS, 'new-tab']), /exhaustive/);

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-pde-ci-'));
try {
  fs.mkdirSync(path.join(temporary, 'tools/lib'), { recursive: true });
  fs.mkdirSync(path.join(temporary, 'validation'));
  for (const file of ['tools/pde-ci.js', 'tools/verify.js', 'tools/lib/half-float-tabs.js']) {
    fs.copyFileSync(path.join(root, file), path.join(temporary, file));
  }
  const put = (name, value) => fs.writeFileSync(path.join(temporary, name), value);
  const log = name => `require('node:fs').appendFileSync('executions.jsonl', JSON.stringify({name:${JSON.stringify(name)},args:process.argv.slice(2)})+'\\n');`;
  for (const file of ['tools/build.js', 'tools/science.js', 'tools/small.js', 'tools/new-evidence.js', FIELD, HALF]) put(file, log(file));
  const records = IDS.map(id => ({ id, status: 'validated within stated limits',
    numerical: [{ test: 'tools/small.js' }, { test: FIELD }, ...(id === 'amb' ? [{ test: HALF }] : [])],
    print: [{ test: FIELD }],
  }));
  const save = rows => put('validation/techniques.json', JSON.stringify(rows));
  save(records);
  const run = (...args) => cp.spawnSync(process.execPath, ['tools/pde-ci.js', ...args], {
    cwd: temporary, encoding: 'utf8', timeout: 15000,
  });
  const executionFile = path.join(temporary, 'executions.jsonl');
  const read = () => fs.readFileSync(executionFile, 'utf8').trim().split('\n').map(JSON.parse);
  const clear = () => fs.rmSync(executionFile, { force: true });
  let result = run('--matrix');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { include: WORKERS.map(id => ({ id })) });
  assert.equal(run('--check').status, 0);
  assert(!fs.existsSync(executionFile), 'Planning and coverage checks execute no evidence');
  for (const args of [[], ['unknown'], ['--matrix', '--write'], ['half-1', '--no-controls']]) {
    assert.equal(run(...args).status, 2, 'Reject malformed worker command');
  }
  assert(!fs.existsSync(executionFile), 'Invalid worker selection executes no code');

  const all = [];
  for (const id of WORKERS) {
    clear(); result = run(id);
    assert.equal(result.status, 0, result.stderr);
    const executions = read();
    assert.deepEqual(executions.slice(0, 2), [
      { name: 'tools/build.js', args: ['--check'] }, { name: 'tools/science.js', args: [] },
    ], 'Every worker runs both freshness checks first');
    all.push(...executions.slice(2));
    assert.match(result.stdout, /requires every worker to pass/);
  }
  assert.deepEqual(all.filter(test => test.name !== HALF), [
    { name: 'tools/small.js', args: [] }, { name: FIELD, args: [] },
  ]);
  assert.deepEqual(all.filter(test => test.name === HALF).flatMap(test => {
    assert.equal(test.args.length, 2, 'No alternate steps or skipped controls');
    assert.equal(test.args[0], '--only');
    return test.args[1].split(',');
  }).sort(), [...HALF_TABS].sort(), 'Every fallback case executes exactly once');

  // Adding registered evidence automatically adds it to the numerical worker.
  records[0].numerical.push({ test: 'tools/new-evidence.js' }); save(records);
  clear(); assert.equal(run('numerical').status, 0);
  assert.deepEqual(read().slice(2).map(test => test.name), ['tools/small.js', 'tools/new-evidence.js']);
  records[0].numerical.pop(); save(records);

  // A failing preflight or evidence script cannot become a successful worker.
  for (const [file, code, expected] of [
    ['tools/build.js', 8, ['tools/build.js']],
    ['tools/science.js', 9, ['tools/build.js', 'tools/science.js']],
    ['tools/small.js', 7, ['tools/build.js', 'tools/science.js', 'tools/small.js']],
  ]) {
    clear(); put(file, log(file) + `process.exitCode=${code};`);
    assert.equal(run('numerical').status, code);
    assert.deepEqual(read().map(test => test.name), expected);
    put(file, log(file));
  }
  clear(); put(HALF, log(HALF) + 'process.exitCode=6;');
  assert.equal(run('half-2').status, 6, 'Half-float failure propagates');
  clear(); records[0].print = []; save(records);
  assert.equal(run('--matrix').status, 2, 'Missing evidence cannot create a successful matrix');
  assert(!fs.existsSync(executionFile));
  console.log('PASS PDE CI: exhaustive nonduplicated evidence and fallback cases, preserved controls, dynamic evidence, preflight and failure propagation.');
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
