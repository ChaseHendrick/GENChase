// Negative controls and real merge fixtures for conservative browser CI scoping.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const { classify, classifyRaw, documentation, textOnly, strictJson, auditPath } = require('./ci-scope');
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

const registryPath = 'papers/papers.json', auditFile = 'docs/paper-zenodo-release-audit-2026-09-29-layout.json';
const clone = value => JSON.parse(JSON.stringify(value)), json = value => JSON.stringify(value);
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', registryPath), 'utf8'));
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', auditFile), 'utf8'));
const baseline = clone(registry);
for (const paper of baseline.papers) delete paper.archiveVersion;
const updated = clone(baseline);
for (const paper of updated.papers.filter(p => p.companion)) paper.archiveVersion = '1.2.3';
updated.papers[0].note += ' Archive metadata checked.';
updated.papers[0].codeDoi = '10.5281/zenodo.123456789';
const blobs = (before, after) => id => {
  assert([oid, other].includes(id), 'Reads only verified nonzero blob IDs');
  return id === oid ? before : after;
};
const metadata = (before, after, file = registryPath, status = 'M', modes = ['100644', '100644']) =>
  classifyRaw(raw(file, status, ...modes), blobs(typeof before === 'string' ? before : json(before), typeof after === 'string' ? after : json(after))).browserRequired;
