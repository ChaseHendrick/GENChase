'use strict';
// Exercise the narrow uniform-field predicate against the live NPZ and canvas, then
// damage the captured probability and actual canvas separately. No source instrumentation.
const assert = require('node:assert/strict'), path = require('node:path');
const { chromium } = require('playwright'), { glArgs } = require('./lib/gl-args');
const { uniformSkinEvidence, readUniformSkinSample } = require('./lib/check-uniform-skin');
(async () => {
  const browser = await chromium.launch({ args: glArgs() });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { localStorage.clear(); localStorage.setItem('genchase.v1.timeline', '0'); });
    const studio = process.env.STUDIO || path.resolve(__dirname, '../dist/studio.html');
    await page.goto('file://' + studio + '#skin/uniform-control');
    await page.waitForFunction(() => document.querySelector('#seed')?.value === 'uniform-control');
    await page.selectOption('#preset', 'ring');
    await page.waitForFunction(() => /right eigenvectors/.test(document.querySelector('#status').textContent));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const actual = await readUniformSkinSample(page), result = uniformSkinEvidence(actual);
    console.log(JSON.stringify({ paint: actual.paint, result }));
    assert.equal(result.accepted, true, result.reason);
    const corrupt = structuredClone(actual); corrupt.data.values[0] += .001; corrupt.data.values[1] -= .001;
    assert.equal(uniformSkinEvidence(corrupt).accepted, false);
    await page.evaluate(() => { const canvas = [...document.querySelectorAll('canvas.art')].find(c => c.offsetParent !== null); canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); });
    const cleared = await readUniformSkinSample(page);
    assert.deepEqual(cleared.data, actual.data, 'Clearing canvas must not change exported scientific data');
    assert.equal(uniformSkinEvidence(cleared).accepted, false, 'A cleared live canvas passed');
    await page.selectOption('#preset', 'dirty');
    const disordered = await readUniformSkinSample(page);
    assert.equal(uniformSkinEvidence(disordered).accepted, false, 'A disordered recipe qualified for uniform handling');
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, result, controls: ['corrupted density rejected', 'cleared live canvas rejected with unchanged data', 'disordered live recipe rejected'] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
