#!/usr/bin/env node
// Publishes a finished paper as a public repository of its own, its "companion" in papers/papers.json.
// This repository may be private, so a paper points readers to its companion, never here.
// .github/workflows/papers.yml runs this; docs/PUBLISHING-PAPERS.md, section 1, is the setup.
//
//   node tools/paper-sync.js --list [--paper <id>]    "<id> <owner/repo>" for each paper ready to publish
//   node tools/paper-sync.js --stage <id> <dir>       write the companion's files into an empty <dir>
//   node tools/paper-sync.js --check <id>             stage into a scratch folder and report problems
//   node tools/paper-sync.js --companion <id>         the paper's companion repository, owner/name
//   node tools/paper-sync.js --self-test              the checks against planted mistakes (npm test)
//
// The companion holds papers/<id>/ without notes/ and submission/, which are working files that stay
// here, plus a LICENSE, a CITATION.cff and a .zenodo.json written from papers.json. Zenodo archives each release
// as a preprint (Publication / Preprint); its description,
// which OpenAIRE and other indexes copy, is the abstract from the README with its TeX turned into plain text.
// Staging refuses a paper without an "## Abstract" section, or whose abstract keeps TeX it cannot render, and a
// paper whose public files point into this repository (a GENChase URL, a research/ or papers/ path, a
// link out of the folder) or carry an email address outside the manuscript.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ORDER = ['draft', 'preparing', 'ready', 'on-arxiv', 'submitted', 'accepted', 'published'];
const PRIVATE_DIRS = ['notes/', 'submission/'];
const BINARY = /\.(pdf|png|jpe?g|gif|zip|npz|gz)$/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const INTERNAL = [
  [/github\.com\/[A-Za-z0-9-]+\/GENChase\b|\b(ChaseHendrick|SharpMeow)\/GENChase\b|(chasehendrick|sharpmeow)\.github\.io\/GENChase/i, 'a link to the GENChase repository or its site, which may be private'],
  [/(^|[^A-Za-z0-9_./-])(research|papers)\/[A-Za-z0-9_-]/m, 'a research/ or papers/ path of the GENChase repository'],
  [/\]\(\.\.\//, 'a Markdown link out of the paper folder'],
];
const TEXT_LICENSES = {
  'all-rights-reserved': (year, name) => `The manuscript in paper/, its figures included, is Copyright (c) ${year} ${name}. All rights reserved.`,
  'CC-BY-4.0': (year, name) => `The manuscript in paper/, its figures included, is Copyright (c) ${year} ${name}, licensed under the Creative Commons Attribution 4.0 International License (https://creativecommons.org/licenses/by/4.0/).`,
};

const registry = root => JSON.parse(fs.readFileSync(path.join(root, 'papers/papers.json'), 'utf8'));
const yaml = s => JSON.stringify(String(s));

function ready(reg, only) {
  const out = [];
  for (const p of reg.papers) {
    if (only && p.id !== only) continue;
    const why = !p.companion ? 'has no companion repository' : ORDER.indexOf(p.status) < ORDER.indexOf('ready') ? 'is ' + p.status + ', not ready' : null;
    if (why) { if (only) throw new Error('paper ' + only + ' ' + why); continue; }
    if (!/^[a-z0-9-]+$/.test(p.id) || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(p.companion)) throw new Error('bad id or companion for ' + p.id);
    out.push(p);
  }
  if (only && !out.length) throw new Error('no paper ' + only + ' in papers/papers.json');
  return out;
}

// The tracked files of papers/<id>/, relative to that folder.
function trackedFiles(root, id) {
  const prefix = 'papers/' + id + '/';
  return execFileSync('git', ['-C', root, 'ls-files', '-z', '--', prefix], { encoding: 'utf8' })
    .split('\0').filter(Boolean).map(f => f.slice(prefix.length));
}

function citation(reg, p, year) {
  const a = reg.author, who = ['  - given-names: ' + yaml(a['given-names']), '    family-names: ' + yaml(a['family-names']), '    affiliation: ' + yaml(a.affiliation)];
  if (a.orcid) who.push('    orcid: ' + yaml('https://orcid.org/' + a.orcid));
  const ids = [];
  if (p.arxiv && p.arxiv.id) ids.push('    - type: doi', '      value: ' + yaml('10.48550/arXiv.' + p.arxiv.id.replace(/v\d+$/, '')));
  if (p.journal && p.journal.doi) ids.push('    - type: doi', '      value: ' + yaml(p.journal.doi));
  return ['cff-version: 1.2.0', 'message: "If you use these programs or data, please cite the paper."',
    'title: ' + yaml(p.title), 'type: software', 'authors:', ...who,
    'license: Apache-2.0', 'repository-code: ' + yaml('https://github.com/' + p.companion),
    ...(p.codeDoi ? ['doi: ' + yaml(p.codeDoi)] : []),
    'preferred-citation:', '  type: article', '  title: ' + yaml(p.title), '  authors:', ...who.map(l => '  ' + l), '  year: ' + year,
    ...(p.arxiv && p.arxiv.id ? ['  url: ' + yaml('https://arxiv.org/abs/' + p.arxiv.id), '  identifiers:', ...ids.map(l => '  ' + l)] : []),
    ''].join('\n');
}

// Plain text for the TeX in an abstract: the macros the papers use, square roots, scripts. Anything else is
// left as it is and reported, so a description never reaches Zenodo with raw TeX in it.
const TEX_TEXT = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', varepsilon: 'ε', epsilon: 'ε', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  pi: 'π', rho: 'ρ', sigma: 'σ', theta: 'θ', omega: 'ω', Gamma: 'Γ', Omega: 'Ω', infty: '∞', ge: '≥', le: '≤', ne: '≠', to: '→',
  ldots: '…', cdots: '⋯', cdot: '·', pm: '±', times: '×', approx: '≈' };
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
function texText(s) {
  let t = s.replace(/\s+/g, ' ').trim();
  t = t.replace(/\\([A-Za-z]+)(?![A-Za-z])/g, (m, name) => (Object.prototype.hasOwnProperty.call(TEX_TEXT, name) ? TEX_TEXT[name] : m));
  t = t.replace(/\\sqrt\{([^{}]*)\}/g, (m, x) => (/^[0-9A-Za-zα-ωΓΩ]{1,3}$/.test(x.trim()) ? '√' + x.trim() : '√(' + x.trim() + ')'));
  t = t.replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_$1').replace(/_([0-9])/g, (m, d) => SUBSCRIPT_DIGITS[+d]);
  return t;
}

