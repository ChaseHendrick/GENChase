// Meissner exportPNG keeps the Jacobi field. Not a Bessel-accuracy check.
// node tools/meissner-print-state.js [--write]
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/meissner.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one meissner export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field) throw Error('no field');
          return { field: field.slice(), metric, extra, cells: [W, H], settings: JSON.stringify(host.getState()) };
        },
        auditMutate() {
          field[0] = (field[0] || 0) + 1;
          metric = (metric || 0) + 1;
        },
${marker}`);
  const dims = { width: 2400, height: 2400 };
  const fixtures = [
    { name: 'default', overlay: {} },
    { name: 'expel', overlay: { lambda: 8, R: 52, relax: 110 } },
  ];
  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#meissner/meissner-print-state');
      await page.evaluate(source);
      for (const fixture of fixtures) {
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          const mod = Studio.modules.meissner;
          const pal = Studio.PALETTES[mod.defaultPalette];
          const state = { ...mod.defaults, ...fixture.overlay, aspect: '1:1', seed: 'meissner-print/' + fixture.name, palette: pal.colors, bg: pal.bg };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = 480;
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();
          const cells = instance.fieldCells();
          if (!cells || cells[0] !== state.grid || cells[1] !== state.grid) throw Error('Grid: ' + JSON.stringify(cells));
          function compare(a, b) {
            const x = new Uint32Array(a.field.buffer), y = new Uint32Array(b.field.buffer);
            let changedWords = 0, nonfinite = 0;
            for (let i = 0; i < a.field.length; i++) {
              if (x[i] !== y[i]) changedWords++;
              if (!Number.isFinite(a.field[i]) || !Number.isFinite(b.field[i])) nonfinite++;
            }
            return {
              changedWords, nonfinite, words: a.field.length,
              metricChanged: a.metric !== b.metric, extraChanged: a.extra !== b.extra,
              cellsChanged: JSON.stringify(a.cells) !== JSON.stringify(b.cells),
              settingsChanged: a.settings !== b.settings,
            };
          }
          function accept(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.metricChanged && !r.state.extraChanged && !r.state.cellsChanged &&
              !r.state.settingsChanged && r.nonblank;
          }
          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.metricChanged) throw Error('Deterministic replay failed');
          const before = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const c = document.createElement('canvas');
          c.width = 64; c.height = 64;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(bitmap, 0, 0, 64, 64);
          const px = g.getImageData(0, 0, 64, 64).data;
          let lo = 255, hi = 0;
          for (let i = 0; i < px.length; i += 4) {
            const L = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
            if (L < lo) lo = L; if (L > hi) hi = L;
          }
          const result = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            state: compare(before, instance.auditSnapshot()),
            nonblank: hi - lo > 12,
            center: before.metric, bessel: before.extra, cells: before.cells,
          };
          bitmap.close();
          if (!accept(result)) throw Error('Export changed Meissner state: ' + JSON.stringify(result));
          const wrong = { ...result, width: dims.width - 1 };
          if (accept(wrong)) throw Error('Wrong dimensions escaped');
          const preMut = instance.auditSnapshot();
          const blob2 = await instance.exportPNG(dims.width, dims.height);
          instance.auditMutate();
          const bitmap2 = await createImageBitmap(blob2);
          bitmap2.close();
          const mutated = {
            width: dims.width, height: dims.height, bytes: blob2.size,
            state: compare(preMut, instance.auditSnapshot()),
            nonblank: true,
          };
          if (accept(mutated) || mutated.state.changedWords === 0) throw Error('Mutation escaped');
          return {
            fixture: fixture.name, cells: before.cells, center: before.metric, bessel: before.extra,
            export: { width: result.width, height: result.height, bytes: result.bytes, changedWords: result.state.changedWords, nonblank: result.nonblank },
            failureControls: { wrongDimensionsRejected: !accept(wrong), mutatingExportRejected: !accept(mutated), changedWords: mutated.state.changedWords },
          };
        }, { fixture, dims }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    assert.equal(row.export.width, 2400);
    assert.equal(row.export.height, 2400);
    assert.equal(row.export.changedWords, 0);
    assert.equal(row.export.nonblank, true);
    assert.equal(row.failureControls.wrongDimensionsRejected, true);
    assert.equal(row.failureControls.mutatingExportRejected, true);
  }
  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    date: '2026-09-27',
    source: 'src/modules/meissner.js',
    sourceSha256: hash(original),
    command: 'node tools/meissner-print-state.js --write',
    scope: 'Actual meissner exportPNG at 2400x2400 (8 in, 300 ppi) for the default recipe and the Expelled preset. Float32 field words, centre metric, Bessel reference, cells and settings preserved. Deterministic regenerate. Wrong width and a post-export field mutation rejected.',
    criteria: 'Zero changed field words. Exact 2400x2400 PNG larger than 1000 bytes. Luminance spread above 12/255 on a 64px downsample. Wrong width and post-export mutation fail the same predicate.',
    rows,
    limitations: 'State preservation and dimensions only. The default plate is not the converged London solution; that claim is tools/meissner-science.js. No calibrated color and no claim about every slider.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/meissner-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
