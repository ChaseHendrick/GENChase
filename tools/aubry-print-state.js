// Actual Aubry exportPNG state preservation at the default recipe. Not IPR accuracy.
// node tools/aubry-print-state.js [--write]
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
  const original = fs.readFileSync(path.join(root, 'src/modules/aubry.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one aubry export API marker');
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
          metric = (metric || 0) + 1;
        },
${marker}`);

  // Default parameters (grid 128, 4:5, λ = 2.4, 140 relax steps). The seed is fixed
  // only so the Gaussian start replays; it is not a claim about the IPR.
  const fixture = { name: 'default', aspect: '4:5', overlay: {} };

  const browser = await chromium.launch({ args: glArgs() });
  let row;
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#aubry/aubry-print-state');
      await page.evaluate(source);
      const dims = printSize(fixture.aspect);
      row = await page.evaluate(async ({ fixture, dims }) => {
        const mod = Studio.modules.aubry;
        const pal = Studio.PALETTES[mod.defaultPalette];
        const state = {
          ...mod.defaults,
          ...fixture.overlay,
          aspect: fixture.aspect,
          seed: 'aubry-print-state/' + fixture.name,
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
        if (state.lambda !== 2.4) throw Error('Default λ moved: ' + state.lambda);

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
          ipr: before.metric, lambda: before.extra, cells: before.cells,
          state: compare(before, instance.auditSnapshot()),
          nonblank: lum.spread > 12 && lum.finite === lum.samples,
          luminance: lum,
        };
        bitmap.close();
        if (!accept(result)) throw Error('Export changed aubry state or dimensions: ' + JSON.stringify(result));

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
          ipr: before.metric,
          lambda: before.extra,
          export: result,
          replayUnchanged: true,
          failureControls: {
            wrongDimensionsRejected: !accept(wrong),
            mutatingExportRejected: !accept(mutated),
            changedWords: mutated.state.changedWords,
            metricChanged: mutated.state.metricChanged,
          },
        };
      }, { fixture, dims });
    } finally { await page.close(); }
  } finally { await browser.close(); }

  assert.deepEqual([row.export.width, row.export.height], row.requested);
  assert.equal(row.export.state.changedWords, 0);
  assert.equal(row.export.state.nonfinite, 0);
  assert.equal(row.failureControls.wrongDimensionsRejected, true);
  assert.equal(row.failureControls.mutatingExportRejected, true);
  assert(row.export.nonblank);
  assert.equal(row.lambda, 2.4);
  assert(Number.isFinite(row.ipr) && row.ipr > 0, 'IPR must be a finite positive setting of this plate, not a checked exponent');
  // State preservation only. Do not compare the plate IPR with log(λ) or with 1/N.

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/aubry.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/aubry-print-state.js --write',
    scope: 'Actual aubry exportPNG at the default recipe (grid 128, aspect 4:5, lambda 2.4, 140 relax steps, intensity view, exposure 1.05), longest edge 2400 (1920x2400). Exact Float32 field words, IPR metric, lambda extra, cells, buffer size and settings preserved; deterministic regenerate replay; nonblank reduced raster.',
    criteria: 'Zero changed/nonfinite field words; metric/extra/settings/cells unchanged across export; exact requested PNG dimensions and a blob over 1000 bytes; luminance spread over 12/255; wrong dimensions and a deliberate post-export field and metric mutation rejected.',
    rows: [row],
    limitations: 'State preservation and declared dimensions only. Does not establish accuracy of the inverse participation ratio, the Lyapunov exponent, calibrated color, or coverage of every control, aspect or hardware. The plate is a fixed-step imaginary-time relaxation; that IPR is not the transfer-matrix measurement in tools/aubry-science.js.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/aubry-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
