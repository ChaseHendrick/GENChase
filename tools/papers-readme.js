#!/usr/bin/env node
// The README's paper numbers come from papers/papers.json, never from hand edits.
//
//   node tools/papers-readme.js           rewrite the generated blocks in README.md
//   node tools/papers-readme.js --check   exit 1 if README.md is stale (lint.js runs this check)
//
// tools/index.js runs the writer after it stamps the technique count, so the usual
// "build, index, lint" sequence keeps both current. A paper is listed once its status is
// "ready" or later and it has a companion; its release and DOI are archiveVersion and codeDoi,
// which advance only after the archive is verified (docs/PUBLISHING-PAPERS.md).
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = new Set(['ready', 'on-arxiv', 'submitted', 'accepted', 'published']);
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = n => WORDS[n] || String(n);

function listed(registry) {
  return registry.papers.filter(p => PUBLIC.has(p.status) && p.companion);
}

function entry(p) {
  const url = 'https://github.com/' + p.companion;
  const name = '[' + p.id + '](' + url + ')';
  const archive = p.codeDoi && p.archiveVersion
    ? 'release ' + p.archiveVersion + ', [doi:' + p.codeDoi + '](https://doi.org/' + p.codeDoi + ')'
    : 'first release pending on Zenodo';
  return name + ', ' + (p.summary || p.title) + ' (' + archive + ')';
}

function statusBlock(registry) {
  const papers = listed(registry);
  const fields = [];
  for (const p of papers) {
    const f = p.field || 'Other';
    let g = fields.find(x => x.name === f);
    if (!g) fields.push(g = { name: f, papers: [] });
    g.papers.push(p);
  }
  const lines = [
    '> **Current research status: ' + word(papers.length) + ' preprints.** None is peer reviewed, so none is confirmed. ' +
      'Releases are archived on Zenodo with their programs and data; the release and DOI given are the current verified archive.',
    '>',
  ];
  for (const g of fields) {
    lines.push('> - **' + g.name + ' (' + g.papers.length + '):** ' + g.papers.map(entry).join('; ') + '.');
  }
  return lines.join('\n');
}

const BLOCKS = {
  status: { begin: '<!-- papers:status -->', end: '<!-- /papers:status -->', render: r => '\n' + statusBlock(r) + '\n> ' },
  count: { begin: '<!-- papers:count -->', end: '<!-- /papers:count -->', render: r => word(listed(r).length) },
};

function stamp(text, registry) {
  for (const [key, b] of Object.entries(BLOCKS)) {
    const i = text.indexOf(b.begin), j = text.indexOf(b.end);
    if (i < 0 || j < i) throw new Error('README.md is missing the generated block ' + key + ' (' + b.begin + ' ... ' + b.end + ')');
    text = text.slice(0, i + b.begin.length) + b.render(registry) + text.slice(j);
  }
  return text;
}

function load() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'papers', 'papers.json'), 'utf8'));
}

// Returns a problem string, or null when README.md matches papers.json.
function check(readme, registry = load()) {
  try {
    return stamp(readme, registry) === readme ? null
      : 'README.md: the generated paper status is stale; run node tools/index.js (or node tools/papers-readme.js)';
  } catch (e) {
    return e.message;
  }
}

function write(root = ROOT) {
  const file = path.join(root, 'README.md');
  const before = fs.readFileSync(file, 'utf8');
  const after = stamp(before, load());
  if (after !== before) fs.writeFileSync(file, after);
  return after !== before;
}

module.exports = { stamp, check, write, statusBlock, listed };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    const problem = check(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8'));
    if (problem) { console.error(problem); process.exit(1); }
    console.log('README.md paper status is current');
  } else {
    console.log(write() ? 'rewrote the paper status in README.md' : 'README.md paper status already current');
  }
}
