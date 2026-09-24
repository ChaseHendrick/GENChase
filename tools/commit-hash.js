#!/usr/bin/env node
// Commit to an unpublished result without revealing it, and reveal it later. docs/COMMITMENTS.md.
//
//   node tools/commit-hash.js ~/genchase-private/new-bound.typ --label "vortex note, draft 1"
//   node tools/commit-hash.js --reveal ~/genchase-private/new-bound.typ.C-2026-09-24-01.commitment.json
//
// Commit: hashes the private file with a fresh 32-byte salt, appends one line to
// identities/COMMITMENTS.txt, writes identities/commitments/<id>.txt (the line the timestamp covers),
// stamps that file with OpenTimestamps when the `ots` client is installed, and saves the salt in a
// private record beside the file. The file and the record never enter this repository.
//
// Reveal: copies the file and its salt into identities/revealed/<id>/ and appends a reveal line, so
// anyone can check the file against the commitment with tools/verify-commitment.js.
//
// Options: --record <path> (where the private record goes), --no-ots (skip the timestamp),
// --file <path> and --published <where> (reveal only), --root <dir> (a different ledger, for tests).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const C = require('./lib/commitment.js');

function parseArgs(argv) {
  const o = { file: null, label: null, record: null, ots: true, reveal: null, published: null, root: path.resolve(__dirname, '..') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(a + ' needs a value'); return argv[++i]; };
    if (a === '--label') o.label = next();
    else if (a === '--record') o.record = next();
    else if (a === '--no-ots') o.ots = false;
    else if (a === '--reveal') o.reveal = next();
    else if (a === '--file') o.file = next();
    else if (a === '--published') o.published = next();
    else if (a === '--root') o.root = path.resolve(next());
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('--')) throw new Error('Unknown option ' + a);
    else if (!o.file) o.file = a;
    else throw new Error('Unexpected argument ' + a);
  }
  return o;
}

function readPrivateFile(file) {
  if (!file) throw new Error('Name the private file to commit to');
  const st = fs.statSync(file);
  if (!st.isFile()) throw new Error(file + ' is not a file');
  const content = fs.readFileSync(file);
  if (!content.length) throw new Error(file + ' is empty');
  return content;
}

function ensureLedger(root) {
  const ledger = path.join(root, C.LEDGER);
  if (!fs.existsSync(ledger)) { fs.mkdirSync(path.dirname(ledger), { recursive: true }); fs.writeFileSync(ledger, C.HEADER); }
  const text = fs.readFileSync(ledger, 'utf8');
  const parsed = C.parseLedger(text);
  if (parsed.errors.length) throw new Error('The ledger does not parse; fix it before adding to it:\n  ' + parsed.errors.join('\n  '));
  return { ledger, text, entries: parsed.entries };
}

const rel = (root, p) => path.relative(root, p).split(path.sep).join('/');

