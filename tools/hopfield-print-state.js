// node tools/hopfield-print-state.js [--write]
// Actual browser module exports, binary cell centers and state preservation.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { glArgs } = require('./lib/gl-args');
(async () => {
  const root = path.resolve(__dirname, '..'), browser = await chromium.launch({ args: glArgs() }), rows = [];
  const errors = []; let version, dataPackage;
  try {
    version = browser.version(); const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + path.join(root, 'dist/studio.html') + '#hopfield/hopfield-print-state');
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('target mismatch'));
    const keys = await page.evaluate(() => ['default', ...Object.keys(Studio.modules.hopfield.presets), 'portrait']);
    for (const key of keys) rows.push(await page.evaluate(async key => {
      const mod = Studio.modules.hopfield, preset = mod.presets[key], palette = preset?.palette || Studio.PALETTES[mod.defaultPalette];
      const state = { ...mod.defaults, ...preset?.p, seed: 'hopfield-print-state/' + key, palette: palette.colors, bg: palette.bg, ...(key === 'portrait' ? { aspect: '4:5', side: 24 } : {}) };
      const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = Math.round(720 * ({ '3:2': 2 / 3, '4:5': 1.25 }[state.aspect] || 1));
      const instance = mod.create({ canvas, util: Studio.util, getState: () => state, setStatus() {}, setWitness() {} }); instance.regenerate();
      const serialize = x => JSON.stringify(x, (_, v) => ArrayBuffer.isView(v) ? Array.from(v) : v);
      const before = await instance.exportData(), saved = serialize(before), ratio = instance.aspect(state);
      const w = ratio > 1 ? Math.round(2400 / ratio) : 2400, h = ratio > 1 ? 2400 : Math.round(2400 * ratio);
      const blob = await instance.exportPNG(w, h), bitmap = await createImageBitmap(blob), png = document.createElement('canvas'); png.width = w; png.height = h;
      const ctx = png.getContext('2d', { willReadFrequently: true }); ctx.drawImage(bitmap, 0, 0);
      const svg = instance.exportSVG(w, h), parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const boxes = [...parsed.querySelectorAll('rect')].filter(r => +r.getAttribute('width') < w);
      const states = [before.arrays.memories.data.slice(0, state.side ** 2), before.arrays.cue.data, before.arrays.state.data].flatMap(x => Array.from(x));
      let wrongColors = 0, squareError = 0;
      // Read SVG cell centers against independent data signs, and sample the PNG there.
      for (let k = 0; k < boxes.length; k++) {
        const box = boxes[k], x = +box.getAttribute('x'), y = +box.getAttribute('y'), width = +box.getAttribute('width'), height = +box.getAttribute('height');
        squareError = Math.max(squareError, Math.abs(width - height));
        const expected = Studio.util.hexToRgb(states[k] > 0 ? state.palette[0] : state.palette[1] || state.bg);
        const pixel = ctx.getImageData(Math.floor(x + width / 2), Math.floor(y + height / 2), 1, 1).data;
        if (pixel[0] !== expected[0] || pixel[1] !== expected[1] || pixel[2] !== expected[2]) wrongColors++;
      }
      const unchanged = saved === serialize(await instance.exportData());
      const replay = mod.create({ canvas, util: Studio.util, getState: () => state, setStatus() {}, setWitness() {} }); replay.regenerate();
      const deterministic = saved === serialize(await replay.exportData());
      const mismatches = Array.from(before.arrays.state.data).filter((v, i) => v !== before.arrays.memories.data[i]).length;
      instance.pause(); replay.pause();
      return { key, seed: state.seed, requested: [w, h], actual: [bitmap.width, bitmap.height], bytes: blob.size, svgCells: boxes.length, expectedCells: 3 * state.side ** 2, wrongColors, squareError, unchanged, deterministic, mismatches, arrayShapes: Object.fromEntries(Object.entries(before.arrays).map(([k, v]) => [k, v.shape])), fixedPoint: before.meta.fixedPoint };
    }, key));
    dataPackage = await page.evaluate(async () => {
      const F = window.GenChaseDataFormats, zip = F.readZip(new Uint8Array(await (await Studio.exportData()).arrayBuffer()));
      const meta = JSON.parse(new TextDecoder().decode(zip['meta.json'])), final = F.readNpy(zip['state.npy']), memories = F.readNpy(zip['memories.npy']);
      return { members: Object.keys(zip), stateExported: meta.stateExported, sourceSha256: meta.provenance.technique.sourceSha256, status: meta.provenance.technique.validation, shape: final.shape, dtype: final.descr, memoryShape: memories.shape, meta: meta.grid };
    });
    assert.ok(dataPackage.stateExported); assert.equal(dataPackage.dtype, '|i1'); assert.deepEqual(dataPackage.shape, [16, 16]); assert.deepEqual(dataPackage.memoryShape, [4, 16, 16]); assert.equal(dataPackage.status, 'unvalidated');
    if (process.env.HOPFIELD_SCREENSHOT) await page.screenshot({ path: process.env.HOPFIELD_SCREENSHOT });
  } finally { await browser.close(); }
  for (const row of rows) {
    assert.deepEqual(row.actual, row.requested); assert.ok(row.bytes > 1000); assert.equal(row.svgCells, row.expectedCells); assert.equal(row.wrongColors, 0); assert.equal(row.squareError, 0); assert.ok(row.unchanged && row.deterministic);
  }
  assert.deepEqual(errors, []);
  const accept = r => r.actual[0] === r.requested[0] && r.actual[1] === r.requested[1] && r.wrongColors === 0 && r.unchanged;
  const failureControls = { wrongDimensionsRejected: !accept({ ...rows[0], actual: [2399, rows[0].actual[1]] }), wrongPixelRejected: !accept({ ...rows[0], wrongColors: 1 }), stateMutationRejected: !accept({ ...rows[0], unchanged: false }) };
  assert.ok(Object.values(failureControls).every(Boolean));
  const sha = f => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
  const result = { passed: true, reviewed: '2026-09-29', command: 'node tools/hopfield-print-state.js --write', sourceSha256: sha('src/modules/hopfield.js'), harnessSha256: sha('tools/hopfield-print-state.js'), environment: { browser: version, node: process.version, platform: process.platform }, dataPackage, rows, failureControls, limitations: ['Cell-center color and geometry, dimensions and state preservation checks; not color calibration or general model validation.', 'Direct module PNG/SVG/data paths here; tools/export.js separately exercises the real studio print button.'] };
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation/results/hopfield-print-state.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