// The "## Abstract" section of a README as paragraphs of plain text, and what keeps it from being one.
function abstractOf(readme) {
  const lines = readme.split('\n'), at = lines.findIndex(l => /^## Abstract\b/.test(l));
  if (at < 0) return { paragraphs: [], problems: ['README.md: no "## Abstract" section, which the Zenodo description is made from'] };
  const body = [];
  for (const l of lines.slice(at + 1)) { if (/^## /.test(l)) break; body.push(l); }
  const paragraphs = body.join('\n').split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .map(x => x.replace(/\$([^$]+)\$/g, (m, tex) => texText(tex)));
  const left = paragraphs.join(' ').match(/\\[A-Za-z]+|\$|\\./g);
  const problems = !paragraphs.length ? ['README.md: the "## Abstract" section is empty']
    : left ? ['README.md: the abstract keeps TeX that has no plain-text form for the Zenodo description: ' + [...new Set(left)].join(' ')] : [];
  return { paragraphs, problems };
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const html = s => s.replace(/[&<>]/g, c => HTML_ESCAPES[c]);

function zenodo(reg, p, paragraphs) {
  const related = [];
  if (p.arxiv && p.arxiv.id) related.push({ identifier: 'arXiv:' + p.arxiv.id.replace(/v\d+$/, ''), relation: 'isSupplementTo', scheme: 'arxiv', resource_type: 'publication-preprint' });
  if (p.journal && p.journal.doi) related.push({ identifier: p.journal.doi, relation: 'isSupplementTo', scheme: 'doi', resource_type: 'publication-article' });
  const creator = { name: reg.author['family-names'] + ', ' + reg.author['given-names'], affiliation: reg.author.affiliation };
  if (reg.author.orcid) creator.orcid = reg.author.orcid;
  const holds = 'This record holds the manuscript, a preprint that has not been peer reviewed, with the programs that check its results and their output. README.md describes each program and how to run it.';
  return JSON.stringify({
    // Each companion release is the paper's preprint on Zenodo (owner's decision, 2026-09-25): the manuscript with
    // the programs that check it, typed Publication / Preprint so indexes list it as the paper.
    title: p.title, upload_type: 'publication', publication_type: 'preprint',
    description: [...(paragraphs || []), holds].map(x => '<p>' + html(x) + '</p>').join(''),
    creators: [creator], license: 'Apache-2.0', ...(related.length ? { related_identifiers: related } : {}),
  }, null, 2) + '\n';
}

function license(root, reg, p, year) {
  const text = TEXT_LICENSES[p.textLicense || 'all-rights-reserved'];
  if (!text) throw new Error('textLicense of ' + p.id + ' must be one of ' + Object.keys(TEXT_LICENSES).join(', '));
  return text(year, reg.author.name) + '\n\nThe programs in code/ and the data in data/ are licensed under the Apache License, Version 2.0, whose text follows.\n\n' +
    fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
}

// Problems that keep a staged companion from going public: links back into this repository, and email
// addresses. The author's own address may appear in the manuscript (paper/) and nowhere else, so the
// README, CITATION.cff and the programs leave it out (owner's decision, 2026-09-25).
function problems(dir, reg) {
  const out = [], allowed = new Set([String(reg.author.email || '').toLowerCase()]);
  const walk = rel => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const f = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (e.name !== '.git') walk(f); continue; }
      if (BINARY.test(f) || f === 'LICENSE') continue;
      const s = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const [re, what] of INTERNAL) if (re.test(s)) out.push(f + ': ' + what);
      const stray = (s.match(EMAIL) || []).filter(a => !(f.startsWith('paper/') && allowed.has(a.toLowerCase())) && !/@example\.(com|org|net)$/i.test(a));
      if (stray.length) out.push(f + ': email address ' + [...new Set(stray)].join(', '));
    }
  };
  walk('');
  return out;
}

