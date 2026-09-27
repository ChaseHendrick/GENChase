// Regression check for the metadata returned by the real Fisher-KPP data export.
// node tools/fisher-kpp-metadata-check.js (build first; Playwright + Chromium required)
const assert = require('node:assert/strict');
const path = require('node:path');
const { glArgs } = require('./lib/gl-args');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: glArgs() });
  try {
    const page = await browser.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../dist/studio.html') + '#three-vortex-bound/fisher-kpp-metadata');
    const rows = await page.evaluate(async () => {
      const mod = Studio.modules['fisher-kpp'], pal = Studio.PALETTES.kiln;
      return Promise.all([
        { grid: 512, mu: '1/6', D: 1 },
        { grid: 256, mu: '1/4', D: 2 },
        { grid: 384, mu: '3/10', D: 0.5 },
      ].map(async over => {
        const state = Object.assign({}, mod.defaults, { palette: pal.colors, bg: pal.bg }, over);
        mod.sanitize(state);
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
        const inst = mod.create({ canvas, getState: () => state, setStatus() {}, setWitness() {},
          isActive: () => false, reducedMotion: () => true, requestRepaint() {}, fault(m) { throw Error(m); } });
        inst.regenerate(); inst.pause();
        const meta = (await inst.exportData()).meta;
        return { requested: over, grid: inst.fieldCells(), meta };
      }));
    });
    for (const { requested, grid, meta } of rows) {
      assert.deepEqual(grid, [requested.grid, requested.grid]);
      assert.deepEqual(meta.grid, grid);
      assert.match(meta.scheme, /forward Euler diffusion with the 9-point Mehrstellen Laplacian/);
      assert.match(meta.scheme, /D dt\/h\^2 = mu, then the exact logistic flow over dt/);
      assert.equal(typeof meta.mu, 'number');
      const [num, den] = requested.mu.split('/').map(Number);
      assert.ok(Math.abs(meta.mu - num / den) < 1e-14, 'mu must reflect the selected timestep');
      assert.equal(meta.mu, meta.D * meta.dt / (meta.cell * meta.cell));
    }
    console.log('PASS fisher-kpp metadata: real exports at grids 512, 256, 384 with three diffusion numbers');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
