#!/usr/bin/env node
// Pre-submission checks for every publication in papers/papers.json.
// docs/PUBLISHING-PAPERS.md is the runbook; this catches the mechanical mistakes before a submission.
//
//   node tools/paper-check.js                    every paper
//   node tools/paper-check.js --paper minimal-winding
//   node tools/paper-check.js --self-test        the checks against planted mistakes (npm test runs this)
//
// Per paper: the status is known and its bookkeeping is filled in (an arXiv id once on arXiv, and so
// on); the listed files exist; the title is the same in every source; the only email address in a
// paper's files is the author's published one (papers.json "author.email"); the arXiv abstract fits arXiv's
// 1,920 characters and its stated length is right; the committed PDF has the page count the Comments line
// gives (and, when pdflatex is installed, so does a fresh LaTeX build); and the Typst and LaTeX reference
// lists have the same entries in the same order, with the same works cited. From "ready" on, a paper with
// a companion repository must stage cleanly for it (tools/paper-sync.js). Placeholders are listed.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const ABSTRACT_LIMIT = 1920;
const ORDER = ['draft', 'preparing', 'ready', 'on-arxiv', 'submitted', 'accepted', 'published'];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const EXAMPLE = /@example\.(com|org|net)$/i;

const read = (root, f) => fs.readFileSync(path.join(root, f), 'utf8');
// A title in math mode ($\alpha$ in LaTeX, $alpha$ in Typst) matches the spelled-out name the PDF metadata uses.
const norm = s => s.replace(/\$\\?([A-Za-z]+)\$/g, '$1').replace(/\\\\(\[[^\]]*\])?/g, ' ').replace(/\\(Large|large|bfseries|textbf|emph)\b/g, ' ').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
// The page count is the largest /Count on a /Type /Pages node (the root holds the total). pdflatex
// keeps those nodes in compressed object streams, so Flate streams are inflated and searched too.
// The quality bar (papers/<id>/notes/QUALITY.md): seven items, each checked with its evidence before a paper is
// "ready" or later, which is when it goes public as its own repository and gets a DOI.
const BAR = ['Complete proofs', 'Rigorous computation', 'Every claim labelled', 'Sources read', 'Prior article review', 'Adversarial second reading', 'Reproducible'];

function quality(root, p) {
  const file = ['papers', p.id, 'notes', 'QUALITY.md'].join('/');
  if (!fs.existsSync(path.join(root, file))) return { file, items: null };
  const items = [...read(root, file).matchAll(/^- \[([ xX])\] \*\*(\d+)\. ([^*]+?)\.\*\*[ \t]*(.*)$/gm)]
    .map(m => ({ done: m[1] !== ' ', n: +m[2], title: m[3].trim(), evidence: m[4].trim() }));
  return { file, items };
}

function pdfPages(buf) {
  const counts = [], scan = text => { for (const m of text.matchAll(/\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g)) counts.push(+(m[1] || m[2])); };
  const raw = buf.toString('latin1');
  scan(raw);
  for (const m of raw.matchAll(/stream\r?\n/g)) {
    const start = m.index + m[0].length, end = raw.indexOf('endstream', start);
    if (end < 0) break;
    try { scan(zlib.inflateSync(buf.subarray(start, end)).toString('latin1')); } catch (_) { /* not a Flate stream, or not complete */ }
  }
  return counts.length ? Math.max(...counts) : null;
}

function titles(root, p) {
  const out = [];
  if (p.typst) { const m = /title:\s*"([^"]+)"/.exec(read(root, p.typst)); if (m) out.push(['Typst', norm(m[1])]); }
  if (p.latex) { const m = /\\title\{([\s\S]*?)\}\s*\n/.exec(read(root, p.latex)); if (m) out.push(['LaTeX', norm(m[1])]); }
  if (p.markdown) { const m = /^title:\s*'([^']+)'|^title:\s*"([^"]+)"/m.exec(read(root, p.markdown)); if (m) out.push(['Markdown', m[1] || m[2]]); }
  if (p.arxiv && p.arxiv.metadata) { const m = /\*\*Title:\*\*\s*(.+)/.exec(read(root, p.arxiv.metadata)); if (m) out.push(['arXiv metadata', m[1].trim()]); }
  return out;
}