function commit(o) {
  const label = C.checkLabel(o.label);
  const content = readPrivateFile(o.file);
  if (C.exposedInRepo(o.root, o.file)) throw new Error(o.file + ' is inside this repository and not ignored by git, so it could be published by accident. Keep unpublished work outside the repository (docs/COMMITMENTS.md).');
  const { ledger, text, entries } = ensureLedger(o.root);
  const salt = crypto.randomBytes(C.SALT_BYTES);
  const hash = C.commitmentOf(content, salt);
  const date = C.utcNow(), id = C.nextId(entries, date);
  const recordPath = path.resolve(o.record || (o.file + '.' + id + '.commitment.json'));
  if (C.exposedInRepo(o.root, recordPath)) throw new Error('The private record would land inside this repository at ' + recordPath + '; choose --record outside it.');
  const record = {
    format: C.DOMAIN.trim(), id, date, label,
    file: path.basename(o.file), bytes: content.length, fileSha256: C.sha256Hex(content),
    salt: salt.toString('hex'), commitment: hash, ledger: C.LEDGER,
    verify: 'node tools/verify-commitment.js <file> --record <this record>',
    note: 'PRIVATE until you reveal. The salt is the only way to prove this commitment: back this record up with the file, byte for byte. Anyone holding both can reveal it.'
  };
  // The record is written first and never overwritten, so a failure later cannot lose a salt.
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const line = C.commitLine({ id, date, hash, label });
  const stamp = path.join(o.root, C.STAMPS, id + '.txt');
  fs.mkdirSync(path.dirname(stamp), { recursive: true });
  fs.writeFileSync(stamp, line + '\n', { flag: 'wx' });
  fs.writeFileSync(ledger, text + (text.endsWith('\n') ? '' : '\n') + line + '\n');
  let stamped = false;
  if (o.ots && C.onPath('ots')) {
    try { execFileSync('ots', ['stamp', stamp], { stdio: 'inherit' }); stamped = fs.existsSync(stamp + '.ots'); }
    catch (e) { console.error('ots stamp failed (' + e.message + '); run it again later: ots stamp ' + rel(o.root, stamp)); }
  }
  const files = [C.LEDGER, rel(o.root, stamp)].concat(stamped ? [rel(o.root, stamp) + '.ots'] : []);
  console.log('Committed ' + id + ' at ' + date);
  console.log('  commitment   ' + hash);
  console.log('  label        ' + label + '   (public)');
  console.log('  private      ' + recordPath + '   (the salt; keep it with the file, never commit it)');
  console.log(stamped ? '  timestamp    ' + rel(o.root, stamp) + '.ots (complete it in a few hours: ots upgrade ' + rel(o.root, stamp) + '.ots)'
    : '  timestamp    none yet. Install the client (pip install opentimestamps-client), then: ots stamp ' + rel(o.root, stamp));
  console.log('\nPublish the commitment, not the file:');
  console.log('  git add ' + files.join(' '));
  console.log('  git commit -m "Commitment ' + id + '"');
  console.log('  git push');
  return { id, date, hash, recordPath, stamp, stamped };
}

function reveal(o) {
  const recordPath = path.resolve(o.reveal);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  if (record.format !== C.DOMAIN.trim()) throw new Error(recordPath + ' is not a ' + C.DOMAIN.trim() + ' record');
  const file = path.resolve(o.file || path.join(path.dirname(recordPath), record.file));
  const content = readPrivateFile(file);
  const hash = C.commitmentOf(content, C.saltFromHex(record.salt));
  if (hash !== record.commitment) throw new Error(file + ' does not match record ' + record.id + ': the file changed since the commitment. Reveal the exact bytes you committed to.');
  const { ledger, text, entries } = ensureLedger(o.root);
  const entry = entries.find(e => e.type === 'commit' && e.id === record.id);
  if (!entry) throw new Error('No commit line for ' + record.id + ' in ' + C.LEDGER);
  if (entry.hash !== hash) throw new Error('The ledger line for ' + record.id + ' carries a different commitment');
  if (entries.some(e => e.type === 'reveal' && e.id === record.id)) throw new Error(record.id + ' is already revealed');
  const dir = path.join(o.root, C.REVEALED, record.id);
  if (fs.existsSync(dir)) throw new Error(dir + ' already exists');
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, path.join(dir, record.file));
  const date = C.utcNow();
  const out = { format: record.format, id: record.id, committed: record.date, label: record.label, file: record.file,
    bytes: content.length, fileSha256: C.sha256Hex(content), salt: record.salt, commitment: hash, revealed: date, published: o.published || null };
  fs.writeFileSync(path.join(dir, 'reveal.json'), JSON.stringify(out, null, 2) + '\n');
  const folder = rel(o.root, dir);
  fs.writeFileSync(ledger, text + (text.endsWith('\n') ? '' : '\n') + C.revealLine({ id: record.id, date, path: folder }) + '\n');
  console.log('Revealed ' + record.id + ' (committed ' + record.date + ') into ' + folder);
  console.log('  check it    node tools/verify-commitment.js --revealed ' + record.id);
  console.log('  git add ' + C.LEDGER + ' ' + folder);
  console.log('  git commit -m "Reveal ' + record.id + '"');
  return { id: record.id, dir };
}

function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (o.help || (!o.file && !o.reveal)) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 17).map(s => s.replace(/^\/\/ ?/, '')).join('\n')); process.exit(o.help ? 0 : 2); }
  try { o.reveal ? reveal(o) : commit(o); } catch (e) { console.error('commit-hash: ' + e.message); process.exit(1); }
}

if (require.main === module) main();
module.exports = { commit, reveal, parseArgs };