function stage(root, id, dir, opts = {}) {
  const reg = opts.registry || registry(root), p = reg.papers.find(q => q.id === id);
  if (!p || !p.companion) throw new Error('paper ' + id + ' has no companion repository in papers/papers.json');
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) throw new Error(dir + ' is not empty');
  const year = opts.year || new Date().getUTCFullYear();
  for (const f of (opts.files || trackedFiles(root, id)).filter(f => !PRIVATE_DIRS.some(d => f.startsWith(d)))) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, 'papers', id, f), path.join(dir, f));
  }
  if (!fs.existsSync(path.join(dir, 'README.md'))) throw new Error('papers/' + id + '/README.md is missing');
  fs.writeFileSync(path.join(dir, 'LICENSE'), license(root, reg, p, year));
  fs.writeFileSync(path.join(dir, 'CITATION.cff'), citation(reg, p, year));
  const abs = abstractOf(fs.readFileSync(path.join(dir, 'README.md'), 'utf8'));
  fs.writeFileSync(path.join(dir, '.zenodo.json'), zenodo(reg, p, abs.paragraphs));
  return [...abs.problems, ...problems(dir, reg)];
}

function check(root, id, opts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-companion-'));
  try { return stage(root, id, path.join(dir, 'c'), opts); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function selfTest() {
  let checks = 0, failures = 0;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-sync-'));
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };
  const reg = () => ({ author: { name: 'A B', 'given-names': 'A', 'family-names': 'B', affiliation: 'Independent Researcher', email: 'ab@real-domain.org' },
    papers: [{ id: 't', title: 'T', status: 'ready', companion: 'o/t', arxiv: { id: null } }, { id: 'u', title: 'U', status: 'draft', companion: 'o/u' }, { id: 'v', title: 'V', status: 'published' }] });
  const files = ['README.md', 'paper/t.tex', 'code/run.py', 'notes/n.md', 'submission/letter.md'];
  const ABSTRACT = '# T\n\n## Abstract\n\nWe prove $P > \\sqrt{3}/2$ for\n$0 < \\mu \\le 1$ and $|\\omega_0| t_c \\to \\sqrt{3 + \\alpha}$.\n\nA second paragraph.\n\n## Files\n\n';
  const base = () => {
    fs.rmSync(tmp, { recursive: true, force: true });
    w('LICENSE', 'Apache License\n');
    w('papers/t/README.md', ABSTRACT + '[PDF](paper/t.pdf)\n'); w('papers/t/paper/t.tex', '\\author{A B \\texttt{ab@real-domain.org}}\n');
    w('papers/t/code/run.py', 'print(1)\n'); w('papers/t/notes/n.md', 'see ../../research/x and me@real-domain.org\n'); w('papers/t/submission/letter.md', 'private\n');
  };
  const expect = (want, what, mutate) => {
    base(); const r = reg(); if (mutate) mutate(r);
    let got;
    try { got = check(tmp, 't', { registry: r, files, year: 2026 }); } catch (e) { got = [e.message]; }
    const ok = want ? got.length === 0 : got.length > 0;
    checks++; if (!ok) { failures++; console.log('FAIL ' + what + (got.length ? ': ' + got.join('; ') : ': no problem found')); }
  };
  try {
    expect(true, 'a clean paper stages, with its private notes and letters left out');
    base();
    const out = path.join(tmp, 'out');
    stage(tmp, 't', out, { registry: reg(), files, year: 2026 });
    const staged = fs.readdirSync(out).sort().join(' ');
    checks++; if (staged !== '.zenodo.json CITATION.cff LICENSE README.md code paper') { failures++; console.log('FAIL staged ' + staged); }
    const cff = fs.readFileSync(path.join(out, 'CITATION.cff'), 'utf8'), lic = fs.readFileSync(path.join(out, 'LICENSE'), 'utf8');
    checks++; if (!/family-names: "B"/.test(cff) || !/repository-code: "https:\/\/github.com\/o\/t"/.test(cff)) { failures++; console.log('FAIL CITATION.cff:\n' + cff); }
    checks++; if (!/^The manuscript in paper\/.*All rights reserved\./.test(lic) || !/Apache License/.test(lic)) { failures++; console.log('FAIL LICENSE:\n' + lic); }
    const zen = JSON.parse(fs.readFileSync(path.join(out, '.zenodo.json'), 'utf8')), desc = zen.description;
    checks++; if (zen.upload_type !== 'publication' || zen.publication_type !== 'preprint') { failures++; console.log('FAIL .zenodo.json type: ' + zen.upload_type + ' / ' + zen.publication_type); }
    checks++; if (desc !== '<p>We prove P &gt; √3/2 for 0 &lt; μ ≤ 1 and |ω₀| t_c → √(3 + α).</p><p>A second paragraph.</p><p>This record holds the manuscript, a preprint that has not been peer reviewed, with the programs that check its results and their output. README.md describes each program and how to run it.</p>') { failures++; console.log('FAIL .zenodo.json description: ' + desc); }
    expect(false, 'a GENChase link in the paper', () => w('papers/t/paper/t.tex', 'Code: https://github.com/ChaseHendrick/GENChase\n'));
    expect(false, 'a GENChase link under the old account name', () => w('papers/t/paper/t.tex', 'Code: https://github.com/SharpMeow/GENChase\n'));
    expect(false, 'a research/ path in the code', () => w('papers/t/code/run.py', "open('research/generalizations/x.json')\n"));
    expect(false, 'a papers/ path in the README', () => w('papers/t/README.md', 'Run python3 papers/t/code/run.py\n'));
    expect(false, 'a link out of the folder', () => w('papers/t/README.md', '[status](../papers.json)\n'));
    expect(false, 'another email address', () => w('papers/t/README.md', 'Write to someone@real-domain.org\n'));
    expect(false, 'the author address outside the manuscript', () => w('papers/t/README.md', 'ab@real-domain.org\n'));
    expect(true, 'the author address in the manuscript and an example.com placeholder', () => { w('papers/t/paper/t.tex', 'ab@real-domain.org\n'); w('papers/t/README.md', ABSTRACT + 'you@example.com\n'); });
    expect(false, 'a README without an abstract', () => w('papers/t/README.md', '# T\n\nIntro.\n'));
    expect(false, 'an abstract with TeX that has no plain-text form', () => w('papers/t/README.md', '# T\n\n## Abstract\n\nThe bound is $\\mathcal{O}(1)$.\n'));
    expect(false, 'an unknown text license', r => { r.papers[0].textLicense = 'MIT'; });
    const listed = ready(reg()).map(p => p.id).join(' ');
    checks++; if (listed !== 't') { failures++; console.log('FAIL --list gave "' + listed + '", not "t"'); }
    checks++; try { ready(reg(), 'u'); failures++; console.log('FAIL a draft was listed'); } catch (_) { /* refused, as it should be */ }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  console.log((failures ? 'PAPER SYNC SELF-TEST FAILED: ' + failures + ' of ' : 'Paper sync self-test OK: ') + checks + ' cases, including the planted mistakes');
  return failures;
}

function main() {
  const argv = process.argv.slice(2), root = path.resolve(__dirname, '..');
  const at = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  try {
    if (argv.includes('--self-test')) process.exit(selfTest() ? 1 : 0);
    if (argv.includes('--list')) { for (const p of ready(registry(root), at('--paper'))) console.log(p.id + ' ' + p.companion); return; }
    if (argv.includes('--stage')) {
      const id = at('--stage'), dir = argv[argv.indexOf('--stage') + 2];
      if (!id || !dir) throw new Error('usage: --stage <id> <dir>');
      const bad = stage(root, id, path.resolve(dir));
      if (bad.length) { bad.forEach(m => console.error('  ' + m)); throw new Error(id + ' cannot go public until these are fixed'); }
      console.log('Staged ' + id + ' in ' + dir); return;
    }
    if (argv.includes('--companion')) {
      const p = registry(root).papers.find(q => q.id === at('--companion'));
      if (!p || !p.companion || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(p.companion)) throw new Error('no companion repository for ' + at('--companion') + ' in papers/papers.json');
      console.log(p.companion); return;
    }
    if (argv.includes('--check')) {
      const bad = check(root, at('--check'));
      bad.forEach(m => console.log('  ' + m));
      console.log(bad.length ? at('--check') + ': ' + bad.length + ' problem(s) before it can go public' : at('--check') + ': ready to publish as its own repository');
      process.exit(bad.length ? 1 : 0);
    }
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 16).map(s => s.replace(/^\/\/ ?/, '')).join('\n'));
  } catch (e) { console.error('paper-sync: ' + e.message); process.exit(2); }
}

if (require.main === module) main();
module.exports = { stage, check, problems, ready };