let metadataControls = 0;
const checkMetadata = (expected, before, after, label, file = registryPath, status = 'M', modes) => {
  metadataControls++; assert.equal(metadata(before, after, file, status, modes), expected, label);
};
checkMetadata(false, baseline, updated, 'Only notes, canonical Zenodo DOI and new archive versions change');
checkMetadata(false, updated, registry, 'Existing archive versions may update with preserved registry structure');
checkMetadata(false, baseline, JSON.stringify(baseline, null, 4), 'Registry formatting is inert');
const reorderedKeys = Object.fromEntries(Object.entries(updated).reverse());
checkMetadata(false, baseline, reorderedKeys, 'Object key ordering is inert');
for (const [label, mutate] of [
  ['author changes', r => { r.author.email = 'other@example.invalid'; }],
  ['registry description changes', r => { r.about += ' Changed.'; }],
  ['allowed statuses change', r => { r.statuses.push('new-status'); }],
  ['unknown root field', r => { r.extra = true; }],
  ['paper addition', r => { r.papers.push(clone(r.papers[0])); }],
  ['paper deletion', r => { r.papers.pop(); }],
  ['paper ordering', r => { r.papers.reverse(); }],
  ['paper identity', r => { r.papers[0].id = 'unknown'; }],
  ['missing paper identity', r => { delete r.papers[0].id; }],
  ['duplicate paper identity', r => { r.papers[1].id = r.papers[0].id; }],
  ...['title', 'status', 'pdf', 'latex', 'companion', 'textLicense', 'commitments', 'arxiv', 'journal', 'unknown'].map(key =>
    ['nonallowed paper field ' + key, r => { r.papers[0][key] = 'changed'; }]),
  ['software paper notes', r => { r.papers.find(p => p.id === 'software-paper').note += ' Changed.'; }],
  ['empty note', r => { r.papers[0].note = ''; }],
  ['nonstring note', r => { r.papers[0].note = null; }],
  ['note control character', r => { r.papers[0].note += '\n'; }],
  ['note leading whitespace', r => { r.papers[0].note = ' ' + r.papers[0].note; }],
  ['oversized note', r => { r.papers[0].note = 'a'.repeat(20001); }],
  ['note deletion', r => { delete r.papers[0].note; }],
  ['non-Zenodo DOI', r => { r.papers[0].codeDoi = '10.1000/example'; }],
  ['DOI URL instead of identifier', r => { r.papers[0].codeDoi = 'https://doi.org/10.5281/zenodo.123'; }],
  ['DOI leading zero', r => { r.papers[0].codeDoi = '10.5281/zenodo.0123'; }],
  ['DOI deletion', r => { delete r.papers[0].codeDoi; }],
  ...['v1.2.3', '01.2.3', '1.02.3', '1.2.03', '1.2', '1.2.3-beta', '1.2.3+build', ' 1.2.3', null, 123].map(value =>
    ['invalid archive version ' + json(value), r => { r.papers[0].archiveVersion = value; }]),
]) {
  const changed = clone(updated); mutate(changed);
  checkMetadata(true, baseline, changed, label);
}
const removedVersion = clone(updated); delete removedVersion.papers[0].archiveVersion;
checkMetadata(true, updated, removedVersion, 'Archive version deletion');
const missingIdentity = clone(baseline); delete missingIdentity.papers[0].id;
checkMetadata(true, missingIdentity, missingIdentity, 'Even an unchanged malformed identity cannot receive the shortcut');
for (const text of ['{', '{"papers":[],"papers":[]}', '{"papers":[],"pa\\u0070ers":[]}', '{"papers":[{"id":"a","id":"a"}]}', '{"papers":[],"value":1e999}']) {
  checkMetadata(true, baseline, text, 'Malformed, duplicate or nonfinite JSON: ' + text);
}
checkMetadata(true, '{', updated, 'Malformed old registry cannot receive the shortcut');
checkMetadata(true, '{"other":9007199254740992,' + json(baseline).slice(1), '{"other":9007199254740993,' + json(updated).slice(1), 'Unsafe integer rounding cannot hide a nonallowed field change');
checkMetadata(true, '{"other":1.1,' + json(baseline).slice(1), '{"other":1.1000000000000001,' + json(updated).slice(1), 'Decimal rounding cannot hide a nonallowed field change');
const oldMissingNote = clone(baseline); delete oldMissingNote.papers[0].note;
checkMetadata(true, oldMissingNote, updated, 'New note fields do not expand the metadata boundary');
const oldMissingDoi = clone(baseline); delete oldMissingDoi.papers[0].codeDoi;
checkMetadata(true, oldMissingDoi, updated, 'New DOI fields do not expand the metadata boundary');
assert.deepEqual(strictJson('{"a":[{"b":"quotes \\\" : {}"},null,true,0]}'), { a: [{ b: 'quotes " : {}' }, null, true, 0] });
checkMetadata(true, baseline, updated, 'Registry additions require full checks', registryPath, 'A', ['000000', '100644']);
checkMetadata(true, baseline, updated, 'Registry deletions require full checks', registryPath, 'D', ['100644', '000000']);
for (const file of ['papers/other.json', 'docs/report.json', 'docs/paper-zenodo-release-audit-2026-02-30-layout.json', 'docs/paper-zenodo-release-audit-2026-09-29.json', 'docs/paper-zenodo-release-audit-2026-09-29-other.json']) {
  checkMetadata(true, audit, audit, 'Unknown JSON path: ' + file, file);
}
for (const file of [auditFile, 'docs/paper-zenodo-release-audit-2028-02-29-figures.json']) {
  assert(auditPath(file));
  checkMetadata(false, audit, audit, 'Known audit modification: ' + file, file);
  checkMetadata(false, null, audit, 'Known audit addition: ' + file, file, 'A', ['000000', '100644']);
}
for (const [label, mutate] of [
  ['unknown audit field', a => { a.extra = true; }],
  ['unknown paper field', a => { a.papers[0].extra = true; }],
  ['unknown archive field', a => { a.papers[0].zenodoArchives[0].extra = true; }],
  ['unknown metadata field', a => { a.papers[0].recordMetadata.extra = true; }],
  ['missing required field', a => { delete a.scope; }],
  ['unrecognized report envelope', a => { delete a.publicationCommit; delete a.reviewedFigureCommit; delete a.allVerified; delete a.scope; }],
  ['invalid audit time', a => { a.checkedAt = '2026-09-29T25:01:00Z'; }],
  ['invalid audit date', a => { a.checkedAt = '2026-02-30T01:01:00Z'; }],
  ['invalid commit', a => { a.publicationCommit = 'a'.repeat(39); }],
  ['wrong boolean type', a => { a.allVerified = 'true'; }],
  ['missing paper', a => { a.papers.pop(); }],
  ['duplicate paper', a => { a.papers[1] = clone(a.papers[0]); }],
  ['unknown paper identity', a => { a.papers[0].paper = 'software-paper'; }],
  ['invalid release version', a => { a.papers[0].version = 'v1.2.3'; }],
  ['invalid PDF hash', a => { a.papers[0].reviewedPdfSha256 = '../file'; }],
  ['unknown record host', a => { a.papers[0].record = a.papers[0].record.replace('zenodo.org', 'example.invalid'); }],
  ['different companion identity', a => { a.papers[0].release = a.papers[0].release.replace(a.papers[0].paper, 'other-paper'); }],
  ['unknown archive host', a => { a.papers[0].zenodoArchives[0].url = 'https://example.invalid/archive.zip'; }],
  ['unexpected archive count', a => { a.papers[0].zenodoArchives.push(clone(a.papers[0].zenodoArchives[0])); }],
  ['different PDF path', a => { a.papers[0].zenodoArchives[0].manuscript = 'paper/wrong.pdf'; }],
  ['software resource type', a => { a.papers[0].recordMetadata.resourceType.type = 'software'; }],
  ['unknown rights identifier', a => { a.papers[0].recordMetadata.license = 'apache-2.0'; }],
  ['malformed optional version', a => { a.papers[0].recordMetadata.expectedVersion = 'v1.2.3'; }],
]) {
  const changed = clone(audit); mutate(changed);
  checkMetadata(true, audit, changed, label, auditFile);
}
const versionedAudit = clone(audit);
versionedAudit.papers.forEach(p => Object.assign(p.recordMetadata, { version: p.version, expectedVersion: p.version, validExpectedVersion: true, versionMatches: true }));
checkMetadata(false, audit, versionedAudit, 'Known optional archive-version metadata', auditFile);
const historicalFigures = fs.readFileSync(path.join(__dirname, '..', 'docs/paper-zenodo-release-audit-2026-09-29-figures.json'), 'utf8');
checkMetadata(true, historicalFigures, historicalFigures, 'Historical figures envelope retains full checks', 'docs/paper-zenodo-release-audit-2026-09-29-figures.json');
checkMetadata(true, '{', audit, 'Malformed old audit cannot receive the shortcut', auditFile);
checkMetadata(true, audit, audit, 'Audit deletions require full checks', auditFile, 'D', ['100644', '000000']);
for (const file of [registryPath, auditFile]) {
  checkMetadata(true, baseline, updated, 'Executable metadata cannot skip: ' + file, file, 'M', ['100644', '100755']);
  checkMetadata(true, baseline, updated, 'Symlink metadata cannot skip: ' + file, file, 'M', ['120000', '120000']);
  assert.equal(classifyRaw(raw(file)).browserRequired, true, 'No unchecked JSON shortcut without blob inspection');
  assert.equal(classifyRaw(raw(file), () => { throw Error('Unavailable object'); }).browserRequired, true);
}
assert.equal(classifyRaw(raw(registryPath) + raw('README.md'), blobs(json(baseline), json(updated))).browserRequired, false, 'Metadata mixed with Markdown');
for (const file of ['src/engine.js', 'tools/paper-zenodo-check.py', 'papers/minimal-winding/code/proof.py', 'papers/minimal-winding/paper/minimal-winding.tex', 'papers/minimal-winding/paper/figures/graph.pdf']) {
  assert.equal(classifyRaw(raw(registryPath) + raw(file), blobs(json(baseline), json(updated))).browserRequired, true, 'Metadata cannot hide executable, manuscript or figure changes: ' + file);
}
function mockedMetadataGit(numstat, unavailable = false) {
  return args => {
    if (args[0] === 'rev-list') return `${oid} ${other} ${oid}\n`;
    if (args[1] === '--raw') return raw(registryPath);
    if (args[0] === 'cat-file') { assert.equal(args[1], 'blob'); if (unavailable) throw Error('Missing blob'); return blobs(json(baseline), json(updated))(args[2]); }
    assert.equal(args[1], '--numstat'); return numstat;
  };
}
assert.equal(classify({ eventName: 'pull_request', git: mockedMetadataGit('1\t1\t' + registryPath + '\0') }).browserRequired, false, 'Validated blob contents used in PR scope');
assert.equal(classify({ eventName: 'pull_request', git: mockedMetadataGit('-\t-\t' + registryPath + '\0') }).browserRequired, true, 'Binary metadata keeps full checks');
assert.equal(classify({ eventName: 'pull_request', git: mockedMetadataGit('', true) }).browserRequired, true, 'Unavailable metadata blobs keep full checks');

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
  git('init', '-q', '-b', 'main'); put('README.md', 'Initial\n'); put('src/engine.js', 'initial\n'); put(registryPath, json(baseline)); commit('initial');
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
  merge(() => { put(registryPath, json(updated)); put(auditFile, json(audit)); });
  assert.equal(scope().browserRequired, false, 'Real metadata merge with an added known audit');
  merge(() => { const changed = clone(updated); changed.papers[0].title += ' Changed'; put(registryPath, json(changed)); });
  assert.equal(scope().browserRequired, true, 'Real nonallowed registry merge');
  merge(() => { const changed = JSON.parse(fs.readFileSync(path.join(temporary, registryPath), 'utf8')); changed.papers[0].note += ' Later audit.'; put(registryPath, json(changed)); put('papers/minimal-winding/code/proof.py', 'changed\n'); });
  assert.equal(scope().browserRequired, true, 'Real metadata and solver merge');
  merge(() => fs.unlinkSync(path.join(temporary, auditFile)));
  assert.equal(scope().browserRequired, true, 'Real audit deletion');
  merge(() => fs.chmodSync(path.join(temporary, registryPath), 0o755));
  assert.equal(scope().browserRequired, true, 'Real executable registry mode');
  const result = cp.spawnSync(process.execPath, [path.join(__dirname, 'ci-scope.js')], { encoding: 'utf8', timeout: 10000, env: { ...process.env, CI_EVENT_NAME: 'push' } });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stderr, '');
  assert.equal(JSON.parse(result.stdout).browserRequired, true, 'CLI emits machine-readable JSON only');
  console.log(`PASS CI scope: ${metadataControls} publication controls, conservative paths, raw records, event and parent guards, real merge and rename fixtures.`);
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
