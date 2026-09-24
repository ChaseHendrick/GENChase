#!/usr/bin/env node
// Signed release tags. docs/SIGNING.md sets up the key once; this does the rest.
//
//   node tools/tag-release.js v0.6.3 --dry-run   every check, no tag
//   node tools/tag-release.js v0.6.3             create the signed tag on main and verify it
//   node tools/tag-release.js --verify v0.6.3    check an existing tag (the tag and release workflows run this)
//   node tools/tag-release.js --policy           print "signed" when identities/allowed_signers lists a key
//
// A release tag is annotated, made by the project identity from AGENTS.md, on a commit of main, and
// signed by an SSH key listed in identities/allowed_signers. While that file lists no key, --verify
// accepts an unsigned tag with a notice, so releases keep working until the owner registers a key.
// --verify options: --commit <sha> (the tag must point there), --on-main (its commit must be on
// origin/main), --root <dir> (another repository, for tests).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const IDENTITY = { name: 'Chaos', email: '326338179+SharpMeow@users.noreply.github.com' };
const SIGNERS = 'identities/allowed_signers';
const VERSION_RE = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;   // tools/package-release.py

function parseArgs(argv) {
  const o = { version: null, dryRun: false, verify: null, commit: null, onMain: false, policy: false, root: path.resolve(__dirname, '..') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(a + ' needs a value'); return argv[++i]; };
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--verify') o.verify = next();
    else if (a === '--commit') o.commit = next();
    else if (a === '--on-main') o.onMain = true;
    else if (a === '--policy') o.policy = true;
    else if (a === '--root') o.root = path.resolve(next());
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('--')) throw new Error('Unknown option ' + a);
    else if (!o.version) o.version = a;
    else throw new Error('Unexpected argument ' + a);
  }
  return o;
}

const git = (root, args, opts = {}) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const gitOk = (root, args) => spawnSync('git', ['-C', root, ...args], { stdio: 'ignore' }).status === 0;

// "type base64" pairs from an allowed-signers file; '#' lines are comments (ssh-keygen(1), ALLOWED SIGNERS).
function signerKeys(root) {
  const file = path.join(root, SIGNERS);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(line => {
    const t = line.split(/\s+/), k = t.findIndex(x => /^(ssh-|ecdsa-|sk-)/.test(x));
    if (k < 1 || !t[k + 1]) throw new Error(SIGNERS + ': cannot read the key in "' + line.slice(0, 60) + '"');
    if (!t[0].split(',').includes(IDENTITY.email)) throw new Error(SIGNERS + ': a key must be listed for ' + IDENTITY.email + ', the tagger identity in AGENTS.md');
    return t[k] + ' ' + t[k + 1];
  });
}

function verifyTag(o, tag) {
  const out = [], fail = m => { throw new Error(tag + ': ' + m); };
  if (!gitOk(o.root, ['rev-parse', '-q', '--verify', 'refs/tags/' + tag])) fail('no such tag here (fetch it with: git fetch --force origin refs/tags/' + tag + ':refs/tags/' + tag + ')');
  if (git(o.root, ['cat-file', '-t', 'refs/tags/' + tag]) !== 'tag') fail('a lightweight tag; a release tag is annotated (git tag -s)');
  const commit = git(o.root, ['rev-parse', tag + '^{commit}']);
  if (o.commit && commit !== git(o.root, ['rev-parse', o.commit + '^{commit}'])) fail('points at ' + commit.slice(0, 12) + ', not at ' + o.commit.slice(0, 12));
  if (o.onMain && !gitOk(o.root, ['merge-base', '--is-ancestor', commit, 'origin/main'])) fail('its commit ' + commit.slice(0, 12) + ' is not on origin/main');
  const tagger = git(o.root, ['for-each-ref', 'refs/tags/' + tag, '--format=%(taggername) %(taggeremail)']);
  if (tagger !== IDENTITY.name + ' <' + IDENTITY.email + '>') fail('tagged by "' + tagger + '", not by ' + IDENTITY.name + ' <' + IDENTITY.email + '> (AGENTS.md)');
  const keys = signerKeys(o.root);
  const signed = /-----BEGIN (SSH|PGP) SIGNATURE-----/.test(git(o.root, ['cat-file', 'tag', 'refs/tags/' + tag]));
  if (!keys.length) {
    out.push((signed ? 'signed, but ' : 'unsigned; ') + SIGNERS + ' lists no key yet, so the signature is not required (docs/SIGNING.md)');
    return { commit, signed, verified: false, notes: out };
  }
  if (!signed) fail('not signed, and ' + SIGNERS + ' requires a signature');
  // ssh-keygen is the reference verifier; a custom gpg.ssh.program (an agent's signing helper) may only sign.
  const r = spawnSync('git', ['-C', o.root, '-c', 'gpg.ssh.program=ssh-keygen', '-c', 'gpg.ssh.allowedSignersFile=' + path.join(o.root, SIGNERS), 'tag', '-v', tag], { encoding: 'utf8' });
  if (r.status !== 0) fail('the signature does not verify against ' + SIGNERS + ':\n' + (r.stderr || r.stdout).trim());
  out.push((r.stderr.split('\n').find(l => /^Good/.test(l)) || 'good signature').trim());
  return { commit, signed, verified: true, notes: out };
}

