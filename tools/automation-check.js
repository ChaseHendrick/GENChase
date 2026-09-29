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
    { file: 'volunteer-results.yml', prepare: 'Prepare the generated ledger branch', step: 'Open or update a refresh pull request', branch: 'automation/refresh-volunteer-ledger',
      files: ['experiments/VORTEX-COLLAPSE.md', 'experiments/results/vortex-collapse-leaderboard.json', 'COMPUTE.md'] },
    { file: 'timestamps.yml', prepare: 'Prepare the generated proof branch', step: 'Propose the proofs', branch: 'automation/timestamps', files: ['identities/commitments/fixture.txt.ots'] },
  ]) {
    const workflow = fs.readFileSync(path.join(root, '.github/workflows', fixture.file), 'utf8');
    assert.match(workflow, /actions: write/, fixture.file + ' must be allowed to dispatch workflows');
    assert.match(workflow, /token: \$\{\{ secrets\.AUTOMATION_TOKEN \|\| github\.token \}\}/, 'Checkout must use the same configured credential as PR creation');
    assert.match(workflow, /GH_TOKEN: \$\{\{ secrets\.AUTOMATION_TOKEN \|\| github\.token \}\}/);
    assert.match(workflow, /fetch-depth: 0/, 'Existing proposals need complete ancestry');
    const script = stepScript(workflow, fixture.step), prepare = stepScript(workflow, fixture.prepare);
    for (const scenario of ['unchanged', 'new PR', 'existing PR', 'dispatch failure', 'configured new PR', 'configured existing PR', 'unexpected file', 'main advance', 'concurrent advance', 'merge conflict', 'merged branch', 'generated symlink', 'orphan branch', 'unchanged open PR']) {
      const cwd = path.join(tmp, 'case-' + ++cases), remote = path.join(tmp, 'remote-' + cases + '.git'), runner = path.join(tmp, 'runner-' + cases);
      fs.mkdirSync(cwd); fs.mkdirSync(runner); git(cwd, 'init', '-q'); git(cwd, 'init', '-q', '--bare', remote);
      for (const file of fixture.files) put(path.join(cwd, file), 'initial\n');
      put(path.join(cwd, 'tools/automation-branch.js'), fs.readFileSync(path.join(root, 'tools/automation-branch.js'), 'utf8'));
      put(path.join(cwd, 'reviewed-source.txt'), 'initial source\n');
      git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'initial');
      git(cwd, 'remote', 'add', 'origin', remote); git(cwd, 'push', '-q', 'origin', 'main');
      const existing = scenario.includes('existing PR') || ['unexpected file', 'main advance', 'concurrent advance', 'merge conflict', 'merged branch', 'generated symlink', 'orphan branch', 'unchanged open PR'].includes(scenario);
      const configured = scenario.startsWith('configured') || ['unexpected file', 'main advance', 'concurrent advance', 'merge conflict', 'merged branch', 'generated symlink', 'orphan branch'].includes(scenario);
      let oldHead = '';
      if (existing) {
        git(cwd, 'switch', '-c', fixture.branch);
        for (const file of fixture.files) put(path.join(cwd, file), 'previous generated output\n');
        if (scenario === 'unexpected file') put(path.join(cwd, 'reviewer-notes.md'), 'Preserve this follow-up.\n');
        if (scenario === 'generated symlink') {
          const file = path.join(cwd, fixture.files[0]); fs.unlinkSync(file);
          fs.symlinkSync(path.relative(path.dirname(file), path.join(cwd, 'reviewed-source.txt')), file);
        }
        git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'existing proposal'); oldHead = git(cwd, 'rev-parse', 'HEAD');
        git(cwd, 'push', '-q', 'origin', fixture.branch); git(cwd, 'switch', 'main'); git(cwd, 'branch', '-D', fixture.branch);
      }
      if (scenario === 'merged branch') {
        git(cwd, 'merge', '--no-edit', oldHead);
        put(path.join(cwd, 'reviewed-source.txt'), 'reviewed source after merged proposal\n');
        git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'main after merged proposal'); git(cwd, 'push', 'origin', 'main');
      }
      if (['main advance', 'merge conflict'].includes(scenario)) {
        put(path.join(cwd, 'reviewed-source.txt'), 'reviewed source advanced\n');
        if (scenario === 'merge conflict') for (const file of fixture.files) put(path.join(cwd, file), 'conflicting reviewed output\n');
        git(cwd, 'add', '.'); git(cwd, 'commit', '-qm', 'advance reviewed main'); git(cwd, 'push', '-q', 'origin', 'main');
      }
      const base = git(cwd, 'rev-parse', 'HEAD');
      const log = path.join(tmp, 'calls-' + cases), summary = path.join(tmp, 'summary-' + cases); put(log, ''); put(summary, '');
      const runEnv = { ...env, GH_TOKEN: 'fixture', GH_CALLS: log, GITHUB_STEP_SUMMARY: summary, GITHUB_RUN_ID: '123', RUNNER_TEMP: runner,
        HAS_AUTOMATION_TOKEN: configured ? 'true' : 'false', OPEN_PR: existing && scenario !== 'orphan branch' ? 'yes' : 'no', FAIL_WORKFLOW: scenario === 'dispatch failure' ? 'check.yml' : '' };
      const run = block => cp.spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', block], { cwd, encoding: 'utf8', timeout: 20000, env: runEnv });
      const prepared = run(prepare);
      if (['unexpected file', 'merge conflict', 'generated symlink'].includes(scenario)) {
        assert.equal(prepared.status, 1, prepared.stdout + prepared.stderr);
        assert.match(prepared.stderr, scenario === 'unexpected file' ? /unexpected files/ : scenario === 'generated symlink' ? /must be regular files/ : /Resolve the branch conflict manually/);
        assert.equal(git(remote, 'rev-parse', fixture.branch), oldHead, 'Refusal must retain the remote head');
        assert.equal(fs.readFileSync(log, 'utf8'), '', 'Refusal must not open PRs or dispatch checks');
        continue;
      }
      assert.equal(prepared.status, 0, prepared.stdout + prepared.stderr);
      if (!['unchanged', 'main advance', 'merged branch', 'orphan branch', 'unchanged open PR'].includes(scenario)) for (const file of fixture.files) put(path.join(cwd, file), 'updated\n');
      let concurrent = '';
      if (scenario === 'concurrent advance') {
        concurrent = git(cwd, 'commit-tree', git(cwd, 'rev-parse', oldHead + '^{tree}'), '-p', oldHead, '-m', 'concurrent writer');
        git(cwd, 'push', 'origin', concurrent + ':refs/heads/' + fixture.branch);
      }
      const result = run(script), calls = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
      assert.equal(result.status, ['dispatch failure', 'concurrent advance'].includes(scenario) ? 1 : 0, fixture.file + ': ' + scenario + '\n' + result.stdout + result.stderr);
      if (scenario === 'concurrent advance') {
        assert.equal(git(remote, 'rev-parse', fixture.branch), concurrent, 'Normal push must preserve a concurrent advance');
        assert.deepEqual(calls, []); continue;
      }
      if (scenario === 'unchanged') {
        assert.deepEqual(calls, [], 'No new PR or checks for unchanged generated files');
        assert.equal(git(remote, 'for-each-ref', '--format=%(refname)', 'refs/heads/' + fixture.branch), ''); continue;
      }
      if (scenario === 'merged branch') {
        assert.deepEqual(calls, [], 'Do not open an empty proposal when reusing a merged branch');
        assert.equal(git(remote, 'rev-parse', fixture.branch), base);
        git(remote, 'merge-base', '--is-ancestor', oldHead, fixture.branch); continue;
      }
      if (['orphan branch', 'unchanged open PR'].includes(scenario)) {
        assert.equal(git(remote, 'rev-parse', fixture.branch), oldHead, 'Retry must retain the existing commit');
        assert.equal(calls.filter(args => args[0] === 'pr' && args[1] === 'create').length, scenario === 'orphan branch' ? 1 : 0);
        assert.deepEqual(calls.filter(args => args[0] === 'workflow'), [], 'Do not redispatch unchanged open-PR checks');
        if (scenario === 'unchanged open PR') assert.match(result.stdout, /existing proposal is unchanged/);
        continue;
      }
      assert.equal(git(remote, 'show', fixture.branch + ':' + fixture.files[0]), scenario === 'main advance' ? 'previous generated output' : 'updated');
      if (oldHead) git(remote, 'merge-base', '--is-ancestor', oldHead, fixture.branch);
      if (scenario === 'main advance') {
        git(remote, 'merge-base', '--is-ancestor', base, fixture.branch);
        assert.equal(git(remote, 'show', fixture.branch + ':reviewed-source.txt'), 'reviewed source advanced');
        assert.notEqual(git(remote, 'rev-parse', fixture.branch), oldHead, 'Push a base merge even without regenerated differences');
      }
      assert.equal(calls.filter(args => args[0] === 'pr' && args[1] === 'create').length, existing ? 0 : 1);
      assert.deepEqual(calls.filter(args => args[0] === 'workflow'), (configured ? [] : scenario === 'dispatch failure' ? ['check.yml'] : ['check.yml', 'pages.yml']).map(file => ['workflow', 'run', file, '--ref', fixture.branch]));
      if (configured) assert.match(result.stdout, /starts the normal pull_request checks/);
      else {
        assert.match(result.stdout, /do not satisfy required PR check contexts/, 'Fallback must disclose the merge-check limitation');
        assert.match(result.stdout, /Approve workflows to run/, 'Fallback must identify the required-context approval route');
      }
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
  console.log('PASS automation workflows: ' + cases + ' local cases covering real existing-branch updates, preserved main/history, unexpected-file and merge-conflict refusal, concurrent push rejection, configured/fallback checks, trusted submission verification, and symlink refusal.');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
