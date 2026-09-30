// Actual same-seed CIMA to relief handoff with a deliberately pending initial GL fence.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright'), { glArgs } = require('./lib/gl-args');
const { pendingWork } = require('./check');
(async () => {
  const root = path.resolve(__dirname, '..');
  const studio = path.resolve(process.env.STUDIO || path.join(root, 'dist/studio.html'));
  const source = fs.readFileSync(process.env.RDX_SOURCE || path.join(root, 'src/modules/rdx.js'), 'utf8');
  const html = fs.readFileSync(studio, 'utf8'), sha = value => crypto.createHash('sha256').update(value).digest('hex');
  assert.ok(html.includes(source), 'Fixture must contain the declared RDX source');
  const browser = await chromium.launch({ args: glArgs() });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.removeItem('genchase.v1.history'); localStorage.setItem('genchase.v1.timeline', '0');
      const original = WebGL2RenderingContext.prototype.clientWaitSync;
      window.rdxHold = false; window.rdxHeldPolls = 0;
      WebGL2RenderingContext.prototype.clientWaitSync = function (...args) {
        if (window.rdxHold) { window.rdxHeldPolls++; return this.TIMEOUT_EXPIRED; }
        return original.apply(this, args);
      };
    });
    const payload = Buffer.from(JSON.stringify({ grid: 128, warmup: 32, running: false, grain: 0 })).toString('base64url');
    await page.goto('file://' + studio + '#turing/status-handoff/' + payload);
    await page.evaluate(() => Studio.ready);
    const waitDone = (model, steps) => page.waitForFunction(({ model, steps }) => {
      const text = document.getElementById('status').innerText;
      return text.includes(model) && /\bpaused\b/.test(text) && new RegExp('\\bstep\\s+' + steps.toLocaleString('en-US') + '\\b').test(text);
    }, { model, steps }, { timeout: 60000 });
    await waitDone('Schnakenberg', 32);
    await page.selectOption('#preset', 'cima'); await waitDone('Lengyel-Epstein', 2000);
    const readStatus = () => ({ status: document.getElementById('status').innerText.replace(/\s+/g, ' '),
      statusParts: [...document.getElementById('status').children].map(x => x.textContent.replace(/\s+/g, ' ').trim()), recipe: { ...Studio.modules.turing.defaults, ...Studio.getRecipe() } });
    const before = await page.evaluate(readStatus);
    const initial = await page.evaluate(() => {
      window.rdxHold = true;
      const el = document.getElementById('preset'); el.value = 'relief'; el.dispatchEvent(new Event('change', { bubbles: true }));
      return { status: document.getElementById('status').innerText.replace(/\s+/g, ' '),
        statusParts: [...document.getElementById('status').children].map(x => x.textContent.replace(/\s+/g, ' ').trim()), recipe: { ...Studio.modules.turing.defaults, ...Studio.getRecipe() } };
    });
    await page.waitForTimeout(200);
    const held = await page.evaluate(readStatus), heldPolls = await page.evaluate(() => rdxHeldPolls);
    await page.evaluate(() => { window.rdxHold = false; });
    await waitDone('Schnakenberg', 1500);
    const complete = await page.evaluate(readStatus);
    const data = await page.evaluate(async () => {
      const F = GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData()).arrayBuffer()));
      const meta = JSON.parse(new TextDecoder().decode(zip['meta.json'])), array = F.readNpy(zip['species.npy']);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', array.data))).map(n => n.toString(16).padStart(2, '0')).join('');
      return { fieldHash: digest, shape: array.shape, finite: array.data.every(Number.isFinite), grid: meta.grid };
    });
    await page.selectOption('#export-inches', 'custom');
    await page.fill('#export-width', '4'); await page.fill('#export-height', '4'); await page.locator('#export-height').press('Tab');
    await page.selectOption('#export-dpi', '300'); await page.click('#btn-export');
    await page.waitForFunction(() => !Studio.exportJob && !document.getElementById('export-download').hidden, null, { timeout: 60000 });
    const print = await page.evaluate(async () => {
      const blob = await (await fetch(document.getElementById('export-download').href)).blob(), bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(bitmap, 0, 0); bitmap.close();
      const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', value))).map(n => n.toString(16).padStart(2, '0')).join('');
      const F = GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData()).arrayBuffer()));
      return { width: canvas.width, height: canvas.height, bytes: blob.size, pixelHash: await digest(context.getImageData(0, 0, canvas.width, canvas.height).data), fieldHashAfter: await digest(F.readNpy(zip['species.npy']).data) };
    });
    const freshPending = [initial, held].every(m => pendingWork(m).pending && /\bstep 0\b/.test(m.status) && !m.status.includes('Lengyel-Epstein'));
    const report = { passed: freshPending && heldPolls > 0, browser: browser.version(), sourceSha256: sha(source), studioSha256: sha(html), harnessSha256: sha(fs.readFileSync(__filename)),
      scope: 'Same-seed actual UI CIMA to relief at grid128, existing preset budgets2000/1500; initial fence held200ms, then actual1200pxPNG. No timing or numerical-accuracy claim.',
      before, initial, held, heldPolls, complete, data, print, freshPending, errors };
    const output = process.argv.find(x => x.startsWith('--write=')); if (output) fs.writeFileSync(output.slice(8), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    assert.ok(heldPolls > 0, 'Failure control did not hold the measurement fence');
    assert.ok(freshPending, 'Initial asynchronous measurement must replace the previous preset status with step0 pending');
    assert.equal(initial.recipe.tmodel, 'schnak'); assert.equal(complete.recipe.warmup, 1500);
    assert.equal(data.grid.steps, 1500); assert.ok(data.finite); assert.deepEqual(data.shape, [128, 128, 2]);
    assert.equal(print.fieldHashAfter, data.fieldHash); assert.equal(print.width, 1200); assert.equal(print.height, 1200);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