// The public half of git's configured SSH signing key, as "type base64", or null if it cannot be read.
function configuredKey(root) {
  let v = '';
  try { v = git(root, ['config', 'user.signingkey']); } catch (_) { return null; }
  if (v.startsWith('key::')) v = v.slice(5);
  else {
    let p = v.replace(/^~(?=\/|\\|$)/, os.homedir());
    if (!fs.existsSync(p)) return null;
    let text = fs.readFileSync(p, 'utf8');
    if (!/^(ssh-|ecdsa-|sk-)/.test(text.trim())) { if (!fs.existsSync(p + '.pub')) return null; text = fs.readFileSync(p + '.pub', 'utf8'); }
    v = text;
  }
  const t = v.trim().split(/\s+/);
  return t.length >= 2 ? t[0] + ' ' + t[1] : null;
}

function run(cmd, args, root) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(cmd + ' ' + args.join(' ') + ' failed');
}

function createTag(o) {
  const v = o.version, R = o.root, problems = [], warnings = [];
  if (!VERSION_RE.test(v || '')) throw new Error('Use a numbered release such as v0.6.3 (no date or leading zeros)');
  let email = '', name = '';
  try { email = git(R, ['config', 'user.email']); name = git(R, ['config', 'user.name']); } catch (_) { /* unset */ }
  if (email !== IDENTITY.email) problems.push('git user.email is "' + email + '"; AGENTS.md requires ' + IDENTITY.email);
  if (name !== IDENTITY.name) warnings.push('git user.name is "' + name + '"; AGENTS.md uses ' + IDENTITY.name);
  let format = '';
  try { format = git(R, ['config', 'gpg.format']); } catch (_) { /* unset */ }
  const keys = signerKeys(R), mine = configuredKey(R);
  if (format !== 'ssh') problems.push('git gpg.format is "' + (format || 'unset') + '"; set it to ssh (docs/SIGNING.md, step 2)');
  if (!mine) problems.push('git user.signingkey does not name a readable SSH public key (docs/SIGNING.md, step 2)');
  if (!keys.length) problems.push(SIGNERS + ' lists no key; add yours in a merged pull request first (docs/SIGNING.md, step 4)');
  else if (mine && !keys.includes(mine)) problems.push('your signing key is not the one listed in ' + SIGNERS);
  if (git(R, ['status', '--porcelain', '--untracked-files=no'])) problems.push('the working tree has uncommitted changes');
  try { git(R, ['fetch', '-q', 'origin', 'main']); } catch (e) { problems.push('could not fetch origin/main: ' + e.message.split('\n')[0]); }
  if (gitOk(R, ['rev-parse', '-q', '--verify', 'origin/main']) && git(R, ['rev-parse', 'HEAD']) !== git(R, ['rev-parse', 'origin/main'])) problems.push('HEAD is not origin/main; check out main and pull');
  if (gitOk(R, ['rev-parse', '-q', '--verify', 'refs/tags/' + v])) problems.push(v + ' already exists here');
  if (spawnSync('git', ['-C', R, 'ls-remote', '--exit-code', '--tags', 'origin', 'refs/tags/' + v], { stdio: 'ignore' }).status === 0) problems.push(v + ' already exists on origin');
  const cff = fs.readFileSync(path.join(R, 'CITATION.cff'), 'utf8');
  const cv = (/^version:\s*"?([^"\n]+)"?/m.exec(cff) || [])[1], cd = (/^date-released:\s*"?([^"\n]+)"?/m.exec(cff) || [])[1];
  if (cv !== v) problems.push('CITATION.cff says version ' + cv + '; set it to ' + v + ' in the release pull request (docs/PUBLISHING.md)');
  const today = new Date().toISOString().slice(0, 10);
  if (cd !== today) warnings.push('CITATION.cff date-released is ' + cd + ', not today (' + today + ')');
  const stamps = path.join(R, 'identities', 'commitments');
  if (fs.existsSync(stamps)) {
    const pending = fs.readdirSync(stamps).filter(f => f.endsWith('.txt') && !fs.existsSync(path.join(stamps, f + '.ots')));
    if (pending.length) warnings.push(pending.length + ' commitment(s) have no OpenTimestamps proof yet; the timestamps workflow adds them');
  }
  warnings.forEach(w => console.log('note: ' + w));
  if (problems.length) throw new Error('not ready to tag ' + v + ':\n  ' + problems.join('\n  '));
  for (const args of [['tools/build.js', '--check'], ['tools/lint.js'], ['tools/science.js'], ['tools/verify-commitment.js', '--all']]) run(process.execPath, args, R);
  if (o.dryRun) { console.log('\nDry run: ' + v + ' is ready to tag at ' + git(R, ['rev-parse', '--short', 'HEAD']) + '.'); return; }
  run('git', ['-C', R, 'tag', '-s', v, '-m', 'GENChase ' + v], R);
  const res = verifyTag(o, v);
  console.log('\nSigned ' + v + ' at ' + res.commit.slice(0, 12) + ': ' + res.notes.join('; '));
  console.log('Next:\n  git push origin ' + v + '\n  then run the "Publish offline studio" workflow on main with version ' + v + ' (docs/PUBLISHING.md).');
}

function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (o.help || (!o.version && !o.verify && !o.policy)) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 14).map(s => s.replace(/^\/\/ ?/, '')).join('\n')); process.exit(o.help ? 0 : 2); }
  try {
    if (o.policy) { console.log(signerKeys(o.root).length ? 'signed' : 'unsigned'); return; }
    if (o.verify) {
      const res = verifyTag(o, o.verify);
      console.log('Tag ' + o.verify + ' OK at ' + res.commit.slice(0, 12) + ': ' + res.notes.join('; '));
      if (!res.verified && process.env.GITHUB_ACTIONS) console.log('::notice::' + res.notes.join('; '));
      return;
    }
    createTag(o);
  } catch (e) { console.error('tag-release: ' + e.message); process.exit(1); }
}

if (require.main === module) main();
module.exports = { verifyTag, signerKeys, IDENTITY, SIGNERS };
