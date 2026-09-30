// node tools/rdx-readback-check.js [--write=report.json]
// Actual GL measurements, finite state and 1200px module exports for all rdx tabs.
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright'), { glArgs } = require('./lib/gl-args');
(async () => {
  const browser = await chromium.launch({ args: glArgs() }), rows = [], warnings = [], errors = [];
  try {
    const page = await browser.newPage();
    page.on('console', msg => { if (/READ-usage|WebGL:|INVALID_/i.test(msg.text())) warnings.push(msg.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      const proto = WebGL2RenderingContext.prototype, states = new WeakMap();
      window.readbackAudit = { writes: 0, reads: 0, pendingOverwrite: 0 };
      for (const name of ['readPixels', 'getBufferSubData']) {
        const original = proto[name];
        proto[name] = function (...args) {
          const audit = states.get(this) || { pending: false }; states.set(this, audit);
          if (name === 'readPixels' && typeof args[6] === 'number') {
            if (audit.pending) readbackAudit.pendingOverwrite++;
            audit.pending = true; readbackAudit.writes++;
          } else if (name === 'getBufferSubData' && args[0] === this.PIXEL_PACK_BUFFER) {
            audit.pending = false; readbackAudit.reads++;
          }
          return original.apply(this, args);
        };
      }
    });
    const studio = path.resolve(process.env.STUDIO || path.join(__dirname, '../dist/studio.html'));
    await page.goto('file://' + studio + '#hopfield/readback-harness'); await page.evaluate(() => Studio.ready);
    for (const id of ['excitable', 'turing', 'cyclic', 'chemotaxis', 'vegetation']) {
      rows.push(await page.evaluate(async id => {
        const mod = Studio.modules[id], palette = Studio.PALETTES[mod.defaultPalette] || Studio.PALETTES.kiln;
        const state = { ...mod.defaults, grid: 128, warmup: 32, running: false, seed: 'rdx-readback/' + id, palette: palette.colors, bg: palette.bg };
        if (mod.sanitize) mod.sanitize(state);
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
        let settled = null, fault = null;
        const inst = mod.create({ canvas, getState: () => state, reducedMotion: () => true, isActive: () => true, setStatus(text) { if (text.includes('paused') && settled) settled(); }, fault(message) { fault = message; } });
        const before = { ...readbackAudit };
        for (let cycle = 0; cycle < 8; cycle++) await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(Error(id + ': settle timed out')), 15000);
          settled = () => { clearTimeout(timer); settled = null; resolve(); }; inst.regenerate();
        });
        if (fault) throw Error(fault);
        const exported = await inst.exportData(), values = exported.arrays.species.data;
        const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(n => n.toString(16).padStart(2, '0')).join('');
        const fieldHash = await digest(values), blob = await inst.exportPNG(1200, 1200), bitmap = await createImageBitmap(blob);
        const print = document.createElement('canvas'); print.width = print.height = 1200; const ctx = print.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
        const pixels = ctx.getImageData(0, 0, 1200, 1200).data; let lo = 255, hi = 0;
        for (let i = 0; i < pixels.length; i += 4) { lo = Math.min(lo, pixels[i], pixels[i + 1], pixels[i + 2]); hi = Math.max(hi, pixels[i], pixels[i + 1], pixels[i + 2]); }
        const after = await inst.exportData(), gl = canvas.getContext('webgl2'), extension = gl.getExtension('WEBGL_debug_renderer_info');
        const row = { id, cycles: 8, measurements: { writes: readbackAudit.writes - before.writes, reads: readbackAudit.reads - before.reads, pendingOverwrite: readbackAudit.pendingOverwrite - before.pendingOverwrite }, finite: values.every(Number.isFinite), shape: exported.arrays.species.shape, fieldHash, statePreserved: fieldHash === await digest(after.arrays.species.data), pixelHash: await digest(pixels), dimensions: [bitmap.width, bitmap.height], range: hi - lo, glError: gl.getError(), renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
        inst.pause(); bitmap.close(); gl.getExtension('WEBGL_lose_context')?.loseContext(); return row;
      }, id));
    }
    const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const result = { browser: browser.version(), studioSha256: sha(studio), harnessSha256: sha(__filename), scope: 'Eight seeded regenerations per rdx tab at grid128, warmup32; actual asynchronous GL measurements, finite state, exact state preservation and 1200px PNG exports.', rows, warnings: [...new Set(warnings)], warningCount: warnings.length, errors };
    const write = process.argv.find(s => s.startsWith('--write=')); if (write) fs.writeFileSync(write.slice(8), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result, null, 2));
    for (const row of rows) { assert.ok(row.measurements.reads >= 16); assert.equal(row.measurements.pendingOverwrite, 0); assert.ok(row.finite && row.statePreserved); assert.deepEqual(row.dimensions, [1200, 1200]); assert.ok(row.range > 12); assert.equal(row.glError, 0); }
    assert.deepEqual(errors, []); assert.deepEqual(warnings, [], 'Readback must not discard a fenced shadow allocation');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
