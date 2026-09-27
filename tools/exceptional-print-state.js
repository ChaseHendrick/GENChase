// Actual exceptional exportPNG state preservation; not a laboratory exceptional point.
// node tools/exceptional-print-state.js [--write]
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/exceptional.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one exceptional export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field) throw Error('no field');
          return {
            field: field.slice(),
            metric, extra, W, H,
            cells: [W, H],
            settings: JSON.stringify(host.getState()),
            buf: buf ? [buf.width, buf.height] : null,
          };
        },
        auditMutate() {
          if (!field) throw Error('no field');
          field[0] = (field[0] || 0) + 1;
          metric = (metric | 0) + 1;
        },
${marker}`);

  const fixtures = [
    { name: 'ep', aspect: '1:1', overlay: { gamma: 1, kappa: 1, kind: 'sheet' } },
    { name: 'broken', aspect: '4:5', overlay: { gamma: 1.6, kappa: 0.8, kind: 'sheet' } },
  ];

  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#exceptional/exceptional-print-state');
      await page.evaluate(source);
      for (const fixture of fixtures) {
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          const mod = Studio.modules.exceptional;
          const pal = Studio.PALETTES[mod.defaultPalette];
          const state = {
            ...mod.defaults,
            ...fixture.overlay,
            aspect: fixture.aspect,
            seed: 'exceptional-print-state/' + fixture.name,
            palette: pal.colors,
            bg: pal.bg,
          };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480; canvas.height = 600;
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();
          const expectedH = Math.max(48, Math.round(state.grid * ({ '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 }[state.aspect] || 1)));
          const cells = instance.fieldCells();
          if (!cells || cells[0] !== state.grid || cells[1] !== expectedH) throw Error('Grid dimensions wrong: ' + JSON.stringify(cells));

          function compare(a, b) {
            if (a.field.length !== b.field.length) throw Error('Field size changed');
            const x = new Uint32Array(a.field.buffer), y = new Uint32Array(b.field.buffer);
            let changedWords = 0, nonfinite = 0;
            for (let i = 0; i < a.field.length; i++) {
              if (x[i] !== y[i]) changedWords++;
              if (!Number.isFinite(a.field[i]) || !Number.isFinite(b.field[i])) nonfinite++;
            }
            return {
              changedWords, nonfinite, words: a.field.length,
              metricChanged: a.metric !== b.metric,
              extraChanged: a.extra !== b.extra,
              cellsChanged: JSON.stringify(a.cells) !== JSON.stringify(b.cells),
              settingsChanged: a.settings !== b.settings,
              bufChanged: JSON.stringify(a.buf) !== JSON.stringify(b.buf),
            };
          }
          function accept(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.metricChanged && !r.state.extraChanged && !r.state.cellsChanged &&
              !r.state.settingsChanged && !r.state.bufChanged && r.nonblank;
          }
          function luminanceSpread(bitmap) {
            const c = document.createElement('canvas');
            c.width = 320; c.height = Math.max(1, Math.round(320 * bitmap.height / bitmap.width));
            const g = c.getContext('2d', { willReadFrequently: true });
            g.imageSmoothingEnabled = false;
            g.drawImage(bitmap, 0, 0, c.width, c.height);
            const pixels = g.getImageData(0, 0, c.width, c.height).data;
            let lo = 255, hi = 0, finite = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const L = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
              if (Number.isFinite(L)) { finite++; if (L < lo) lo = L; if (L > hi) hi = L; }
            }
            return { spread: hi - lo, finite, samples: pixels.length / 4 };
          }

          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.metricChanged || replay.settingsChanged) throw Error('Deterministic replay failed');

          const before = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const lum = luminanceSpread(bitmap);
          const result = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            splitting: before.metric, gammaOverKappa: before.extra, cells: before.cells,
            state: compare(before, instance.auditSnapshot()),
            nonblank: lum.spread > 12 && lum.finite === lum.samples,
            luminance: lum,
          };
          bitmap.close();
          if (!accept(result)) throw Error('Export changed exceptional state or dimensions: ' + JSON.stringify(result));

          const wrong = { ...result, width: dims.width - 1 };
          if (accept(wrong)) throw Error('Wrong dimensions escaped');

          const preMut = instance.auditSnapshot();
          const blob2 = await instance.exportPNG(dims.width, dims.height);
          instance.auditMutate();
          const bitmap2 = await createImageBitmap(blob2);
          const lum2 = luminanceSpread(bitmap2);
          const mutated = {
            width: bitmap2.width, height: bitmap2.height, bytes: blob2.size,
            state: compare(preMut, instance.auditSnapshot()),
            nonblank: lum2.spread > 12 && lum2.finite === lum2.samples,
          };
          bitmap2.close();
          if (accept(mutated) || mutated.state.changedWords === 0 || !mutated.state.metricChanged) {
            throw Error('Mutating post-export state escaped detection');
          }

          return {
            fixture: fixture.name,
            cells: before.cells,
            requested: [dims.width, dims.height],
            splitting: before.metric,
            gammaOverKappa: before.extra,
            export: result,
            replayUnchanged: true,
            failureControls: {
              wrongDimensionsRejected: !accept(wrong),
              mutatingExportRejected: !accept(mutated),
              changedWords: mutated.state.changedWords,
              metricChanged: mutated.state.metricChanged,
            },
          };
        }, { fixture, dims: printSize(fixture.aspect) }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    assert.deepEqual([row.export.width, row.export.height], row.requested);
    assert.equal(row.export.state.changedWords, 0);
    assert.equal(row.export.state.nonfinite, 0);
    assert.equal(row.failureControls.wrongDimensionsRejected, true);
    assert.equal(row.failureControls.mutatingExportRejected, true);
    assert.ok(row.failureControls.changedWords > 0);
    assert.equal(row.failureControls.metricChanged, true);
    assert.equal(row.export.nonblank, true);
  }
  const ep = rows.find(r => r.fixture === 'ep');
  const brokenPT = rows.find(r => r.fixture === 'broken');
  assert.equal(ep.splitting, 0, 'exceptional-point fixture must report a zero splitting');
  assert.equal(ep.gammaOverKappa, 1);
  assert.ok(brokenPT.splitting > 1, 'broken-PT fixture must report a positive splitting');
  assert.ok(Math.abs(brokenPT.gammaOverKappa - 2) < 1e-12);
  assert.notEqual(ep.splitting, brokenPT.splitting);

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/exceptional.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/exceptional-print-state.js --write',
    scope: 'Actual exceptional exportPNG at 2400 longest edge for the ep fixture (1:1, 2400x2400, gamma = kappa = 1, sheet) and the broken fixture (4:5, 1920x2400, gamma 1.6, kappa 0.8, sheet). Exact Float32 field words, dimer splitting, gamma/kappa, cells, buffer size and settings preserved; deterministic regenerate replay; nonblank reduced raster.',
    criteria: 'Zero changed or nonfinite field words; metric, extra, settings, cells and buffer unchanged across export; exact requested PNG dimensions and blobs larger than 1000 bytes; luminance spread greater than 12/255; wrong width and a deliberate post-export field-plus-metric mutation rejected by the same predicate.',
    rows,
    limitations: 'State preservation and declared dimensions only. Does not establish calibrated color, the modes schematic, the gap plot, printed numerical resolution beyond the recorded grid, or a laboratory exceptional point. The sheet eigenvalue comparison is tools/exceptional-science.js.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/exceptional-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify({
    pass: true,
    ep: { splitting: ep.splitting, extra: ep.gammaOverKappa, png: ep.requested, words: ep.export.state.words, spread: ep.export.luminance.spread },
    broken: { splitting: brokenPT.splitting, extra: brokenPT.gammaOverKappa, png: brokenPT.requested, words: brokenPT.export.state.words, spread: brokenPT.export.luminance.spread },
    wrongDimensionsRejected: true,
    mutatingExportRejected: true,
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
