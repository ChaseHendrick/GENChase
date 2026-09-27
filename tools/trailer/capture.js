// node tools/trailer/capture.js probe <outdir> <id[/seed]> ...        one frame of each plate after a warm-up
// node tools/trailer/capture.js record <outdir> <frames> <id[/seed]> ...  <frames> JPEG frames of each plate, in time
//
// Records the studio's own plates for the trailer (docs/trailer/). Every frame is the real simulation, computed in
// headless Chromium from the recipe in the hash, in focus mode (canvas only, no controls). Frames are taken as
// fast as the renderer allows, so on a software renderer the clip is a time-lapse of the run.
// Set STUDIO=path/to/studio.html to record another build; the default is dist/studio.html.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { glArgs } = require('../lib/gl-args');

const W = 1920, H = 1080;
const WARM = +(process.env.TRAILER_WARM_MS || 5000);
const GAP = +(process.env.TRAILER_GAP_MS || 60);
const DSF = +(process.env.TRAILER_DSF || 2);        // the plate's canvas is 506 CSS px in headless focus mode; 2x gives 1012 px

async function open(b, url, hash) {
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
  await p.addInitScript(() => {
    try { localStorage.removeItem('genchase.v1.history'); localStorage.setItem('genchase.v1.timeline', '0'); } catch (e) { /* ignore */ }
  });
  await p.goto(url + '#' + hash, { waitUntil: 'domcontentloaded', timeout: 90000 });
  const want = decodeURIComponent(hash.split('/')[1] || '');
  if (want) {
    await p.waitForFunction(s => { const el = document.querySelector('#seed'); return !!el && el.value === s; }, want,
      { timeout: 60000, polling: 250 }).catch(() => {});
  }
  await p.waitForTimeout(800);
  await p.keyboard.press('f');                       // focus mode: the plate fills the stage
  await p.waitForTimeout(600);
  return p;
}

async function canvas(p) {
  const handles = await p.$$('canvas');
  let best = null, area = 0;
  for (const h of handles) {
    const bb = await h.boundingBox();
    if (bb && bb.width * bb.height > area) { area = bb.width * bb.height; best = h; }
  }
  return best;
}

(async () => {
  const [mode, outdir, ...rest] = process.argv.slice(2);
  if (!['probe', 'record'].includes(mode) || !outdir) {
    console.error('usage: capture.js probe <outdir> <id[/seed]>... | record <outdir> <frames> <id[/seed]>...');
    process.exit(1);
  }
  const frames = mode === 'record' ? +rest.shift() : 1;
  const ids = rest;
  fs.mkdirSync(outdir, { recursive: true });
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', '..', 'dist', 'studio.html');
  const url = 'file://' + studio;
  const b = await chromium.launch({ args: [...glArgs(), '--ignore-gpu-blocklist'] });
  const meta = {};
  for (const hash of ids) {
    const id = hash.split('/')[0];
    const t0 = Date.now();
    try {
      const p = await open(b, url, hash);
      await p.waitForTimeout(WARM);
      const c = await canvas(p);
      if (!c) throw new Error('no canvas');
      const box = await c.boundingBox();
      const dir = mode === 'record' ? path.join(outdir, id) : outdir;
      fs.mkdirSync(dir, { recursive: true });
      for (let k = 0; k < frames; k++) {
        const f = mode === 'record' ? path.join(dir, String(k).padStart(4, '0') + '.jpg') : path.join(dir, id + '.jpg');
        // the canvas's own pixels, read in the page: much faster than a compositor screenshot on a software renderer.
        // A WebGL canvas that does not keep its drawing buffer reads back blank; then a page screenshot clipped to the
        // plate is used (an element screenshot waits for the element to be stable, which a running simulation never is).
        const data = await c.evaluate(el => { try { return el.toDataURL('image/jpeg', 0.92); } catch (e) { return ''; } });
        const buf = data.startsWith('data:image/jpeg;base64,') ? Buffer.from(data.split(',')[1], 'base64') : null;
        if (buf && buf.length > 12000) fs.writeFileSync(f, buf);
        else await p.screenshot({ path: f, type: 'jpeg', quality: 92, clip: box, timeout: 60000 });
        if (GAP) await p.waitForTimeout(GAP);
      }
      const info = await p.evaluate(() => ({
        name: (document.querySelector('.tab.active, [aria-selected="true"]') || {}).textContent || '',
        status: ((document.querySelector('#status') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 160),
        seed: (document.querySelector('#seed') || {}).value || '',
        hash: location.hash,
      }));
      meta[id] = { ...info, canvas: [Math.round(box.width), Math.round(box.height)], frames, ms: Date.now() - t0 };
      console.log(id, JSON.stringify(meta[id]));
      await p.close();
    } catch (e) {
      console.log(id, 'FAILED', e.message);
      meta[id] = { error: e.message };
    }
  }
  fs.writeFileSync(path.join(outdir, 'meta.json'), JSON.stringify(meta, null, 1));
  await b.close();
})();