// Reference lists: LaTeX \bibitem keys in order, Typst "+ " entries after the References heading.
function bibliography(root, p) {
  const tex = read(root, p.latex), typ = read(root, p.typst);
  const items = [...tex.matchAll(/\\bibitem\{([^}]+)\}([\s\S]*?)(?=\\bibitem\{|\\end\{thebibliography\})/g)].map(m => ({ key: m[1], text: m[2] }));
  const at = typ.search(/\[References\]|^= References/m);
  const entries = at < 0 ? [] : typ.slice(at).split('\n').filter(l => /^\+ /.test(l));
  const years = s => [...new Set((s.match(/\b(1[89]\d\d|20\d\d)\b/g) || []))].sort().join(',');
  const texCited = new Set();
  for (const m of tex.matchAll(/\\cite[pt]?\*?(?:\[[^\]]*\])?\{([^}]+)\}/g)) m[1].split(',').forEach(k => texCited.add(items.findIndex(i => i.key === k.trim()) + 1));
  const body = typ.slice(0, at < 0 ? typ.length : at).replace(/\$[^$]*\$/g, ' ');
  const typCited = new Set();
  for (const m of body.matchAll(/\[([^\]\n]+)\]/g)) m[1].split(',').map(t => t.trim()).filter(t => /^\d+$/.test(t)).forEach(t => { if (+t >= 1 && +t <= entries.length) typCited.add(+t); });
  return { items, entries, years, texCited, typCited };
}

