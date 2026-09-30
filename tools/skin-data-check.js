// Native Skin data contract through real hash recipes and the engine NPZ export.
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright'), { glArgs } = require('./lib/gl-args');
const root = path.resolve(__dirname, '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function validate(array, meta, uniform = false) {
  assert.deepEqual(array.shape, [meta.modes, meta.sites]);
  assert.equal(array.data.length, meta.modes * meta.sites);
  assert.ok(array.data.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
  let skin = 0, ipr = 0, error = 0;
  for (let row = 0; row < meta.modes; row++) {
    let sum = 0;
    for (let site = 0; site < meta.sites; site++) {
      const x = array.data[row * meta.sites + site]; sum += x; ipr += x * x;
      if (site >= meta.skinStartSite) skin += x;
      error = Math.max(error, Math.abs(x - 1 / meta.sites));
    }
    assert.ok(Math.abs(sum - 1) < 2e-6, 'row normalization');
  }
  assert.ok(Math.abs(skin / meta.modes - meta.skinWeight) < 1e-8, 'skin weight');
  assert.ok(Math.abs(ipr / meta.modes - meta.meanIPR) < 1e-8, 'mean IPR');
  if (uniform) {
    assert.equal(meta.solver, 'right'); assert.equal(meta.boundary, 'periodic');
    assert.equal(meta.disorder, 0); assert.notEqual(meta.g, 0); assert.equal(meta.rowMode, 'modes');
    assert.ok(meta.modes <= meta.sites); assert.ok(error < 1e-6, 'independent uniform 1/N reference');
    assert.ok(Math.abs(meta.skinWeight - (meta.sites - meta.skinStartSite) / meta.sites) < 1e-6);
  }
  return { maxUniformError: error, rows: meta.modes, sites: meta.sites };
}
const fixtures = [
  { name: 'clean-open', payload: { grid: 96, g: 0.08, disorder: 0, bc: 'open', aspect: '4:5' }, shape: [96, 96], method: 'analytic-open' },
  { name: 'clean-periodic', payload: { grid: 96, g: 0.08, disorder: 0, bc: 'periodic', view: 'modes' }, shape: [96, 96], method: 'periodic-right', uniform: true },
  { name: 'disordered-open', payload: { grid: 48, g: 0.08, disorder: 0.6, bc: 'open', aspect: '1:1' }, shape: [48, 48], method: 'open-right' },
  { name: 'legacy-sheet-gram', payload: { v: 7, grid: 48, g: 0.08, disorder: 0.6, bc: 'open', aspect: '4:5' }, shape: [60, 48], method: 'legacy-gram-basis' },
];
(async () => {
  const browser = await chromium.launch({ args: glArgs() }), rows = [], errors = [];
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.join(root, 'dist/studio.html');
  const version = browser.version();
  try {
    for (const fixture of fixtures) {
      const page = await browser.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', e => errors.push(e.message));
      try {
        // Instantiate Skin only after wrapping its public lifecycle, without exposing engine internals.
        const initial = Buffer.from(JSON.stringify({ side: 8, count: 1, sweeps: 0 })).toString('base64url');
        await page.goto('file://' + studio + '#hopfield/skin-data-start/' + initial);
        await page.waitForFunction(() => window.Studio?.modules?.skin);
        await page.evaluate(() => {
          const mod = Studio.modules.skin, create = mod.create;
          window.skinCalls = [];
          mod.create = host => {
            const inst = create(host); window.skinHost = host; window.skinInstance = inst;
            for (const key of ['pause', 'resume']) { const fn = inst[key]; inst[key] = (...args) => { skinCalls.push(key); return fn.apply(inst, args); }; }
            return inst;
          };
        });
        const seed = 'skin-data/' + fixture.name, payload = Buffer.from(JSON.stringify(fixture.payload)).toString('base64url');
        await page.evaluate(hash => { location.hash = hash; }, '#skin/' + encodeURIComponent(seed) + '/' + payload);
        await page.waitForFunction(() => window.skinInstance?.exportData && Studio.getRecipe().id === 'skin');
        const row = await page.evaluate(async () => {
          const inst = skinInstance, host = skinHost;
          const snapshot = () => ({ state: JSON.stringify(host.getState()), recipe: JSON.stringify(Studio.getRecipe()), canvas: host.canvas.toDataURL(), calls: JSON.stringify(skinCalls) });
          // Explicit pause before export; a second P must resume, rather than pause again.
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
          if (skinCalls.at(-1) !== 'pause') throw Error('Pause fixture did not pause');
          const before = snapshot(), direct = await inst.exportData();
          const original = Array.from(direct.arrays.probability.data), originalMeta = JSON.stringify(direct.meta);
          direct.arrays.probability.data.fill(-1); direct.arrays.probability.shape[0] = -1; direct.meta.sites = -1;
          const second = await inst.exportData();
          if (JSON.stringify(Array.from(second.arrays.probability.data)) !== JSON.stringify(original) || JSON.stringify(second.meta) !== originalMeta) throw Error('Export exposed mutable instance data');
          const F = GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData('skin')).arrayBuffer()));
          const meta = JSON.parse(new TextDecoder().decode(zip['meta.json'])), array = F.readNpy(zip['probability.npy']);
          if (!meta.stateExported || meta.provenance.technique.id !== 'skin' || !meta.provenance.technique.sourceSha256) throw Error('Missing data/provenance');
          if (JSON.stringify(Array.from(array.data)) !== JSON.stringify(original)) throw Error('NPZ changed field');
          if (JSON.stringify(snapshot()) !== JSON.stringify(before)) throw Error('Data export changed settings, recipe, pixels or lifecycle');
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
          if (skinCalls.at(-1) !== 'resume') throw Error('Data export changed explicit pause preference');
          return { array: { shape: array.shape, data: Array.from(array.data) }, meta, seed: host.getState().seed,
            isolated: true, settingsAndPixelsPreserved: true, pausePreserved: true, shapeCopy: second.arrays.probability.shape,
            bytes: Array.from(zip['probability.npy']) };
        });
        assert.deepEqual(row.array.shape, fixture.shape); assert.deepEqual(row.shapeCopy, fixture.shape);
        assert.equal(row.meta.grid.method, fixture.method); assert.equal(row.meta.grid.seed, seed); assert.equal(row.seed, seed);
        assert.equal(row.meta.arrays.probability.units, 'dimensionless');
        assert.equal(row.meta.provenance.technique.sourceSha256, sha(fs.readFileSync(path.join(root, 'src/modules/skin.js'))), 'Build provenance must match maintained source');
        const measures = validate(row.array, row.meta.grid, fixture.uniform);
        if (fixture.name === 'clean-open') {
          let maxError = 0;
          for (let n = 0; n < 96; n++) {
            const weights = Array.from({ length: 96 }, (_, j) => Math.exp(2 * 0.08 * j) * Math.sin(Math.PI * (n + 1) * (j + 1) / 97) ** 2);
            const norm = weights.reduce((a, b) => a + b, 0);
            for (let j = 0; j < 96; j++) maxError = Math.max(maxError, Math.abs(row.array.data[n * 96 + j] - weights[j] / norm));
          }
          assert.ok(maxError < 1e-6); measures.maxAnalyticOpenError = maxError;
        }
        assert.throws(() => validate({ ...row.array, shape: [fixture.shape[1], fixture.shape[0] + 1] }, row.meta.grid, fixture.uniform));
        if (fixture.uniform) {
          const corrupt = structuredClone(row.array); corrupt.data[0] += 0.001; corrupt.data[1] -= 0.001;
          const corruptMeta = { ...row.meta.grid, meanIPR: corrupt.data.reduce((sum, x) => sum + x * x, 0) / row.meta.grid.modes };
          assert.throws(() => validate(corrupt, corruptMeta, true), /independent uniform 1\/N reference/, 'normalized corruption must fail the independent reference even with consistent diagnostics');
        }
        if (fixture.name === 'disordered-open') assert.throws(() => validate(row.array, row.meta.grid, true));
        rows.push({ name: fixture.name, payload: fixture.payload, seed, grid: row.meta.grid, shape: row.array.shape, measures,
          dataSha256: sha(Buffer.from(row.bytes)), provenanceSourceSha256: row.meta.provenance.technique.sourceSha256,
          isolated: row.isolated, settingsAndPixelsPreserved: row.settingsAndPixelsPreserved, pausePreserved: row.pausePreserved });
      } finally { await page.close(); }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
  const result = { passed: true, scope: 'Data contract and bounded analytic regressions, not a scientific status promotion.', command: 'node tools/skin-data-check.js --write',
    environment: { browser: version, node: process.version }, sourceSha256: sha(fs.readFileSync(path.join(root, 'src/modules/skin.js'))),
    harnessSha256: sha(fs.readFileSync(__filename)), negativeControls: ['incorrect shape', 'normalized periodic corruption', 'disordered case ineligible for uniform reference'], rows };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/skin-data-check.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('PASS Skin native NPZ data: 4 current/legacy recipes, analytic references, copy isolation, unchanged pixels/settings/pause, corruption and shape controls');
})().catch(e => { console.error(e); process.exitCode = 1; });
