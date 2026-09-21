// node tools/index.js
// Regenerates TECHNIQUES.md, techniques.json and llms.txt from studio.html itself.
//
// The index is generated rather than written by hand for the same reason the technique count is linted:
// a hand-kept list of sixty entries is a list that is wrong within a month, and a wrong index is worse
// than none, because it sends a reader to a tab that is not there. This boots the studio in a headless
// browser and reads the registry the shell already exposes as Studio.modules, so the index cannot
// disagree with the file it describes.
//
// It exists because the recipe is the product. Every row carries the URL hash that reconstructs that
// plate exactly, which is the thing a reader, or a program reading on someone's behalf, actually needs.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const count = require('./count.js');

(async () => {
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto('file://' + studio, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.Studio && window.Studio.modules, null, { timeout: 30000 });

  const mods = await p.evaluate(() => {
    const out = [];
    const fam = window.Studio.familiarity || {};
    for (const id of Object.keys(window.Studio.modules)) {
      const m = window.Studio.modules[id];
      const d = m.defaults || {};
      out.push({
        id,
        name: m.name || id,
        tab: m.tab || '',
        subtitle: m.subtitle || '',
        equation: m.equation || '',
        credit: m.credit || '',
        blurb: m.blurb || '',
        order: typeof m.order === 'number' ? m.order : 999,
        seed: (d && d.seed) || '',
        presets: Object.keys(m.presets || {}),
        vectors: false,
        familiarity: m.familiarity || fam[id] || '',
        liveCapable: Object.prototype.hasOwnProperty.call(d, 'running'),
        runningDefault: !!d.running,
        headline: m.headline || '',
      });
    }
    return out;
  });
  await b.close();

  mods.sort((a, b2) => (a.order - b2.order) || a.name.localeCompare(b2.name));

  const src = fs.readFileSync(studio, 'utf8');
  const regs = [...src.matchAll(/Studio\.register\(\{\s*\n?\s*id:\s*'([^']+)'/g)];
  const spans = regs.map((m, i) => ({ id: m[1], body: src.slice(m.index, i + 1 < regs.length ? regs[i + 1].index : src.length) }));
  const aliasBlock = /const ALIAS = \{([^}]*)\}/.exec(src);
  const aliases = {};
  if (aliasBlock) {
    for (const m of aliasBlock[1].matchAll(/['"]?([A-Za-z0-9_-]+)['"]?\s*:\s*'([^']+)'/g)) aliases[m[1]] = m[2];
  }
  for (const m of mods) {
    const sp = spans.find(x => x.id === m.id);
    m.vectors = !!(sp && /exportSVG\s*\(/.test(sp.body));
    m.hash = m.seed ? '#' + m.id + '/' + m.seed : '#' + m.id;
    m.aliases = Object.keys(aliases).filter(k => aliases[k] === m.id);
  }

  const missingFam = mods.filter(m => !m.familiarity);
  if (missingFam.length) {
    console.error('no familiarity bucket for: ' + missingFam.map(m => m.id).join(', '));
    process.exit(1);
  }

  const FAM_NOTE = 'Nobody measured this. It is one person\'s estimate of how often you have seen the picture somewhere else, made in 2026. It is the only ordering in this studio that is not computed from the file.';

  fs.writeFileSync(path.join(root, 'techniques.json'), JSON.stringify({
    project: 'GENChase',
    repository: 'https://github.com/SharpMeow/GENChase',
    file: 'studio.html',
    count: mods.length,
    hashFormat: '#<id>/<seed>  or  #<id>/<seed>/<base64url of a JSON diff from defaults>',
    aliases,
    familiarityBuckets: ['ubiquitous', 'common', 'occasional', 'rare', 'unseen'],
    familiarityNote: FAM_NOTE,
    forAI: {
      read: 'techniques.json',
      skip: 'studio.html',
      contract: 'tools/modules/CONTRACT.md',
      agents: 'AGENTS.md',
      research: 'RESEARCH.md',
      addATab: 'Write tools/modules/<id>.js, then node tools/inject.js, node tools/check.js <id>, node tools/index.js, node tools/lint.js. Do not split studio.html. All noise through U.makeRng(seed). Credit the paper. Do not put a name on work that already exists. A result derived here, uniqueness-checked, with a plate whose check can miss, belongs in IDENTITIES.md. Search the literature for the closed form and the extremum first. Read RESEARCH.md before a prior-art search.',
    },
    techniques: mods,
  }, null, 2) + '\n');

  const esc = t => String(t).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  const famLabel = { ubiquitous: 'Ubiquitous', common: 'Common', occasional: 'Occasional', rare: 'Rare', unseen: 'Almost unseen' };
  let md = `# Techniques

${mods.length} pattern-forming systems, one file. Generated from \`studio.html\` by \`node tools/index.js\`; do not edit by hand.

Open \`studio.html\` and append the hash to reconstruct a plate exactly. \`#snowflake/gravner-2008\` is a complete recipe: the technique, and the seed that every random draw in it comes from. The longer form, \`#<id>/<seed>/<base64url JSON>\`, carries any settings that differ from the defaults. A hash written as \`#id\` with no seed means that tab ships no fixed default seed and the studio will roll one for you.

The same data in machine-readable form is [\`techniques.json\`](techniques.json). A short file for language models is [\`llms.txt\`](llms.txt).

**Seen elsewhere** is a curator's call, not a measurement. ${FAM_NOTE} It is never the default sort.

| Technique | Hash | Rule | Vectors | Live | Seen elsewhere |
|---|---|---|---|---|---|
`;
  for (const m of mods) {
    const hash = m.hash;
    md += `| **${esc(m.name)}**<br><sub>${esc(m.subtitle)}</sub> | \`${hash}\` | ${esc(m.equation)} | ${m.vectors ? 'SVG' : 'raster'} | ${m.liveCapable ? (m.runningDefault ? 'live' : 'can run') : 'still'} | ${famLabel[m.familiarity] || m.familiarity} |\n`;
  }
  md += `
## Credits

Each technique names the people whose work it implements. The vortex-collapse formulas are derived here from classical dynamics. The first specializes Gröbli’s 1877 spiral coefficient; priority of the optimized minima remains unconfirmed. See identities/NOVELTY-AUDIT.md and identities/ORIGINALITY-FOLLOWUP.md. Their plates mark miss if the measured claim is wrong. Miss is a grade on the numbers, not a crash. The statements are in IDENTITIES.md.

`;
  for (const m of mods) md += `**${esc(m.name)}**. ${esc(m.credit)}\n\n`;
  fs.writeFileSync(path.join(root, 'TECHNIQUES.md'), md);

  const llms = `# GENChase

One HTML file of seeded scientific simulations. Each tab reprints from a hash. Generated images belong to the human. The source is PolyForm Small Business 1.0.0.

## Do not

- Parse or scrape studio.html. It is 2.6 MB of implementation.
- Invent a bundler, a framework tree, or a second architecture.
- Do not put a name on a published equation. Credit the paper. A result derived here, uniqueness-checked, with a plate whose check can miss, belongs in IDENTITIES.md. Search the literature for the closed form and the extremum first. Do not relicense as MIT.
- Treat "familiarity" / "seen elsewhere" as a measurement. It is a curator's call from 2026, five named buckets, never a number, never the default sort.

## Read instead

- techniques.json — every tab: id, name, subtitle, equation, credit, blurb, hash, presets, vectors, liveCapable, runningDefault, familiarity, aliases.
- TECHNIQUES.md — the same catalog as a table.
- AGENTS.md — product rules.
- tools/modules/CONTRACT.md — how to add a tab.
- README.md — what is new, and what is not.
- IDENTITIES.md — derived formulas and bounds, with classical sources and originality limits. Use descriptive titles and credit the original mathematics.
- identities/ORIGINALITY-FOLLOWUP.md — the first formula’s equivalence to Gröbli (1877); minimum priority remains unconfirmed.
- identities/NOVELTY-AUDIT.md — evidence and limits for all five candidates.
- RESEARCH.md — what was searched, what was not. Read before a prior-art search. Do not re-run a search marked skip.

## Recipe hash

\`#<id>/<seed>\` or \`#<id>/<seed>/<base64url JSON diff from defaults>\`.

Copy link (L) transfers the seed and every slider that is not at the factory default. Print size, ppi, colophon, panel side and witness quiet stay on the viewer's machine.

Aliases: ${Object.keys(aliases).map(k => '#' + k + ' → ' + aliases[k]).join(', ') || '(none)'}.

## Adding a tab

Write tools/modules/<id>.js (first lines as CONTRACT.md requires). Inject, check, export, then the maintainer inlines into studio.html. Then:

    node tools/index.js
    node tools/lint.js
    node tools/check.js <id> 12000

All randomness through U.makeRng(seed). Math.random in a sim is a bug. Discrete marks export as SVG; accumulated density does not.

## Counts

${mods.length} techniques in this build. README, CITATION.cff, RESEARCH.md, DESIGN-PLAN.md, the studio head, and .github/description.txt are stamped by this command. Do not hand-edit the number.
`;
  fs.writeFileSync(path.join(root, 'llms.txt'), llms);
  const stamped = count.stampRepo(fs, path, root, mods.length, mods);
  console.log('wrote TECHNIQUES.md, techniques.json, llms.txt, and stamped', stamped.n, 'into the prose');
})();
