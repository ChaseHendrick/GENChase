// node tools/nonreciprocal-print.js [--write]
// Actual-instance preparation, complete state preservation, guard rollback and app exports.
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '..'), temp = path.join(root, '.nonreciprocal-print-test.html');
  const source = fs.readFileSync(path.join(root, 'src/modules/nonreciprocal.js'), 'utf8');
  const marker = '    return {\n      aspect:s=>ASPECTS'; assert(source.includes(marker));
  const instrumented = source.replace(marker, `    function auditPixels(t) {
      const values=new Float32Array(gw*gh*4);gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);
      gl.readPixels(0,0,gw,gh,gl.RGBA,gl.FLOAT,values);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      if(gl.getError()!==gl.NO_ERROR)throw Error('Audit readback failed');
      return Array.from(new Uint32Array(values.buffer));
    }
    return window.nrchInstance = {
      audit(full=false){return {steps,pending,dt,stopped,drift,grid:[gw,gh],mean:initialMean.slice(),
        ...(full?{recipe:host.getState(),readback:Array.from(new Uint32Array(readback.buffer)),buffers:[field.read,field.write,k1,k2,stage,backup].map(auditPixels)}:{})};},
      auditGuard(){stop();const z=new Float32Array(gw*gh*4);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){
        const p=4*(y*gw+x);z[p]=(x+y)%2?.4:-.4;z[p+3]=1;
      }field.read.upload(z);const before=JSON.stringify(auditPixels(field.read)),beforeSteps=steps;dt=.5;advance(1);render();status();
        return {restored:before===JSON.stringify(auditPixels(field.read)),stepsUnchanged:steps===beforeSteps,stopped};},
      aspect:s=>ASPECTS`);
  const built = fs.readFileSync(path.join(root, 'dist/studio.html'), 'utf8'); assert(built.includes(source), 'build the maintained module first');
  fs.writeFileSync(temp, built.replace(source, instrumented));
  let browser;
  try {
    browser = await chromium.launch({ args: glArgs() });
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + temp + '#nonreciprocal/print-audit');
    await page.waitForFunction(() => window.nrchInstance && nrchInstance.audit().pending === 0, null, { timeout: 120000 });
    const presets = await page.evaluate(() => Object.entries(Studio.modules.nonreciprocal.presets).map(([key, p]) => ({ key, p: p.p, palette: p.palette })));
    const rows = [];
    for (const { key, p, palette } of [{ key: 'default', p: {} }, ...presets]) {
      const settings = { v: 2, ...p, ...(palette ? { palette: palette.colors, bg: palette.bg } : {}), running: false },
        hash = '#nonreciprocal/print-audit/' + Buffer.from(JSON.stringify(settings)).toString('base64url');
      await page.goto('file://' + temp + hash);
      await page.waitForFunction(() => window.nrchInstance && nrchInstance.audit().pending === 0, null, { timeout: 120000 });
      rows.push(await page.evaluate(async key => {
        const instance = window.nrchInstance; instance.pause();
        const before = JSON.stringify(instance.audit(true)), state = instance.audit(), tests = [];
        for (const [w, h] of [[1200, 1200], [2400, 1800]]) {
          const blob = await instance.exportPNG(w, h), image = await createImageBitmap(blob);
          const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = Math.round(300 * h / w);
          const g = canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(image, 0, 0, canvas.width, canvas.height);
          const pixels = g.getImageData(0, 0, canvas.width, canvas.height).data, luminance = [];
          for (let i = 0; i < pixels.length; i += 4) luminance.push(.2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2]);
          luminance.sort((a, b) => a - b);
          const q = p => luminance[Math.floor(p * (luminance.length - 1))];
          tests.push({ requested: [w, h], dimensions: [image.width, image.height], bytes: blob.size,
            luminance: { p01: q(.01), p50: q(.5), p99: q(.99) } }); image.close();
        }
        return { preset: key, state, tests, everyBufferAndRecipeUnchanged: before === JSON.stringify(instance.audit(true)) };
      }, key));
    }
    const before = await page.evaluate(() => JSON.stringify(nrchInstance.audit(true)));
    await page.evaluate(() => {
      for (const [id, value] of [['export-inches', '8'], ['export-dpi', '300']]) {
        const element = document.getElementById(id); element.value = value; element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('btn-export').click();
    });
    await page.waitForFunction(() => { const image = document.getElementById('export-img'); return image && !image.hidden && image.naturalWidth > 0; }, null, { timeout: 120000 });
    const shell = await page.evaluate(before => {
      const image = document.getElementById('export-img');
      return { width: image.naturalWidth, height: image.naturalHeight, note: document.getElementById('export-note').textContent,
        everyBufferAndRecipeUnchanged: before === JSON.stringify(nrchInstance.audit(true)) };
    }, before);
    const guard = await page.evaluate(() => nrchInstance.auditGuard());
    assert.deepEqual(errors, []);
    for (const row of rows) {
      assert(!row.state.stopped && !row.state.pending && row.state.steps >= 128, row.preset + ' preparation completes');
      assert(row.state.drift < 2e-6, row.preset + ' means remain conserved');
      assert(row.everyBufferAndRecipeUnchanged, row.preset + ' print changes a numerical buffer or recipe');
      for (const test of row.tests) {
        assert.deepEqual(test.dimensions, test.requested);
        assert(test.luminance.p99 - test.luminance.p01 > 12, row.preset + ' print is blank');
      }
    }
    assert.equal(shell.width, 2400); assert.equal(shell.height, 2400); assert(shell.everyBufferAndRecipeUnchanged);
    assert(guard.restored && guard.stepsUnchanged && /Amplitude guard/.test(guard.stopped), 'unsafe-step guard must restore the last accepted field');
    const result = { schemaVersion: 1, date: new Date().toISOString().slice(0, 10), passed: true,
      source: 'src/modules/nonreciprocal.js', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
      criteria: { bitwisePreservationOfAllSixNumericalTargets: true, recipeAndCountersPreserved: true, exactDimensions: true,
        nonblankPercentileSpread: 12, meanDrift: 2e-6, rejectedBatchFieldAndStepRollback: true }, rows, shell, guard,
      limitations: ['Preserving a numerical field at print size does not add spatial resolution or establish paper accuracy.',
        'The unsafe-step guard fixture demonstrates rollback after one rejected batch, not global nonlinear stability.',
        'Actual app presets are prepared states; their appearance is not evidence of spontaneously selected phases.'] };
    if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/nonreciprocal-print.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); if (fs.existsSync(temp)) fs.unlinkSync(temp); }
})().catch(e => { console.error(e.stack || e); process.exitCode = 1; });
