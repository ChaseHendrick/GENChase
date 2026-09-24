#!/usr/bin/env node
// Self-test for signed release tags (tools/tag-release.js --verify), with negative controls. It makes
// throwaway SSH keys in a temporary repository, so it never touches your keys or this repository's tags.
// Needs ssh-keygen and git 2.34 or newer. In CI a missing ssh-keygen is a failure; locally it is reported.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { IDENTITY, SIGNERS } = require('./tag-release.js');

if (spawnSync('ssh-keygen', ['-?'], { stdio: 'ignore' }).error) {
  console.log('Signing check: ssh-keygen was not found, so signed tags could not be tested here.');
  process.exit(process.env.CI ? 1 : 0);
}

let failures = 0, checks = 0;
const check = (ok, what) => { checks++; if (!ok) { failures++; console.log('FAIL ' + what); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-sign-'));
const root = path.join(tmp, 'repo');
const git = (args, extra = []) => execFileSync('git', ['-C', root, '-c', 'user.name=' + IDENTITY.name, '-c', 'user.email=' + IDENTITY.email, ...extra, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const refused = (tag, more, why) => { const r = verify(tag, more); return r.status === 1 && r.stderr.includes(why); };
const verify = (tag, more = []) => spawnSync(process.execPath, [path.join(__dirname, 'tag-release.js'), '--verify', tag, '--root', root, ...more], { encoding: 'utf8' });
const key = name => { const f = path.join(tmp, name); execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', name, '-f', f]); return f; };
const signWith = k => ['-c', 'gpg.format=ssh', '-c', 'gpg.ssh.program=ssh-keygen', '-c', 'user.signingkey=' + k];
const pub = k => fs.readFileSync(k + '.pub', 'utf8').trim().split(/\s+/).slice(0, 2).join(' ');
const signers = lines => fs.writeFileSync(path.join(root, SIGNERS), '# test\n' + lines.join('\n') + '\n');

try {
  fs.mkdirSync(path.join(root, 'identities'), { recursive: true });
  execFileSync('git', ['init', '-q', '-b', 'main', root]);
  fs.writeFileSync(path.join(root, 'a.txt'), 'one\n');
  git(['add', '-A']); git(['commit', '-q', '-m', 'one']);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  const owner = key('owner'), stranger = key('stranger');

  signers([]);
  const policy = () => execFileSync(process.execPath, [path.join(__dirname, 'tag-release.js'), '--policy', '--root', root], { encoding: 'utf8' }).trim();
  check(policy() === 'unsigned', 'with no key listed the policy is unsigned');
  git(['tag', '-a', 'v0.0.1', '-m', 'unsigned']);
  let r = verify('v0.0.1');
  check(r.status === 0 && /not required/.test(r.stdout), 'before a key is registered an unsigned annotated tag passes, with a notice');

  signers([IDENTITY.email + ' namespaces="git" ' + pub(owner)]);
  check(policy() === 'signed', 'with a key listed the policy is signed');
  git(['tag', '-s', 'v0.0.2', '-m', 'signed'], signWith(owner));
  const head = git(['rev-parse', 'HEAD']);
  r = verify('v0.0.2', ['--commit', head, '--on-main']);
  check(r.status === 0 && /Good/.test(r.stdout), 'a tag signed by the listed key on main verifies (' + (r.stderr || '').trim() + ')');

  // Negative controls: each must be refused.
  check(refused('v0.0.1', [], 'not signed'), 'an unsigned tag is refused once a key is listed');
  git(['tag', 'v0.0.3']);
  check(refused('v0.0.3', [], 'lightweight'), 'a lightweight tag is refused');
  git(['tag', '-s', 'v0.0.4', '-m', 'wrong key'], signWith(stranger));
  check(refused('v0.0.4', [], 'does not verify'), 'a tag signed by an unlisted key is refused');
  execFileSync('git', ['-C', root, '-c', 'user.name=Someone', '-c', 'user.email=sharpie@users.noreply.github.com', ...signWith(owner), 'tag', '-s', 'v0.0.5', '-m', 'wrong identity']);
  check(refused('v0.0.5', [], 'tagged by'), 'a tag made under another identity is refused, even with the right key');
  fs.writeFileSync(path.join(root, 'a.txt'), 'two\n');
  git(['commit', '-q', '-am', 'two']);
  git(['tag', '-s', 'v0.0.6', '-m', 'off main'], signWith(owner));
  check(refused('v0.0.6', ['--on-main'], 'not on origin/main'), 'a signed tag whose commit is not on origin/main is refused with --on-main');
  check(refused('v0.0.2', ['--commit', 'HEAD'], 'points at'), 'a signed tag pointing at another commit than --commit is refused');
  const tagObj = git(['cat-file', 'tag', 'v0.0.2']).replace('signed', 'forged');
  const forged = execFileSync('git', ['-C', root, 'mktag'], { input: tagObj + '\n', encoding: 'utf8' }).trim();
  git(['update-ref', 'refs/tags/v0.0.7', forged]);
  check(refused('v0.0.7', [], 'does not verify'), 'a signed tag whose message was altered after signing is refused');
  signers(['someone@example.com namespaces="git" ' + pub(owner)]);
  check(refused('v0.0.2', [], 'a key must be listed for'), 'a key listed for another principal than the project identity is refused');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log((failures ? 'SIGNING CHECK FAILED: ' + failures + ' of ' : 'Signing check OK: ') + checks + ' checks, including the negative controls');
process.exit(failures ? 1 : 0);
