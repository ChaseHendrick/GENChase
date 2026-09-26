'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
// Prior-article snippets are source material, never instructions or a priority verdict.
function restrained(text) {
  return String(text).replace(/new law|first discovery|never been theorized|novel\s*["']?\s*:\s*true/gi, '[unsupported priority wording omitted]');
}
function literature(root, n) {
  // The ledger must be opened first. Never silently ignore its access limitations.
  const ledger = fs.readFileSync(path.join(root, 'RESEARCH.md'), 'utf8');
  const sources = [{ file: 'RESEARCH.md', text: ledger }], skipped = [];
  const add = relative => {
    const absolute = path.join(root, relative), st = fs.lstatSync(absolute);
    if (st.isSymbolicLink()) { skipped.push(relative + ': symbolic link'); return; }
    if (st.isDirectory()) {
      if (relative === 'identities/candidates') return; // A candidate cannot cite itself as a prior article.
      for (const name of fs.readdirSync(absolute).sort()) add(relative + '/' + name);
    } else if (/\.(md|txt|bib|typ)$/i.test(relative)) sources.push({ file: relative, text: fs.readFileSync(absolute, 'utf8') });
    else skipped.push(relative + ': binary or unsupported format');
  };
  for (const name of ['IDENTITIES.md', 'TECHNIQUES.md', 'identities']) {
    if (fs.existsSync(path.join(root, name))) add(name); else skipped.push(name + ': missing');
  }
  // Include available in-repo paper text, if contributors have supplied it.
  for (const name of ['papers', 'references']) if (fs.existsSync(path.join(root, name))) add(name);
  const terms = ['polygon', 'two-ring', 'koiller', 'collapse', 'spin-time'];
  const matches = sources.flatMap(s => s.text.split('\n').flatMap((line, i) => {
    const lower = line.toLowerCase(), score = terms.filter(t => lower.includes(t)).length;
    return score >= 2 ? [{ file: s.file, line: i + 1, excerpt: restrained(line).slice(0, 500), score }] : [];
  })).sort((a, b) => b.score - a.score).slice(0, 20);
  const known = sources.some(s => s.file === 'identities/polygon-collapse.md' && /K_n/.test(s.text));
  return { classification: known ? 'matches known source' : skipped.length ? 'search incomplete' : 'not found in sources checked',
    priority: 'unconfirmed', method: 'Local text matching and identification of the existing polygon-family derivation. Not semantic proof of equivalence or an exhaustive literature search.',
    sources: sources.map(s => ({ file: s.file, sha256: crypto.createHash('sha256').update(s.text).digest('hex') })), matches, skipped,
    limitation: 'Only available repository text was read. External citations and binary papers were not opened. Mathematical priority remains unconfirmed.',
    queries: ['"self-similar collapse" "two regular polygons" "angular velocity"',
      'Koiller 1985 two rings point vortices collapse spin time minimum',
      '"' + n + '-gon" vortex collapse sharp bound rotation collapse time'] };
}
module.exports = { literature, restrained };
