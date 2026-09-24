// Hash commitments to unpublished results: the shared format behind tools/commit-hash.js and
// tools/verify-commitment.js. docs/COMMITMENTS.md explains what a commitment proves and what it does not.
//
// commitment = SHA-256( "GENChase commitment v1\n" || salt || file bytes )
//
// The salt is 32 random bytes kept private until the reveal. Without it a short statement (one formula,
// one number) could be found by hashing guesses; with it the commitment says nothing about the file.
// The construction is deliberately plain so anyone can check it without this code (docs/COMMITMENTS.md):
//   python3 -c "import hashlib,sys; print(hashlib.sha256(b'GENChase commitment v1\n'+bytes.fromhex(sys.argv[1])+open(sys.argv[2],'rb').read()).hexdigest())" SALT_HEX FILE
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DOMAIN = 'GENChase commitment v1\n';
const SALT_BYTES = 32;
const LEDGER = 'identities/COMMITMENTS.txt';
const STAMPS = 'identities/commitments';
const REVEALED = 'identities/revealed';
const ID_RE = /^C-\d{4}-\d{2}-\d{2}-\d{2}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function sha256Hex(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function commitmentOf(content, salt) {
  if (!Buffer.isBuffer(salt) || salt.length !== SALT_BYTES) throw new Error('The salt must be ' + SALT_BYTES + ' bytes (' + 2 * SALT_BYTES + ' hex characters)');
  return sha256Hex(Buffer.concat([Buffer.from(DOMAIN, 'utf8'), salt, content]));
}

function saltFromHex(hex) {
  const h = String(hex || '').trim().toLowerCase();
  if (!HEX64.test(h)) throw new Error('The salt must be ' + 2 * SALT_BYTES + ' hexadecimal characters');
  return Buffer.from(h, 'hex');
}

// A label is public. It says what kind of thing was committed, never the result itself.
function checkLabel(label) {
  const s = String(label || '');
  if (!s.trim()) throw new Error('A commitment needs --label, a short public description that does not give the result away');
  if (/[\r\n\t]/.test(s)) throw new Error('The label must be one line without tabs');
  if (s.length > 120) throw new Error('The label must be 120 characters or fewer');
  return s.trim();
}

const commitLine = e => ['commit', e.id, e.date, e.hash, e.label].join('  ');
const revealLine = e => ['reveal', e.id, e.date, e.path].join('  ');

// Ledger lines: "commit  <id>  <date>  <hash>  <label>" and "reveal  <id>  <date>  <folder>".
// Comments start with '#'. The ledger is append-only; tools/verify-commitment.js --all checks it.
function parseLedger(text) {
  const entries = [], errors = [];
  String(text).split('\n').forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.startsWith('#')) return;
    const f = line.split('  ');
    const where = 'ledger line ' + (i + 1);
    if (f[0] === 'commit' && f.length >= 5) {
      const e = { type: 'commit', id: f[1], date: f[2], hash: f[3], label: f.slice(4).join('  '), line, lineNo: i + 1 };
      if (!ID_RE.test(e.id)) errors.push(where + ': bad id ' + e.id);
      if (!DATE_RE.test(e.date)) errors.push(where + ': bad date ' + e.date);
      if (!HEX64.test(e.hash)) errors.push(where + ': bad hash');
      entries.push(e);
    } else if (f[0] === 'reveal' && f.length === 4) {
      const e = { type: 'reveal', id: f[1], date: f[2], path: f[3], line, lineNo: i + 1 };
      if (!ID_RE.test(e.id)) errors.push(where + ': bad id ' + e.id);
      if (!DATE_RE.test(e.date)) errors.push(where + ': bad date ' + e.date);
      entries.push(e);
    } else errors.push(where + ': not a commit or reveal line');
  });
  return { entries, errors };
}

function readLedger(root) {
  const file = path.join(root, LEDGER);
  if (!fs.existsSync(file)) throw new Error('No ledger at ' + file);
  return parseLedger(fs.readFileSync(file, 'utf8'));
}

const HEADER = `# Hash commitments to unpublished results. Written by tools/commit-hash.js; read docs/COMMITMENTS.md.
#
# Each commit line fixes a file's exact bytes on the day it was added without revealing them:
#   commitment = SHA-256("GENChase commitment v1\\n" || 32-byte private salt || file bytes)
# A reveal line points to the folder that later published the file and its salt, so anyone can check it.
# The date column is written by the author's computer. Independent evidence of the date is the
# OpenTimestamps proof beside each stamp file in identities/commitments/, and every Zenodo release
# archive of this repository. This ledger is append-only: never edit or delete a line.
#
# commit  <id>  <UTC date>  <commitment>  <public label>
# reveal  <id>  <UTC date>  <folder>
`;

const utcNow = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

function nextId(entries, date) {
  const day = date.slice(0, 10), used = entries.filter(e => e.type === 'commit' && e.id.startsWith('C-' + day + '-')).length;
  if (used >= 99) throw new Error('At most 99 commitments per day');
  return 'C-' + day + '-' + String(used + 1).padStart(2, '0');
}

// True when a path sits inside the repository at root and git would not ignore it, so a stray
// `git add` could publish it. Files outside root are always private as far as this repository goes.
function exposedInRepo(root, file) {
  const rel = path.relative(root, path.resolve(file));
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false;
  try { execFileSync('git', ['-C', root, 'ls-files', '--error-unmatch', rel], { stdio: 'ignore' }); return true; } catch (_) { /* not tracked */ }
  try { execFileSync('git', ['-C', root, 'check-ignore', '-q', rel], { stdio: 'ignore' }); return false; } catch (_) { return true; }
}

function onPath(cmd) {
  try { execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }); return true; } catch (_) { return false; }
}

module.exports = { DOMAIN, HEADER, SALT_BYTES, LEDGER, STAMPS, REVEALED, ID_RE, HEX64, sha256Hex, commitmentOf, saltFromHex, checkLabel, commitLine, revealLine, parseLedger, readLedger, utcNow, nextId, exposedInRepo, onPath };
