// node tools/lint.js [studio.html]
// Structural checks on the studio file. No browser, no GPU, under a second.
//
// The browser harness is the real verification, but it takes hours across the whole file, so nothing
// ran it on every change. This is the part that can run on every push: it enforces the invariants
// AGENTS.md states in prose, mechanically, and catches the documentation drifting away from the file.
//
// Exit status is 0 when clean, 1 when anything fails.
const fs = require('fs');
const path = require('path');
const count = require('./count.js');

const file = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', 'dist', 'studio.html');
const root = path.resolve(__dirname, '..');
const src = fs.readFileSync(file, 'utf8');

const fails = [];
const notes = [];
const fail = m => fails.push(m);

// Line number for a character offset, so a failure points somewhere you can open.
const lineAt = i => src.slice(0, i).split('\n').length;

/* ---- 1. every script block parses ---- */
const blocks = [...src.matchAll(/<script>([\s\S]*?)<\/script\s*>/gi)];
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

/* ---- 3b. hash aliases resolve ---- */
{
  const block = /const ALIAS = \{([^}]*)\}/.exec(src);
  if (block) {
    const pairs = [...block[1].matchAll(/([A-Za-z0-9_-]+)\s*:\s*'([^']+)'/g)];
    if (!pairs.length) fail('ALIAS map is present but empty');
    for (const [, from, to] of pairs) {
      if (!seen.has(to)) fail('hash alias "' + from + '" points at "' + to + '", which is not a registered technique');
      if (seen.has(from)) fail('hash alias "' + from + '" collides with a registered id');
    }
  }
}

