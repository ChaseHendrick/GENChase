#!/usr/bin/env node
// End-to-end check of tools/paper-publish.sh and tools/paper-pull.sh against local repositories;
// nothing touches GitHub. A throwaway repository shaped like this one publishes a paper to a bare
// "companion", and an "owner" clone edits the companion directly, as the owner would on GitHub.
//
// Cases: the first publish; a run with nothing new; an owner's direct edit surviving a later update
// from here; a conflicting edit that stops the run and pushes nothing; tools/paper-pull.sh bringing
// the owner's edit back; the run after that publishing cleanly; a release that needs its notes; and the
// version rule: a new release is written without a leading v, while a release made before 2026-09-26
// keeps its v tag. npm test runs this.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-publish-'));
const ENV = { ...process.env, GIT_CONFIG_GLOBAL: path.join(tmp, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' };
delete ENV.GH_TOKEN;
fs.writeFileSync(ENV.GIT_CONFIG_GLOBAL, '[init]\n\tdefaultBranch = main\n');

const git = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8', env: ENV, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const read = f => fs.readFileSync(f, 'utf8');
const SRC = path.join(tmp, 'src'), REMOTES = path.join(tmp, 'remotes'), BARE = path.join(REMOTES, 'o', 't.git'), OWNER = path.join(tmp, 'owner');
const run = (script, args = [], extra = {}) => spawnSync('sh', [path.join(SRC, 'tools', script), ...args],
  { cwd: SRC, encoding: 'utf8', env: { ...ENV, GH_TOKEN: 'x', PAPERS_REMOTE: 'file://' + REMOTES, ...extra } });
const remoteHead = ref => git(BARE, 'rev-parse', ref);
const remoteFile = (ref, f) => git(BARE, 'show', ref + ':' + f);
const commitSrc = msg => { git(SRC, 'add', '-A'); git(SRC, 'commit', '-q', '-m', msg); };
const ownerEdit = (f, s, msg) => { git(OWNER, 'pull', '-q', 'origin', 'main'); write(path.join(OWNER, f), s); git(OWNER, 'commit', '-q', '-am', msg); git(OWNER, 'push', '-q', 'origin', 'main'); };

let checks = 0, failures = 0;
const ok = (cond, what, detail) => { checks++; if (!cond) { failures++; console.log('FAIL ' + what + (detail ? '\n' + detail : '')); } };

try {
  // A repository shaped like this one, with one ready paper whose companion is o/t.
  for (const f of ['paper-sync.js', 'paper-publish.sh', 'paper-pull.sh']) write(path.join(SRC, 'tools', f), read(path.join(ROOT, 'tools', f)));
  write(path.join(SRC, 'LICENSE'), 'Apache License\n');
  write(path.join(SRC, 'papers', 'papers.json'), JSON.stringify({ author: { name: 'A B', 'given-names': 'A', 'family-names': 'B', affiliation: 'Independent Researcher', email: 'ab@example.org' },
    papers: [{ id: 't', title: 'T', status: 'ready', companion: 'o/t' }] }, null, 2));
  write(path.join(SRC, 'papers', 't', 'README.md'), '# T\n\n## Abstract\n\nIntro.\n');
  write(path.join(SRC, 'papers', 't', 'paper', 't.tex'), 'line one\nline two\nline three\n');
  write(path.join(SRC, 'papers', 't', 'code', 'run.py'), 'print(1)\n');
  write(path.join(SRC, 'papers', 't', 'notes', 'private.md'), 'working note\n');
  git(tmp, 'init', '-q', SRC); commitSrc('start');
  fs.mkdirSync(path.dirname(BARE), { recursive: true }); git(tmp, 'init', '-q', '--bare', BARE);

  // 1. First publish: the paper, without its notes, plus the generated files, on main and genchase-sync.
  let r = run('paper-publish.sh');
  ok(r.status === 0, 'first publish succeeds', r.stdout + r.stderr);
  const files = git(BARE, 'ls-tree', '-r', '--name-only', 'main').split('\n').sort().join(' ');
  ok(files === '.zenodo.json CITATION.cff LICENSE README.md code/run.py paper/t.tex', 'the companion holds the paper and generated files, not notes/', files);
  ok(remoteHead('main') === remoteHead('genchase-sync'), 'main starts at the published snapshot');
  ok(git(BARE, 'log', '-1', '--format=%an <%ae> / %cn <%ce>', 'main') === 'Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com> / Chase Hendrick <326338179+ChaseHendrick@users.noreply.github.com>',
    'publishing commits carry the project identity, even with another identity in the environment');

  // 2. Nothing new: nothing is pushed.
  const first = remoteHead('main');
  r = run('paper-publish.sh');
  ok(r.status === 0 && /already up to date/.test(r.stdout) && remoteHead('main') === first, 'a run with nothing new pushes nothing', r.stdout + r.stderr);

  // 3. The owner edits the companion directly; an update here to another file keeps that edit.
  git(tmp, 'clone', '-q', BARE, OWNER);
  ownerEdit('README.md', '# T\n\n## Abstract\n\nIntro.\n\nErratum: a typo on page 2.\n', 'Erratum in the README');
  write(path.join(SRC, 'papers', 't', 'paper', 't.tex'), 'line one\nline two\nline three, revised\n'); commitSrc('revise line three');
  r = run('paper-publish.sh');
  ok(r.status === 0, 'an update after a direct edit succeeds', r.stdout + r.stderr);
  ok(/Erratum/.test(remoteFile('main', 'README.md')), "the owner's direct edit survives the update");
  ok(/revised/.test(remoteFile('main', 'paper/t.tex')), 'the update from here lands too');
  ok(!/Erratum/.test(remoteFile('genchase-sync', 'README.md')), 'genchase-sync holds only what this repository published');

  // 4. The owner and this repository change the same line: the run stops and pushes nothing.
  ownerEdit('paper/t.tex', 'line one, as the owner wrote it\nline two\nline three, revised\n', 'Owner rewrites line one');
  write(path.join(SRC, 'papers', 't', 'paper', 't.tex'), 'line one, as this repository wrote it\nline two\nline three, revised\n'); commitSrc('rewrite line one here');
  const beforeMain = remoteHead('main'), beforeSync = remoteHead('genchase-sync');
  r = run('paper-publish.sh');
  ok(r.status !== 0 && /paper\/t\.tex/.test(r.stdout + r.stderr), 'a conflicting edit stops the run and names the file', r.stdout + r.stderr);
  ok(remoteHead('main') === beforeMain && remoteHead('genchase-sync') === beforeSync, 'a stopped run pushes nothing');

  // 5. Pull the companion back: the owner's text arrives, notes stay, generated files stay out.
  r = run('paper-pull.sh', ['t']);
  ok(r.status === 0 && /updated papers\/t\/paper\/t\.tex/.test(r.stdout), 'paper-pull brings the edited file back', r.stdout + r.stderr);
  ok(/as the owner wrote it/.test(read(path.join(SRC, 'papers', 't', 'paper', 't.tex'))) && /Erratum/.test(read(path.join(SRC, 'papers', 't', 'README.md'))), "the owner's edits are now here");
  ok(fs.existsSync(path.join(SRC, 'papers', 't', 'notes', 'private.md')), 'paper-pull leaves notes/ alone');
  ok(!fs.existsSync(path.join(SRC, 'papers', 't', 'LICENSE')) && !fs.existsSync(path.join(SRC, 'papers', 't', 'CITATION.cff')), 'paper-pull does not copy the generated files');

  // 6. With the owner's version taken here, the next run publishes cleanly.
  commitSrc('take the companion edits');
  r = run('paper-publish.sh');
  ok(r.status === 0, 'after the pull, publishing succeeds', r.stdout + r.stderr);
  ok(/as the owner wrote it/.test(remoteFile('main', 'paper/t.tex')) && /Erratum/.test(remoteFile('main', 'README.md')), 'the companion keeps the agreed text');
  ok(git(BARE, 'merge-base', '--is-ancestor', beforeMain, 'main') === '', 'main was never rewritten, only added to');

  // 7. Without a token nothing happens; a malformed release tag is refused.
  r = spawnSync('sh', [path.join(SRC, 'tools', 'paper-publish.sh')], { cwd: SRC, encoding: 'utf8', env: ENV });
  ok(r.status === 0 && /not set/.test(r.stdout), 'without a token the script does nothing', r.stdout + r.stderr);
  r = run('paper-publish.sh', [], { RELEASE: 'latest', PAPER: 't' });
  ok(r.status !== 0, 'a malformed release tag is refused');

  // 8. A release needs notes: a tag without a section in RELEASES.md is refused before anything is
  // pushed, and one with a section passes that gate.
  const mainBefore = remoteHead('main');
  write(path.join(SRC, 'papers', 't', 'README.md'), read(path.join(SRC, 'papers', 't', 'README.md')) + '\nA change that must not be pushed.\n');
  commitSrc('a change waiting for a release');
  r = run('paper-publish.sh', [], { RELEASE: '1.0.0', PAPER: 't' });
  ok(r.status !== 0 && /RELEASES\.md has no notes under '## 1\.0\.0'/.test(r.stdout + r.stderr), 'a release without notes is refused', r.stdout + r.stderr);
  ok(remoteHead('main') === mainBefore, 'a refused release pushes nothing');
  write(path.join(SRC, 'papers', 't', 'RELEASES.md'), '# Releases\n\n## Unreleased\n\n- next\n\n## 1.1.0 (2026-10-01)\n\nA new release.\n\n' +
    '## 1.0.0 (2026-09-26)\n\nThe first release written without a v.\n\n## 0.9.0 (2026-09-25)\n\nA release made before 2026-09-26, tagged v0.9.0.\n');
  commitSrc('release notes');

  // 9. Versions are written without a leading v (owner's decision, 2026-09-26): a new tag with the v is
  // refused before anything is pushed, even with notes, and a plain one publishes.
  r = run('paper-publish.sh', [], { RELEASE: 'v1.1.0', PAPER: 't' });
  ok(r.status !== 0 && /without a leading v: 1\.1\.0, not v1\.1\.0/.test(r.stdout + r.stderr), 'a new release tagged with a leading v is refused', r.stdout + r.stderr);
  ok(remoteHead('main') === mainBefore, 'a release refused for its v pushes nothing');
  r = run('paper-publish.sh', [], { RELEASE: '1.0.0', PAPER: 't' });
  ok(r.status === 0 && remoteHead('main') !== mainBefore, 'a release written 1.0.0 with notes publishes', r.stdout + r.stderr);
  ok(/## 1\.0\.0/.test(remoteFile('main', 'RELEASES.md')), 'RELEASES.md reaches the companion');

  // 10. A release made before 2026-09-26 keeps its v tag: that tag is taken, to bring its notes up to date
  // from the section written without the v, and the same version under a new plain tag is refused.
  git(OWNER, 'pull', '-q', 'origin', 'main'); git(OWNER, 'tag', 'v0.9.0'); git(OWNER, 'push', '-q', 'origin', 'v0.9.0');
  r = run('paper-publish.sh', [], { RELEASE: 'v0.9.0', PAPER: 't' });
  ok(r.status === 0, 'the existing tag v0.9.0 is taken, with its notes under "## 0.9.0"', r.stdout + r.stderr);
  const beforeTwin = remoteHead('main');
  write(path.join(SRC, 'papers', 't', 'README.md'), read(path.join(SRC, 'papers', 't', 'README.md')) + '\nAnother change that must not be pushed.\n');
  commitSrc('a change waiting for a release');
  r = run('paper-publish.sh', [], { RELEASE: '0.9.0', PAPER: 't' });
  ok(r.status !== 0 && /already has 0\.9\.0 as v0\.9\.0/.test(r.stdout + r.stderr), 'a plain tag for a version released under its v tag is refused', r.stdout + r.stderr);
  ok(remoteHead('main') === beforeTwin, 'a release refused as a twin pushes nothing');
  ok(git(BARE, 'tag', '--list').split('\n').join(' ') === 'v0.9.0', 'no tag is made, moved or renamed', git(BARE, 'tag', '--list'));
} catch (e) {
  failures++; console.log('FAIL ' + (e.stack || e.message) + (e.stderr ? '\n' + e.stderr : ''));
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }

console.log((failures ? 'PAPER PUBLISH CHECK FAILED: ' + failures + ' of ' : 'Paper publish check OK: ') + checks + ' checks against local repositories');
process.exit(failures ? 1 : 0);
