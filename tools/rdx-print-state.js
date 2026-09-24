// Export real RDX instances at 8 x 8 inches, 300 ppi; verify exact float32 state preservation.
// Test-only instrumentation reads the actual solver textures. It never changes production code.
// Setup: Playwright + Chromium per BUILDING.md.
// Run: node tools/rdx-print-state.js --write
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  let source = fs.readFileSync(path.join(root, 'src/modules/rdx.js'), 'utf8');
  const marker = 'fieldCells() { return gw && gh ? [gw, gh] : null; },';
  assert.equal(source.split(marker).length, 2, 'Expected one fieldCells hook');
  source = source.replace(
    marker,
    `auditAdvance(n) { stop(); step(n); },
        auditSnapshot() {
          if (texType !== 'rgba32f') throw Error('Print-state benchmark requires float32');
          const pixels = new Float32Array(gw * gh * 4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, C.read.fbo);
          gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.FLOAT, pixels);
          if (gl.getError() !== gl.NO_ERROR) throw Error('Readback failed');
          return pixels;
        },
        ${marker}`
  );

  const ids = ['excitable', 'turing', 'cyclic', 'chemotaxis', 'vegetation'];
  const browser = await chromium.launch({
    args: glArgs(),
  });
  const rows = [];
  try {
    for (const id of ids) {
      const page = await browser.newPage();
      try {
        await page.goto('file://' + path.join(root, 'dist/studio.html') + '#three-vortex-bound/print-state');
        await page.evaluate(source);
        rows.push(
          await page.evaluate(async (id) => {
            const mod = Studio.modules[id];
            if (!mod) throw Error('missing module ' + id);
            const pal = Studio.PALETTES[mod.defaultPalette];
            const state = {
              ...mod.defaults,
              grid: 256,
              warmup: 0,
              running: false,
              palette: pal.colors,
              bg: pal.bg,
              noise: 0,
            };
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
            const before = instance.auditSnapshot();
            const cells = instance.fieldCells();
            const blob = await instance.exportPNG(2400, 2400);
            const image = await createImageBitmap(blob);
            const after = instance.auditSnapshot();
            let changes = 0,
              nonfinite = 0,
              nonzero = 0;
            for (let i = 0; i < before.length; i++) {
              if (before[i] !== after[i]) changes++;
              if (!Number.isFinite(before[i]) || !Number.isFinite(after[i])) nonfinite++;
              if (before[i] !== 0) nonzero++;
            }
            const accept = (r) =>
              r.width === 2400 &&
              r.height === 2400 &&
              r.bytes > 1000 &&
              r.changes === 0 &&
              r.nonfinite === 0;
            const ok = {
              width: image.width,
              height: image.height,
              bytes: blob.size,
              changes,
              nonfinite,
            };
            image.close();
            if (!accept(ok)) throw Error('Export changed state or dimensions: ' + JSON.stringify(ok));

            // Deliberate wrong path: advance the real solver after producing the PNG.
            const pre = instance.auditSnapshot();
            const badBlob = await instance.exportPNG(2400, 2400);
            instance.auditAdvance(1);
            const badImage = await createImageBitmap(badBlob);
            let badChanges = 0,
              badNonfinite = 0;
            const post = instance.auditSnapshot();
            for (let i = 0; i < pre.length; i++) {
              if (pre[i] !== post[i]) badChanges++;
              if (!Number.isFinite(pre[i]) || !Number.isFinite(post[i])) badNonfinite++;
            }
            const negative = {
              width: badImage.width,
              height: badImage.height,
              bytes: badBlob.size,
              changes: badChanges,
              nonfinite: badNonfinite,
            };
            badImage.close();
            instance.pause();
            if (accept(negative) || badChanges === 0) {
              throw Error('State-mutating export failure control escaped detection');
            }

            return {
              id,
              cells,
              width: ok.width,
              height: ok.height,
              bytes: ok.bytes,
              changes: ok.changes,
              nonfinite: ok.nonfinite,
              nonzero,
              failureControl: {
                description: 'Export wrapper advances the actual solver one step after producing the PNG',
                rejected: !accept(negative),
                changes: badChanges,
              },
            };
          }, id)
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
    assert.equal(r.changes, 0);
    assert.equal(r.nonfinite, 0);
    assert.deepEqual(r.cells, [256, 256]);
    assert(r.bytes > 1000);
    assert(r.nonzero > 0, r.id + ' field was all zeros');
    assert.equal(r.failureControl.rejected, true);
    assert(r.failureControl.changes > 0);
  }

  const out = {
    scope:
      'Paused initial 256x256 float32 RDX fields exported through each real module exportPNG to 2400x2400 (8 in at 300 ppi). Checks state preservation and dimensions, not nonlinear pattern fidelity or colorimetric print accuracy.',
    limitations:
      'Preservation and dimensions only on SwiftShader float32 paused initial fields at grid 256. Does not establish nonlinear pattern fidelity, colorimetric print accuracy, float16 fallback, evolved states, other grids/hardware, noise, or running exports.',
    reviewed: new Date().toISOString().slice(0, 10),
    command: 'node tools/rdx-print-state.js --write',
    rows,
  };
  const dest = path.join(root, 'validation/results/rdx-print-state.json');
  if (process.argv.includes('--write')) {
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
