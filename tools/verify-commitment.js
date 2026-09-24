#!/usr/bin/env node
// Check a file against the hash commitments in identities/COMMITMENTS.txt. docs/COMMITMENTS.md.
//
//   node tools/verify-commitment.js paper.pdf --salt <64 hex>       anyone, once the salt is public
//   node tools/verify-commitment.js draft.typ --record <record.json> the author, before revealing
//   node tools/verify-commitment.js --revealed C-2026-09-24-01       a commitment revealed in this repository
//   node tools/verify-commitment.js --all                            the whole ledger (npm test runs this)
//
// A match says the file's exact bytes were committed on the line it names. The line's date is written by
// the author's computer; the OpenTimestamps proof beside the stamp file is the independent evidence of
// the date. Add --ots to check that proof with the `ots` client (full verification needs a Bitcoin node;
// without one, opentimestamps.org verifies the stamp file and its .ots in a browser).
// --root <dir> points at a different ledger, for tests.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const C = require('./lib/commitment.js');

function parseArgs(argv) {
  const o = { file: null, salt: null, record: null, revealed: null, all: false, ots: false, root: path.resolve(__dirname, '..') };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(a + ' needs a value'); return argv[++i]; };
    if (a === '--salt') o.salt = next();
    else if (a === '--record') o.record = next();
    else if (a === '--revealed') o.revealed = next();
    else if (a === '--all') o.all = true;
    else if (a === '--ots') o.ots = true;
    else if (a === '--root') o.root = path.resolve(next());
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('--')) throw new Error('Unknown option ' + a);
    else if (!o.file) o.file = a;
    else throw new Error('Unexpected argument ' + a);
  }
  return o;
}

