// Actual hash and Settings JSON imports, followed by NPZ export for both new models.
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright'), { glArgs } = require('./lib/gl-args');
const root = path.resolve(__dirname, '..');
const fixtures = {
  hopfield: [
    { name: 'fractional', input: { side: 8.5, count: 1.5, sweeps: 2.5 }, expected: { side: 9, count: 2, sweeps: 3 } },
    { name: 'malformed', input: { side: 'bad', count: {}, sweeps: 'Infinity' }, expected: { side: 16, count: 4, sweeps: 12 } },
    { name: 'bounds', input: { side: 1000, count: -10, sweeps: -10 }, expected: { side: 24, count: 1, sweeps: 0 } },
    { name: 'integer', input: { side: 9, count: '3', sweeps: 4 }, expected: { side: 9, count: 3, sweeps: 4 } }
  ],
  'flow-matching': [
    { name: 'fractional', input: { modes: 3.5, count: 100.5, steps: 32.5 }, expected: { modes: 4, count: 101, steps: 33 } },
    { name: 'malformed', input: { modes: 'bad', count: {}, steps: 'Infinity' }, expected: { modes: 5, count: 600, steps: 128 } },
    { name: 'bounds', input: { modes: 1000, count: -10, steps: -10 }, expected: { modes: 12, count: 100, steps: 32 } },
    { name: 'integer', input: { modes: 3, count: '101', steps: 33 }, expected: { modes: 3, count: 101, steps: 33 } }
  ]
};
(async () => {
  const browser = await chromium.launch({ args: glArgs() }), rows = [], errors = [];
  const version = browser.version();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } }); page.on('pageerror', e => errors.push(e.message));
    for (const [id, cases] of Object.entries(fixtures)) for (const fixture of cases) {
      const seed = 'recipe-regression/' + fixture.name;
      let prior = null;
      for (const route of ['hash', 'settings']) {
        if (route === 'hash') {
          const body = Buffer.from(JSON.stringify(fixture.input)).toString('base64url');
          await page.goto('file://' + path.join(root, 'dist/studio.html') + '#' + id + '/' + encodeURIComponent(seed) + '/' + body);
          await page.waitForFunction(id => window.Studio?.getRecipe()?.id === id, id);
        } else {
          await page.evaluate(() => document.querySelector('#btn-settings').click());
          await page.fill('#settings-text', JSON.stringify({ id, seed, ...fixture.input }));
          await page.click('#settings-apply');
          assert.equal(await page.locator('#settings-err').isVisible(), false);
        }
        const row = await page.evaluate(async ({ id, route, name }) => {
          const F = GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData()).arrayBuffer()));
          const meta = JSON.parse(new TextDecoder().decode(zip['meta.json']));
          if (meta.error || !meta.stateExported) throw Error(meta.error || 'State not exported');
          const arrays = {};
          for (const [file, bytes] of Object.entries(zip)) if (file.endsWith('.npy')) {
            const a = F.readNpy(bytes);
            arrays[file] = { shape: a.shape, length: a.data.length, finite: a.data.every(Number.isFinite), digest: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('') };
          }
          return { id, route, name, actual: { ...Studio.modules[id].defaults, ...Studio.getRecipe() }, arrays, sourceSha256: meta.provenance.technique.sourceSha256 };
        }, { id, route, name: fixture.name });
        for (const [key, expected] of Object.entries(fixture.expected)) assert.equal(row.actual[key], expected, id + '/' + fixture.name + '/' + key);
        for (const a of Object.values(row.arrays)) { assert.ok(a.finite); assert.ok(a.shape.every(Number.isInteger)); assert.equal(a.shape.reduce((a, b) => a * b, 1), a.length); }
        if (id === 'hopfield') assert.deepEqual(row.arrays['memories.npy'].shape, [row.actual.count, row.actual.side, row.actual.side]);
        else assert.deepEqual(row.arrays['trajectories.npy'].shape, [row.actual.count, row.actual.steps + 1, 2]);
        if (prior) assert.deepEqual(row.arrays, prior.arrays, 'Hash and Settings JSON must compute identical data');
        prior = row; rows.push(row);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  const result = { passed: true, command: 'node tools/model-recipe-check.js --write', scope: 'Recipe parsing and NPZ shape regression, not scientific validation.', environment: { browser: version, node: process.version }, harnessSha256: sha('tools/model-recipe-check.js'), sourceHashes: Object.fromEntries(Object.keys(fixtures).map(id => [id, sha('src/modules/' + id + '.js')])), rows };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/model-recipe-check.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('PASS hash and Settings JSON imports, finite NPZ dimensions and identical replay:', rows.length, 'cases');
})().catch(e => { console.error(e); process.exitCode = 1; });
