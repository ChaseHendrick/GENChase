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

/* ---- 6b. a size control may not offer more than its own sanitizer allows ---- */
// Three tabs shipped a grid control whose largest options did nothing: the segmented control offered
// 1024 while the technique's own sanitize() clamped the value to 512 or 768 on the way in. The button
// moved, the label changed, the plate did not, and nothing anywhere said so. A control that lies about
// what it does is worse than a missing control, and this is the one kind of lie that can be checked
// mechanically, so it is.
//
// The options are often not inside the module that uses them: a block defines one shared GRID array and
// several techniques splice it into their schema. Scanning only the module body therefore misses exactly
// the families where one edit changes six tabs at once, which is where this went wrong in the first
// place. So the search falls back to the last grid options array declared earlier in the same script
// block, which is how these files are actually organized.
const GRID_OPTS = /key: 'grid'[\s\S]{0,240}?options: \[\[([\s\S]*?)\]\]/g;
const blockStartFor = i => {
  let best = 0;
  for (const b of blocks) { if (b.index <= i && b.index > best) best = b.index; }
  return best;
};
for (const m of mods) {
  const cl = /s\.grid = U\.clamp\(Math\.round\(Number\(s\.grid\) \/ 2\) \* 2, (\d+), (\d+)\)/.exec(m.body);
  if (!cl) continue;
  let optsText = null;
  const own = new RegExp(GRID_OPTS.source).exec(m.body);
  if (own) optsText = own[1];
  else {
    const from = blockStartFor(m.start);
    const before = src.slice(from, m.start);
    let last = null, g = new RegExp(GRID_OPTS.source, 'g'), h;
    while ((h = g.exec(before))) last = h;
    if (last) optsText = last[1];
  }
  if (!optsText) continue;
  const offered = [...optsText.matchAll(/(\d+),/g)].map(x => +x[1]);
  if (!offered.length) continue;
  const max = Math.max(...offered);
  if (max > +cl[2]) {
    fail(m.id + ' (line ' + m.line + ') offers grid ' + max + ' but its sanitize clamps grid to ' + cl[2] +
      ': the larger options do nothing');
  }
}

/* ---- 7. the prose agrees with the file ---- */
const WORDS = { 49: 'Forty-nine', 50: 'Fifty', 51: 'Fifty-one', 52: 'Fifty-two', 53: 'Fifty-three', 54: 'Fifty-four',
  55: 'Fifty-five', 56: 'Fifty-six', 57: 'Fifty-seven', 58: 'Fifty-eight', 59: 'Fifty-nine', 60: 'Sixty', 61: 'Sixty-one',
  62: 'Sixty-two', 63: 'Sixty-three', 64: 'Sixty-four', 65: 'Sixty-five', 66: 'Sixty-six', 67: 'Sixty-seven',
  68: 'Sixty-eight', 69: 'Sixty-nine', 70: 'Seventy',
  108: 'One hundred eight' };
const spelled = WORDS[mods.length];
const readme = fs.existsSync(path.join(root, 'README.md')) ? fs.readFileSync(path.join(root, 'README.md'), 'utf8') : '';
for (const [label, text] of [['studio.html', src], ['README.md', readme]]) {
  if (!text) continue;
  // Only a spelled number that is actually counting techniques. Matching the word on its own
  // flagged a code comment about sixty-three animation loops, which is not a claim about anything.
  const claims = [...text.matchAll(/\b((?:One hundred eight)|(?:Forty|Fifty|Sixty|Seventy)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)\b(?=(?:\s+\w+){0,2}\s+(?:pattern-forming systems|sciences|techniques|tabs)\b)/gi)]
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

// The studio must load nothing from the network. About says so and AGENTS.md says so, and for a while
// neither was true: three <link> tags pulled Instrument Serif, Geist and Geist Mono from Google on every
// load, so the one claim a reader can check by opening devtools was the one that was false. The fonts are
// inlined now, and this keeps them that way. It looks for a URL in a position that would actually fetch
// something, so prose, credits and comments that mention a URL are untouched.
{
  const fetchers = [
    [/<link[^>]+href\s*=\s*["']https?:/gi, 'a <link> that loads from the network'],
    [/<script[^>]+src\s*=\s*["']https?:/gi, 'a <script src> that loads from the network'],
    [/<img[^>]+src\s*=\s*["']https?:/gi, 'an <img> that loads from the network'],
    [/url\(\s*["']?https?:/gi, 'a CSS url() that loads from the network'],
    [/\bimportScripts\s*\(\s*["']https?:/gi, 'importScripts from the network'],
  ];
  for (const [re, what] of fetchers) {
    for (const h of src.matchAll(re)) {
      fail('studio.html line ' + lineAt(h.index) + ' has ' + what + '. The file has to work with no network: ' +
        'inline the resource instead, and if it genuinely cannot be inlined, change what About and AGENTS.md promise.');
    }
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
