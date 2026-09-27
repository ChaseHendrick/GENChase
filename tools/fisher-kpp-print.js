// Print-path evidence for the fisher-kpp tab: the real module's exportPNG at 8 in x 300 ppi.
//
//   node tools/fisher-kpp-print.js [--write]
//
// 1. Preservation: exporting at 2400 x 2400 (and 2400 x 1600 for a 3:2 plate) leaves every float32 component of the
//    solver state bit-identical, in all four views, and returns exactly the requested dimensions.
// 2. Agreement: the print shows this state. A 2560 x 2560 export puts a pixel centre exactly on every cell centre
//    (5 pixels per cell on the 512 grid), where the Catmull-Rom interpolation returns the cell's own value; those
//    pixels must equal a one-pixel-per-cell render of the same state (grain and isochrone lines off, since both are
//    drawn per output pixel by design).
// 3. Controls: an export wrapper that advances the solver one step must be caught by (1); a print of a state 24 steps
//    later must be caught by (2).
// Setup: Playwright + Chromium per BUILDING.md.
const fs = require('node:fs'), path = require('node:path');
const { glArgs } = require('./lib/gl-args');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  let source = fs.readFileSync(path.join(root, 'src/modules/fisher-kpp.js'), 'utf8');
  const marker = 'fieldCells() { return fine ? [fine.W, fine.H] : null; },';
  if (source.split(marker).length !== 2) throw Error('expected one fieldCells hook in fisher-kpp.js');
  // Test-only instrumentation: read the solver's own textures and step it. Production code is unchanged.
  source = source.replace(marker, marker + `
        auditInternals() { return { gl, readRaw, stepGrid, get fine() { return fine; }, get coarse() { return coarse; }, get steps() { return steps; }, get total() { return total; }, get dt() { return dt; } }; },`);
  const browser = await chromium.launch({ args: glArgs() });
  const page = await browser.newPage();
  const failures = [];
  let out;
  try {
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/fisher-kpp-print');
    await page.evaluate(source);
    out = await page.evaluate(async () => {
      const make = async over => {
        const mod = Studio.modules['fisher-kpp'], pal = Studio.PALETTES.kiln;
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
      const snap = I => I.readRaw(I.gl, I.fine.C.read);
      const same = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && !(Number.isNaN(a[i]) && Number.isNaN(b[i]))) n++; return n; };
      const pixels = async blob => {
        const bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0); bmp.close();
        return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
      };
      // largest channel difference between each cell centre of the fine print and the one-pixel-per-cell render
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
      const res = { preservation: [], agreement: null, controls: {} };

      // 1. preservation, every view, square and 3:2
      for (const [label, over, w, h] of [['rings, 2400 x 2400', { grain: 0.04 }, 2400, 2400], ['straight front 3:2, 2400 x 1600', { init: 'edge', radius: 6, aspect: '3:2', until: 60 }, 2400, 1600]]) {
        const { inst, state, I } = await make(over);
        for (const view of ['arrival', 'territory', 'density', 'relief']) {
          state.view = view;
          const before = snap(I), coarseBefore = I.coarse ? snap({ gl: I.gl, readRaw: I.readRaw, fine: I.coarse }) : null;
          const blob = await inst.exportPNG(w, h), bmp = await createImageBitmap(blob);
          const after = snap(I), coarseAfter = I.coarse ? snap({ gl: I.gl, readRaw: I.readRaw, fine: I.coarse }) : null;
          res.preservation.push({ label, view, grid: [I.fine.W, I.fine.H], requested: [w, h], width: bmp.width, height: bmp.height, bytes: blob.size,
            changedComponents: same(before, after) + (coarseBefore ? same(coarseBefore, coarseAfter) : 0), steps: I.steps });
          bmp.close();
        }
        inst.pause();
      }
      // control for (1): an export wrapper that advances the real solver one step after rendering
      {
        const { inst, I } = await make({ until: 20 });
        const before = snap(I);
        await inst.exportPNG(2400, 2400);
        I.stepGrid(I.fine, I.steps, I.dt);
        res.controls.stateMutatingExport = { changedComponents: same(before, snap(I)) };
        res.controls.stateMutatingExport.rejected = res.controls.stateMutatingExport.changedComponents > 0;
      }
      // 2. agreement at cell centres, finished default plate, lines and grain off
      {
        const { inst, I } = await make({ grain: 0, lineAmt: 0 });
        const big = await pixels(await inst.exportPNG(2560, 2560)), small = await pixels(await inst.exportPNG(I.fine.W, I.fine.H));
        res.agreement = Object.assign({ grid: [I.fine.W, I.fine.H], print: [big.w, big.h], pixelsPerCell: 5, time: I.steps * I.dt }, compare(big, small, 5));
      }
      // control for (2): the print of a mid-invasion state set against the render of the same plate 24 steps later
      {
        const { inst, I } = await make({ grain: 0, lineAmt: 0, until: 24 });
        const big = await pixels(await inst.exportPNG(2560, 2560));
        for (let k = 0; k < 24; k++) I.stepGrid(I.fine, I.steps + k, I.dt);
        const small = await pixels(await inst.exportPNG(I.fine.W, I.fine.H));
        res.controls.laterState = compare(big, small, 5);
        res.controls.laterState.rejected = res.controls.laterState.fractionOver2Levels >= 0.005;
      }
      return res;
    });
  } finally { await browser.close(); }

  for (const p of out.preservation) if (p.changedComponents !== 0 || p.width !== p.requested[0] || p.height !== p.requested[1]) failures.push('preservation: ' + JSON.stringify(p));
  if (!out.controls.stateMutatingExport.rejected) failures.push('state-mutating export not caught');
  if (!(out.agreement.fractionOver2Levels < 0.005 && out.agreement.medianLevels === 0)) failures.push('agreement: ' + JSON.stringify(out.agreement));
  if (!out.controls.laterState.rejected) failures.push('a later state was not caught: ' + JSON.stringify(out.controls.laterState));
  const result = {
    scope: 'fisher-kpp exportPNG on SwiftShader float32: state preservation in all four views at 2400 x 2400 and 2400 x 1600, and agreement of the print with the state at every cell centre (2560 x 2560, five pixels per cell).',
    criteria: 'Zero changed float32 components in the plate grid and its half-resolution twin; exact requested dimensions; at cell centres, under 0.5% of cells differ from a one-pixel-per-cell render by more than 2 levels and the median difference is 0. Controls: a one-step state change after export and a state 24 steps later must both be caught.',
    limitations: 'Selected recipes on one renderer; no colorimetric or printer-profile claim. Grain and isochrone lines are drawn per output pixel and are excluded from the agreement test. A larger print adds pixels, not resolved physics: the field has the cells shown.',
    command: 'node tools/fisher-kpp-print.js --write',
    reviewed: new Date().toISOString().slice(0, 10),
    ...out, failures,
  };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/fisher-kpp-print.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) { console.error('FAIL\n  ' + failures.join('\n  ')); process.exitCode = 1; } else console.log('PASS fisher-kpp-print');
})().catch(e => { console.error(e); process.exitCode = 1; });
