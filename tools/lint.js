// node tools/lint.js [studio.html]
// Structural checks on the studio file. No browser, no GPU, under a second.
//
// The browser harness is the real verification, but it takes hours across 52 techniques, so nothing
// ran it on every change. This is the part that can run on every push: it enforces the invariants
// AGENTS.md states in prose, mechanically, and catches the documentation drifting away from the file.
//
// Exit status is 0 when clean, 1 when anything fails.
const fs = require('fs');
const path = require('path');

const file = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', 'studio.html');
const root = path.dirname(file);
const src = fs.readFileSync(file, 'utf8');

const fails = [];
const notes = [];
const fail = m => fails.push(m);

// Line number for a character offset, so a failure points somewhere you can open.
const lineAt = i => src.slice(0, i).split('\n').length;

/* ---- 1. every script block parses ---- */
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!blocks.length) fail('no <script> blocks found: is this the studio file?');
for (const b of blocks) {
  try { new Function(b[1]); }
  catch (e) { fail('script block at line ' + lineAt(b.index) + ' does not parse: ' + e.message); }
}

/* ---- 2. find each registered technique and the slice of file that belongs to it ---- */
// A module runs from its own Studio.register to the next one; the last runs to the end of the file.
// The bare "Studio.register({...})" in the file header comment is not a registration, so require an
// id to follow.
const regs = [...src.matchAll(/Studio\.register\(\{\s*\n?\s*id:\s*'([^']+)'/g)];
if (regs.length < 2) fail('found ' + regs.length + ' registered techniques, which cannot be right');
const mods = regs.map((m, i) => ({
  id: m[1],
  start: m.index,
  end: i + 1 < regs.length ? regs[i + 1].index : src.length,
  line: lineAt(m.index),
}));
mods.forEach(m => { m.body = src.slice(m.start, m.end); });

/* ---- 3. ids are unique ---- */
const seen = new Map();
for (const m of mods) {
  if (seen.has(m.id)) fail('duplicate technique id "' + m.id + '" at lines ' + seen.get(m.id) + ' and ' + m.line);
  else seen.set(m.id, m.line);
}

/* ---- 4. every technique carries what the shell and the colophon need ---- */
// The colophon prints the technique, its rule and its credit under the plate; a technique missing one
// prints a gap on a sheet somebody paid to have framed.
const REQUIRED = ['name', 'schema', 'defaults', 'create', 'credit', 'blurb', 'equation'];
for (const m of mods) {
  for (const key of REQUIRED) {
    // "key: value", the shorthand "key," several techniques use for schema/defaults, or the method
    // shorthand "create(host) {". The leading boundary keeps document.createElement out of it.
    if (!new RegExp('(^|[\\s,{])' + key + '\\s*[:,(}]').test(m.body)) fail(m.id + ' (line ' + m.line + ') has no "' + key + '"');
  }
}

/* ---- 5. no Math.random inside a technique ---- */
// "All randomness through U.makeRng(seed). Math.random in a sim breaks reprinting." The three uses in
// the shell (seed words, palette shuffle, ambient tab pick) are outside every module body by design.
for (const m of mods) {
  const hit = /Math\.random/.exec(m.body);
  if (hit) fail(m.id + ' uses Math.random at line ' + lineAt(m.start + hit.index) + ': a seeded plate cannot reprint');
}

/* ---- 6. (deliberately absent) every schema control has a default ---- */
// Tried and removed. A module's schema is assembled from shared helpers (GRID, simFields(),
// pictureFields()) that are defined between registrations, so attributing a control to the module
// that owns it needs the file evaluated, not scanned. The scanned version blamed raymarch modules
// for missing defaults on grid controls they do not have. A check that cries wolf gets switched off,
// which costs more than it saves; the browser harness catches an undefined control as a blank plate.

/* ---- 7. the prose agrees with the file ---- */
const WORDS = { 49: 'Forty-nine', 50: 'Fifty', 51: 'Fifty-one', 52: 'Fifty-two', 53: 'Fifty-three', 54: 'Fifty-four',
  55: 'Fifty-five', 56: 'Fifty-six', 57: 'Fifty-seven', 58: 'Fifty-eight', 59: 'Fifty-nine', 60: 'Sixty', 61: 'Sixty-one',
  62: 'Sixty-two', 63: 'Sixty-three', 64: 'Sixty-four', 65: 'Sixty-five', 66: 'Sixty-six', 67: 'Sixty-seven',
  68: 'Sixty-eight', 69: 'Sixty-nine', 70: 'Seventy' };
const spelled = WORDS[mods.length];
const readme = fs.existsSync(path.join(root, 'README.md')) ? fs.readFileSync(path.join(root, 'README.md'), 'utf8') : '';
for (const [label, text] of [['studio.html', src], ['README.md', readme]]) {
  if (!text) continue;
  // Only a spelled number that is actually counting techniques. Matching the word on its own
  // flagged a code comment about sixty-three animation loops, which is not a claim about anything.
  const claims = [...text.matchAll(/\b((?:Forty|Fifty|Sixty|Seventy)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)\b(?=(?:\s+\w+){0,2}\s+(?:pattern-forming systems|sciences|techniques|tabs)\b)/gi)]
    .map(x => x[1]);
  for (const c of new Set(claims)) {
    if (spelled && c.toLowerCase() !== spelled.toLowerCase()) {
      fail(label + ' says "' + c + '" but the file registers ' + mods.length + ' techniques (' + spelled + ')');
    }
  }
  const digits = [...text.matchAll(/\b(\d{2})\s+(?:pattern-forming systems|sciences|techniques)\b/g)].map(x => +x[1]);
  for (const d of new Set(digits)) {
    if (d !== mods.length) fail(label + ' says "' + d + '" techniques but the file registers ' + mods.length);
  }
}

/* ---- 8. referenced files exist ---- */
for (const [label, text] of [['README.md', readme], ['studio.html', src]]) {
  if (!text) continue;
  for (const m of text.matchAll(/(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g)) {
    const rel = m[1].split('?')[0];
    if (!rel || rel.startsWith('//')) continue;
    if (!fs.existsSync(path.join(root, rel))) fail(label + ' references ' + rel + ', which is not in the repository');
  }
  for (const m of text.matchAll(/!\[[^\]]*\]\((?!https?:)([^)\s]+)\)/g)) {
    if (!fs.existsSync(path.join(root, m[1]))) fail(label + ' links ' + m[1] + ', which is not in the repository');
  }
}

/* ---- 9. docs do not point at files that were renamed away ---- */
for (const name of ['MODULE_SPEC.md']) {
  const hits = [...src.matchAll(new RegExp(name, 'g'))];
  for (const h of hits) {
    if (!fs.existsSync(path.join(root, name))) fail('studio.html line ' + lineAt(h.index) + ' points at ' + name + ', which does not exist');
  }
}

notes.push(mods.length + ' techniques: ' + mods.map(m => m.id).join(' '));
notes.push(blocks.length + ' script blocks parsed');

for (const n of notes) console.log(n);
if (fails.length) {
  console.log('\n' + fails.length + ' problem' + (fails.length === 1 ? '' : 's') + ':');
  for (const f of fails) console.log('  ' + f);
  console.log('\nFAIL');
  process.exit(1);
}
console.log('\nPASS');
