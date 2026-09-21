// Shared catalog-count helpers for tools/index.js (writer) and tools/lint.js (cop).
// The number of techniques is whatever studio.html registers. After twelve, the
// docs and the studio write it as digits (13, 117, 118). Spelled catalog counts
// are a bug. index.js rewrites the claims; lint.js fails them.

const SPELLED_ANY = '(?:One hundred (?:eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:-one|-two|-three|-four|-five|-six|-seven|-eight|-nine)?|thirty)|(?:Forty|Fifty|Sixty|Seventy)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)';
const NOUN = '(?:pattern-forming systems|sciences|techniques)';
const SPELLED_NOUN = '(?:pattern-forming systems|sciences|techniques|tabs)';

function spell(n) {
  return String(n);
}

// Claims that count the catalog. Years in a credit line, "63 tabs" inside a survey
// quote, and "116 scientific simulations" inside archived promptPreview blocks are
// not rewritten: those patterns do not match.
function stampText(text, n) {
  const num = String(n);
  text = text.replace(new RegExp('\\b' + SPELLED_ANY + '\\b(?=(?:\\s+\\w+){0,2}\\s+' + SPELLED_NOUN + '\\b)', 'gi'), num);
  text = text.replace(new RegExp('\\b\\d{2,3}\\s+(?=' + NOUN + '\\b)', 'g'), num + ' ');
  text = text.replace(/The studio now has \d+/g, 'The studio now has ' + num);
  text = text.replace(/there are \d+ now/g, 'there are ' + num + ' now');
  text = text.replace(/At \d+ techniques/g, 'At ' + num + ' techniques');
  text = text.replace(/^\d+ techniques\./m, num + ' techniques.');
  text = text.replace(/The live catalog is [^.]+ techniques\./g, 'The live catalog is ' + num + ' techniques.');
  text = text.replace(/The citation is (?:one hundred [a-z-]+|\d+)\./g, 'The citation is ' + num + '.');
  return text;
}

function claimsIn(text) {
  const spelled = [...text.matchAll(new RegExp('\\b(' + SPELLED_ANY + ')\\b(?=(?:\\s+\\w+){0,2}\\s+' + SPELLED_NOUN + '\\b)', 'gi'))].map(x => x[1]);
  const digits = [...text.matchAll(new RegExp('\\b(\\d{2,3})\\s+' + NOUN + '\\b', 'g'))].map(x => +x[1]);
  const nowHas = [...text.matchAll(/The studio now has (\d+)/g)].map(x => +x[1]);
  const thereAre = [...text.matchAll(/there are (\d+) now/g)].map(x => +x[1]);
  const live = [...text.matchAll(/The live catalog is ([^.]+) techniques\./g)].map(x => x[1]);
  return { spelled, digits, nowHas, thereAre, live };
}

function researchIds(text) {
  return [...text.matchAll(/^\| `([^`]+)` \|/gm)].map(m => m[1]);
}

function ensureResearchRows(text, mods) {
  const have = new Set(researchIds(text));
  const missing = mods.filter(m => !have.has(m.id));
  if (!missing.length) return text;
  const marker = '\n## Notes on the rows';
  const at = text.indexOf(marker);
  if (at < 0) throw new Error('RESEARCH.md is missing "## Notes on the rows"; cannot append catalog rows');
  let rows = '';
  for (const m of missing) {
    rows += '| `' + m.id + '` | ' + (m.name || m.id) + ' | ' + (m.familiarity || 'occasional') +
      ' | science only | never searched |\n';
  }
  return text.slice(0, at) + rows + text.slice(at);
}

function stampStudio(src, n) {
  const num = String(n);
  src = stampText(src, n);
  src = src.replace(new RegExp('\\b' + SPELLED_ANY + ' pattern-forming systems', 'gi'), num + ' pattern-forming systems');
  src = src.replace(new RegExp('\\b' + SPELLED_ANY + ' techniques spanning', 'gi'), num + ' techniques spanning');
  src = src.replace(new RegExp('\\b' + SPELLED_ANY + ' unrelated sciences', 'gi'), num + ' unrelated sciences');
  const about = '<p class="colo" id="catalog-count">The live catalog is ' + num +
    ' techniques. The list above is a sample. The rest is in TECHNIQUES.md.</p>';
  if (/id="catalog-count"/.test(src)) {
    src = src.replace(/<p class="colo" id="catalog-count">[\s\S]*?<\/p>/, about);
  } else {
    src = src.replace(
      /(<\/ul>\s*)(\n\s*<h3>How it is built<\/h3>)/,
      '$1\n      ' + about + '$2'
    );
  }
  return src;
}

function stampRepo(fs, path, root, n, mods) {
  const num = String(n);
  const write = (rel, transform) => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) return;
    const before = fs.readFileSync(file, 'utf8');
    const after = transform(before);
    if (after !== before) fs.writeFileSync(file, after);
  };

  write('README.md', t => stampText(t, n));
  write('CITATION.cff', t => stampText(t, n));
  write('CONTRIBUTING.md', t => stampText(t, n));
  write('DESIGN-PLAN.md', t => stampText(t, n));
  write('AGENTS.md', t => stampText(t, n));
  write('studio.html', t => stampStudio(t, n));
  write('RESEARCH.md', t => {
    let next = stampText(t, n);
    next = next.replace(/^Last updated \d{4}-\d{2}-\d{2}\./m,
      'Last updated ' + new Date().toISOString().slice(0, 10) + '.');
    if (mods) next = ensureResearchRows(next, mods);
    return next;
  });

  const desc = num + ' seeded scientific simulations in one HTML file. Explore, derive, and test mathematical formulas against classical sources.\n';
  fs.writeFileSync(path.join(root, '.github', 'description.txt'), desc);

  return { n, spelled: num, low: num };
}

module.exports = {
  spell, stampText, stampStudio, stampRepo, claimsIn, researchIds, ensureResearchRows, SPELLED_ANY, NOUN, SPELLED_NOUN,
};
