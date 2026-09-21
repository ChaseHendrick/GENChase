// Real-module field upload, paused print/state checks and shell controls.
// node tools/shallow-print.js [--write]
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..'), temp = path.join(root, '.shallow-print-test.html');
  const source = fs.readFileSync(path.join(root, 'src/modules/shallow.js'), 'utf8'), built = fs.readFileSync(path.join(root, 'studio.html'), 'utf8');
  const marker = '    return {\n      aspect(s)'; assert(source.includes(marker) && built.includes(source));
  const instrumented = source.replace(marker, `    return globalThis.shallowAudit = {
      audit() { return { nx:sim.nx, ny:sim.ny, step:sim.step, time:sim.time, lastDt:sim.lastDt, remaining, halted:sim.halted, h:[...sim.h], mx:[...sim.mx], my:[...sim.my], mass:sim.mass, energy:sim.energy }; },
      auditTexture() {
        const pixels=new Float32Array(sim.h.length*4); gl.bindFramebuffer(gl.FRAMEBUFFER,texture.fbo);
        gl.readPixels(0,0,sim.nx,sim.ny,gl.RGBA,gl.FLOAT,pixels); if(gl.getError()!==gl.NO_ERROR)throw Error('Field readback failed');
        let maxError=0; const speed=host.getState().view==='speed';
        for(let i=0;i<sim.h.length;i++)maxError=Math.max(maxError,Math.abs(pixels[4*i]-Math.fround(speed?Math.hypot(sim.mx[i],sim.my[i])/sim.h[i]:sim.h[i])));
        return {maxError,displayCells:[sim.nx,sim.ny]};
      },
      auditStop() {
        sim.h[0]=0; const before=JSON.stringify(this.audit()); sim.advance(1); draw();
        return {before,after:JSON.stringify(this.audit()),message:sim.halted};
      },
      aspect(s)`);
  fs.writeFileSync(temp, built.replace(source, instrumented)); let browser;
  try {
    browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }), errors = [], rows = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const fixture of [{ grid: 128, aspect: '1:1', view: 'depth', warmup: 180 },
      { grid: 128, aspect: '4:5', view: 'speed', boundary: 'walls', warmup: 180 },
      { grid: 512, aspect: '1:1', view: 'depth', warmup: 60 }]) {
      const encoded = Buffer.from(JSON.stringify({ v: 2, ...fixture, running: false })).toString('base64url');
      await page.goto('file://' + temp + '#shallow/shallow-print/' + encoded);
      await page.waitForFunction(f => {
        const a = globalThis.shallowAudit?.audit(); return a && a.nx === f.grid && a.step === f.warmup && a.remaining === 0;
      }, fixture, { timeout: 120000 });
      rows.push(await page.evaluate(async fixture => {
        const inst = shallowAudit; inst.pause(); const before = JSON.stringify(inst.audit()), texture = inst.auditTexture();
        const display = [...document.querySelectorAll('canvas')].find(c => c.offsetParent && c.width > 100), tests = [];
        for (const [w, h] of [[2400, 2400], [2400, 1800]]) {
          const blob = await inst.exportPNG(w, h), bitmap = await createImageBitmap(blob);
          const c = document.createElement('canvas'); c.width = 400; c.height = Math.round(400 * h / w);
          const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bitmap, 0, 0, c.width, c.height);
          const printed = ctx.getImageData(0, 0, c.width, c.height).data;
          ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(display, 0, 0, c.width, c.height);
          const shown = ctx.getImageData(0, 0, c.width, c.height).data; let diff = 0;
          for (let i = 0; i < shown.length; i += 4) for (let k = 0; k < 3; k++) diff += Math.abs(shown[i + k] - printed[i + k]);
          tests.push({ requested: [w, h], width: bitmap.width, height: bitmap.height, bytes: blob.size, displayPrintMAD: diff / (shown.length * .75) }); bitmap.close();
        }
        return { fixture, time: inst.audit().time, texture, tests, unchanged: before === JSON.stringify(inst.audit()), halted: inst.audit().halted };
      }, fixture));
    }
    const before = await page.evaluate(() => JSON.stringify(shallowAudit.audit()));
    await page.evaluate(() => {
      for (const [id, value] of [['export-inches', '8'], ['export-dpi', '300']]) {
        const e = document.getElementById(id); e.value = value; e.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('btn-export').click();
    });
    await page.waitForFunction(() => { const i = document.getElementById('export-img'); return i && !i.hidden && i.naturalWidth > 0; }, null, { timeout: 120000 });
    const shell = await page.evaluate(before => {
      const img = document.getElementById('export-img'); return { width: img.naturalWidth, height: img.naturalHeight,
        note: document.getElementById('export-note').textContent, unchanged: before === JSON.stringify(shallowAudit.audit()) };
    }, before);
    assert.equal(shell.width, 2400); assert.equal(shell.height, 2400); assert(shell.unchanged);
    for (const row of rows) {
      assert(row.unchanged); assert.equal(row.halted, ''); assert.equal(row.texture.maxError, 0);
      for (const t of row.tests) { assert.deepEqual([t.width, t.height], t.requested); assert(t.displayPrintMAD < 2, JSON.stringify(t)); }
    }
    const liveBefore = await page.evaluate(() => {
      document.getElementById('export-close').click(); shallowAudit.resume();
      const n = shallowAudit.audit().step; document.getElementById('p-shallow-running').click(); return n;
    });
    await page.waitForFunction(n => shallowAudit.audit().step >= n + 4, liveBefore, { timeout: 30000 });
    const pausedAt = await page.evaluate(() => { document.getElementById('p-shallow-running').click(); return shallowAudit.audit().step; });
    await page.waitForTimeout(200); const pausedAfter = await page.evaluate(() => shallowAudit.audit().step); assert.equal(pausedAt, pausedAfter);
    const stop = await page.evaluate(() => {
      const r = shallowAudit.auditStop(), before = JSON.parse(r.before), after = JSON.parse(r.after); delete before.halted; delete after.halted;
      return { unchanged: JSON.stringify(before) === JSON.stringify(after), message: r.message, status: document.getElementById('status').textContent };
    });
    assert(stop.unchanged && stop.status.includes('Stopped:') && stop.message.includes('dry'));
    assert.deepEqual(errors, []);
    const result = { scope: 'Actual paused evolved module, depth/speed display texture equals rounded Float64 solver state, square and non-square 2400px raster exports preserve complete physical state, actual shell print/live/pause/visible-stop controls. Interpolation does not add physical resolution.',
      sourceSHA256: crypto.createHash('sha256').update(source).digest('hex'), rows, shell, live: { before: liveBefore, pausedAt, pausedAfter }, stop, errors };
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/shallow-print.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); fs.rmSync(temp, { force: true }); }
})().catch(e => { console.error(e); process.exitCode = 1; });
