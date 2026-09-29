// Exercise the actual automation PR steps with local Git remotes and a fake gh. No network calls.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-automation-'));
const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const bin = path.join(tmp, 'bin');
put(path.join(bin, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs'), args = process.argv.slice(2);
fs.appendFileSync(process.env.GH_CALLS, JSON.stringify(args) + '\\n');
if (args[0] === 'pr' && args[1] === 'list') {
  if (process.env.OPEN_PR === 'yes') console.log('42');
} else if (args[0] === 'pr' && args[1] === 'create') {
  console.log('https://example.invalid/pull/42');
} else if (args[0] === 'workflow' && args[1] === 'run') {
  if (args[2] === process.env.FAIL_WORKFLOW) process.exit(1);
} else { console.error('Unexpected gh command'); process.exit(99); }
`);
fs.chmodSync(path.join(bin, 'gh'), 0o755);
const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH,
  GIT_CONFIG_GLOBAL: path.join(tmp, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid' };
put(env.GIT_CONFIG_GLOBAL, '[init]\n\tdefaultBranch = main\n');
const git = (cwd, ...args) => cp.execFileSync('git', args, { cwd, env, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// These workflow steps contain literal shell blocks. Extract the complete block that Actions runs.
function stepScript(workflow, name) {
  const lines = workflow.split('\n'), start = lines.findIndex(line => line.trim() === '- name: ' + name);
  assert(start >= 0, 'Missing automation step ' + name);
  let run = start + 1;
  while (run < lines.length && !/^        run: \|$/.test(lines[run])) {
    assert(!/^      - /.test(lines[run]), 'Missing shell block in ' + name); run++;
  }
  assert(run < lines.length, 'Missing run block in ' + name);
  const script = [];
  for (const line of lines.slice(run + 1)) {
    if (line.trim() && !line.startsWith('          ')) break;
    script.push(line.slice(10));
  }
  return script.join('\n');
}

let cases = 0;
try {
  for (const fixture of [
    { file: 'volunteer-results.yml', step: 'Open or update a refresh pull request', branch: 'automation/refresh-volunteer-ledger',
      files: ['experiments/VORTEX-COLLAPSE.md', 'experiments/results/vortex-collapse-leaderboard.json', 'COMPUTE.md'] },
    { file: 'timestamps.yml', step: 'Propose the proofs', branch: 'automation/timestamps', files: ['identities/commitments/fixture.txt.ots'] },
  ]) {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows', fixture.file), 'utf8');
    assert.match(workflow, /actions: write/, fixture.file + ' must be allowed to dispatch workflows');
    assert.match(workflow, /token: \$\{\{ secrets\.AUTOMATION_TOKEN \|\| github\.token \}\}/, 'Checkout must use the same configured credential as PR creation');
    assert.match(workflow, /GH_TOKEN: \$\{\{ secrets\.AUTOMATION_TOKEN \|\| github\.token \}\}/);
    const script = stepScript(workflow, fixture.step);
    for (const scenario of ['unchanged', 'new PR', 'existing PR', 'dispatch failure', 'configured new PR', 'configured existing PR']) {
      const cwd = path.join(tmp, 'case-' + ++cases), remote = path.join(tmp, 'remote-' + cases + '.git');
      fs.mkdirSync(cwd); git(cwd, 'init', '-q'); git(cwd, 'init', '-q', '--bare', remote);
      for (const file of fixture.files) put(path.join(cwd, file), 'initial\n');
      git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'initial');
      git(cwd, 'remote', 'add', 'origin', remote); git(cwd, 'push', '-q', 'origin', 'main');
      if (scenario !== 'unchanged') for (const file of fixture.files) put(path.join(cwd, file), 'updated\n');
      const log = path.join(tmp, 'calls-' + cases), summary = path.join(tmp, 'summary-' + cases);
      put(log, ''); put(summary, '');
      const result = cp.spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script], {
        cwd, encoding: 'utf8', timeout: 20000,
        env: { ...env, GH_TOKEN: 'fixture', GH_CALLS: log, GITHUB_STEP_SUMMARY: summary, GITHUB_RUN_ID: '123',
          HAS_AUTOMATION_TOKEN: scenario.startsWith('configured') ? 'true' : 'false',
          OPEN_PR: scenario.includes('existing PR') ? 'yes' : 'no', FAIL_WORKFLOW: scenario === 'dispatch failure' ? 'check.yml' : '' },
      });
      const calls = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      assert.equal(result.status, scenario === 'dispatch failure' ? 1 : 0, fixture.file + ': ' + scenario + '\n' + result.stdout + result.stderr);
      if (scenario === 'unchanged') {
        assert.deepEqual(calls, [], 'No new PR or checks for unchanged generated files');
        assert.equal(git(remote, 'for-each-ref', '--format=%(refname)', 'refs/heads/' + fixture.branch), '');
        continue;
      }
      assert.equal(git(remote, 'show', fixture.branch + ':' + fixture.files[0]), 'updated', 'Checks target a pushed candidate');
      assert.equal(calls.filter(args => args[0] === 'pr' && args[1] === 'create').length, scenario.includes('existing PR') ? 0 : 1);
      assert.deepEqual(calls.filter(args => args[0] === 'workflow'),
        (scenario.startsWith('configured') ? [] : scenario === 'dispatch failure' ? ['check.yml'] : ['check.yml', 'pages.yml'])
          .map(file => ['workflow', 'run', file, '--ref', fixture.branch]));
      if (scenario.startsWith('configured')) assert.match(result.stdout, /starts the normal pull_request checks/);
      else assert.match(result.stdout, /do not satisfy required PR check contexts/, 'Fallback must disclose the merge-check limitation');
    }
  }
  // A rename within the submission tree must be treated as a newly added result. The verifier must
  // still come from the base branch even when the PR changes its own copy of that program.
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/volunteer-results.yml'), 'utf8');
  const verifyScript = stepScript(workflow, 'Re-verify submitted vortex results');
  for (const change of ['add', 'rename', 'symlink']) {
    const cwd = path.join(tmp, 'verify-' + ++cases), runner = path.join(tmp, 'runner-' + cases);
    fs.mkdirSync(cwd); fs.mkdirSync(runner); git(cwd, 'init', '-q');
    put(path.join(cwd, 'tools/vortex-collapse-search.js'), '// vortex-threshold supported by this fixture\n' +
      'require("node:fs").writeFileSync(process.env.VERIFIED_ARGS, JSON.stringify(process.argv.slice(2)));\n');
    const oldFile = 'experiments/results/vortex-collapse/vortex-collapse-before.json';
    const newFile = 'experiments/results/vortex-collapse/vortex-collapse-after space-\u03bc.json';
    put(path.join(cwd, oldFile), '{"fixture":true}\n');
    put(path.join(cwd, 'experiments/results/vortex-collapse/fixture.json'), '{"fixture":true}\n');
    git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'trusted verifier and old result');
    const base = git(cwd, 'rev-parse', 'HEAD');
    if (change === 'rename') git(cwd, 'mv', oldFile, newFile);
    else if (change === 'symlink') {
      fs.unlinkSync(path.join(cwd, oldFile));
      fs.symlinkSync('fixture.json', path.join(cwd, oldFile));
    }
    else put(path.join(cwd, newFile), '{"fixture":false}\n');
    put(path.join(cwd, 'tools/vortex-collapse-search.js'), 'throw Error("The PR verifier must never run");\n');
    git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'new submission');
    const log = path.join(tmp, 'verified-' + cases), summary = path.join(tmp, 'summary-' + cases);
    put(summary, '');
    const result = cp.spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', verifyScript], {
      cwd, encoding: 'utf8', timeout: 20000,
      env: { ...env, BASE: base, RUNNER_TEMP: runner, GITHUB_STEP_SUMMARY: summary, VERIFIED_ARGS: log },
    });
    if (change === 'symlink') {
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout, /must be a regular JSON file/);
      assert(!fs.existsSync(log), 'Do not hand symlinked results to the verifier');
      continue;
    }
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert(fs.existsSync(log), change + ' result must be re-verified');
    assert.deepEqual(JSON.parse(fs.readFileSync(log, 'utf8')), ['--verify', newFile, '--strict']);
  }
  console.log('PASS automation workflows: ' + cases + ' local cases covering configured/fallback PR creation/update/no-op, dispatch failures, trusted verification of added/renamed results, and symlink refusal.');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
