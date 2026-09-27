'use strict';
// Talbot print path. The carpet is painted straight into an ImageData, so there is no field array
// to snapshot. This loads the built studio, exports the default plate at 8 in and 300 ppi, and checks
// the PNG size, that a second regenerate reprints the same pixels, and that the recipe is unchanged.
// An injected copy whose longitudinal phase uses half the coefficient (the missing factor of 2) must
// move those pixels. Not a laboratory grating and not a color proof.
// node tools/talbot-print-state.js [--write]
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { glArgs } = require('./lib/gl-args');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const sourceFile = 'src/modules/cgl-hofstadter-scars-caustics-smectic-hl-phyllotaxis.js';
const source = fs.readFileSync(path.join(root, sourceFile), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const PHASE = 'TAU*n*u - PI*n*n*z';
const BAD_PHASE = 'TAU*n*u - 0.5*PI*n*n*z';
assert.equal(source.split(PHASE).length - 1, 1, 'plate phase must appear exactly once');
assert.equal(source.includes(BAD_PHASE), false, 'the maintained source must not already use the half coefficient');
const corrupted = source.replace(PHASE, BAD_PHASE);
assert.equal(corrupted.split(BAD_PHASE).length - 1, 1);
assert.equal(corrupted.includes(PHASE), false);

// Same arithmetic as the studio printSpec for a non-custom sheet: long edge is `inches`.
function printPixels(aspect, inches, dpi) {
  let hIn = inches, wIn = inches;
  if (aspect >= 1) wIn = inches / aspect;
  else hIn = inches * aspect;
  return { width: Math.round(wIn * dpi), height: Math.round(hIn * dpi), wIn, hIn };
}

(async () => {
  const browser = await chromium.launch({ args: glArgs() });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const studio = path.join(root, 'dist/studio.html');
    await page.goto('file://' + studio + '#talbot/talbot-1836', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => {
      const text = (document.querySelector('#status') || {}).innerText || '';
      return text.includes('talbot-1836') && text.includes('d2/λ');
    }, null, { timeout: 30000 });

    const sized = await page.evaluate(() => {
      const inches = document.querySelector('#export-inches');
      const dpi = document.querySelector('#export-dpi');
      if (!inches || !dpi) return false;
      inches.value = '8';
      inches.dispatchEvent(new Event('change', { bubbles: true }));
      dpi.value = '300';
      dpi.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    assert.equal(sized, true, 'print size controls must offer 8 in at 300 ppi');

    const before = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.art');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      window.__talbotPixels = data;
      const mod = Studio.modules.talbot;
      const pal = Studio.PALETTES[mod.defaultPalette];
      const state = Object.assign({}, mod.defaults, { palette: pal.colors.slice(), bg: pal.bg });
      const fixed = document.createElement('canvas');
      fixed.width = 240; fixed.height = 276;
      const inst = mod.create({
        canvas: fixed, getState: () => state, setStatus() {}, isActive: () => false,
        reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw new Error(msg); },
      });
      inst.regenerate();
      window.__talbotFixed = fixed.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 240, 276).data;
      window.__talbotFixedState = JSON.stringify(state);
      const status = document.querySelector('#status').innerText.replace(/\s+/g, ' ');
      return {
        recipe: JSON.stringify(Studio.getRecipe('talbot')),
        zMax: document.querySelector('#p-talbot-zMax').value,
        status,
        width: canvas.width,
        height: canvas.height,
        bytes: data.length,
      };
    });
    assert.match(before.status, /z ≤ 1\.5 d2\/λ/);
    assert.equal(/zT|z_T/.test(before.status), false, 'status must not call the depth a Talbot length: ' + before.status);
    assert.equal(before.zMax, '1.5');

    await page.evaluate(() => {
      const seed = document.querySelector('#seed');
      seed.value = 'talbot-1836';
      seed.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const replay = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.art');
      const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
      const first = window.__talbotPixels;
      if (first.length !== data.length) return { equal: false, changedBytes: -1, maxDelta: -1 };
      let changedBytes = 0, maxDelta = 0;
      for (let i = 0; i < data.length; i++) {
        const d = Math.abs(data[i] - first[i]);
        if (d) changedBytes++;
        if (d > maxDelta) maxDelta = d;
      }
      return { equal: changedBytes === 0, changedBytes, maxDelta, width: canvas.width, height: canvas.height };
    });
    assert.equal(replay.equal, true, 'second regenerate must reprint the same pixels: ' + JSON.stringify(replay));

    await page.evaluate(() => {
      const img = document.querySelector('#export-img');
      if (img) { img.removeAttribute('src'); img.hidden = true; }
      const note = document.querySelector('#export-note');
      if (note) note.classList.remove('err');
      document.querySelector('#btn-export').click();
    });
    const state = await page.waitForFunction(() => {
      const img = document.querySelector('#export-img');
      const note = document.querySelector('#export-note');
      if (note && note.classList.contains('err')) return 'err';
      if (img && !img.hidden && img.getAttribute('src')) return 'ok';
      return false;
    }, null, { timeout: 120000, polling: 500 }).then(handle => handle.jsonValue());
    assert.equal(state, 'ok', 'studio export did not finish');

    const printed = await page.evaluate(async () => {
      const img = document.querySelector('#export-img');
      const url = img.getAttribute('src');
      const blob = await (await fetch(url)).blob();
      const image = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('exported blob does not decode'));
        el.src = url;
      });
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        bytes: blob.size,
        note: (document.querySelector('#export-note') || {}).textContent || '',
        recipe: JSON.stringify(Studio.getRecipe('talbot')),
        zMax: document.querySelector('#p-talbot-zMax').value,
      };
    });
    const aspect = await page.evaluate(() => {
      const mod = Studio.modules.talbot;
      const pal = Studio.PALETTES[mod.defaultPalette];
      const state = Object.assign({}, mod.defaults, { palette: pal.colors.slice(), bg: pal.bg });
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const inst = mod.create({
        canvas, getState: () => state, setStatus() {}, isActive: () => false,
        reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw new Error(msg); },
      });
      return inst.aspect(state);
    });
    const expected = printPixels(aspect, 8, 300);
    assert.equal(printed.width, expected.width, 'PNG width ' + printed.width + ' != ' + expected.width);
    assert.equal(printed.height, expected.height, 'PNG height ' + printed.height + ' != ' + expected.height);
    assert(printed.bytes > 1000, 'export blob is empty');
    assert.equal(printed.recipe, before.recipe, 'export changed the recipe');
    assert.equal(printed.zMax, before.zMax, 'export changed the depth slider');

    await page.evaluate(() => {
      const close = document.querySelector('#export-close');
      if (close) close.click();
    });
    await page.waitForFunction(() => {
      const modal = document.querySelector('#modal-export');
      return modal && modal.hidden;
    }, null, { timeout: 5000 });
    await page.evaluate(() => {
      const seed = document.querySelector('#seed');
      seed.value = 'talbot-1836';
      seed.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const afterExport = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.art');
      const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
      const first = window.__talbotPixels;
      let changedBytes = 0, maxDelta = 0, screenComparable = first.length === data.length;
      if (screenComparable) {
        for (let i = 0; i < data.length; i++) {
          const d = Math.abs(data[i] - first[i]);
          if (d) changedBytes++;
          if (d > maxDelta) maxDelta = d;
        }
      }
      const mod = Studio.modules.talbot;
      const pal = Studio.PALETTES[mod.defaultPalette];
      const state = Object.assign({}, mod.defaults, { palette: pal.colors.slice(), bg: pal.bg });
      const fixed = document.createElement('canvas');
      fixed.width = 240; fixed.height = 276;
      const inst = mod.create({
        canvas: fixed, getState: () => state, setStatus() {}, isActive: () => false,
        reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw new Error(msg); },
      });
      inst.regenerate();
      const again = fixed.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 240, 276).data;
      const prior = window.__talbotFixed;
      let fixedChanged = 0, fixedMax = 0;
      for (let i = 0; i < again.length; i++) {
        const d = Math.abs(again[i] - prior[i]);
        if (d) fixedChanged++;
        if (d > fixedMax) fixedMax = d;
      }
      return {
        width: canvas.width, height: canvas.height, screenComparable, changedBytes, maxDelta,
        fixedChanged, fixedMax, fixedState: JSON.stringify(state),
        recipe: JSON.stringify(Studio.getRecipe('talbot')),
      };
    });
    // Opening the export sheet reflows the preview, so the screen buffer can change size.
    // The parameters are the recipe, and the pixels that those parameters paint at a fixed size.
    assert.equal(afterExport.fixedChanged, 0, 'fixed-size repaint after export moved pixels: ' + afterExport.fixedChanged);
    assert.equal(afterExport.fixedMax, 0);
    assert.match(afterExport.fixedState, /"zMax":1\.5/);
    assert.match(afterExport.fixedState, /"fill":0\.22/);
    assert.match(afterExport.fixedState, /"orders":18/);
    assert.equal(afterExport.recipe, before.recipe);
    if (afterExport.width === before.width && afterExport.height === before.height) {
      assert.equal(afterExport.changedBytes, 0, 'same-size regenerate after export moved screen pixels');
    }

    const injected = await page.evaluate(async ({ original, corruptedSource }) => {
      function paintOf(mod) {
        const pal = Studio.PALETTES[mod.defaultPalette];
        const state = Object.assign({}, mod.defaults, { palette: pal.colors.slice(), bg: pal.bg });
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 276;
        const inst = mod.create({
          canvas, getState: () => state, setStatus() {}, isActive: () => false,
          reducedMotion: () => true, requestRepaint() {}, fault(msg) { throw new Error(msg); },
        });
        inst.regenerate();
        const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data;
        return { state: JSON.stringify(state), data, width: canvas.width, height: canvas.height };
      }
      function compare(a, b) {
        let changed = 0, maxDelta = 0, sum = 0;
        const pixels = a.length / 4;
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
          if (d) changed++;
          if (d > maxDelta) maxDelta = d;
          sum += d;
        }
        return { changed, pixels, maxDelta, meanDelta: sum / pixels };
      }
      const first = paintOf(Studio.modules.talbot);
      const marker = document.createElement('script');
      marker.textContent = original;
      document.body.appendChild(marker);
      const replay = paintOf(Studio.modules.talbot);
      const same = compare(first.data, replay.data);
      const bad = document.createElement('script');
      bad.textContent = corruptedSource;
      document.body.appendChild(bad);
      const moved = paintOf(Studio.modules.talbot);
      const diff = compare(first.data, moved.data);
      const paramsSame = first.state === replay.state && replay.state === moved.state;
      return {
        width: first.width, height: first.height, paramsSame,
        reinjectChanged: same.changed, reinjectMaxDelta: same.maxDelta,
        corruptChanged: diff.changed, corruptPixels: diff.pixels,
        corruptMaxDelta: diff.maxDelta, corruptMeanDelta: diff.meanDelta,
        corruptFraction: diff.changed / diff.pixels,
      };
    }, { original: source, corruptedSource: corrupted });

    assert.equal(injected.paramsSame, true, 'injected copies must keep the same parameters');
    assert.equal(injected.reinjectChanged, 0, 're-registering the maintained source must not move pixels');
    assert(injected.corruptFraction > 0.1, 'half-coefficient phase must move a wide fraction of pixels, got ' + injected.corruptFraction);
    assert(injected.corruptMaxDelta > 20, 'half-coefficient phase must move pixels by more than 20 levels, got ' + injected.corruptMaxDelta);

    const result = {
      test: 'tools/talbot-print-state.js',
      command: 'node tools/talbot-print-state.js --write',
      source: sourceFile,
      sourceSha256,
      phase: PHASE,
      inches: 8,
      dpi: 300,
      aspect,
      expected,
      png: { width: printed.width, height: printed.height, bytes: printed.bytes, note: printed.note.slice(0, 180) },
      screen: { before: { width: before.width, height: before.height }, after: { width: afterExport.width, height: afterExport.height } },
      regenerate: replay,
      afterExport: {
        fixedChanged: afterExport.fixedChanged,
        fixedMax: afterExport.fixedMax,
        screenComparable: afterExport.screenComparable,
        screenChangedBytes: afterExport.screenComparable ? afterExport.changedBytes : null,
        recipeUnchanged: afterExport.recipe === before.recipe,
      },
      parametersUnchanged: printed.recipe === before.recipe && printed.zMax === before.zMax,
      status: before.status,
      injected,
      environment: { node: process.version, chromium: browser.version(), platform: process.platform },
      passed: true,
    };
    if (process.argv.includes('--write')) {
      fs.writeFileSync(path.join(root, 'validation/results/talbot-print-state.json'), JSON.stringify(result, null, 2) + '\n');
    }
    console.log(JSON.stringify({
      png: result.png,
      parametersUnchanged: result.parametersUnchanged,
      regenerateChangedBytes: replay.changedBytes,
      fixedChangedAfterExport: afterExport.fixedChanged,
      corruptFraction: injected.corruptFraction,
      corruptMaxDelta: injected.corruptMaxDelta,
      passed: true,
    }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
