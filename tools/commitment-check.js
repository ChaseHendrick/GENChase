#!/usr/bin/env node
// Self-test for the hash commitments (tools/commit-hash.js, tools/verify-commitment.js), with negative
// controls: each tampering below must be caught. Runs in a temporary git repository; about a second.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');
const C = require('./lib/commitment.js');

const TOOLS = __dirname;
let failures = 0, checks = 0;
const check = (ok, what) => { checks++; if (!ok) { failures++; console.log('FAIL ' + what); } };
const node = (tool, args) => spawnSync(process.execPath, [path.join(TOOLS, tool), ...args], { encoding: 'utf8' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-commit-'));
const root = path.join(tmp, 'repo'), priv = path.join(tmp, 'private');
fs.mkdirSync(root); fs.mkdirSync(priv);
execFileSync('git', ['init', '-q', root]);
fs.writeFileSync(path.join(root, '.gitignore'), 'private/\n');
const g = ['-c', 'user.name=Chaos', '-c', 'user.email=326338179+SharpMeow@users.noreply.github.com'];
const commitAll = msg => { execFileSync('git', ['-C', root, 'add', '-A']); execFileSync('git', ['-C', root, ...g, 'commit', '-q', '-m', msg]); };

try {
  // The construction is the documented one: SHA-256 over the domain line, the raw salt, then the bytes.
  const salt = crypto.randomBytes(32), body = Buffer.from('a closed form nobody has seen\n');
  const direct = crypto.createHash('sha256').update('GENChase commitment v1\n').update(salt).update(body).digest('hex');
  check(C.commitmentOf(body, salt) === direct, 'commitmentOf matches the documented construction');
  const py = spawnSync('python3', ['-c', 'import hashlib,sys; s=bytes.fromhex(sys.argv[1]); print(hashlib.sha256(b"GENChase commitment v1\\n"+s+sys.stdin.buffer.read()).hexdigest())', salt.toString('hex')], { input: body, encoding: 'utf8' });
  if (py.status === 0) check(py.stdout.trim() === direct, 'an independent Python hashlib gives the same commitment');
  else console.log('note: python3 not found; the hashlib cross-check did not run');
  check((() => { try { C.commitmentOf(body, salt.subarray(0, 16)); return false; } catch (_) { return true; } })(), 'a 16-byte salt is refused');

  // Commit a private file kept outside the repository.
  const draft = path.join(priv, 'bound.typ');
  fs.writeFileSync(draft, 'The collapse time is bounded by a ratio of rates.\n');
  let r = node('commit-hash.js', [draft, '--label', 'vortex note, draft 1', '--no-ots', '--root', root]);
  check(r.status === 0, 'commit a private file (' + (r.stderr || '').trim() + ')');
  const record = path.join(priv, fs.readdirSync(priv).find(f => f.endsWith('.commitment.json')) || 'missing');
  const rec = JSON.parse(fs.readFileSync(record, 'utf8'));
  check(C.ID_RE.test(rec.id) && C.HEX64.test(rec.commitment) && rec.salt.length === 64, 'the private record carries id, commitment and salt');
  if (process.platform !== 'win32') check((fs.statSync(record).mode & 0o077) === 0, 'the private record is readable by its owner only');
  const ledger = fs.readFileSync(path.join(root, C.LEDGER), 'utf8');
  check(ledger.includes(rec.commitment) && !ledger.includes(rec.salt) && !ledger.includes(rec.fileSha256), 'the ledger holds the commitment, never the salt or the plain file hash');
  check(!ledger.includes('ratio of rates'), 'the ledger does not contain the file');
  commitAll('commitment');
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 0, 'the ledger checks out');
  check(node('verify-commitment.js', [draft, '--record', record, '--root', root]).status === 0, 'the file verifies with its record');
  r = node('verify-commitment.js', [draft, '--salt', rec.salt, '--root', root]);
  check(r.status === 0 && r.stdout.includes('MATCH ' + rec.id) && /first added in [0-9a-f]+ /.test(r.stdout), 'the file verifies with the salt alone and git names the commit that added it');

  // Negative controls: every one of these must fail.
  const edited = path.join(priv, 'edited.typ');
  fs.writeFileSync(edited, fs.readFileSync(draft, 'utf8').replace('ratio', 'Ratio'));
  check(node('verify-commitment.js', [edited, '--salt', rec.salt, '--root', root]).status === 1, 'a one-letter edit of the file does not match');
  const wrongSalt = (rec.salt[0] === '0' ? '1' : '0') + rec.salt.slice(1);
  check(node('verify-commitment.js', [draft, '--salt', wrongSalt, '--root', root]).status === 1, 'a salt with one changed digit does not match');
  check(node('verify-commitment.js', [draft, '--salt', rec.salt.slice(2), '--root', root]).status === 2, 'a truncated salt is an error');
  check(node('commit-hash.js', [draft, '--label', 'two\nlines', '--no-ots', '--root', root]).status === 1, 'a two-line label is refused');
  const inside = path.join(root, 'leak.typ');
  fs.writeFileSync(inside, 'unpublished\n');
  check(node('commit-hash.js', [inside, '--label', 'x', '--no-ots', '--root', root, '--record', path.join(priv, 'inside.json')]).status === 1 && !fs.existsSync(path.join(priv, 'inside.json')), 'a file inside the repository that git would track is refused');
  fs.unlinkSync(inside);
  check(node('commit-hash.js', [draft, '--label', 'x', '--no-ots', '--root', root, '--record', path.join(root, 'rec.json')]).status === 1 && !fs.existsSync(path.join(root, 'rec.json')), 'a private record that would land inside the repository is refused');
  fs.mkdirSync(path.join(root, 'private'));
  const ignored = path.join(root, 'private', 'ok.typ');
  fs.writeFileSync(ignored, 'unpublished but ignored\n');
  check(node('commit-hash.js', [ignored, '--label', 'ignored folder', '--no-ots', '--root', root]).status === 0, 'a file in a git-ignored folder is accepted');
  commitAll('second commitment');
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 0, 'two commitments check out');

  const ledgerPath = path.join(root, C.LEDGER), good = fs.readFileSync(ledgerPath, 'utf8');
  fs.writeFileSync(ledgerPath, good.replace(rec.commitment, rec.commitment.slice(0, -1) + (rec.commitment.endsWith('0') ? '1' : '0')));
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 1, 'an edited ledger line no longer matches its stamp file');
  fs.writeFileSync(ledgerPath, good);
  const stamp = path.join(root, C.STAMPS, rec.id + '.txt');
  fs.renameSync(stamp, stamp + '.moved');
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 1, 'a missing stamp file is caught');
  fs.renameSync(stamp + '.moved', stamp);
  const lines = good.split('\n'), dup = lines.find(l => l.startsWith('commit  ' + rec.id));
  fs.writeFileSync(ledgerPath, good + dup + '\n');
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 1, 'a duplicated id is caught');
  fs.writeFileSync(ledgerPath, good);
  const leaked = path.join(root, 'notes.commitment.json');
  fs.copyFileSync(record, leaked);
  execFileSync('git', ['-C', root, 'add', '-f', 'notes.commitment.json']);
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 1, 'a private record committed to the repository is caught');
  execFileSync('git', ['-C', root, 'rm', '-q', '--cached', 'notes.commitment.json']); fs.unlinkSync(leaked);
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 0, 'the ledger checks out again after the controls');

  // Reveal: the file and salt become public and anyone can check them.
  check(node('commit-hash.js', ['--reveal', record, '--no-ots', '--root', root, '--published', 'arXiv (test)']).status === 0, 'reveal the first commitment');
  check(node('verify-commitment.js', ['--revealed', rec.id, '--root', root]).status === 0, 'the revealed file verifies');
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 0, 'the ledger with a reveal checks out');
  check(node('commit-hash.js', ['--reveal', record, '--root', root]).status === 1, 'a second reveal of the same commitment is refused');
  const revealed = path.join(root, C.REVEALED, rec.id, 'bound.typ'), orig = fs.readFileSync(revealed);
  fs.writeFileSync(revealed, Buffer.concat([orig, Buffer.from(' ')]));
  check(node('verify-commitment.js', ['--all', '--root', root]).status === 1, 'a revealed file changed after the reveal is caught');
  fs.writeFileSync(revealed, orig);
  fs.writeFileSync(edited, 'something else\n');
  check(node('commit-hash.js', ['--reveal', record, '--file', edited, '--root', root]).status === 1, 'revealing different bytes than were committed is refused');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log((failures ? 'COMMITMENT CHECK FAILED: ' + failures + ' of ' : 'Commitment check OK: ') + checks + ' checks, including the negative controls');
process.exit(failures ? 1 : 0);
