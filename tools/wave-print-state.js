// Setup: install Playwright + Chromium as described in BUILDING.md.
// Run: node tools/wave-print-state.js > validation/results/wave-print-state.json
// Tests real exportPNG methods with read-only, test-only access to solver textures.
// This checks preservation of a paused scientific state, not physical or color accuracy.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

function instrument(source, stateName, targets, scalars) {
  const marker = `      exportPNG(w, h) { if (!${stateName})`;
  assert.equal(source.split(marker).length, 2, `Expected one ${stateName} export hook`);
  const hook = `      auditAdvance(n) { rig.stop(); step(n); },
      auditSnapshot() {
        if (rig.texType !== 'rgba32f') throw Error('Print-state benchmark requires float32');
        const targets = { ${targets} }, fields = {};
        for (const [name, target] of Object.entries(targets)) {
          if (target.w !== gw || target.h !== gh) throw Error('Unexpected dimensions for ' + name);
          const pixels = new Float32Array(target.w * target.h * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
          if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw Error('Incomplete ' + name);
          gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.FLOAT, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Readback failed for ' + name);
          fields[name] = pixels;
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return { fields, cells: [gw, gh], settings: JSON.stringify(host.getState()), metadata: { ${scalars}, stepCount: rig.stepCount, raf: rig.raf, chunkTimer: rig.chunkTimer } };
      },
${marker}`;
  return source.replace(marker, hook);
}