/* ---- 3c. every registered id has a familiarity bucket ---- */
{
  const block = /const FAMILIARITY = \{([\s\S]*?)\n  \};/.exec(src);
  if (!block) fail('FAMILIARITY map is missing from the shell');
  else {
    const keys = [...block[1].matchAll(/^\s*'?([A-Za-z0-9_-]+)'?\s*:/gm)].map(x => x[1]);
    const have = new Set(keys);
    const want = mods.map(m => m.id);
    const missing = want.filter(id => !have.has(id));
    const extra = keys.filter(id => !want.includes(id));
    if (missing.length) fail('FAMILIARITY is missing ' + missing.join(', '));
    if (extra.length) fail('FAMILIARITY still lists ' + extra.join(', ') + ', which studio.html does not register');
    const dups = keys.filter((k, i) => keys.indexOf(k) !== i);
    if (dups.length) fail('FAMILIARITY duplicates ' + [...new Set(dups)].join(', '));
    const bad = [...block[1].matchAll(/:\s*'([^']+)'/g)].map(x => x[1]).filter(v => !/^(ubiquitous|common|occasional|rare|unseen)$/.test(v));
    if (bad.length) fail('FAMILIARITY has unknown bucket(s): ' + [...new Set(bad)].join(', '));
  }
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
const spelled = count.spell(mods.length);
const readme = fs.existsSync(path.join(root, 'README.md')) ? fs.readFileSync(path.join(root, 'README.md'), 'utf8') : '';
const citation = fs.existsSync(path.join(root, 'CITATION.cff')) ? fs.readFileSync(path.join(root, 'CITATION.cff'), 'utf8') : '';
const techniquesMd = fs.existsSync(path.join(root, 'TECHNIQUES.md')) ? fs.readFileSync(path.join(root, 'TECHNIQUES.md'), 'utf8') : '';
const designPlan = fs.existsSync(path.join(root, 'DESIGN-PLAN.md')) ? fs.readFileSync(path.join(root, 'DESIGN-PLAN.md'), 'utf8') : '';
const llmsTxt = fs.existsSync(path.join(root, 'llms.txt')) ? fs.readFileSync(path.join(root, 'llms.txt'), 'utf8') : '';
const agentsMd = fs.existsSync(path.join(root, 'AGENTS.md')) ? fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8') : '';
const researchMd = fs.existsSync(path.join(root, 'RESEARCH.md')) ? fs.readFileSync(path.join(root, 'RESEARCH.md'), 'utf8') : '';
const contributingMd = fs.existsSync(path.join(root, 'CONTRIBUTING.md')) ? fs.readFileSync(path.join(root, 'CONTRIBUTING.md'), 'utf8') : '';
if (!researchMd) fail('RESEARCH.md is missing');
for (const [label, text] of [
  ['studio.html', src],
  ['README.md', readme],
  ['CITATION.cff', citation],
  ['TECHNIQUES.md', techniquesMd],
  ['DESIGN-PLAN.md', designPlan],
  ['llms.txt', llmsTxt],
  ['AGENTS.md', agentsMd],
  ['RESEARCH.md', researchMd],
  ['CONTRIBUTING.md', contributingMd],
]) {
  if (!text) continue;
  const claims = count.claimsIn(text);
  for (const c of new Set(claims.spelled)) {
    fail(label + ' spells the catalog as "' + c + '"; write ' + mods.length + ' in digits');
  }
  for (const d of new Set(claims.digits)) {
    if (d !== mods.length) fail(label + ' says "' + d + '" techniques but the file registers ' + mods.length);
  }
  for (const d of new Set(claims.nowHas.concat(claims.thereAre))) {
    if (d !== mods.length) fail(label + ' says the studio has ' + d + ' but the file registers ' + mods.length);
  }
  for (const live of new Set(claims.live)) {
    if (live !== spelled) {
      fail(label + ' live catalog says "' + live + '" but the file registers ' + spelled);
    }
  }
}

{
  const descPath = path.join(root, '.github', 'description.txt');
  if (!fs.existsSync(descPath)) fail('.github/description.txt is missing; run node tools/index.js');
  else {
    const desc = fs.readFileSync(descPath, 'utf8');
    if (!desc.includes(spelled)) {
      fail('.github/description.txt does not contain "' + spelled + '"; run node tools/index.js');
    }
  }
}

if (researchMd) {
  const have = new Set(count.researchIds(researchMd));
  const missing = mods.map(m => m.id).filter(id => !have.has(id));
  if (missing.length) {
    fail('RESEARCH.md table is missing ' + missing.join(', ') + '; run node tools/index.js (it will append science-only rows)');
  }
  const identPath = path.join(root, 'IDENTITIES.md');
  if (!fs.existsSync(identPath)) fail('IDENTITIES.md is missing');
  else {
    const ident = fs.readFileSync(identPath, 'utf8');
    const ids = [...researchMd.matchAll(/^\| `([^`]+)` \|[^|\n]+\|[^|\n]+\| identity \|/gm)].map(m => m[1]);
    const gap = ids.filter(id => ident.indexOf('`' + id + '`') < 0);
    if (gap.length) fail('IDENTITIES.md does not mention ' + gap.join(', '));
  }
}

/* ---- 7c. the social card caption is the catalog, not a leftover sixty-six ---- */
// og.jpg is what GitHub and the Open Graph tags show. The number lives in a JPEG COM
// comment so this check does not need OCR. Rewrite the card and the comment together.
{
  const ogPath = path.join(root, 'og.jpg');
  if (!fs.existsSync(ogPath)) fail('og.jpg is missing');
  else {
    const buf = fs.readFileSync(ogPath);
    let comment = '';
    for (let i = 2; i < buf.length - 4 && buf[i] === 0xFF; ) {
      const marker = buf[i + 1];
      if (marker === 0xD8 || marker === 0xD9) { i += 2; continue; }
      if (marker === 0xDA) break;
      const len = (buf[i + 2] << 8) | buf[i + 3];
      if (len < 2) break;
      if (marker === 0xFE) comment += buf.slice(i + 4, i + 2 + len).toString('utf8');
      i += 2 + len;
    }
    const want = String(mods.length);
    if (!comment.includes(want)) {
      fail('og.jpg JPEG comment is "' + comment.trim() + '" but the file registers ' + mods.length +
        ' techniques; recaption the card and write the count into the COM comment');
    }
  }
}

/* ---- 7b. the generated catalog is the file, not a parallel list ---- */
// TECHNIQUES.md and techniques.json are written by tools/index.js from the live registry.
// Adding a tab and forgetting that command used to leave the catalog a plate behind, and
// CITATION.cff sat at 108 while the file already had 16 more. The
// count check above catches spelled drift; this catches a catalog that is simply old.
{
  const techPath = path.join(root, 'techniques.json');
  if (!fs.existsSync(techPath)) fail('techniques.json is missing; run node tools/index.js after adding a technique');
  else {
    let data = null;
    try { data = JSON.parse(fs.readFileSync(techPath, 'utf8')); }
    catch (e) { fail('techniques.json does not parse: ' + e.message); }
    if (data) {
      const listed = (data.techniques || []).map(t => t.id);
      if (data.count !== mods.length) {
        fail('techniques.json count is ' + data.count + ' but studio.html registers ' + mods.length +
          '; run node tools/index.js');
      }
      const have = new Set(listed);
      const want = mods.map(m => m.id);
      const missing = want.filter(id => !have.has(id));
      const extra = listed.filter(id => !want.includes(id));
      if (missing.length) fail('techniques.json is missing ' + missing.join(', ') + '; run node tools/index.js');
      if (extra.length) fail('techniques.json still lists ' + extra.join(', ') + ', which studio.html does not register; run node tools/index.js');
      const byId = new Map((data.techniques || []).map(t => [t.id, t]));
      for (const m of mods) {
        const row = byId.get(m.id);
        if (!row) continue;
        const nm = /(?:^|[,\s])name:\s*'((?:\\'|[^'])*)'/.exec(m.body);
        if (nm && row.name !== nm[1].replace(/\\'/g, "'")) {
          fail('techniques.json name for ' + m.id + ' is "' + row.name + '" but studio.html says "' + nm[1] +
            '"; run node tools/index.js');
        }
      }
    }
  }
  if (!techniquesMd) fail('TECHNIQUES.md is missing; run node tools/index.js after adding a technique');
  else {
    for (const m of mods) {
      if (!new RegExp('#' + m.id + '(?:/|`)').test(techniquesMd)) {
        fail('TECHNIQUES.md has no hash for ' + m.id + '; run node tools/index.js');
      }
    }
  }
}

