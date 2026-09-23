// Export real BEC instances at 8 x 8 inches, 300 ppi; verify exact float32 state preservation.
// Test-only instrumentation reads the actual solver texture. It never changes production code.
// Setup: Playwright + Chromium per BUILDING.md.
// Run: node tools/bec-print-state.js --write
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  let source = fs.readFileSync(path.join(root, 'src/modules/bec.js'), 'utf8');
  const marker = 'fieldCells() { return gw && gh ? [gw, gh] : null; },';
  assert.equal(source.split(marker).length, 2, 'Expected one fieldCells hook');
  source = source.replace(
    marker,
    `auditAdvance(n) { stop(); step(n); },
        auditSnapshot() {
          if (texType !== 'rgba32f') throw Error('Print-state benchmark requires float32');
          if (!P) throw Error('no field');
          const pixels = new Float32Array(gw * gh * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, P.read.fbo);
          gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.FLOAT, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Readback failed');
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          return {
            pixels,
            cells: [gw, gh],
            settings: JSON.stringify(host.getState()),
            metadata: { stepCount, raf, chunkTimer, normV, maxV, refDens, vortAt },
          };
        },
        ${marker}`
  );

  const views = ['density', 'phase', 'both', 'vortices'];
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const rows = [];
  try {
    for (const view of views) {
      const page = await browser.newPage();
      try {
        await page.goto('file://' + path.join(root, 'dist/studio.html') + '#bec/bec-print-state');
        await page.evaluate(source);
        rows.push(
          await page.evaluate(async (view) => {
            const mod = Studio.modules.bec;
            if (!mod) throw Error('missing module bec');
            const pal = Studio.PALETTES[mod.defaultPalette];
            const state = {
              ...mod.defaults,
              mode: 'ground',
              grid: 256,
              omega: 0,
              g: 600,
              half: 9,
              trap: 1,
              startNoise: 0.2,
              warmup: 0,
              running: false,
              steps: 40,
              dtScale: 0.35,
              view,
              seed: 'bec-print-state/' + view,
              palette: pal.colors,
              bg: pal.bg,
            };
            mod.sanitize(state);
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const instance = mod.create({
              canvas,
              getState: () => state,
              setStatus() {},
              isActive: () => false,
              reducedMotion: () => true,
              requestRepaint() {},
              fault(msg) {
                throw Error(msg);
              },
            });
            instance.regenerate();
            instance.pause();

            function compare(before, after) {
              if (before.pixels.length !== after.pixels.length) throw Error('Field size changed');
              const ab = new Uint32Array(before.pixels.buffer);
              const bb = new Uint32Array(after.pixels.buffer);
              let changedWords = 0, nonfinite = 0, nonzero = 0;
              for (let i = 0; i < before.pixels.length; i++) {
                if (ab[i] !== bb[i]) changedWords++;
                if (!Number.isFinite(before.pixels[i]) || !Number.isFinite(after.pixels[i])) nonfinite++;
                if (before.pixels[i] !== 0) nonzero++;
              }
              return {
                changedWords,
                nonfinite,
                nonzero,
                words: before.pixels.length,
                cellsChanged: JSON.stringify(before.cells) !== JSON.stringify(after.cells),
                settingsChanged: before.settings !== after.settings,
                metadataChanged: JSON.stringify(before.metadata) !== JSON.stringify(after.metadata),
              };
            }
            function accept(r) {
              return (
                r.width === 2400 &&
                r.height === 2400 &&
                r.bytes > 1000 &&
                r.comparison.changedWords === 0 &&
                r.comparison.nonfinite === 0 &&
                !r.comparison.cellsChanged &&
                !r.comparison.settingsChanged &&
                !r.comparison.metadataChanged
              );
            }

            const before = instance.auditSnapshot();
            if (before.cells[0] !== 256 || before.cells[1] !== 256) {
              throw Error('Expected 256 grid: ' + JSON.stringify(before.cells));
            }
            const blob = await instance.exportPNG(2400, 2400);
            const image = await createImageBitmap(blob);
            const after = instance.auditSnapshot();
            const ok = {
              width: image.width,
              height: image.height,
              bytes: blob.size,
              comparison: compare(before, after),
            };
            image.close();
            if (!accept(ok)) throw Error('Export changed state or dimensions: ' + JSON.stringify(ok));
            if (!(ok.comparison.nonzero > 0)) throw Error('Seeded field was all zeros');

            // Deliberate wrong path: advance the real solver after producing the PNG.
            const pre = instance.auditSnapshot();
            const badBlob = await instance.exportPNG(2400, 2400);
            instance.auditAdvance(1);
            const badImage = await createImageBitmap(badBlob);
            const negative = {
              width: badImage.width,
              height: badImage.height,
              bytes: badBlob.size,
              comparison: compare(pre, instance.auditSnapshot()),
            };
            badImage.close();
            instance.pause();
            if (accept(negative) || negative.comparison.changedWords === 0) {
              throw Error('State-mutating export failure control escaped detection');
            }

            return {
              id: 'bec',
              view,
              cells: before.cells,
              width: ok.width,
              height: ok.height,
              bytes: ok.bytes,
              changedWords: ok.comparison.changedWords,
              nonfinite: ok.comparison.nonfinite,
              nonzero: ok.comparison.nonzero,
              failureControl: {
                description: 'Export wrapper advances the actual solver one step after producing the PNG',
                rejected: !accept(negative),
                changedWords: negative.comparison.changedWords,
              },
            };
          }, view)
        );
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  for (const r of rows) {
    assert.equal(r.width, 2400);
    assert.equal(r.height, 2400);
    assert.equal(r.changedWords, 0);
    assert.equal(r.nonfinite, 0);
    assert.deepEqual(r.cells, [256, 256]);
    assert(r.bytes > 1000);
    assert(r.nonzero > 0, r.view + ' field was all zeros');
    assert.equal(r.failureControl.rejected, true);
    assert(r.failureControl.changedWords > 0);
  }

  const out = {
    scope:
      'Paused initial 256x256 float32 BEC/GPE fields (ground mode, Ω=0, Thomas–Fermi seed) exported through the real module exportPNG to 2400x2400 (8 in at 300 ppi) for density, phase, both and vortices views. Checks exact float32 PingPong read-texture preservation, cells, settings and solver metadata, plus a deliberate state-mutating export control.',
    limitations:
      'Preservation and dimensions only on SwiftShader float32 paused initial fields at grid 256 with Ω=0 and warmup 0. Does not establish vortex-lattice fidelity, colorimetric print accuracy, float16 fallback, evolved/rotating states, other grids/hardware, or running exports.',
    reviewed: new Date().toISOString().slice(0, 10),
    command: 'node tools/bec-print-state.js --write',
    rows,
  };
  const dest = path.join(root, 'validation/results/bec-print-state.json');
  if (process.argv.includes('--write')) {
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