// The earliest commit that added a path, as git records it. Git dates are also self-reported.
function firstAdded(root, relPath) {
  try {
    const out = execFileSync('git', ['-C', root, 'log', '--diff-filter=A', '--format=%h %cI', '--', relPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').filter(Boolean);
    return out.length ? out[out.length - 1] : null;
  } catch (_) { return null; }
}

function describe(o, entry, reveals) {
  const stampRel = C.STAMPS + '/' + entry.id + '.txt', stamp = path.join(o.root, stampRel);
  const ots = fs.existsSync(stamp + '.ots'), added = firstAdded(o.root, stampRel);
  console.log('MATCH ' + entry.id);
  console.log('  ledger date  ' + entry.date + '   (written by the author\'s computer)');
  console.log('  label        ' + entry.label);
  console.log('  git          ' + (added ? 'first added in ' + added : 'not in this repository\'s history (or no git here)'));
  console.log('  timestamp    ' + (ots ? stampRel + '.ots' : 'none recorded'));
  const rv = reveals.find(r => r.id === entry.id);
  if (rv) console.log('  revealed     ' + rv.date + ' in ' + rv.path);
  let ok = true;
  if (o.ots) {
    if (!ots) { console.log('  --ots        no .ots proof for this commitment'); ok = false; }
    else if (!C.onPath('ots')) { console.log('  --ots        the ots client is not installed (pip install opentimestamps-client)'); ok = false; }
    else {
      try { execFileSync('ots', ['verify', stamp + '.ots'], { stdio: 'inherit' }); }
      catch (_) { console.log('  --ots        ots verify did not confirm the proof (a new stamp needs a few hours and `ots upgrade`)'); ok = false; }
    }
  }
  return ok;
}

function checkFile(o) {
  const content = fs.readFileSync(o.file);
  let saltHex = o.salt, record = null;
  if (o.record) { record = JSON.parse(fs.readFileSync(o.record, 'utf8')); saltHex = record.salt; }
  if (!saltHex) throw new Error('Give --salt <hex> or --record <record.json>');
  const hash = C.commitmentOf(content, C.saltFromHex(saltHex));
  if (record && record.commitment !== hash) { console.log('NO MATCH: ' + o.file + ' is not the file record ' + record.id + ' committed to (commitment ' + hash + ')'); return false; }
  const { entries, errors } = C.readLedger(o.root);
  if (errors.length) throw new Error('The ledger does not parse:\n  ' + errors.join('\n  '));
  const entry = entries.find(e => e.type === 'commit' && e.hash === hash);
  if (!entry) { console.log('NO MATCH: commitment ' + hash + ' is not in ' + C.LEDGER); return false; }
  if (record && record.id !== entry.id) { console.log('NO MATCH: the record says ' + record.id + ' but the ledger has this commitment as ' + entry.id); return false; }
  return describe(o, entry, entries.filter(e => e.type === 'reveal'));
}

function checkRevealed(o, id, entries) {
  const problems = [];
  const entry = entries.find(e => e.type === 'commit' && e.id === id);
  const rv = entries.find(e => e.type === 'reveal' && e.id === id);
  if (!entry) return ['no commit line for ' + id];
  if (!rv) return ['no reveal line for ' + id];
  if (rv.path !== C.REVEALED + '/' + id) return [id + ': reveal folder must be ' + C.REVEALED + '/' + id];
  const dir = path.join(o.root, C.REVEALED, id);
  const meta = path.join(dir, 'reveal.json');
  if (!fs.existsSync(meta)) return [rv.path + '/reveal.json is missing'];
  const r = JSON.parse(fs.readFileSync(meta, 'utf8'));
  const file = path.join(dir, String(r.file || ''));
  if (!r.file || path.basename(r.file) !== r.file || !fs.existsSync(file)) return [rv.path + ': the revealed file ' + r.file + ' is missing'];
  let hash;
  try { hash = C.commitmentOf(fs.readFileSync(file), C.saltFromHex(r.salt)); } catch (e) { return [rv.path + ': ' + e.message]; }
  if (hash !== entry.hash) problems.push(id + ': the revealed file and salt give ' + hash + ', not the committed ' + entry.hash);
  if (r.id !== id || r.commitment !== entry.hash || r.committed !== entry.date) problems.push(id + ': reveal.json disagrees with the ledger');
  return problems;
}

function checkAll(o) {
  const problems = [];
  const { entries, errors } = C.readLedger(o.root);
  problems.push(...errors);
  const commits = entries.filter(e => e.type === 'commit'), reveals = entries.filter(e => e.type === 'reveal');
  const seen = new Set();
  let last = '';
  for (const e of entries) {
    if (e.date < last) problems.push('ledger line ' + e.lineNo + ': dated before the line above it; the ledger is append-only');
    last = e.date > last ? e.date : last;
    if (e.type === 'commit') {
      if (seen.has(e.id)) problems.push('ledger line ' + e.lineNo + ': duplicate id ' + e.id);
      seen.add(e.id);
      const stamp = path.join(o.root, C.STAMPS, e.id + '.txt');
      if (!fs.existsSync(stamp)) problems.push(e.id + ': stamp file ' + C.STAMPS + '/' + e.id + '.txt is missing');
      else if (fs.readFileSync(stamp, 'utf8') !== e.line + '\n') problems.push(e.id + ': the ledger line differs from its stamp file, so the line was edited after it was stamped');
    } else {
      if (!seen.has(e.id)) problems.push('ledger line ' + e.lineNo + ': reveal of ' + e.id + ' before (or without) its commit');
      if (reveals.filter(r => r.id === e.id).length > 1) problems.push(e.id + ': revealed more than once');
      problems.push(...checkRevealed(o, e.id, entries));
    }
  }
  const stampDir = path.join(o.root, C.STAMPS);
  let proofs = 0;
  if (fs.existsSync(stampDir)) for (const f of fs.readdirSync(stampDir)) {
    const m = /^(.*)\.txt(\.ots)?$/.exec(f);
    if (!m || !C.ID_RE.test(m[1])) { problems.push(C.STAMPS + '/' + f + ': unexpected file'); continue; }
    if (!seen.has(m[1])) problems.push(C.STAMPS + '/' + f + ': no ledger line for ' + m[1]);
    if (m[2]) proofs++;
  }
  const revDir = path.join(o.root, C.REVEALED);
  if (fs.existsSync(revDir)) for (const d of fs.readdirSync(revDir)) if (!reveals.some(r => r.id === d)) problems.push(C.REVEALED + '/' + d + ': no reveal line in the ledger');
  // A private record holds a salt. Committed, it reveals its commitment to anyone who has the file.
  let tracked = [];
  try { tracked = execFileSync('git', ['-C', o.root, 'ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0'); } catch (_) { /* not a git checkout */ }
  for (const f of tracked) if (/\.commitment\.json$/.test(f)) problems.push(f + ': a private commitment record (it holds the salt) is committed; remove it and treat that commitment as revealed');
  if (problems.length) { console.log('COMMITMENTS FAILED\n  ' + [...new Set(problems)].join('\n  ')); return false; }
  console.log('Commitments OK: ' + commits.length + ' committed, ' + reveals.length + ' revealed, ' + proofs + ' with an OpenTimestamps proof');
  return true;
}

function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (o.help || (!o.file && !o.revealed && !o.all)) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 14).map(s => s.replace(/^\/\/ ?/, '')).join('\n')); process.exit(o.help ? 0 : 2); }
  let ok;
  try {
    if (o.all) ok = checkAll(o);
    else if (o.revealed) {
      const { entries } = C.readLedger(o.root);
      const problems = checkRevealed(o, o.revealed, entries);
      if (problems.length) { console.log('NO MATCH\n  ' + problems.join('\n  ')); ok = false; }
      else ok = describe(o, entries.find(e => e.type === 'commit' && e.id === o.revealed), entries.filter(e => e.type === 'reveal'));
    } else ok = checkFile(o);
  } catch (e) { console.error('verify-commitment: ' + e.message); process.exit(2); }
  process.exit(ok ? 0 : 1);
}

if (require.main === module) main();
module.exports = { checkAll, checkFile, checkRevealed };
