// node tools/index.js
// Regenerates TECHNIQUES.md and techniques.json from studio.html itself.
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

(async () => {
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'studio.html');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.goto('file://' + studio, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.Studio && window.Studio.modules, null, { timeout: 30000 });

  const mods = await p.evaluate(() => {
    const out = [];
    for (const id of Object.keys(window.Studio.modules)) {
      const m = window.Studio.modules[id];
      out.push({
        id,
        name: m.name || id,
        subtitle: m.subtitle || '',
        equation: m.equation || '',
        credit: m.credit || '',
        blurb: m.blurb || '',
        order: typeof m.order === 'number' ? m.order : 999,
        seed: (m.defaults && m.defaults.seed) || '',
        presets: Object.keys(m.presets || {}),
        vectors: false,
      });
    }
    return out;
  });
  await b.close();

  mods.sort((a, b2) => (a.order - b2.order) || a.name.localeCompare(b2.name));

  // exportSVG is defined on the instance, not on the registration, so read it off the source text
  const src = fs.readFileSync(studio, 'utf8');
  const regs = [...src.matchAll(/Studio\.register\(\{\s*\n?\s*id:\s*'([^']+)'/g)];
  const spans = regs.map((m, i) => ({ id: m[1], body: src.slice(m.index, i + 1 < regs.length ? regs[i + 1].index : src.length) }));
  for (const m of mods) {
    const sp = spans.find(x => x.id === m.id);
    m.vectors = !!(sp && /exportSVG\s*\(/.test(sp.body));
  }

  fs.writeFileSync(path.resolve(__dirname, '..', 'techniques.json'), JSON.stringify({
    project: 'GENChase',
    repository: 'https://github.com/SharpMeow/GENChase',
    file: 'studio.html',
    count: mods.length,
    hashFormat: '#<id>/<seed>  or  #<id>/<seed>/<base64url of a JSON diff from defaults>',
    techniques: mods,
  }, null, 2) + '\n');

  const esc = t => String(t).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();
  let md = `# Techniques

${mods.length} pattern-forming systems, one file. Generated from \`studio.html\` by \`node tools/index.js\`; do not edit by hand.

Open \`studio.html\` and append the hash to reconstruct a plate exactly. \`#snowflake/gravner-2008\` is a complete recipe: the technique, and the seed that every random draw in it comes from. The longer form, \`#<id>/<seed>/<base64url JSON>\`, carries any settings that differ from the defaults. A hash written as \`#id\` with no seed means that tab ships no fixed default seed and the studio will roll one for you.

The same data in machine-readable form is [\`techniques.json\`](techniques.json).

| Technique | Hash | Rule | Vectors |
|---|---|---|---|
`;
  for (const m of mods) {
    // A few tabs ship no fixed seed, so the studio rolls one on load. Writing `#id/` for those would be
    // a recipe that reprints nothing; `#id` is the honest form and says the seed is yours to choose.
    const hash = m.seed ? '#' + m.id + '/' + m.seed : '#' + m.id;
    md += `| **${esc(m.name)}**<br><sub>${esc(m.subtitle)}</sub> | \`${hash}\` | ${esc(m.equation)} | ${m.vectors ? 'SVG' : 'raster'} |\n`;
  }
  md += `
## Credits

None of the science is original to this project. Each technique names the people whose work it implements.

`;
  for (const m of mods) md += `**${esc(m.name)}** — ${esc(m.credit)}\n\n`;
  fs.writeFileSync(path.resolve(__dirname, '..', 'TECHNIQUES.md'), md);
  console.log('wrote TECHNIQUES.md and techniques.json:', mods.length, 'techniques');
})();
