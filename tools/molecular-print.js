// Exercise actual shell print export and the module's raster/vector paths.
// Requires Playwright and a browser; see validation/MOLECULAR.md.
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..'), temp = path.join(root, '.molecular-print-test.html');
  const source = fs.readFileSync(path.join(root, 'src/modules/molecular.js'), 'utf8');
  const marker = '      return {\n        aspect()'; assert(source.includes(marker));
  const instrumented = source.replace(marker, `      return globalThis.molecularAudit = {
        audit() { return { step: sim.step, remaining, halted: sim.halted, x: [...sim.x], y: [...sim.y], vx: [...sim.vx], vy: [...sim.vy], fx: [...sim.fx], fy: [...sim.fy], energy: sim.kinetic + sim.potential }; },
        auditStop() {
          sim = makeSim({ ...host.getState(), n: 4, density: .01 });
          sim.x.set([1, 2, 6, 12]); sim.y.set([.3, .3, 6, 12]);
          sim.vx.set([250, -250, 0, 0]); sim.vy.fill(0); sim.reference();
          const before = JSON.stringify(this.audit()); sim.advance(1); draw();
          return { before, after: JSON.stringify(this.audit()), message: sim.halted };
        },
        aspect()`);
  const built = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8'); assert(built.includes(source));
  fs.writeFileSync(temp, built.replace(source, instrumented));
  let browser;
  try {
    browser = await chromium.launch({ args: glArgs() });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + temp + '#molecular/molecular-print');
    await page.waitForFunction(() => window.molecularAudit && !molecularAudit.audit().remaining, null, { timeout: 120000 });
    const rows = [];
    for (const fixture of [{ links: false, n: 1024, warmup: 1000 }, { links: true, n: 1024, warmup: 300 }, { links: false, n: 4096, warmup: 1000 }]) {
      const { links } = fixture;
      // Restore using the real hash and wait for the requested complete state.
      const encoded = Buffer.from(JSON.stringify({ v: 2, ...fixture, running: false })).toString('base64url');
      await page.goto('file://' + temp + '#molecular/molecular-print/' + encoded);
      await page.waitForFunction(f => {
        const a = window.molecularAudit && molecularAudit.audit();
        return a && a.x.length === f.n && a.step === f.warmup && !a.remaining;
      }, fixture, { timeout: 120000 });
      rows.push(await page.evaluate(async links => {
        const instance = molecularAudit; instance.pause();
        const before = JSON.stringify(instance.audit());
        const tests = [];
        for (const [w, h] of [[2400, 2400], [2400, 1800]]) {
          const png = await instance.exportPNG(w, h), svg = instance.exportSVG(w, h);
          const a = await createImageBitmap(png);
          const image = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          image.src = url; await image.decode();
          const c = document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * h / w);
          const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(a, 0, 0, c.width, c.height);
          const pixels = g.getImageData(0, 0, c.width, c.height).data;
          // Rasterize SVG at the same print resolution before reducing both;
          // direct SVG-to-thumbnail rendering uses a different antialias filter.
          const svgCanvas = document.createElement('canvas'); svgCanvas.width = w; svgCanvas.height = h;
          svgCanvas.getContext('2d').drawImage(image, 0, 0, w, h);
          g.clearRect(0, 0, c.width, c.height); g.drawImage(svgCanvas, 0, 0, c.width, c.height);
          const vector = g.getImageData(0, 0, c.width, c.height).data;
          let difference = 0;
          for (let i = 0; i < pixels.length; i += 4) for (let k = 0; k < 3; k++) difference += Math.abs(pixels[i + k] - vector[i + k]);
          tests.push({ requested: [w, h], width: a.width, height: a.height, svgWidth: image.naturalWidth, svgHeight: image.naturalHeight, pngBytes: png.size, svgBytes: svg.length, rasterVectorMAD: difference / (pixels.length * .75) });
          a.close(); URL.revokeObjectURL(url);
        }
        return { links, n: instance.audit().x.length, steps: instance.audit().step, tests, unchanged: before === JSON.stringify(instance.audit()), halted: instance.audit().halted };
      }, links));
    }
    // Drive the user's actual print button and dimensions controls.
    const shellBefore = await page.evaluate(() => JSON.stringify(molecularAudit.audit()));
    await page.evaluate(() => {
      for (const [id, value] of [['export-inches', '8'], ['export-dpi', '300']]) {
        const el = document.getElementById(id); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('btn-export').click();
    });
    await page.waitForFunction(() => {
      const i = document.getElementById('export-img'); return i && !i.hidden && i.naturalWidth > 0;
    }, null, { timeout: 120000 });
    const shell = await page.evaluate(before => {
      const img = document.getElementById('export-img');
      return { width: img.naturalWidth, height: img.naturalHeight, note: document.getElementById('export-note').textContent, unchanged: before === JSON.stringify(molecularAudit.audit()) };
    }, shellBefore);
    assert.equal(shell.width, 2400); assert.equal(shell.height, 2400); assert(shell.unchanged);
    for (const r of rows) {
      assert(r.unchanged); assert.equal(r.halted, '');
      for (const t of r.tests) {
        assert.deepEqual([t.width, t.height], t.requested);
        assert.deepEqual([t.svgWidth, t.svgHeight], t.requested);
        assert(t.rasterVectorMAD < 1.5, JSON.stringify(t));
      }
    }
    assert.deepEqual(errors, []);
    const liveBefore = await page.evaluate(() => {
      document.getElementById('export-close').click(); molecularAudit.resume();
      const before = molecularAudit.audit().step; document.getElementById('p-molecular-running').click(); return before;
    });
    await page.waitForFunction(n => molecularAudit.audit().step > n + 4, liveBefore, { timeout: 30000 });
    const pausedAt = await page.evaluate(() => { document.getElementById('p-molecular-running').click(); return molecularAudit.audit().step; });
    await page.waitForTimeout(200);
    const pausedAfter = await page.evaluate(() => molecularAudit.audit().step);
    assert.equal(pausedAt, pausedAfter);
    const stop = await page.evaluate(() => {
      const result = molecularAudit.auditStop(), before = JSON.parse(result.before), after = JSON.parse(result.after);
      delete before.halted; delete after.halted;
      return { message: result.message, status: document.getElementById('status').textContent, rolledBack: JSON.stringify(before) === JSON.stringify(after) };
    });
    assert(stop.rolledBack); assert(stop.status.includes('Stopped:')); assert(stop.status.includes('Unresolved close approach'));
    const result = { scope: 'Paused actual browser module at a seeded evolved state. Raster and vector 2400px square/non-square exports, actual 8-inch 300-ppi shell print, exact position/velocity/force/energy/step preservation. Real running control advances and pauses. Injected collision fixture checks visible failure and rollback. No claim about physical experimental agreement.', rows, shell, live: { before: liveBefore, pausedAt, pausedAfter }, stop, errors };
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/molecular-print.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); fs.rmSync(temp, { force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