/* ---- 8. referenced files exist ---- */
for (const [label, text] of [['README.md', readme], ['studio.html', src]]) {
  if (!text) continue;
  const linkRoot = label === 'studio.html' ? path.dirname(file) : root;
  for (const m of text.matchAll(/(?:src|href)="(?!https?:|data:|#|mailto:)([^"]+)"/g)) {
    const rel = m[1].split('?')[0];
    if (!rel || rel.startsWith('//')) continue;
    if (!fs.existsSync(path.resolve(linkRoot, rel))) fail(label + ' references ' + rel + ', which is not in the repository');
  }
  for (const m of text.matchAll(/!\[[^\]]*\]\((?!https?:)([^)\s]+)\)/g)) {
    if (!fs.existsSync(path.resolve(linkRoot, m[1]))) fail(label + ' links ' + m[1] + ', which is not in the repository');
  }
}

/* ---- 9. docs do not point at files that were renamed away ---- */
for (const name of ['MODULE_SPEC.md']) {
  const hits = [...src.matchAll(new RegExp(name, 'g'))];
  for (const h of hits) {
    if (!fs.existsSync(path.resolve(path.dirname(file), name))) fail('studio.html line ' + lineAt(h.index) + ' points at ' + name + ', which does not exist');
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

/* ---- the uncertainty gate ---- */
// AGENTS.md: a measured number printed against theory carries an error bar, or says why it has none.
// Status lines build those comparisons with Studio.util.stats.compare(), which refuses a comparison
// without a basis (sampled with an uncertainty and a method, exact, deterministic or construction) and
// refuses a sampled one without an error bar unless it states why the bar is pending. This rule keeps
// hand-written comparisons from coming back. It reads module sources line by line, so it recognises the
// phrasings this codebase has used (theory, expected, surmise, Euler, vs, against, a value followed by
// "· 0", a hand-typed ± or σ), not every sentence a person could write; validation/COMPARISON-AUDIT.md
// lists the comparisons that were converted when the rule was introduced.
{
  const MARKERS = [
    /\btheory\b|\bexpected\b|\bpredict|\bsurmise\b|\bEuler[:,]|\bagainst\b|\bvs\.?\s|\bOnsager\b/i,
    /\bformula\b|\bLorentz\b|\bwhole[- ]line\b|\bequilibrium:|\bEP at\b|\bdisk π|~\s*1\/|⇒\s*~|\bdual [0-9]|analytic global max|\bβ = 1\/[0-9]/i,
    /\bdrift\b|\bresidual\b|\bconserved\b/i,
    // a hand-typed uncertainty or significance: ± before a value, σ after one
    /±\s*(['"`+]|<b>|[0-9])|&plusmn;|\+\/-|[0-9]σ|['"`]σ/,
    // a value followed by the reference it should equal: "</b> · 0", "</b> · exact 1"
    /<\/b>[^<'"`]{0,6}·\s*(exact\s+)?[-−]?[0-9.]+\s*(['"`]|<|$)/,
  ];
  // Text of the call starting at an opening parenthesis, skipping strings and comments.
  const callText = (text, open) => {
    let depth = 0, i = open, q = null;
    for (; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '/' && text[i + 1] === '/') { i = text.indexOf('\n', i); if (i < 0) break; continue; }
      if (c === '(') depth++;
      else if (c === ')' && --depth === 0) return text.slice(open, i + 1);
    }
    return text.slice(open);
  };
  const dir = path.join(root, 'src', 'modules');
  for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== '_template.js').sort()) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    text.split('\n').forEach((line, i) => {
      const code = line.replace(/(^|[^:'"\\])\/\/.*$/, '$1');
      if (!/<b>|<\/b>|<span/.test(code) || /\bcompare\(/.test(code)) return;
      if (MARKERS.some(re => re.test(code))) {
        fail('src/modules/' + name + ':' + (i + 1) + ' prints a measured value against a reference by hand. ' +
          'Build the span with U.stats.compare({ label, measured, expected, basis, uncertainty, method }) so it carries an error bar or states that it is exact, deterministic or true by construction.');
      }
    });
    for (const [re, what] of [[/\bstats\.compare\(|\bcompare\(\{/g, 'compare()'], [/\bsetWitness\(\{/g, 'setWitness()']]) {
      for (const h of text.matchAll(re)) {
        const call = callText(text, h.index + h[0].indexOf('('));
        if (!/\bbasis\s*:/.test(call)) {
          fail('src/modules/' + name + ':' + text.slice(0, h.index).split('\n').length + ' calls ' + what +
            ' without a basis: say sampled (with uncertainty and method), exact, deterministic or construction.');
        }
      }
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
