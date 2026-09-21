// Fast isolated controls for evidence selection and execution; no browser required.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process'), assert = require('node:assert/strict');
const { parseArgs, createPlan } = require('./verify');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-verify-'));
const root = path.join(temporary, 'repo');
try {
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(root, 'validation'));
  const put = (name, content) => fs.writeFileSync(path.join(root, name), content);
  const exists = name => fs.existsSync(path.join(root, name));
  const clear = name => fs.rmSync(path.join(root, name), { force: true });
  fs.copyFileSync(path.join(__dirname, 'verify.js'), path.join(root, 'tools/verify.js'));
  const log = name => `require('node:fs').appendFileSync('executions.txt', ${JSON.stringify(name + '\n')});`;
  put('tools/build.js', log('build'));
  put('tools/science.js', log('inventory'));
  put('tools/shared.js', log('shared'));
  put('tools/print.js', log('print'));
  const evidence = { test: 'tools/shared.js', command: `node -e "require('fs').writeFileSync('INJECTED','bad')"` };
  const rows = [
    { id: 'first', status: 'partially validated', numerical: [evidence, evidence], print: [{ test: 'tools/print.js' }] },
    { id: 'second', status: 'partially validated', numerical: [evidence], print: [evidence] },
    { id: 'empty', status: 'unvalidated', numerical: [], print: [] },
  ];
  const save = records => put('validation/techniques.json', JSON.stringify(records));
  save(rows);
  const run = (...args) => cp.spawnSync(process.execPath, ['tools/verify.js', ...args], { cwd: root, encoding: 'utf8' });
  const executed = () => fs.readFileSync(path.join(root, 'executions.txt'), 'utf8').trim().split('\n');

  let plan = createPlan(root, rows, parseArgs(['first', 'second', 'first', '--print']));
  assert.equal(plan.selected.length, 2, 'Duplicate IDs are selected once');
  assert.equal(plan.tests.length, 2, 'Duplicate test paths and kinds run once');
  assert.deepEqual(plan.tests[0].uses, ['first (numerical)', 'second (numerical)', 'second (print)']);
  plan = createPlan(root, rows, parseArgs(['empty', '--print']));
  assert.equal(plan.tests.length, 0);
  assert.deepEqual(plan.gaps, [{ id: 'empty', kind: 'numerical' }, { id: 'empty', kind: 'print' }]);
  assert.throws(() => parseArgs([]), /Select technique/);
  assert.throws(() => parseArgs(['--all', 'first']), /Select technique/);
  assert.throws(() => parseArgs(['first', '--unknown']), /Unknown option/);
  assert.throws(() => createPlan(root, rows, parseArgs(['unknown'])), /Unknown technique/);
  assert.equal(run('unknown').status, 2);
  assert.equal(exists('executions.txt'), false, 'Unknown IDs run no code');

  const outside = path.join(temporary, 'outside.js');
  fs.writeFileSync(outside, log('escaped'));
  fs.symlinkSync(outside, path.join(root, 'tools/escape.js'));
  for (const test of ['../outside.js', outside, 'tools/../outside.js', 'tools/shared.js;touch INJECTED', 'tools/shared.js --option', 'tools/shared.sh', 'tools\\shared.js', 'tools/escape.js', 'tools/verify.js']) {
    assert.throws(() => createPlan(root, [{ ...rows[0], numerical: [{ test }] }], parseArgs(['first'])), undefined, 'Reject unsafe or recursive path: ' + test);
  }
  const linked = path.join(temporary, 'linked');
  fs.mkdirSync(linked); fs.symlinkSync(path.join(root, 'tools'), path.join(linked, 'tools'));
  assert.throws(() => createPlan(linked, rows, parseArgs(['first'])), /escapes the repository/, 'Reject a tools directory symlink outside the repository');
  let result = run('--all', '--list', '--print');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /MISSING numerical evidence: empty/);
  assert.match(result.stdout, /Plan only/);
  assert.equal(exists('executions.txt'), false, 'Planning executes neither preflight nor tests');
  result = run('first', 'second', '--print');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(executed(), ['build', 'inventory', 'shared', 'print']);
  assert.equal(exists('INJECTED'), false, 'Freeform command was never executed');
  assert.match(result.stdout, /2 selected technique\(s\) still lack full validation/);

  clear('executions.txt');
  result = run('empty');
  assert.equal(result.status, 2);
  assert.match(result.stdout, /INCOMPLETE/);
  assert.deepEqual(executed(), ['build', 'inventory']);
  clear('executions.txt');
  result = run('--all');
  assert.equal(result.status, 2, '--all cannot report complete coverage with missing numerical evidence');
  assert.deepEqual(executed(), ['build', 'inventory', 'shared']);

  clear('executions.txt');
  put('tools/science.js', log('inventory') + 'process.exitCode=9;');
  result = run('first');
  assert.equal(result.status, 9, 'Inventory failure exit is preserved');
  assert.deepEqual(executed(), ['build', 'inventory'], 'No evidence executes after inconsistent inventory');
  put('tools/science.js', log('inventory'));
  clear('executions.txt');
  put('tools/build.js', log('build') + 'process.exitCode=8;');
  assert.equal(run('first').status, 8);
  assert.deepEqual(executed(), ['build'], 'No inventory/evidence executes after stale build');
  put('tools/build.js', log('build'));
  clear('executions.txt');
  put('tools/shared.js', log('shared') + 'process.exitCode=7;');
  result = run('first', '--print');
  assert.equal(result.status, 7, 'Scientific test failure exit is preserved');
  assert.deepEqual(executed(), ['build', 'inventory', 'shared'], 'Fail fast before remaining print test');
  assert.equal(exists('INJECTED'), false);
  console.log('PASS: evidence planning, deduplication, coverage gaps, dry run, unsafe paths, command isolation, consistency gating and child failure propagation.');
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
