// node tools/index.js
// Generate the catalog from actual maintained registrations, without dependencies.
const path = require('node:path'), fs = require('node:fs');
const count = require('./count.js');

(() => {
  const root = path.resolve(__dirname, '..');
  const { techniques: mods, aliases } = require('./build.js').verify();
  for (const m of mods) {
    m.hash = m.seed ? '#' + m.id + '/' + m.seed : '#' + m.id;
    m.aliases = Object.keys(aliases).filter(k => aliases[k] === m.id);
  }

  const missingFam = mods.filter(m => !m.familiarity);
  if (missingFam.length) {
    console.error('no familiarity bucket for: ' + missingFam.map(m => m.id).join(', '));
    process.exit(1);
  }

  const FAM_NOTE = 'Nobody measured this. It is one person\'s estimate of how often you have seen the picture somewhere else, made in 2026. It is the only ordering in this studio that is not computed from maintained registrations.';

  fs.writeFileSync(path.join(root, 'techniques.json'), JSON.stringify({
    project: 'GENChase',
    repository: 'https://github.com/ChaseHendrick/GENChase',
    file: 'index.html',
    portableFile: 'dist/studio.html',
    count: mods.length,
    hashFormat: '#<id>/<seed>  or  #<id>/<seed>/<base64url of a JSON diff from defaults>',
    aliases,
    familiarityBuckets: ['ubiquitous', 'common', 'occasional', 'rare', 'unseen'],
    familiarityNote: FAM_NOTE,
    forAI: {
      read: 'techniques.json',
      skip: 'dist/studio.html',
      contract: 'tools/modules/CONTRACT.md',
      agents: 'AGENTS.md',
      research: 'RESEARCH.md',
      addATab: 'Write src/modules/<id>.js, add its template include, then node tools/build.js, node tools/check.js <id>, node tools/index.js, node tools/lint.js and node tools/science.js. All noise through U.makeRng(seed). Credit the paper. Do not put a name on work that already exists. A result derived here, uniqueness-checked, with a plate whose check can miss, belongs in IDENTITIES.md. Search the literature for the closed form and the extremum first. Read RESEARCH.md before a prior-article search.',
    },
    techniques: mods,
  }, null, 2) + '\n');

  const esc = t => String(t).replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  const famLabel = { ubiquitous: 'Ubiquitous', common: 'Common', occasional: 'Occasional', rare: 'Rare', unseen: 'Almost unseen' };
  let md = `# Techniques

${mods.length} pattern-forming systems in a shared studio. Generated from maintained module registrations by \`node tools/index.js\`; do not edit by hand.

Serve the folder and open \`index.html\`, or open the portable \`dist/studio.html\`, and append the hash to restore its seed and settings. Preserve the studio version, settings and seed for historical reproduction; numerical precision, browser, hardware and output dimensions can affect results. \`#snowflake/gravner-2008\` names the technique and the seed that every random draw in it comes from. The longer form, \`#<id>/<seed>/<base64url JSON>\`, carries any settings that differ from the defaults. A hash written as \`#id\` with no seed means that tab ships no fixed default seed and the studio will roll one for you.

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

Each technique names the people whose work it implements. The vortex-collapse formulas are derived here from classical dynamics. The first specializes Gröbli’s 1877 spiral coefficient and is the ratio of the rates in Kimura (1987), Eq. (4.4); priority of the optimized minima remains unconfirmed. See identities/NOVELTY-AUDIT.md and identities/ORIGINALITY-FOLLOWUP.md. Their plates mark miss if the measured claim is wrong. Miss is a grade on the numbers, not a crash. The statements are in IDENTITIES.md.

`;
  for (const m of mods) md += `**${esc(m.name)}**. ${esc(m.credit)}\n\n`;
  fs.writeFileSync(path.join(root, 'TECHNIQUES.md'), md);

  const llms = `# GENChase

A folder-based studio of seeded scientific simulations. The shared engine loads a technique source when needed. index.html is the default entry point; dist/studio.html is a portable all-inline build. Both are generated from maintained sources in src/. Recipes preserve settings and seed, but historical reproduction also depends on the studio version, precision, browser, hardware and output dimensions. Generated images belong to the human. The source is Apache-2.0.

## Do not

- Parse the generated dist/studio.html to discover metadata; use the catalog. Edit maintained code in src/.
- Invent a bundler, a framework tree, or a second architecture.
- Do not put a name on a published equation. Credit the paper. A result derived here, uniqueness-checked, with a plate whose check can miss, belongs in IDENTITIES.md. Search the literature for the closed form and the extremum first. Preserve license notices.
- Treat "familiarity" / "seen elsewhere" as a measurement. It is a curator's call from 2026, five named buckets, never a number, never the default sort.

## Read instead

- techniques.json: every tab: id, name, subtitle, equation, credit, blurb, hash, presets, vectors, liveCapable, runningDefault, familiarity, aliases.
- TECHNIQUES.md: the same catalog as a table.
- AGENTS.md: product rules.
- tools/modules/CONTRACT.md: how to add a tab.
- README.md: usage, scope and evidence limits.
- BUILDING.md: maintained source and reproducible assembly.
- VALIDATION.md: scientific coverage and outstanding gaps.
- IDENTITIES.md: derived formulas and bounds, with classical sources and originality limits. Use descriptive titles and credit the original mathematics.
- identities/ORIGINALITY-FOLLOWUP.md: the first formula’s equivalence to Gröbli (1877); minimum priority remains unconfirmed.
- identities/NOVELTY-AUDIT.md: evidence and limits for all five candidates.
- RESEARCH.md: what was searched, what was not. Read before a prior-article search. Do not re-run a search marked skip.

## Recipe hash

\`#<id>/<seed>\` or \`#<id>/<seed>/<base64url JSON diff from defaults>\`.

Copy link (L) transfers the seed and every slider that is not at the factory default. Print size, ppi, colophon, panel side and witness quiet stay on the viewer's machine.

Aliases: ${Object.keys(aliases).map(k => '#' + k + ' → ' + aliases[k]).join(', ') || '(none)'}.

## Adding a tab

Write src/modules/<id>.js and add its include to src/studio.html before boot. Build, check, export and record validation evidence. Then:

    node tools/build.js
    node tools/index.js
    node tools/lint.js
    node tools/science.js
    node tools/check.js <id> 12000

All randomness through U.makeRng(seed). Math.random in a sim is a bug. Discrete marks export as SVG; accumulated density does not.

## Counts

${mods.length} techniques in this build. README, CITATION.cff, RESEARCH.md, DESIGN-PLAN.md, the studio head, and .github/description.txt are stamped by this command. Do not hand-edit the number.
`;
  fs.writeFileSync(path.join(root, 'llms.txt'), llms);
  const stamped = count.stampRepo(fs, path, root, mods.length, mods);
  console.log('wrote TECHNIQUES.md, techniques.json, llms.txt, and stamped', stamped.n, 'into the prose');
})();
