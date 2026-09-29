// Actual skin exportPNG state preservation; not calibrated color.
// Two open Hatano-Nelson fixtures, grid 96, g = 0.08, disorder 0, longest edge 2400:
// aspect 4:5 and aspect 1:1. rows is modes, so both fields are 96 by 96.
// node tools/skin-print-state.js [--write]
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/skin.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one skin export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!amp) throw Error('no field');
          return {
            amp: amp.slice(),
            skinW, ipr, W, H,
            cells: [W, H],
            settings: JSON.stringify(host.getState()),
            buf: buf ? [buf.width, buf.height] : null,
          };
        },
        auditMutate() {
          if (!amp) throw Error('no field');
          amp[0] = (amp[0] || 0) + 1;
          skinW = (skinW || 0) + 1;
        },
${marker}`);

  const fixtures = [
    { name: 'open-skin', aspect: '4:5', overlay: { grid: 96, g: 0.08, disorder: 0, bc: 'open', view: 'log' } },
    { name: 'open-square', aspect: '1:1', overlay: { grid: 96, g: 0.08, disorder: 0, bc: 'open', view: 'log' } },
  ];

  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#skin/skin-print-state');
      await page.evaluate(source);
      for (const fixture of fixtures) {
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          const mod = Studio.modules.skin;
          const pal = Studio.PALETTES[mod.defaultPalette];
          const state = {
            ...mod.defaults,
            ...fixture.overlay,
            aspect: fixture.aspect,
            seed: 'skin-print-state/' + fixture.name,
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
          const aspect = ({ '1:1': 1, '4:5': 1.25, '5:4': 0.8, '3:2': 2 / 3, '16:9': 9 / 16 }[state.aspect] || 1);
          const sheet = Math.max(32, Math.round(state.grid * aspect));
          const expectedH = state.rows === 'sheet' ? sheet : Math.min(sheet, state.grid);
          const cells = instance.fieldCells();
          if (!cells || cells[0] !== state.grid || cells[1] !== expectedH) throw Error('Grid dimensions wrong: ' + JSON.stringify(cells));

          function compare(a, b) {
            if (a.amp.length !== b.amp.length) throw Error('Field size changed');
            const x = new Uint32Array(a.amp.buffer), y = new Uint32Array(b.amp.buffer);
            let changedWords = 0, nonfinite = 0;
            for (let i = 0; i < a.amp.length; i++) {
              if (x[i] !== y[i]) changedWords++;
              if (!Number.isFinite(a.amp[i]) || !Number.isFinite(b.amp[i])) nonfinite++;
            }
            return {
              changedWords, nonfinite, words: a.amp.length,
              skinWChanged: a.skinW !== b.skinW,
              iprChanged: a.ipr !== b.ipr,
              cellsChanged: JSON.stringify(a.cells) !== JSON.stringify(b.cells),
              settingsChanged: a.settings !== b.settings,
              bufChanged: JSON.stringify(a.buf) !== JSON.stringify(b.buf),
            };
          }
          function accept(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.skinWChanged && !r.state.iprChanged && !r.state.cellsChanged &&
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
          if (replay.changedWords || replay.skinWChanged || replay.settingsChanged) throw Error('Deterministic replay failed');

          const before = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const lum = luminanceSpread(bitmap);
          const result = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            skinW: before.skinW, ipr: before.ipr, cells: before.cells,
            state: compare(before, instance.auditSnapshot()),
            nonblank: lum.spread > 12 && lum.finite === lum.samples,
            luminance: lum,
          };
          bitmap.close();
          if (!accept(result)) throw Error('Export changed skin state or dimensions: ' + JSON.stringify(result));

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
          if (accept(mutated) || mutated.state.changedWords === 0 || !mutated.state.skinWChanged) {
            throw Error('Mutating post-export state escaped detection');
          }

          return {
            fixture: fixture.name,
            cells: before.cells,
            requested: [dims.width, dims.height],
            skinW: before.skinW,
            ipr: before.ipr,
            export: result,
            replayUnchanged: true,
            failureControls: {
              wrongDimensionsRejected: !accept(wrong),
              mutatingExportRejected: !accept(mutated),
              changedWords: mutated.state.changedWords,
              skinWChanged: mutated.state.skinWChanged,
            },
          };
        }, { fixture, dims: printSize(fixture.aspect) }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    assert.deepEqual([row.export.width, row.export.height], row.requested);
    assert.equal(row.export.state.changedWords, 0);
    assert.equal(row.failureControls.wrongDimensionsRejected, true);
    assert.equal(row.failureControls.mutatingExportRejected, true);
    assert(row.export.nonblank);
    assert(row.skinW > 0.45, 'open g=0.08 fixture should report a right-end pile');
    assert.deepEqual(row.cells, [96, 96], row.fixture + ' should draw one row per mode');
  }
  const weights = rows.map(r => r.skinW);
  assert(Math.abs(weights[0] - weights[1]) < 1e-12, '4:5 and 1:1 draw the same modes, so the skin weight matches');

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/skin.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/skin-print-state.js --write',
    scope: 'Actual skin exportPNG at 2400 longest edge for two open clean chains, both grid 96, g=0.08, disorder 0, bc open, log view, rows modes: aspect 4:5 (1920x2400, 96 by 96 cells) and aspect 1:1 (2400x2400, 96 by 96 cells). Exact Float32 amp words, skin weight, IPR, cells, buffer size and settings preserved; deterministic regenerate replay; nonblank reduced raster.',
    criteria: 'Zero changed/nonfinite amp words; skin weight, IPR, settings, cells and buffer unchanged across export; exact requested PNG dimensions and >1000-byte blob; luminance spread >12/255; wrong dimensions and deliberate post-export amp+skinW mutation rejected.',
    rows,
    limitations: 'State preservation and declared dimensions for these two clean open fixtures with disorder exactly 0 and rows modes. Does not validate the current nonzero-disorder open-chain QL or periodic Francis QR/inverse-iteration paths, legacy pre-v8 Gram-Schmidt or rows sheet paths, calibrated color, or every control.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/skin-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