(async () => {
  const root = path.resolve(__dirname, '..');
  let source = fs.readFileSync(path.join(root, 'src/modules/wavesflow.js'), 'utf8');
  source = instrument(source, 'S', "wave: S.read, wavePrevious: S.write, potential: potT", 'nOff, norm0, normNow, expWhite, densWhite, simTime, staggerDt');
  source = instrument(source, 'F', "fluid: F.read, fluidPrevious: F.write, streamfunction: PSI.read, streamfunctionPrevious: PSI.write, velocity: velT", 'dx, wMax, gMax, nusselt, simTime');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const rows = [];
  try {
    for (const id of ['schrodinger', 'convection']) for (const grid of [128, 192]) {
      const page = await browser.newPage();
      try {
        await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/wave-print-state');
        await page.evaluate(source);
        rows.push(await page.evaluate(async ({ id, grid }) => {
          function compare(before, after) {
            const names = Object.keys(before.fields);
            if (JSON.stringify(names) !== JSON.stringify(Object.keys(after.fields))) throw Error('Field set changed');
            let changedWords = 0, nonfinite = 0, checkedWords = 0;
            const changedFields = [];
            for (const name of names) {
              const a = before.fields[name], b = after.fields[name];
              if (a.length !== b.length) throw Error('Field size changed: ' + name);
              const ab = new Uint32Array(a.buffer), bb = new Uint32Array(b.buffer);
              let changed = false;
              for (let i = 0; i < a.length; i++) {
                if (ab[i] !== bb[i]) { changedWords++; changed = true; }
                if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) nonfinite++;
              }
              checkedWords += a.length;
              if (changed) changedFields.push(name);
            }
            const metadataChanged = JSON.stringify(before.metadata) !== JSON.stringify(after.metadata);
            const metadataNonfinite = [...Object.values(before.metadata), ...Object.values(after.metadata)].filter(value => typeof value === 'number' && !Number.isFinite(value)).length;
            const cellsChanged = JSON.stringify(before.cells) !== JSON.stringify(after.cells);
            const settingsChanged = before.settings !== after.settings;
            return { changedWords, nonfinite, checkedWords, changedFields, metadataChanged, metadataNonfinite, cellsChanged, settingsChanged };
          }
          function accept(result) {
            return result.width === 2400 && result.height === 2400 && result.bytes > 1000 &&
              result.comparison.changedWords === 0 && result.comparison.nonfinite === 0 &&
              result.comparison.metadataNonfinite === 0 && !result.comparison.metadataChanged && !result.comparison.cellsChanged && !result.comparison.settingsChanged;
          }
          const mod = Studio.modules[id], pal = Studio.PALETTES[mod.defaultPalette];
          const state = { ...mod.defaults, grid, aspect: '1:1', warmup: 0, running: false, palette: pal.colors, bg: pal.bg };
          mod.sanitize(state);
          const canvas = document.createElement('canvas'); canvas.width = grid; canvas.height = grid;
          const instance = mod.create({ canvas, getState: () => state, setStatus() {}, isActive: () => false, reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw Error(msg); } });
          instance.regenerate(); instance.pause();
          const initial = instance.auditSnapshot();
          if (initial.cells[0] !== grid || initial.cells[1] !== grid) throw Error('Requested square grid was not retained');
          const views = id === 'schrodinger' ? ['detector', 'density', 'phase'] : ['temp', 'vort', 'schlieren', 'etched'];
          const exports = [];
          for (const steps of [0, 16]) {
            if (steps) instance.auditAdvance(steps);
            for (const view of views) {
              state.view = view;
              const before = instance.auditSnapshot();
              const blob = await instance.exportPNG(2400, 2400);
              const bitmap = await createImageBitmap(blob);
              const after = instance.auditSnapshot();
              const result = { steps, view, time: before.metadata.simTime, width: bitmap.width, height: bitmap.height, bytes: blob.size, comparison: compare(before, after) };
              bitmap.close();
              if (!accept(result)) throw Error('Export changed state or dimensions: ' + JSON.stringify(result));
              exports.push(result);
            }
          }
          const evolved = instance.auditSnapshot(), evolution = compare(initial, evolved);
          if (!evolution.changedWords || !evolution.metadataChanged) throw Error('Evolved fixture did not evolve');
          let detectorDose = null;
          if (id === 'schrodinger') {
            detectorDose = 0;
            for (let i = 2; i < evolved.fields.wave.length; i += 4) detectorDose += evolved.fields.wave[i];
            if (!(detectorDose > 0 && Number.isFinite(detectorDose))) throw Error('Detector did not accumulate');
          }
          // Deliberately broken export advances the actual solver once after producing its PNG.
          // The identical acceptance predicate must reject this plausible state-mutating bug.
          const before = instance.auditSnapshot();
          const faultyExport = async () => { const blob = await instance.exportPNG(2400, 2400); instance.auditAdvance(1); return blob; };
          const blob = await faultyExport(), bitmap = await createImageBitmap(blob);
          const negative = { width: bitmap.width, height: bitmap.height, bytes: blob.size, comparison: compare(before, instance.auditSnapshot()) };
          bitmap.close(); instance.pause();
          if (accept(negative) || !negative.comparison.changedWords) throw Error('State-mutating export failure control escaped detection');
          return { id, requestedGrid: grid, cells: initial.cells, precision: 'rgba32f', dt: state.dt, seed: state.seed, fields: Object.keys(initial.fields), metadataFields: Object.keys(initial.metadata), detectorDose, exports, failureControl: { description: 'Export wrapper advances the actual solver one step after producing the PNG', rejected: !accept(negative), comparison: negative.comparison } };
        }, { id, grid }));
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  for (const row of rows) {
    assert.deepEqual(row.cells, [row.requestedGrid, row.requestedGrid]);
    assert([128, 192].includes(row.requestedGrid));
    assert.equal(row.failureControl.rejected, true);
  }
  console.log(JSON.stringify({
    scope: 'Actual module exportPNG to 2400x2400 pixels (8 inches at 300 ppi), on initial and 16-step evolved paused square fields at 128 and 192 cells per side, for every current view. Compares exact float32 words in both ping-pong textures and all other solver textures, plus settings, solver time, counters and measurement scalars; includes nonzero Schrodinger detector history and a state-mutating export failure control.',
    limitations: 'Preservation and dimensions only, not numerical PDE accuracy, print color fidelity, pixel-level renderer correctness or added physical resolution. Fixed default physical parameters and seeds, square aspect, float32 SwiftShader; no running exports, float16 fallback, other devices, longer trajectories, other parameters or aspect ratios.',
    rows,
  }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
