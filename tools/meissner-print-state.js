// Actual meissner exportPNG on fixtures inside the converged London disk.
// State preservation and dimensions, plus an independent I0 check that the printed field is that disk.
//   node tools/meissner-print-state.js [--write]
'use strict';
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
  const original = fs.readFileSync(path.join(root, 'src/modules/meissner.js'), 'utf8');
  const marker = '        async exportPNG(w, h) {';
  assert.equal(original.split(marker).length, 2, 'Expected one meissner exportPNG marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field) throw Error('no field');
          let nonfinite = 0;
          for (let i = 0; i < field.length; i++) if (!Number.isFinite(field[i])) nonfinite++;
          return {
            words: Array.from(new Uint32Array(field.buffer, field.byteOffset, field.length)),
            values: Array.from(field),
            metric, extra, cycles, W, H, nonfinite,
            settings: JSON.stringify(host.getState()),
          };
        },
        auditMutate() {
          if (!field) throw Error('no field');
          field[0] = (field[0] || 0) + 1;
          metric = (metric || 0) + 1;
        },
${marker}`);

  // Same three plates the numerical harness already compares with I0, covering 1:1, 4:5 and 16:9.
  const fixtures = [
    { name: 'default', grid: 160, aspect: '1:1', lambda: 10, R: 48, relax: 90, solver: 'mg', view: 'int' },
    { name: 'portrait', grid: 160, aspect: '4:5', lambda: 10, R: 48, relax: 40, solver: 'mg', view: 'int' },
    { name: 'wide', grid: 224, aspect: '16:9', lambda: 10, R: 40, relax: 40, solver: 'mg', view: 'int' },
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
          function besselI0(z) {
            const q = z * z / 4;
            let term = 1, sum = 1;
            for (let k = 1; k < 800; k++) {
              term *= q / (k * k);
              sum += term;
              if (term < 1e-18 * sum) break;
            }
            return sum;
          }
          function profileError(values, W, H, lam, R) {
            const cx = W / 2, cy = H / 2, denom = besselI0(R / lam);
            let maxAbs = 0, n = 0;
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
              const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
              if (r >= R) continue;
              const err = Math.abs(values[y * W + x] - besselI0(r / lam) / denom);
              if (err > maxAbs) maxAbs = err;
              n++;
            }
            return { maxAbs, n };
          }
          function compare(a, b) {
            if (a.words.length !== b.words.length) throw Error('field length changed');
            let changedWords = 0;
            for (let i = 0; i < a.words.length; i++) if (a.words[i] !== b.words[i]) changedWords++;
            return {
              changedWords, words: a.words.length, nonfinite: a.nonfinite + b.nonfinite,
              scalarsChanged: a.metric !== b.metric || a.extra !== b.extra || a.cycles !== b.cycles || a.W !== b.W || a.H !== b.H,
              settingsChanged: a.settings !== b.settings,
            };
          }
          function luminanceSpread(bitmap) {
            const c = document.createElement('canvas');
            c.width = 320; c.height = Math.max(1, Math.round(320 * bitmap.height / bitmap.width));
            const g = c.getContext('2d', { willReadFrequently: true });
            g.imageSmoothingEnabled = false;
            g.drawImage(bitmap, 0, 0, c.width, c.height);
            const pixels = g.getImageData(0, 0, c.width, c.height).data;
            let lo = 255, hi = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              const L = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
              if (L < lo) lo = L;
              if (L > hi) hi = L;
            }
            return hi - lo;
          }
          function acceptPng(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 && !r.state.scalarsChanged &&
              !r.state.settingsChanged && r.spread > 12 && r.maxAbs <= 1e-3 && r.diskClear;
          }

          const mod = Studio.modules.meissner;
          const pal = Studio.PALETTES[mod.defaultPalette] || { colors: ['#111111', '#eeeeee'], bg: '#111111' };
          const state = {
            ...mod.defaults, ...fixture, running: false,
            seed: 'meissner-print/' + fixture.name,
            palette: pal.colors, bg: pal.bg,
          };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = Math.max(48, Math.round(480 * (({ '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 })[state.aspect] || 1)));
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();
          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.scalarsChanged || replay.settingsChanged) throw Error('Deterministic replay failed');

          const before = instance.auditSnapshot();
          const diskClear = state.R < Math.min(before.W, before.H) / 2 - 1;
          const prof = profileError(before.values, before.W, before.H, state.lambda, state.R);
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const png = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            spread: luminanceSpread(bitmap),
            state: compare(before, instance.auditSnapshot()),
            maxAbs: prof.maxAbs, n: prof.n, diskClear,
            cycles: before.cycles, metric: before.metric, extra: before.extra,
            cells: [before.W, before.H],
          };
          bitmap.close();
          if (!acceptPng(png)) throw Error('Export changed the Meissner field or left the disk: ' + JSON.stringify(png));

          const wrong = { ...png, width: dims.width - 1 };
          if (acceptPng(wrong)) throw Error('Wrong PNG dimensions escaped');

          const preMut = instance.auditSnapshot();
          const blob2 = await instance.exportPNG(dims.width, dims.height);
          instance.auditMutate();
          const bitmap2 = await createImageBitmap(blob2);
          const mutated = {
            width: bitmap2.width, height: bitmap2.height, bytes: blob2.size,
            spread: luminanceSpread(bitmap2),
            state: compare(preMut, instance.auditSnapshot()),
            maxAbs: prof.maxAbs, n: prof.n, diskClear,
          };
          bitmap2.close();
          if (acceptPng(mutated) || mutated.state.changedWords === 0 || !mutated.state.scalarsChanged) {
            throw Error('Mutating the field after export escaped detection');
          }

          return {
            fixture: fixture.name,
            aspect: state.aspect,
            lambda: state.lambda, R: state.R, relax: state.relax, solver: state.solver,
            requested: [dims.width, dims.height],
            cells: png.cells,
            cycles: png.cycles,
            maxAbs: png.maxAbs,
            n: png.n,
            png: { width: png.width, height: png.height, bytes: png.bytes, spread: png.spread, changedWords: png.state.changedWords, nonfinite: png.state.nonfinite },
            replayUnchanged: true,
            failureControls: {
              wrongPngDimensionsRejected: !acceptPng(wrong),
              mutatingExportRejected: !acceptPng(mutated),
              changedWords: mutated.state.changedWords,
            },
          };
        }, { fixture, dims: printSize(fixture.aspect) }));
      }
    } finally { await page.close(); }
  } finally { await browser.close(); }

  for (const row of rows) {
    assert.deepEqual([row.png.width, row.png.height], row.requested, row.fixture);
    assert.equal(row.png.changedWords, 0, row.fixture);
    assert.equal(row.png.nonfinite, 0, row.fixture);
    assert.equal(row.failureControls.wrongPngDimensionsRejected, true, row.fixture);
    assert.equal(row.failureControls.mutatingExportRejected, true, row.fixture);
    assert(row.failureControls.changedWords > 0, row.fixture);
    assert(row.png.spread > 12, row.fixture);
    assert(row.maxAbs <= 1e-3, row.fixture + ' left the London disk: ' + row.maxAbs);
    assert(row.replayUnchanged, row.fixture);
  }

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/meissner.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/meissner-print-state.js --write',
    scope: 'Actual meissner exportPNG at 8 in and 300 ppi on the longest edge for the default 1:1 disk, the 4:5 portrait corner and the 16:9 wide corner. Exact Float32 field words, core metric, I0 mean, cycle count and settings preserved. Each printed field is the converged London disk.',
    criteria: 'Zero changed or nonfinite field words. Scalars and settings unchanged across export. Exact requested PNG size and a luminance spread above 12. max |B - I0(r/λ)/I0(R/λ)| at most 1e-3 on the open disk, which clears the frame. A one-pixel-narrow PNG and a post-export field mutation are rejected.',
    rows,
    limitations: 'State preservation, dimensions and the I0 bound on these three fixtures only. Not calibrated color, not a disk cut by the frame, not a pre-v7 Jacobi recipe, not every slider.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/meissner-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: true, rows: rows.map(r => ({ fixture: r.fixture, cells: r.cells, cycles: r.cycles, maxAbs: r.maxAbs, png: r.png, failureControls: r.failureControls })) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
