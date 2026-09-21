// Browser distribution regressions, not evidence of scientific accuracy or cross-device identity.
// node tools/folder-browser.js
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src/module-manifest.json'), 'utf8'));
const entries = manifest.techniques;
const sourceFor = id => entries.find(m => m.id === id).source;
const recipe = (id, settings = {}) => '#' + id + '/folder-check/' + Buffer.from(JSON.stringify({ v: 2, ...settings })).toString('base64url');
const initialId = 'three-vortex-bound';
const initialHash = recipe(initialId, { running: false });
const server = http.createServer((req, res) => {
  let file;
  try { file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname)); }
  catch (_) { res.writeHead(400).end(); return; }
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(body);
  });
});
async function selected(page, id, seed = 'folder-check') {
  await page.waitForFunction(({ id, seed }) => document.querySelector('.tab[aria-selected="true"]')?.dataset.id === id && (seed === null || document.querySelector('#seed')?.value === seed), { id, seed });
}
async function plate(page) {
  return page.evaluate(() => {
    const canvas = [...document.querySelectorAll('canvas')].find(c => !c.hidden && c.offsetParent !== null && c.width > 100);
    if (!canvas) throw new Error('No visible plate');
    const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
    const ctx = copy.getContext('2d'); ctx.drawImage(canvas, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
    let hash = 2166136261, min = 255, max = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      min = Math.min(min, pixels[i], pixels[i + 1], pixels[i + 2]);
      max = Math.max(max, pixels[i], pixels[i + 1], pixels[i + 2]);
      for (let k = 0; k < 4; k++) hash = Math.imul(hash ^ pixels[i + k], 16777619);
    }
    return { width: canvas.width, height: canvas.height, fingerprint: (hash >>> 0).toString(16), range: max - min };
  });
}
async function settledPlate(page) {
  await page.waitForFunction(() => document.querySelector('#live-fp')?.textContent.trim());
  const first = await plate(page);
  await page.waitForTimeout(1000);
  const second = await plate(page);
  assert.deepEqual(first, second, 'Still plate must remain deterministic');
  assert.ok(second.range > 20, 'Plate must not be blank');
  assert.match(await page.locator('#live-badge').innerText(), /still/i, 'Still plate must have a Still witness');
  return second;
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const context = await browser.newContext({ viewport: { width: 1000, height: 720 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage(), requests = [], errors = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/index.html' + initialHash);
    await page.evaluate(() => Studio.ready);
    await selected(page, initialId);
    const folderPlate = await settledPlate(page);
    const requestedSources = requests.filter(url => new URL(url).pathname.startsWith('/src/modules/')).map(url => new URL(url).pathname.slice(1));
    assert.deepEqual([...new Set(requestedSources)], [sourceFor(initialId)], 'Initial tab must download only its own source family');
    const loaded = await page.evaluate(() => Object.values(Studio.modules).filter(m => typeof m.create === 'function').map(m => m.id).sort());
    assert.deepEqual(loaded, entries.filter(m => m.source === sourceFor(initialId)).map(m => m.id).sort());
    assert.equal(await page.locator('.tab').count(), entries.length, 'All techniques must be visible before their source is loaded');
    console.log('ok: initial lazy family, full tab list, still witness');

    const portable = await context.newPage();
    await portable.goto(origin + '/dist/studio.html' + initialHash);
    await selected(portable, initialId);
    assert.deepEqual(await settledPlate(portable), folderPlate, 'Same browser and recipe must agree between folder and portable builds');
    await portable.close();
    console.log('ok: folder and portable deterministic plate agreement');

    await page.evaluate(() => {
      window.__folderFirstStates = {};
      window.__folderOriginalCreates = {};
      window.__folderOriginalRegister = Studio.register;
      Studio.register = mod => {
        if (['cahn', 'turing'].includes(mod.id)) {
          const create = mod.create;
          window.__folderOriginalCreates[mod.id] = create;
          mod.create = host => {
            const state = host.getState();
            window.__folderFirstStates[mod.id] = { grid: state.grid, warmup: state.warmup, seed: state.seed };
            return create(host);
          };
        }
        return window.__folderOriginalRegister(mod);
      };
    });
    for (const id of ['cahn', 'turing']) {
      await page.evaluate(hash => { location.hash = hash; }, recipe(id, { grid: 128, running: false, warmup: 0 }));
      await selected(page, id);
      assert.deepEqual(await page.evaluate(id => window.__folderFirstStates[id], id), { grid: 128, warmup: 0, seed: 'folder-check' }, 'First initialization must use the requested recipe instead of expensive defaults');
      const siblings = entries.filter(m => m.source === sourceFor(id)).map(m => m.id);
      assert.ok(siblings.length > 1, 'Fixture must cover a shared source family');
      assert.ok(await page.evaluate(ids => ids.every(id => typeof Studio.modules[id].create === 'function'), siblings), 'Every sibling must register from its family source');
    }
    await page.evaluate(() => {
      Studio.register = window.__folderOriginalRegister;
      for (const [id, create] of Object.entries(window.__folderOriginalCreates)) Studio.modules[id].create = create;
      delete window.__folderOriginalRegister; delete window.__folderOriginalCreates; delete window.__folderFirstStates;
    });
    console.log('ok: PDE and reaction-diffusion family navigation');

    const delayedSource = sourceFor('hasimoto');
    let release, began;
    const gate = new Promise(resolve => { release = resolve; });
    const requested = new Promise(resolve => { began = resolve; });
    await page.route('**/' + delayedSource, async route => { began(); await gate; await route.continue(); });
    await page.evaluate(hash => { location.hash = hash; }, recipe('hasimoto', { running: false }));
    await Promise.race([requested, new Promise((_, reject) => setTimeout(() => reject(new Error('Delayed module was never requested')), 10000))]);
    await page.evaluate(hash => { location.hash = hash; }, initialHash);
    await selected(page, initialId);
    release();
    await page.waitForFunction(() => typeof Studio.modules.hasimoto.create === 'function');
    await page.waitForTimeout(200);
    await selected(page, initialId);
    await page.unroute('**/' + delayedSource);
    console.log('ok: stale import cannot steal selected tab');

    const arrowTargets = await page.evaluate(id => {
      const ids = [...document.querySelectorAll('.tab[data-id]')].map(tab => tab.dataset.id);
      const at = ids.indexOf(id);
      return [ids[(at + 1) % ids.length], ids[(at + 2) % ids.length]];
    }, initialId);
    assert.deepEqual(arrowTargets, ['parallelogram-lock', 'quincunx-lock'], 'Keyboard fixture requires inexpensive adjacent still techniques');
    assert.ok(await page.evaluate(ids => ids.every(id => typeof Studio.modules[id].create !== 'function'), arrowTargets), 'Keyboard fixture must start with unloaded techniques');
    const arrowSource = sourceFor(arrowTargets[0]);
    let releaseArrow, beganArrow;
    const arrowGate = new Promise(resolve => { releaseArrow = resolve; });
    const arrowRequested = new Promise(resolve => { beganArrow = resolve; });
    await page.route('**/' + arrowSource, async route => { beganArrow(); await arrowGate; await route.continue(); });
    try {
      await page.locator('.tab[data-id="' + initialId + '"]').focus();
      await page.keyboard.press('ArrowRight');
      await Promise.race([arrowRequested, new Promise((_, reject) => setTimeout(() => reject(new Error('Keyboard navigation never requested its first target')), 10000))]);
      await page.keyboard.press('ArrowRight');
      // The first import is still held here. A second arrow must advance from the pending target.
      await selected(page, arrowTargets[1], null);
    } finally {
      releaseArrow();
    }
    await page.waitForFunction(id => typeof Studio.modules[id].create === 'function', arrowTargets[0]);
    await selected(page, arrowTargets[1], null);
    await page.unroute('**/' + arrowSource);
    await page.evaluate(hash => { location.hash = hash; }, initialHash);
    await selected(page, initialId);
    console.log('ok: rapid keyboard navigation advances through pending imports');

    let failures = 0;
    const retrySource = sourceFor('peakon');
    const retryRoute = url => url.pathname === '/' + retrySource;
    await page.route(retryRoute, async route => {
      if (!failures++) await route.fulfill({ status: 503, contentType: 'text/javascript', body: 'Temporarily unavailable' });
      else await route.continue();
    });
    await page.evaluate(hash => { location.hash = hash; }, recipe('peakon', { running: false }));
    await page.locator('#fault').waitFor({ state: 'visible' });
    assert.match(await page.locator('#fault-msg').innerText(), /load|retry|try again|fetch|import/i);
    await page.locator('#fault-retry').click();
    await selected(page, 'peakon');
    assert.equal(failures, 2, 'Failed source must be requested again');
    await page.locator('#fault').waitFor({ state: 'hidden' });
    await page.unroute(retryRoute);
    console.log('ok: visible import failure and successful retry');

    const partialId = 'percolation', partialSource = sourceFor(partialId);
    const partialSiblings = entries.filter(m => m.source === partialSource).map(m => m.id);
    assert.ok(partialSiblings.length > 1, 'Rollback fixture must cover a shared family');
    assert.ok(await page.evaluate(ids => ids.every(id => typeof Studio.modules[id].create !== 'function'), partialSiblings), 'Rollback fixture must start with an unloaded family');
    const partialBody = fs.readFileSync(path.join(root, partialSource), 'utf8') + '\nthrow new Error("Injected family evaluation failure");\n';
    const partialRoute = url => url.pathname === '/' + partialSource;
    let partialAttempts = 0;
    await page.route(partialRoute, async route => {
      if (!partialAttempts++) await route.fulfill({ status: 200, contentType: 'text/javascript', body: partialBody });
      else await route.continue();
    });
    await page.evaluate(hash => { location.hash = hash; }, recipe(partialId, { grid: 128 }));
    await page.locator('#fault').waitFor({ state: 'visible' });
    assert.ok(await page.evaluate(ids => ids.every(id => typeof Studio.modules[id].create !== 'function'), partialSiblings), 'A rejected family import must roll back every registration');
    await page.locator('#fault-retry').click();
    await selected(page, partialId);
    await page.locator('#fault').waitFor({ state: 'hidden' });
    assert.equal(partialAttempts, 2, 'Partially evaluated family must be fetched again on retry');
    assert.ok(await page.evaluate(ids => ids.every(id => typeof Studio.modules[id].create === 'function'), partialSiblings), 'Retry must restore every implementation in the family');
    await page.unroute(partialRoute);
    console.log('ok: failed family evaluation rolls back registrations and retries successfully');

    await page.evaluate(hash => { location.hash = hash; }, initialHash);
    await selected(page, initialId);
    await page.evaluate(async ids => { for (const id of ids) await Studio.loadModule(id); }, entries.map(m => m.id));
    const allLoaded = await page.evaluate(() => Object.values(Studio.modules).filter(m => typeof m.create === 'function').map(m => m.id).sort());
    assert.deepEqual(allLoaded, entries.map(m => m.id).sort(), 'Every manifest entry must resolve to an actual registered implementation');
    await selected(page, initialId);
    assert.deepEqual(await plate(page), folderPlate, 'Registering modules must not replace or alter the active plate');
    const remoteSources = requests.filter(url => /\/src\/modules\//.test(url) && new URL(url).origin !== origin);
    assert.deepEqual(remoteSources, [], 'Module sources must stay local');
    assert.deepEqual(errors, [], 'Unexpected page exceptions');
    console.log('ok: all ' + entries.length + ' implementations register without rendering or changing the selected plate');
    console.log('FOLDER BROWSER OK. Packaging and UI regressions only; scientific CI remains separate.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
