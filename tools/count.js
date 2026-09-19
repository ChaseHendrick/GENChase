// Shared catalog-count helpers for tools/index.js (writer) and tools/lint.js (cop).
// The number of techniques is whatever studio.html registers. Prose that claims a
// different number is a bug. index.js rewrites the claims; lint.js fails them.

const WORDS = {
  49: 'Forty-nine', 50: 'Fifty', 51: 'Fifty-one', 52: 'Fifty-two', 53: 'Fifty-three', 54: 'Fifty-four',
  55: 'Fifty-five', 56: 'Fifty-six', 57: 'Fifty-seven', 58: 'Fifty-eight', 59: 'Fifty-nine', 60: 'Sixty',
  61: 'Sixty-one', 62: 'Sixty-two', 63: 'Sixty-three', 64: 'Sixty-four', 65: 'Sixty-five', 66: 'Sixty-six',
  67: 'Sixty-seven', 68: 'Sixty-eight', 69: 'Sixty-nine', 70: 'Seventy',
  108: 'One hundred eight', 109: 'One hundred nine', 110: 'One hundred ten', 111: 'One hundred eleven',
  112: 'One hundred twelve', 113: 'One hundred thirteen', 114: 'One hundred fourteen',
  115: 'One hundred fifteen', 116: 'One hundred sixteen', 117: 'One hundred seventeen',
  118: 'One hundred eighteen', 119: 'One hundred nineteen', 120: 'One hundred twenty',
  121: 'One hundred twenty-one', 122: 'One hundred twenty-two', 123: 'One hundred twenty-three',
  124: 'One hundred twenty-four', 125: 'One hundred twenty-five', 126: 'One hundred twenty-six',
  127: 'One hundred twenty-seven', 128: 'One hundred twenty-eight', 129: 'One hundred twenty-nine',
  130: 'One hundred thirty',
};

const SPELLED_ANY = '(?:One hundred (?:eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:-one|-two|-three|-four|-five|-six|-seven|-eight|-nine)?|thirty)|(?:Forty|Fifty|Sixty|Seventy)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?)';
const NOUN = '(?:pattern-forming systems|sciences|techniques)';
const SPELLED_NOUN = '(?:pattern-forming systems|sciences|techniques|tabs)';

function spell(n) {
  if (!WORDS[n]) throw new Error('tools/count.js has no spelling for ' + n + ' techniques; add it');
  return WORDS[n];
}

function sameCase(sample, spelled) {
  if (sample[0] === sample[0].toLowerCase()) return spelled.toLowerCase();
  return spelled;
}

// Claims that count the catalog. Years in a credit line, "63 tabs" inside a survey
// quote, and "116 scientific simulations" inside archived promptPreview blocks are
// not rewritten: those patterns do not match.
function stampText(text, n) {
  const spelled = spell(n);
  const low = spelled.toLowerCase();
  text = text.replace(new RegExp('\\b(' + SPELLED_ANY + ')\\b(?=(?:\\s+\\w+){0,2}\\s+' + SPELLED_NOUN + '\\b)', 'gi'),
    (m) => sameCase(m, spelled));
  text = text.replace(new RegExp('\\b\\d{2,3}\\s+(?=' + NOUN + '\\b)', 'g'), n + ' ');
  text = text.replace(/The studio now has \d+/g, 'The studio now has ' + n);
  text = text.replace(/there are \d+ now/g, 'there are ' + n + ' now');
  text = text.replace(/At \d+ techniques/g, 'At ' + n + ' techniques');
  text = text.replace(/^\d+ techniques\./m, n + ' techniques.');
  text = text.replace(/The live catalog is [^.]+ techniques\./g, 'The live catalog is ' + low + ' techniques.');
  text = text.replace(/The citation is one hundred [a-z-]+\./g, 'The citation is ' + low + '.');
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
  const spelled = spell(n);
  const low = spelled.toLowerCase();
  src = src.replace(new RegExp('\\b' + SPELLED_ANY + ' pattern-forming systems', 'gi'), spelled + ' pattern-forming systems');
  src = src.replace(new RegExp('\\b' + SPELLED_ANY + ' techniques spanning', 'gi'), spelled + ' techniques spanning');
  const about = '<p class="colo" id="catalog-count">The live catalog is ' + low +
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
  const spelled = spell(n);
  const low = spelled.toLowerCase();
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

  const desc = spelled + ' seeded scientific simulations in one HTML file. Generative art from real physics.\n';
  fs.writeFileSync(path.join(root, '.github', 'description.txt'), desc);

  return { n, spelled, low };
}

module.exports = {
  WORDS, spell, stampText, stampStudio, stampRepo, claimsIn, researchIds, ensureResearchRows, SPELLED_ANY, NOUN, SPELLED_NOUN,
};
