// Print-path evidence for the cattaneo tab: the real module's exportPNG at 8 in x 300 ppi.
//
//   node tools/cattaneo-print.js [--write]
//
// 1. Preservation: exporting at 2400 x 2400 (and 2400 x 3000 for a 4:5 plate) leaves every float32 component of the
//    solver state (temperature and both face fluxes) bit-identical, in all three views, at exactly the requested size.
// 2. Agreement: a 2560 x 2560 export puts a pixel centre exactly on every cell centre of the 512 grid, where the
//    Catmull-Rom interpolation returns the cell's own value; those pixels must equal a one-pixel-per-cell render of the
//    same state (grain off, since it is drawn per output pixel).
// 3. Controls: an export wrapper that advances the solver one step must be caught by (1); a print of the state ten
//    steps later must be caught by (2).
// Setup: Playwright + Chromium per BUILDING.md.
const fs = require('node:fs'), path = require('node:path');
const { glArgs } = require('./lib/gl-args');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  let source = fs.readFileSync(path.join(root, 'src/modules/cattaneo.js'), 'utf8');
  const marker = 'fieldCells() { return C ? [W, H] : null; },';
  if (source.split(marker).length !== 2) throw Error('expected one fieldCells hook in cattaneo.js');
  // Test-only instrumentation: read the solver's own texture and step it. Production code is unchanged.
  source = source.replace(marker, marker + `
        auditInternals() { return { gl, readRaw, step, get C() { return C; }, get W() { return W; }, get H() { return H; }, get steps() { return steps; }, get total() { return total; }, setTotal(n) { total = n; } }; },`);
  const browser = await chromium.launch({ args: glArgs() });
  const page = await browser.newPage();
  const failures = [];
  let out;
  try {
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/cattaneo-print');
    await page.evaluate(source);
    out = await page.evaluate(async () => {
      const make = async over => {
        const mod = Studio.modules.cattaneo, pal = Studio.PALETTES.thermal;
        const state = Object.assign({}, mod.defaults, { palette: pal.colors, bg: pal.bg }, over || {});
        mod.sanitize(state);
        const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400;
        const inst = mod.create({ canvas, getState: () => state, setStatus() {}, setWitness() {}, isActive: () => false,
          reducedMotion: () => true, requestRepaint() {}, fault(m) { throw Error(m); } });
        const I = inst.auditInternals();
        inst.regenerate();
        while (I.steps < I.total) await new Promise(r => setTimeout(r, 200));
        await new Promise(r => setTimeout(r, 200));
        return { inst, state, I };
      };
      const snap = I => I.readRaw(I.gl, I.C.read);
      const same = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
      const pixels = async blob => {
        const bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0); bmp.close();
        return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
      };
      const compare = (big, small, k) => {
        let over2 = 0, maxd = 0; const hist = new Uint32Array(256);
        for (let y = 0; y < small.h; y++) for (let x = 0; x < small.w; x++) {
          const a = ((y * k + (k >> 1)) * big.w + x * k + (k >> 1)) * 4, b = (y * small.w + x) * 4;
          const d = Math.max(Math.abs(big.d[a] - small.d[b]), Math.abs(big.d[a + 1] - small.d[b + 1]), Math.abs(big.d[a + 2] - small.d[b + 2]));
          hist[d]++; if (d > 2) over2++; if (d > maxd) maxd = d;
        }
        const n = small.w * small.h; let acc = 0, median = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n / 2) { median = i; break; } }
        return { cells: n, fractionOver2Levels: over2 / n, maxLevels: maxd, medianLevels: median };
      };
      const res = { preservation: [], agreement: [], controls: {} };
      for (const [label, over, w, h] of [['sparks, 2400 x 2400', {}, 2400, 2400], ['torch 4:5, 2400 x 3000', { source: 'torch', aspect: '4:5' }, 2400, 3000]]) {
        const { inst, state, I } = await make(over);
        for (const view of ['temp', 'flux', 'relief']) {
          state.view = view; inst.repaint();
          const before = snap(I), blob = await inst.exportPNG(w, h), bmp = await createImageBitmap(blob), after = snap(I);
          res.preservation.push({ label, view, grid: [I.W, I.H], requested: [w, h], width: bmp.width, height: bmp.height, bytes: blob.size, changedComponents: same(before, after), steps: I.steps });
          bmp.close();
        }
      }
      {
        const { inst, I } = await make({});
        const before = snap(I);
        await inst.exportPNG(2400, 2400);
        I.setTotal(I.steps + 1); I.step(1);
        res.controls.stateMutatingExport = { changedComponents: same(before, snap(I)) };
        res.controls.stateMutatingExport.rejected = res.controls.stateMutatingExport.changedComponents > 0;
      }
      for (const view of ['temp', 'flux', 'relief']) {
        const { inst, state, I } = await make({ grain: 0 });
        state.view = view; inst.repaint();
        const big = await pixels(await inst.exportPNG(2560, 2560)), small = await pixels(await inst.exportPNG(I.W, I.H));
        res.agreement.push(Object.assign({ view, grid: [I.W, I.H], print: [big.w, big.h], pixelsPerCell: 5 }, compare(big, small, 5)));
        if (view === 'temp') {
          I.setTotal(I.steps + 10); I.step(10);
          const later = await pixels(await inst.exportPNG(I.W, I.H));
          res.controls.laterState = compare(big, later, 5);
          res.controls.laterState.rejected = res.controls.laterState.fractionOver2Levels >= 0.005;
        }
      }
      return res;
    });
  } finally { await browser.close(); }

  for (const p of out.preservation) if (p.changedComponents !== 0 || p.width !== p.requested[0] || p.height !== p.requested[1]) failures.push('preservation: ' + JSON.stringify(p));
  if (!out.controls.stateMutatingExport.rejected) failures.push('state-mutating export not caught');
  for (const a of out.agreement) if (!(a.fractionOver2Levels < 0.005 && a.medianLevels === 0)) failures.push('agreement: ' + JSON.stringify(a));
  if (!out.controls.laterState.rejected) failures.push('a later state was not caught: ' + JSON.stringify(out.controls.laterState));
  const result = {
    scope: 'cattaneo exportPNG on SwiftShader float32: state preservation in all three views at 2400 x 2400 and 2400 x 3000, and agreement of the print with the state at every cell centre (2560 x 2560, five pixels per cell) in each view.',
    criteria: 'Zero changed float32 components (temperature and both face fluxes); exact requested dimensions; at cell centres, under 0.5% of cells differ from a one-pixel-per-cell render by more than 2 levels and the median difference is 0. Controls: a one-step state change after export and the state ten steps later must both be caught.',
    limitations: 'Selected recipes on one renderer; no colorimetric or printer-profile claim. Grain is drawn per output pixel and excluded from the agreement test. The black and white points come from the field at the end of the run and are shared by both renders. A larger print adds pixels, not resolved physics.',
    command: 'node tools/cattaneo-print.js --write',
    reviewed: new Date().toISOString().slice(0, 10),
    ...out, failures,
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/cattaneo-print.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) { console.error('FAIL\n  ' + failures.join('\n  ')); process.exitCode = 1; } else console.log('PASS cattaneo-print');
})().catch(e => { console.error(e); process.exitCode = 1; });
