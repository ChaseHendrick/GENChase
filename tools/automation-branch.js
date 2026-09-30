// Preserve generated-PR history and reject unexpected or concurrent branch changes.
'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const configs = {
  timestamps: { branch: 'automation/timestamps', allowed: file => /^identities\/commitments\/[^/]+\.txt\.ots$/.test(file), message: 'OpenTimestamps proofs for the commitment ledger' },
  volunteer: { branch: 'automation/refresh-volunteer-ledger', allowed: file => ['COMPUTE.md', 'experiments/VORTEX-COLLAPSE.md', 'experiments/results/vortex-collapse-leaderboard.json'].includes(file), message: 'Refresh the vortex leaderboard and compute ledger' }
};
const [mode, kind] = process.argv.slice(2), config = configs[kind];
const git = (...args) => cp.execFileSync('git', args, { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
const files = (...args) => git(...args).split('\0').filter(Boolean);
function allowed(list) {
  const unexpected = list.filter(file => !config.allowed(file));
  if (unexpected.length) throw Error('Refusing to update ' + config.branch + ': unexpected files ' + JSON.stringify(unexpected) + '. Review the existing branch manually; its remote head was not changed.');
}
try {
  if (!config || !['prepare', 'finish'].includes(mode) || !process.env.RUNNER_TEMP) throw Error('Usage: automation-branch.js prepare|finish timestamps|volunteer (RUNNER_TEMP required)');
  const stateFile = path.join(process.env.RUNNER_TEMP, 'automation-branch-' + kind + '.json');
  if (mode === 'prepare') {
    if (git('status', '--porcelain')) throw Error('Prepare the automation branch before generating files; the checkout must be clean.');
    const base = git('rev-parse', 'HEAD');
    git('config', 'user.name', 'Chase Hendrick'); git('config', 'user.email', '326338179+ChaseHendrick@users.noreply.github.com');
    const remote = git('ls-remote', '--heads', 'origin', 'refs/heads/' + config.branch);
    let remoteHead = '';
    if (remote) {
      git('fetch', '--no-tags', 'origin', '+refs/heads/' + config.branch + ':refs/remotes/origin/' + config.branch);
      remoteHead = git('rev-parse', 'refs/remotes/origin/' + config.branch);
      allowed(files('diff', '--name-only', '--no-renames', '-z', base + '...' + remoteHead));
      for (const entry of files('ls-tree', '-r', '-z', remoteHead)) {
        const separator = entry.indexOf('\t'), metadata = entry.slice(0, separator), file = entry.slice(separator + 1);
        if (config.allowed(file) && !metadata.startsWith('100644 blob ')) throw Error('Generated outputs must be regular files: ' + file + '. Review the existing branch manually; its remote head was not changed.');
      }
      git('switch', '-C', config.branch, remoteHead);
      try { git('merge', '--no-edit', base); }
      catch (error) {
        try { git('merge', '--abort'); } catch {}
        throw Error('Cannot merge reviewed base ' + base + ' into ' + config.branch + '. Resolve the branch conflict manually; its remote head was not changed.\n' + (error.stderr || error.message));
      }
      // Generation uses the checked-out reviewed code, never code introduced on the PR branch.
      allowed(files('diff', '--name-only', '--no-renames', '-z', base, 'HEAD'));
    } else git('switch', '-c', config.branch);
    fs.writeFileSync(stateFile, JSON.stringify({ kind, branch: config.branch, base, remoteHead }) + '\n');
    console.log('Prepared ' + config.branch + ' from reviewed base ' + base);
  } else {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (state.kind !== kind || state.branch !== config.branch || git('branch', '--show-current') !== config.branch) throw Error('Automation branch preparation does not match this checkout.');
    const changed = [...new Set([...files('diff', '--name-only', '--no-renames', '-z', 'HEAD'), ...files('ls-files', '--others', '--exclude-standard', '-z')])];
    allowed(changed);
    for (const file of changed) {
      let stat; try { stat = fs.lstatSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (stat && !stat.isFile()) throw Error('Generated outputs must be regular files: ' + file);
    }
    for (const file of changed) git('add', '-A', '--', file);
    if (files('diff', '--cached', '--name-only', '-z').length) git('commit', '-m', config.message);
    const head = git('rev-parse', 'HEAD');
    const hasProposal = files('diff', '--name-only', '--no-renames', '-z', state.base, 'HEAD').length > 0;
    if (head === (state.remoteHead || state.base)) console.log(hasProposal ? 'existing' : 'unchanged');
    else {
      // A concurrent remote advance is rejected by Git. Never rewrite an existing proposal.
      git('push', 'origin', 'HEAD:refs/heads/' + config.branch);
      console.log(hasProposal ? 'changed' : 'empty');
    }
  }
} catch (error) { console.error('::error::' + (error.stderr || error.message)); process.exitCode = 1; }
