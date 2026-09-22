// Exercise the separate local app with a real allowlisted inventory job.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { chromium, webkit } = require('playwright');
const { createServer } = require('../apps/validate/server');
const root = path.resolve(__dirname, '..');
(async () => {
  const name = process.env.BROWSER || 'chromium';
  assert(['chromium', 'webkit'].includes(name));
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-validator-ui-'));
  const app = createServer({ root, data, port: 0 });
  let browser; const generated=[];
  try {
    const address = await app.listen(), origin = 'http://127.0.0.1:' + address.port;
    browser = await ({ chromium, webkit }[name]).launch();
    const context = await browser.newContext({ acceptDownloads: true });
    const errors = [], external = [];
    context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
    await context.route('**/*', route => {
      const url = route.request().url();
      if (/^https?:/.test(url) && new URL(url).origin !== origin) { external.push(url); return route.abort(); }
      return route.continue();
    });
    let page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelector('#connection').textContent === 'Connected locally');
    assert.equal(await page.inputValue('#mode'), 'all');
    assert.equal(await page.inputValue('#machine-slug'), 'm1pro');
    await page.fill('#machine-slug', 'ui-test');
    await page.locator('#machine-slug').dispatchEvent('change');
    await page.selectOption('#mode', 'inventory');
    await page.click('#contribute-tab');
    await page.selectOption('#mode', 'metal');
    await page.fill('#gpu-steps', '400');
    await page.click('#validate-tab');
    assert.equal(await page.inputValue('#mode'), 'inventory', 'workspace preserves selected job');
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#connection').textContent === 'Connected locally');
    assert.equal(await page.inputValue('#mode'), 'inventory', 'reload preserves selected job');
    assert.equal(await page.inputValue('#machine-slug'), 'ui-test', 'machine label persists locally');
    await page.click('#contribute-tab');
    assert.equal(await page.inputValue('#mode'), 'metal');
    assert.equal(await page.inputValue('#gpu-steps'), '400');
    await page.selectOption('#mode', 'derive');
    await page.fill('#slug', '../invalid');
    await page.click('#start');
    assert.equal(app.jobs.current, null, 'invalid input does not launch a job');
    assert.equal(await page.locator('#slug').evaluate(e => e.validity.valid), false);
    await page.click('#validate-tab');
    await page.selectOption('#power-mode', 'maximum');
    await page.uncheck('#battery-pause');
    await page.uncheck('#thermal-pause');
    // An API failure must be readable and must not leave the controls disabled.
    await page.route('**/api/start', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Test rejection: no job started.' }) }));
    await page.click('#start');
    await page.waitForFunction(() => document.querySelector('#error').textContent.includes('Test rejection'));
    assert.equal(await page.isEnabled('#start'), true);
    await page.unroute('**/api/start');
    const started = page.waitForResponse(r => r.url().endsWith('/api/start'));
    await page.click('#start');
    assert.equal((await started).status(), 200);
    const id = app.jobs.current.id;
    await page.close();
    await app.jobs.wait();
    assert.equal(app.jobs.current.exitCode, 0, 'official science inventory completes');
    assert.equal(app.jobs.current.id, id, 'closing the browser preserves the running job');
    page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(() => document.querySelector('#status').textContent.startsWith('Complete'));
    assert.match(await page.locator('#stats').textContent(), /node tools\/science.js/);
    assert.equal(await page.isEnabled('#stop'), false);
    assert.equal(await page.isEnabled('#restart'), true);
    assert.equal(await page.isEnabled('#online'), false, 'inventory never enables online search');
    for (const [button, file] of [['bundle', 'result-bundle.tar.gz'], ['packet', 'paste-packet.md'], ['download-log', 'job.log'], ['hardware-download', 'hardware.json']]) {
      assert.equal(await page.isEnabled('#' + button), true);
      const downloaded = page.waitForEvent('download');
      await page.click('#' + button);
      const download = await downloaded;
      assert.equal(download.suggestedFilename(), file);
      assert.equal(await download.failure(), null);
      assert(fs.statSync(await download.path()).size > 0);
    }
    assert.equal(app.jobs.current.hardware.machineSlug, 'ui-test');
    assert.match(await page.locator('#hardware-fields').textContent(), /ui-test/);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }));
    await page.click('#copy-log');
    assert.match(await page.locator('#error').textContent(), /download the full log/);
    await page.click('#pause-log');
    assert.equal(await page.getAttribute('#pause-log', 'aria-pressed'), 'true');
    await page.click('#pause-log');
    assert.equal(await page.getAttribute('#pause-log', 'aria-pressed'), 'false');
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 850 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no horizontal clipping at ' + width);
      const smallControls = await page.locator('button:visible, select:visible, input:not([type=checkbox]):visible').evaluateAll(items => items.filter(e => e.getBoundingClientRect().height < 43).map(e => e.id));
      assert.deepEqual(smallControls, [], 'touch controls keep their height at ' + width);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.card').first().evaluate(e => getComputedStyle(e).animationName), 'none');
      assert.equal(await page.locator('#start').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
      if (width === 1280 || width === 390) await page.screenshot({ path: path.join(os.tmpdir(), 'genchase-validator-' + name + '-' + width + '.png'), fullPage: true });
    }
    if (name === 'chromium') {
      const label='ui-'+process.pid+'-'+Date.now().toString(36);
      await page.fill('#machine-slug',label);
      await page.selectOption('#mode','witness');
      assert.equal(await page.isVisible('#technique-field'),true);
      await page.selectOption('#technique','reuleaux');
      const launched=page.waitForResponse(r=>r.url().endsWith('/api/start'));
      await page.click('#start');assert.equal((await launched).status(),200);
      await app.jobs.wait();assert.equal(app.jobs.current.exitCode,0);
      const report=JSON.parse(fs.readFileSync(path.join(data,app.jobs.current.id,'harvest-report.json'),'utf8'));
      generated.push(path.join(root,report.corpus));
      await page.waitForFunction(()=>!document.querySelector('#witness-download').disabled);
      const downloaded=page.waitForEvent('download');await page.click('#witness-download');
      const download=await downloaded;assert.equal(download.suggestedFilename(),'witnesses.json');
      const corpus=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
      assert.equal(corpus.machineSlug,label);assert.equal(corpus.entries[0].id,'reuleaux');
      assert.equal(corpus.entries[0].status,'within stated tolerance');assert(corpus.hardware.browserVersions.chromium);
    }
    // An explicit witness miss remains visible even when the command exited zero.
    const fixtureMiss = { file: 'a'.repeat(40) + '-ui-test-fixture.json', kind: 'witness-miss', status: 'miss', id: 'fixture', expected: 1, got: 2, recipeHash: '#fixture/seed', commit: 'a'.repeat(40) };
    await page.route('**/api/state', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...app.jobs.state(), misses: [fixtureMiss] }) }));
    await page.route('**/api/miss?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixtureMiss) }));
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'needs-review');
    assert.match(await page.locator('#miss-list').textContent(), /Expected: 1.*Measured: 2/);
    const missDownloaded = page.waitForEvent('download');
    await page.locator('#miss-list button').click();
    const missDownload = await missDownloaded;
    assert.equal(missDownload.suggestedFilename(), fixtureMiss.file);
    assert.deepEqual(JSON.parse(fs.readFileSync(await missDownload.path(), 'utf8')), fixtureMiss);
    await page.route('**/api/state', route => route.abort());
    await page.waitForFunction(() => document.querySelector('#connection').textContent.startsWith('Server unavailable'));
    assert.equal(await page.isEnabled('#start'), false, 'disconnection disables job actions');
    assert.equal(await page.isEnabled('#restart'), false);
    await page.close();
    const restricted = await context.newPage();
    await restricted.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    await restricted.goto(origin);
    await restricted.waitForFunction(() => document.querySelector('#connection').textContent === 'Connected locally');
    await restricted.click('#contribute-tab');
    assert.equal(await restricted.textContent('#workspace-title'), 'Contribute', 'blocked storage does not break navigation');
    assert.deepEqual(errors, []);
    assert.deepEqual(external, [], 'the app made no external network requests');
    await context.close();
    console.log('PASS', name, 'local job lifecycle, workspace persistence, downloads, input/API errors, blocked storage, clipboard fallback, hardware cards, visible miss packets, mobile layout, reduced motion and offline requests');
  } finally {
    await browser?.close();
    await app.close();
    fs.rmSync(data, { recursive: true, force: true });
    for (const file of generated) fs.rmSync(file,{force:true});
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
