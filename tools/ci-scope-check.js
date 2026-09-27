// Negative controls and real merge fixtures for conservative browser CI scoping.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const { classify, classifyRaw, documentation, textOnly } = require('./ci-scope');
const oid = 'a'.repeat(40), other = 'b'.repeat(40), zero = '0'.repeat(40);
const raw = (file, status = 'M', before = '100644', after = '100644') => `:${before} ${after} ${status === 'A' ? zero : oid} ${status === 'D' ? zero : other} ${status}\0${file}\0`;
for (const file of ['README.md', 'docs/review.md', 'docs/deep/a.md', 'papers/proof/notes/QUALITY.md', 'research/study/notes.md', 'experiments/run/notes.md', 'identities/notes.md']) {
  assert(documentation(file));
  assert.equal(classifyRaw(raw(file)).browserRequired, false, file);
}
for (const file of ['src/README.md', 'tools/README.md', 'apps/README.md', '.github/README.md', 'validation/README.md', 'validation/results/a.json', 'TECHNIQUES.md', 'unknown.md', 'docs/chart.svg', '/docs/a.md', 'docs/../tools/a.md', 'docs//a.md', 'docs/./a.md', 'docs/a\\b.md', 'docs/a\tb.md', 'docs/a\nb.md']) {
  assert.equal(classifyRaw(raw(file)).browserRequired, true, file);
}
assert.equal(classifyRaw(raw('README.md', 'A', '000000', '100644')).browserRequired, false);
assert.equal(classifyRaw(raw('README.md', 'D', '100644', '000000')).browserRequired, false);
for (const data of ['', '\0', raw('README.md').slice(0, -1), ':malformed\0README.md\0', raw('README.md') + 'orphan\0', raw('README.md', 'R100'), raw('README.md', 'T'), raw('README.md', 'M', '120000'), raw('README.md', 'M', '100644', '100755'), raw('README.md', 'A'), raw('README.md') + raw('src/engine.js'), raw('README.md').repeat(2), raw('README.md').replace(oid, zero)]) {
  assert.equal(classifyRaw(data).browserRequired, true, JSON.stringify(data));
}
for (const eventName of [undefined, '', 'push', 'workflow_dispatch', 'pull_request_target']) {
  assert.equal(classify({ eventName, git: () => { throw Error('Must not inspect non-PR changes'); } }).browserRequired, true);
}
assert.equal(classify({ eventName: 'pull_request', git: () => { throw Error('Unavailable parent'); } }).browserRequired, true);
for (const parents of [`${oid}\n`, `${oid} ${other}\n`, `${oid} ${other} ${oid} ${other}\n`, 'invalid invalid invalid\n']) {
  assert.equal(classify({ eventName: 'pull_request', git: () => parents }).browserRequired, true);
}
let calls = 0;
assert.equal(classify({ eventName: 'pull_request', git: args => {
  calls++;
  if (calls === 1) return `${oid} ${other} ${oid}\n`;
  if (calls === 2) {
    assert.deepEqual(args, ['diff', '--raw', '--no-abbrev', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', 'HEAD^1', 'HEAD', '--']);
    return raw('README.md');
  }
  assert.deepEqual(args, ['diff', '--numstat', '-z', '--no-renames', '--no-ext-diff', '--no-textconv', 'HEAD^1', 'HEAD', '--']);
  return '1\t1\tREADME.md\0';
} }).browserRequired, false);
for (const numstat of ['', '-\t-\tREADME.md\0', '1\t1\tdocs/other.md\0', '1\t1\tREADME.md', '1\t1\tREADME.md\0orphan\0', '1\t1\tREADME.md\0'.repeat(2)]) {
  assert.equal(textOnly(raw('README.md'), numstat), false, JSON.stringify(numstat));
}
assert.equal(textOnly(raw('README.md') + raw('docs/other.md'), '1\t1\tREADME.md\0'), false, 'No missing text records');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-ci-scope-'));
const git = (...args) => cp.execFileSync('git', args, { cwd: temporary, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
const put = (name, text) => { fs.mkdirSync(path.dirname(path.join(temporary, name)), { recursive: true }); fs.writeFileSync(path.join(temporary, name), text); };
const commit = message => { git('add', '-A'); git('-c', 'user.name=CI fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', message); };
const scope = () => classify({ cwd: temporary, eventName: 'pull_request' });
let serial = 0;
function merge(change) {
  git('checkout', '-q', 'main'); git('checkout', '-qb', 'fixture-' + ++serial);
  change(); commit('fixture change'); git('checkout', '-q', 'main');
  git('-c', 'user.name=CI fixture', '-c', 'user.email=fixture@example.invalid', 'merge', '--no-ff', '-qm', 'fixture merge', 'fixture-' + serial);
}
try {
  git('init', '-q', '-b', 'main'); put('README.md', 'Initial\n'); put('src/engine.js', 'initial\n'); commit('initial');
  assert.equal(scope().browserRequired, true, 'An ordinary branch checkout cannot skip checks');
  merge(() => { put('README.md', 'Updated\n'); put('docs/first.md', 'Documentation\n'); });
  assert.equal(scope().browserRequired, false, 'Real documentation merge');
  merge(() => put('src/engine.js', 'changed\n'));
  assert.equal(scope().browserRequired, true, 'Real source merge');
  merge(() => git('mv', 'src/engine.js', 'docs/engine.md'));
  assert.equal(scope().browserRequired, true, 'Moving source to documentation retains source deletion');
  merge(() => git('mv', 'docs/first.md', 'docs/renamed.md'));
  assert.equal(scope().browserRequired, false, 'Renaming ordinary documentation covers both paths');
  merge(() => fs.symlinkSync('../README.md', path.join(temporary, 'docs/link.md')));
  assert.equal(scope().browserRequired, true, 'A Markdown symlink cannot skip checks');
  merge(() => put('docs/tab\tname.md', 'Unusual path\n'));
  assert.equal(scope().browserRequired, true, 'Tabs survive NUL parsing and conservatively run full');
  merge(() => put('docs/newline\nname.md', 'Unusual path\n'));
  assert.equal(scope().browserRequired, true, 'Newlines survive NUL parsing and conservatively run full');
  merge(() => put('docs/binary.md', Buffer.from([0, 1, 2, 3])));
  assert.equal(scope().browserRequired, true, 'Binary Markdown cannot skip checks');
  const result = cp.spawnSync(process.execPath, [path.join(__dirname, 'ci-scope.js')], { encoding: 'utf8', timeout: 10000, env: { ...process.env, CI_EVENT_NAME: 'push' } });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).browserRequired, true, 'CLI emits machine-readable JSON only');
  console.log('PASS CI scope: conservative paths, raw records, event and parent guards, real merge and rename fixtures.');
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
