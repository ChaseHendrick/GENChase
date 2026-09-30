'use strict';
// Exercise the production replay predicate on actual reduced-motion Physarum plates.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
const { glArgs } = require('./lib/gl-args');
const { measure, settle, compareReplay } = require('./check');

(async () => {
  const browser = await chromium.launch({ args: glArgs() });
  const studio = process.env.STUDIO || path.resolve(__dirname, '..', 'dist/studio.html');
  const captures = [];
  try {
    for (const seed of ['replay-control', 'replay-control', 'replay-control-changed']) {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, reducedMotion: 'reduce' });
      await page.addInitScript(() => {
        localStorage.removeItem('genchase.v1.history');
        localStorage.setItem('genchase.v1.timeline', '0');
      });
      try {
        await page.goto('file://' + path.resolve(studio) + '#physarum/' + seed, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForFunction(s => document.getElementById('seed')?.value === s, seed, { timeout: 60000 });
        assert.equal(await page.evaluate(() => Object.hasOwn(Studio.modules.physarum.defaults, 'running')), false);
        const settled = await settle(page, 150000, seed);
        const plate = await measure(page);
        assert.match(plate.status, /step 300\b.*stopped/);
        captures.push({ settled, plate });
      } finally { await page.close(); }
    }
    const compare = (a, b) => compareReplay(a.plate, b.plate, a.settled, b.settled);
    const positive = compare(captures[0], captures[1]);
    assert(positive.comparable && positive.same, 'Supported replay must match at step 300');
    const changedSeed = compare(captures[0], captures[2]);
    assert(changedSeed.comparable && !changedSeed.same, 'Changed seed must fail the production replay predicate');
    const wrongStep = { ...captures[1].plate, status: captures[1].plate.status.replace('step 300', 'step 301') };
    assert(!compareReplay(captures[0].plate, wrongStep, 'timeout', 'timeout').comparable,
      'Matching preview fingerprints at different steps must remain incomplete');
    console.log(JSON.stringify({ passed: true, reducedMotion: 'reduce', positive, changedSeed,
      mismatchedStepRejected: true, fingerprints: captures.map(r => r.plate.fp) }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