function checkPaper(root, p, opts = {}) {
  const problems = [], notes = [];
  const bad = m => problems.push(m), note = m => notes.push(m);
  if (!ORDER.includes(p.status)) bad('status "' + p.status + '" is not one of ' + ORDER.join(', '));
  const rank = ORDER.indexOf(p.status);
  if (rank >= ORDER.indexOf('on-arxiv') && p.arxiv && !/^\d{4}\.\d{4,5}(v\d+)?$/.test(p.arxiv.id || '')) bad('status ' + p.status + ' needs arxiv.id (for example 2610.01234)');
  if (rank >= ORDER.indexOf('submitted') && p.journal && !/^\d{4}-\d{2}-\d{2}$/.test(p.journal.submitted || '')) bad('status ' + p.status + ' needs journal.submitted as YYYY-MM-DD');
  if (p.status === 'published' && p.journal && !/^10\.\d{4,}\//.test(p.journal.doi || '')) bad('status published needs journal.doi');
  if (p.id) {
    const q = quality(root, p), due = rank >= ORDER.indexOf('ready'), say = due ? bad : note;
    if (!q.items) { if (due) bad('status ' + p.status + ' needs ' + q.file + ', the quality record, with every item checked'); }
    else {
      const open = [];
      BAR.forEach((title, i) => {
        const it = q.items.find(x => x.n === i + 1);
        if (!it || it.title !== title) say(q.file + ': item ' + (i + 1) + ' "' + title + '" is missing or renamed');
        else if (!it.done) open.push(i + 1);
        else if (!it.evidence) say(q.file + ': item ' + (i + 1) + ' is checked but gives no evidence');
      });
      if (open.length) say(q.file + ': the quality bar is not met (open: item ' + open.join(', ') + ')' + (due ? '; a paper is "ready" or later only when every item is checked' : ''));
      else if (q.items.length >= BAR.length) note(q.file + ': the quality bar is met');
    }
  }
  const files = [p.typst, p.latex, p.markdown, p.pdf, p.arxiv && p.arxiv.metadata, p.journal && p.journal.coverLetter, p.zenodo && p.zenodo.metadata].filter(Boolean);
  const missing = files.filter(f => !fs.existsSync(path.join(root, f)));
  missing.forEach(f => bad('missing file ' + f));
  if (missing.length) return { problems, notes };

  const t = titles(root, p);
  if (t.length && t.some(([, x]) => x !== p.title)) bad('title differs: ' + t.filter(([, x]) => x !== p.title).map(([w, x]) => w + ' has "' + x + '"').join('; '));

  // The author's address belongs in the manuscript only; the submission files and the pages of the
  // repository leave it out (owner's decision, 2026-09-25).
  const allowed = new Set((opts.emails || []).map(a => a.toLowerCase())), manuscript = new Set([p.typst, p.latex, p.markdown]);
  for (const f of files.filter(f => !/\.pdf$/i.test(f))) {
    const found = (read(root, f).match(EMAIL) || []).filter(a => !EXAMPLE.test(a) && !(manuscript.has(f) && allowed.has(a.toLowerCase())));
    if (found.length) bad(f + ' contains ' + [...new Set(found)].join(', ') + (manuscript.has(f) ? ', which is not the author address in papers/papers.json' : '; an email address belongs in the manuscript only'));
  }

  let pages = null;
  if (p.pdf) { pages = pdfPages(fs.readFileSync(path.join(root, p.pdf))); note(p.pdf + ': ' + (pages == null ? 'page count unreadable' : pages + ' pages')); }
  if (p.arxiv && p.arxiv.metadata) {
    const meta = read(root, p.arxiv.metadata);
    const block = /## Abstract[^\n]*\n+```\n([\s\S]*?)\n```/.exec(meta);
    if (!block) bad(p.arxiv.metadata + ': no abstract block');
    else {
      const n = block[1].length, stated = /([\d,]+) characters/.exec(meta);
      if (n > ABSTRACT_LIMIT) bad('the arXiv abstract has ' + n + ' characters; arXiv allows ' + ABSTRACT_LIMIT);
      if (stated && +stated[1].replace(/,/g, '') !== n) bad(p.arxiv.metadata + ' says the abstract has ' + stated[1] + ' characters; it has ' + n);
    }
    const comments = /\*\*Comments:\*\*\s*`(\d+) pages/.exec(meta);
    if (comments && pages != null && +comments[1] !== pages) bad('the Comments line says ' + comments[1] + ' pages; ' + p.pdf + ' has ' + pages);
    if (comments && p.latex) {
      const built = opts.latexPages ? opts.latexPages(root, p.latex) : latexPages(root, p.latex);
      if (built == null) note('the Comments line says ' + comments[1] + ' pages for the LaTeX build; pdflatex is not installed here, so that was not checked');
      else if (built !== +comments[1]) bad('the Comments line says ' + comments[1] + ' pages; the LaTeX build has ' + built);
      else note('LaTeX build: ' + built + ' pages, as the Comments line says');
    }
    const holes = [...new Set(meta.match(/\[(?:[a-z][^\]]{2,40})\]/g) || [])];
    if (holes.length) note('placeholders in ' + p.arxiv.metadata + ': ' + holes.join(' '));
  }
  if (p.journal && p.journal.coverLetter) {
    const holes = [...new Set(read(root, p.journal.coverLetter).match(/\[(?:[a-zA-Z][^\]]{2,60})\]/g) || [])];
    if (holes.length) note('to fill in the copy you send (' + p.journal.coverLetter + '): ' + holes.join(' '));
  }
  if (p.typst && p.latex) {
    const b = bibliography(root, p);
    if (b.items.length !== b.entries.length) bad('the LaTeX bibliography has ' + b.items.length + ' entries and the Typst list ' + b.entries.length);
    else b.items.forEach((it, i) => { if (b.years(it.text) !== b.years(b.entries[i])) bad('reference ' + (i + 1) + ' (' + it.key + ') has years ' + (b.years(it.text) || 'none') + ' in LaTeX and ' + (b.years(b.entries[i]) || 'none') + ' in Typst'); });
    const onlyTex = [...b.texCited].filter(n => n > 0 && !b.typCited.has(n)), onlyTyp = [...b.typCited].filter(n => !b.texCited.has(n));
    if (b.texCited.has(0)) bad('the LaTeX source cites a key that has no \\bibitem');
    if (onlyTex.length) bad('cited in LaTeX but not in Typst: reference ' + onlyTex.join(', '));
    if (onlyTyp.length) bad('cited in Typst but not in LaTeX: reference ' + onlyTyp.join(', '));
    const unused = b.items.map((it, i) => i + 1).filter(n => !b.texCited.has(n));
    if (unused.length) bad('never cited: reference ' + unused.join(', '));
    if (!problems.length) note(b.items.length + ' references, the same works cited in both sources');
  }
  return { problems, notes };
}

// The LaTeX page count, built in a temporary folder when pdflatex is installed; null otherwise.
function latexPages(root, tex) {
  if (spawnSync('pdflatex', ['--version'], { stdio: 'ignore' }).error) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-tex-'));
  try {
    const src = path.join(root, tex);
    fs.copyFileSync(src, path.join(dir, 'paper.tex'));
    const figs = path.join(path.dirname(src), 'figures');
    if (fs.existsSync(figs)) fs.cpSync(figs, path.join(dir, 'figures'), { recursive: true });
    for (let i = 0; i < 3; i++) spawnSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', 'paper.tex'], { cwd: dir, stdio: 'ignore' });
    const pdf = path.join(dir, 'paper.pdf');
    return fs.existsSync(pdf) ? pdfPages(fs.readFileSync(pdf)) : null;
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function run(root, only) {
  const reg = JSON.parse(read(root, 'papers/papers.json'));
  const papers = reg.papers.filter(p => !only || p.id === only);
  if (only && !papers.length) throw new Error('No paper ' + only + ' in papers/papers.json');
  const emails = reg.author && reg.author.email ? [reg.author.email] : [];
  const ids = new Set();
  let failed = 0;
  for (const p of papers) {
    if (ids.has(p.id)) { console.log('FAIL duplicate id ' + p.id); failed++; }
    ids.add(p.id);
    const { problems, notes } = checkPaper(root, p, { emails });
    // A paper goes public as its own repository (tools/paper-sync.js); from "ready" on it must stage cleanly.
    if (p.companion && !problems.some(m => m.startsWith('missing file'))) {
      const found = require('./paper-sync.js').check(root, p.id), due = ORDER.indexOf(p.status) >= ORDER.indexOf('ready');
      found.forEach(m => (due ? problems : notes).push('companion ' + p.companion + ': ' + m + (due ? '' : ' (fix before "ready")')));
      if (!found.length) notes.push('companion ' + p.companion + ': stages cleanly');
    }
    console.log((problems.length ? 'FAIL ' : 'OK   ') + p.id + '  [' + p.status + ']');
    problems.forEach(m => console.log('       ' + m));
    notes.forEach(m => console.log('       note: ' + m));
    if (problems.length) failed++;
  }
  return failed;
}

function selfTest() {
  let checks = 0, failures = 0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-paper-'));
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };
  const abstract = 'We bound $P$ for every collapse.';
  const base = () => {
    fs.rmSync(path.join(tmp, 'papers'), { recursive: true, force: true });
    w('p.typ', '#set document(title: "A Test Paper", author: "A")\nText [1] and [2, Sect. 3], with $[0, 1]$ math.\n#heading[References]\n+ A. One, J. 22 (1979) 1.\n+ B. Two, J. 25 (1982) 2.\n');
    w('p.tex', '\\title{\\Large\\bfseries A Test\\\\ Paper}\nText \\cite{one} and \\cite[Sect.~3]{two}.\n\\begin{thebibliography}{9}\n\\bibitem{one} A. One, J. 22 (1979) 1.\n\\bibitem{two} B. Two, J. 25 (1982) 2.\n\\end{thebibliography}\n');
    w('p.pdf', '%PDF-1.7\n<< /Type/Pages/Count 3 >>\n');
    w('meta.md', '- **Title:** A Test Paper\n- **Comments:** `3 pages, 1 figure`\n\n## Abstract (' + abstract.length + ' characters; the limit is 1,920)\n\n```\n' + abstract + '\n```\n');
    w('letter.md', 'Dear Editors, [arXiv identifier].\n');
  };
  const paper = () => ({ id: 't', title: 'A Test Paper', status: 'preparing', typst: 'p.typ', latex: 'p.tex', pdf: 'p.pdf', arxiv: { metadata: 'meta.md', id: null }, journal: { coverLetter: 'letter.md', submitted: null, doi: null } });
  const opts = { latexPages: () => 3, emails: ['author@real-domain.org'] };
  const expect = (want, what, mutate) => {
    base(); const p = paper(); if (mutate) mutate(p);
    const r = checkPaper(tmp, p, opts), ok = want ? r.problems.length === 0 : r.problems.length > 0;
    checks++; if (!ok) { failures++; console.log('FAIL ' + what + (r.problems.length ? ': ' + r.problems.join('; ') : ': no problem found')); }
  };
  try {
    const record = open => 'Quality record\n\n' + BAR.map((t, i) => '- [' + (open.includes(i + 1) ? ' ' : 'x') + '] **' + (i + 1) + '. ' + t + '.** Evidence ' + (i + 1) + '.\n').join('');
    expect(true, 'a consistent paper passes');
    expect(false, 'an email address in the LaTeX source', () => w('p.tex', read(tmp, 'p.tex').replace('Text', 'Mail me@real-domain.org. Text')));
    expect(true, 'a you@example.com placeholder is allowed', () => w('letter.md', 'Write to you@example.com.\n'));
    expect(true, "the author's published address is allowed", () => w('p.tex', read(tmp, 'p.tex').replace('Text', 'Author@Real-Domain.org. Text')));
    expect(false, 'another address beside the author one', () => w('letter.md', 'author@real-domain.org and me@real-domain.org\n'));
    expect(false, "the author's address outside the manuscript", () => w('letter.md', 'Write to author@real-domain.org.\n'));
    expect(false, 'an abstract over 1,920 characters', () => w('meta.md', read(tmp, 'meta.md').replace(abstract, 'x'.repeat(1921)).replace('(' + abstract.length + ' characters', '(1921 characters')));
    expect(false, 'a wrong stated abstract length', () => w('meta.md', read(tmp, 'meta.md').replace('(' + abstract.length + ' characters', '(999 characters')));
    expect(false, 'a committed PDF with another page count', () => w('p.pdf', '%PDF-1.7\n<< /Type/Pages/Count 2 >>\n'));
    expect(false, 'a wrong LaTeX page count', p => { opts.latexPages = () => 4; });
    opts.latexPages = () => 3;
    expect(false, 'a reference whose year differs', () => w('p.typ', read(tmp, 'p.typ').replace('(1982)', '(1983)')));
    expect(false, 'a reference missing from one list', () => w('p.typ', read(tmp, 'p.typ').replace('+ B. Two, J. 25 (1982) 2.\n', '')));
    expect(false, 'a work cited only in Typst', () => { w('p.tex', read(tmp, 'p.tex').replace(' and \\cite[Sect.~3]{two}', '').replace('\\bibitem{two}', '\\nocite{}\\bibitem{two}')); });
    expect(false, 'a different title in the metadata', () => w('meta.md', read(tmp, 'meta.md').replace('**Title:** A Test Paper', '**Title:** A Tested Paper')));
    expect(false, 'an unknown status', p => { p.status = 'done'; });
    expect(false, 'on arXiv without an identifier', p => { p.status = 'on-arxiv'; });
    expect(true, 'on arXiv with an identifier', p => { p.status = 'on-arxiv'; p.arxiv.id = '2610.01234'; w('papers/t/notes/QUALITY.md', record([])); });
    expect(false, 'submitted without a date', p => { p.status = 'submitted'; p.arxiv.id = '2610.01234'; w('papers/t/notes/QUALITY.md', record([])); });
    expect(false, 'a missing file', p => { p.pdf = 'nope.pdf'; });
    expect(false, 'ready without a quality record', p => { p.status = 'ready'; });
    expect(true, 'ready with every item of the bar checked', p => { p.status = 'ready'; w('papers/t/notes/QUALITY.md', record([])); });
    expect(false, 'ready with an open item', p => { p.status = 'ready'; w('papers/t/notes/QUALITY.md', record([6])); });
    expect(false, 'ready with an item renamed', p => { p.status = 'ready'; w('papers/t/notes/QUALITY.md', record([]).replace('Prior article review', 'Prior work')); });
    // Item 5 was "Prior art" until the owner renamed it (2026-09-26): GENChase is also an art studio.
    expect(false, 'ready with item 5 under its old name', p => { p.status = 'ready'; w('papers/t/notes/QUALITY.md', record([]).replace('Prior article review', 'Prior art')); });
    expect(false, 'ready with an item missing', p => { p.status = 'ready'; w('papers/t/notes/QUALITY.md', record([]).split('\n').filter(l => !l.includes('**7.')).join('\n')); });
    expect(false, 'ready with a checked item and no evidence', p => { p.status = 'ready'; w('papers/t/notes/QUALITY.md', record([]).replace('Evidence 4.', '')); });
    expect(true, 'a draft may have open items', p => { p.status = 'draft'; w('papers/t/notes/QUALITY.md', record([1, 6])); });
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log((failures ? 'PAPER CHECK SELF-TEST FAILED: ' + failures + ' of ' : 'Paper check self-test OK: ') + checks + ' cases, including the planted mistakes');
  return failures;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 15).map(s => s.replace(/^\/\/ ?/, '')).join('\n')); return; }
  if (argv.includes('--self-test')) process.exit(selfTest() ? 1 : 0);
  const i = argv.indexOf('--paper'), root = path.resolve(__dirname, '..');
  try { process.exit(run(root, i >= 0 ? argv[i + 1] : null) ? 1 : 0); }
  catch (e) { console.error('paper-check: ' + e.message); process.exit(2); }
}

if (require.main === module) main();
module.exports = { checkPaper, pdfPages };
