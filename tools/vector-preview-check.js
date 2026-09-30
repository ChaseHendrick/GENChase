'use strict';
// Compare real canvas painting with the PNG exported by the studio's preferred SVG path.
// Grain is disabled: SVG intentionally does not reproduce the raster film-grain finish.
const assert = require('node:assert/strict'), path = require('node:path');
const { glArgs } = require('./lib/gl-args');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: glArgs() });
  const rows = [];
  try {
    for (const [id, view, bg] of [
      ['hl', 'outline', '#121110'], ['hl', 'outline', '#f4f0e8'],
      ['hl', 'age', '#121110'], ['hl', 'fill', '#121110'],
      ['smectic', 'layers', '#090c10'], ['smectic', 'ellipses', '#f4f0e8'], ['smectic', 'both', '#090c10'],
    ]) {
      const page = await browser.newPage();
      try {
        const seed = id === 'hl' ? 'hastings-1998' : 'friedel-1910';
        const payload = Buffer.from(JSON.stringify({ v: 8, grain: 0, view, bg })).toString('base64url');
        await page.goto('file://' + path.resolve(__dirname, '../dist/studio.html') + '#' + id + '/' + seed + '/' + payload);
        await page.evaluate(() => Studio.ready);
        await page.waitForFunction(id => Studio.getRecipe()?.id === id && document.getElementById('status').textContent.includes(id === 'hl' ? 'particles' : 'domains'), id);
        const before = await page.evaluate(() => Studio.getRecipe());
        assert.equal(before.view || (id === 'hl' ? 'outline' : 'layers'), view, 'Requested view was sanitized away');
        await page.selectOption('#export-inches', 'custom');
        await page.fill('#export-width', '4'); await page.fill('#export-height', '4');
        await page.locator('#export-height').press('Tab');
        await page.selectOption('#export-dpi', '300');
        await page.click('#btn-export');
        await page.waitForFunction(() => !Studio.exportJob && !document.getElementById('export-img').hidden);
        const row = await page.evaluate(async ({ id, view, bg }) => {
          const image = document.getElementById('export-img'); await image.decode();
          const recipe = Studio.getRecipe(), mod = Studio.modules[id];
          const state = { ...mod.defaults, ...recipe, grain: 0 };
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1200;
          const instance = mod.create({ canvas, getState: () => state, setStatus() {}, isActive: () => false, reducedMotion: () => true, requestRepaint() {} });
          instance.regenerate(); instance.pause?.();
          const expected = canvas.getContext('2d').getImageData(0, 0, 1200, 1200).data;
          const out = document.createElement('canvas'); out.width = out.height = 1200;
          const ctx = out.getContext('2d'); ctx.drawImage(image, 0, 0);
          const actual = ctx.getImageData(0, 0, 1200, 1200).data;
          const ground = Studio.util.hexToRgb(bg);
          function compare(pixels) {
            let diff = 0, ink = 0, actualInk = 0;
            for (let i = 0; i < expected.length; i += 4) for (let c = 0; c < 3; c++) {
              diff += Math.abs(expected[i + c] - pixels[i + c]);
              ink += Math.abs(expected[i + c] - ground[c]);
              actualInk += Math.abs(pixels[i + c] - ground[c]);
            }
            return { relativeError: diff / Math.max(ink, 1), inkRatio: actualInk / Math.max(ink, 1) };
          }
          // A missing export must fail the same predicate, even for sparse art.
          const blank = new Uint8ClampedArray(actual.length);
          for (let i = 0; i < blank.length; i += 4) { blank.set(ground, i); blank[i + 3] = 255; }
          let modulePng = null;
          if (id === 'smectic') {
            const bitmap = await createImageBitmap(await instance.exportPNG(1200, 1200));
            ctx.clearRect(0, 0, 1200, 1200); ctx.drawImage(bitmap, 0, 0); bitmap.close();
            modulePng = compare(ctx.getImageData(0, 0, 1200, 1200).data);
          }
          return { id, view, bg, width: image.naturalWidth, height: image.naturalHeight,
            vector: document.getElementById('export-note').textContent.includes('Rasterized from SVG'),
            ...compare(actual), negative: compare(blank), modulePng };
        }, { id, view, bg });
        const agrees = r => r.relativeError < 0.15 && r.inkRatio > 0.9 && r.inkRatio < 1.1;
        assert.equal(row.width, 1200); assert.equal(row.height, 1200); assert(row.vector);
        assert(agrees(row), 'Preview/export discrepancy: ' + JSON.stringify(row));
        assert(!agrees(row.negative), 'Blank negative control escaped');
        if (row.modulePng) assert(agrees(row.modulePng), 'Module PNG discrepancy: ' + JSON.stringify(row));
        assert.deepEqual(await page.evaluate(() => Studio.getRecipe()), before, 'Export changed recipe');
        rows.push(row);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ scope: 'Seven real UI PNG exports at 1200x1200 against same-size canvas painting; HL outline on dark/light backgrounds, age and fill; smectic layers, defects and both. Grain disabled. No scientific or calibrated-color validation.', rows }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
