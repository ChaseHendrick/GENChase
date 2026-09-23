// Actual photon exportPNG state preservation; not geodesic accuracy or calibrated color.
// node tools/photon-print-state.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');

const ASPECTS = { '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 };
function printSize(aspect) {
  const a = ASPECTS[aspect] || 1;
  return a >= 1 ? { width: Math.round(2400 / a), height: 2400 } : { width: 2400, height: Math.round(2400 * a) };
}

(async () => {
  const root = path.resolve(__dirname, '..');
  const original = fs.readFileSync(path.join(root, 'src/modules/photon.js'), 'utf8');
  const marker = '        aspect(s) { return ASPECTS[s.aspect] || 1; },';
  assert.equal(original.split(marker).length, 2, 'Expected one photon export API marker');
  const source = original.replace(marker, `        auditSnapshot() {
          if (!field || !mask) throw Error('no field');
          return {
            field: field.slice(),
            mask: mask.slice(),
            W, H, bMeas, rPh, deflRatio, kindLabel,
            settings: JSON.stringify(host.getState()),
            buf: buf ? [buf.width, buf.height] : null,
          };
        },
        auditMutate() {
          if (!field) throw Error('no field');
          field[0] = (field[0] || 0) + 1;
          bMeas = (bMeas || 0) + 0.17;
        },
${marker}`);

  const fixtures = [
    { name: 'ring', aspect: '1:1', overlay: { view: 'disk', scene: 'stars', zoom: 1.2, incline: 10, beltR: 6, tone: 'log', grid: 160, rays: 96 } },
    { name: 'spray', aspect: '4:5', overlay: { view: 'equatorial', scene: 'spray', zoom: 0.95, rays: 96, tone: 'log', grid: 160 } },
    { name: 'polar', aspect: '16:9', overlay: { view: 'polar', scene: 'belt', zoom: 1.05, incline: 56, beltR: 7, rays: 80, tone: 'log', grid: 160 } },
    { name: 'impact', aspect: '1:1', overlay: { view: 'impact', scene: 'spray', zoom: 1, rays: 96, tone: 'log', grid: 160 } },
  ];

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const rows = [];
  try {
    const page = await browser.newPage();
    try {
      await page.goto('file://' + path.join(root, 'dist/studio.html') + '#photon/photon-print-state');
      await page.evaluate(source);
      for (const fixture of fixtures) {
        rows.push(await page.evaluate(async ({ fixture, dims }) => {
          const mod = Studio.modules.photon;
          const pal = Studio.PALETTES[mod.defaultPalette];
          const state = {
            ...mod.defaults,
            ...fixture.overlay,
            aspect: fixture.aspect,
            seed: 'photon-print-state/' + fixture.name,
            palette: pal.colors,
            bg: pal.bg,
          };
          mod.sanitize(state);
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = Math.max(270, Math.round(480 * (({ '1:1': 1, '4:5': 1.25, '5:4': 0.8, '16:9': 9 / 16 })[state.aspect] || 1)));
          const instance = mod.create({
            canvas, getState: () => state, setStatus() {}, isActive: () => false,
            reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); },
          });
          instance.regenerate();

          function pack(snap) { return [snap.field, snap.mask]; }
          function compare(a, b) {
            const aa = pack(a), bb = pack(b);
            if (aa.length !== bb.length) throw Error('Array set changed');
            let changedWords = 0, nonfinite = 0, words = 0;
            for (let k = 0; k < aa.length; k++) {
              if (aa[k].length !== bb[k].length) throw Error('Field length changed');
              const x = new Uint32Array(aa[k].buffer, aa[k].byteOffset, aa[k].byteLength / 4);
              const y = new Uint32Array(bb[k].buffer, bb[k].byteOffset, bb[k].byteLength / 4);
              for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) changedWords++;
              for (let i = 0; i < aa[k].length; i++) {
                if (!Number.isFinite(aa[k][i]) || !Number.isFinite(bb[k][i])) nonfinite++;
              }
              words += aa[k].length;
            }
            return {
              changedWords, nonfinite, words,
              cellsChanged: a.W !== b.W || a.H !== b.H,
              diagnosticsChanged: a.bMeas !== b.bMeas || a.rPh !== b.rPh || a.deflRatio !== b.deflRatio || a.kindLabel !== b.kindLabel,
              settingsChanged: a.settings !== b.settings,
              bufChanged: JSON.stringify(a.buf) !== JSON.stringify(b.buf),
            };
          }
          function accept(r) {
            return r.width === dims.width && r.height === dims.height && r.bytes > 1000 &&
              r.state.changedWords === 0 && r.state.nonfinite === 0 &&
              !r.state.cellsChanged && !r.state.diagnosticsChanged &&
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
          function captureFrac(snap) {
            let n = 0;
            for (let i = 0; i < snap.mask.length; i++) if (snap.mask[i] > 0.5) n++;
            return n / snap.mask.length;
          }

          const first = instance.auditSnapshot();
          instance.regenerate();
          const replay = compare(first, instance.auditSnapshot());
          if (replay.changedWords || replay.diagnosticsChanged || replay.settingsChanged) {
            throw Error('Deterministic replay failed');
          }

          const before = instance.auditSnapshot();
          const blob = await instance.exportPNG(dims.width, dims.height);
          const bitmap = await createImageBitmap(blob);
          const lum = luminanceSpread(bitmap);
          const result = {
            width: bitmap.width, height: bitmap.height, bytes: blob.size,
            bMeas: before.bMeas, rPh: before.rPh, deflRatio: before.deflRatio,
            cells: [before.W, before.H],
            state: compare(before, instance.auditSnapshot()),
            nonblank: lum.spread > 12 && lum.finite === lum.samples,
            luminance: lum,
          };
          bitmap.close();
          if (!accept(result)) throw Error('Export changed photon state or dimensions: ' + JSON.stringify(result));

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
          if (accept(mutated) || mutated.state.changedWords === 0 || !mutated.state.diagnosticsChanged) {
            throw Error('Mutating post-export state escaped detection');
          }

          return {
            fixture: fixture.name,
            view: state.view,
            scene: state.scene,
            cells: [before.W, before.H],
            requested: [dims.width, dims.height],
            bMeas: before.bMeas,
            rPh: before.rPh,
            deflRatio: before.deflRatio,
            bRatio: before.bMeas / (3 * Math.sqrt(3)),
            rRatio: before.rPh / 3,
            captureFrac: captureFrac(before),
            export: result,
            replayUnchanged: true,
            failureControls: {
              wrongDimensionsRejected: !accept(wrong),
              mutatingExportRejected: !accept(mutated),
              changedWords: mutated.state.changedWords,
              diagnosticsChanged: mutated.state.diagnosticsChanged,
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
    assert(Math.abs(row.bRatio - 1) < 0.02, 'bMeas should stay near 3√3 M');
    assert(Math.abs(row.rRatio - 1) < 0.02, 'rPh should stay near 3M');
  }
  const ring = rows.find(r => r.fixture === 'ring');
  const spray = rows.find(r => r.fixture === 'spray');
  assert(ring && spray && ring.captureFrac > spray.captureFrac,
    'disk shadow should mark a larger capture fraction than the equatorial pencil');

  const hash = v => crypto.createHash('sha256').update(v).digest('hex');
  const result = {
    pass: true,
    source: 'src/modules/photon.js',
    sourceSha256: hash(original),
    harnessSha256: hash(fs.readFileSync(__filename)),
    command: 'node tools/photon-print-state.js --write',
    scope: 'Actual photon exportPNG at 2400 longest edge for ring, spray, polar and impact fixtures (2400x2400, 1920x2400 and 2400x1350). Exact Float32 field and mask words, bMeas/rPh/deflRatio diagnostics, cells, buffer size and settings preserved; deterministic regenerate replay; nonblank reduced raster.',
    criteria: 'Zero changed/nonfinite field/mask words; diagnostics/settings/cells unchanged across export; exact requested PNG dimensions and >1000-byte blobs; luminance spread >12/255; wrong dimensions and deliberate post-export field+bMeas mutation rejected; disk capture fraction exceeds equatorial pencil; bMeas and rPh within 2% of 3√3 M and 3M.',
    rows,
    limitations: 'State preservation and declared dimensions only. Does not establish geodesic capture accuracy beyond the recorded ratios, calibrated color, printed numerical resolution or coverage of every control/aspect/hardware.',
  };
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, 'validation/results/photon-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
