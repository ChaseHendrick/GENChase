// node tools/provenance-check.js
// Checks that every exported file says what made it, and that research data comes out intact.
//
// Node: the .npy / .npz / PNG text / JPEG comment writers in src/shared/data-formats.js round-trip,
// and the PDF Info dictionary and TIFF ImageDescription / Software tags written by print-formats.js
// read back as the provenance that went in (with a control: no provenance, no Info object).
// Browser: Studio.getProvenance() matches the embedded build facts and the source file's SHA-256;
// Studio.exportData() gives a readable .npz (a tab without exportData() says so instead of inventing
// arrays); and the PNG, PDF, TIFF and JPEG from the real export buttons carry the same provenance.
// The status badge and the tab strip show the validation status. Needs Playwright (see TESTING.md).
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const F = require('../src/shared/data-formats.js');
require('../src/shared/print-formats.js');
const root = path.resolve(__dirname, '..');

let passed = 0;
const ok = (cond, name, detail) => { assert.ok(cond, name + (detail ? ': ' + detail : '')); passed++; console.log('PASS ' + name); };

/* ---- Node: containers ---- */
async function nodeChecks() {
  ok(F.crc32(new TextEncoder().encode('123456789')) === 0xcbf43926, 'CRC-32 check value');
  for (const T of [Float32Array, Float64Array, Int32Array, Uint32Array, Int16Array, Uint16Array, Int8Array, Uint8Array]) {
    const a = T.from({ length: 12 }, (_, i) => (i * 7) % 11 - (T.name.startsWith('Uint') ? 0 : 5));
    const back = F.readNpy(F.npy(a, [3, 4]));
    ok(back.shape.join() === '3,4' && Array.from(back.data).join() === Array.from(a).join(), '.npy round trip ' + T.name);
  }
  const bad = (() => { try { F.npy(new Float32Array(5), [2, 2]); return false; } catch (e) { return true; } })();
  ok(bad, '.npy refuses a shape that does not match the data');
  const zip = F.zipStore([{ name: 'a.npy', data: F.npy(new Float32Array([1, 2]), [2]) }, { name: 'meta.json', data: new TextEncoder().encode('{"x":1}') }]);
  const members = F.readZip(zip);
  ok(Object.keys(members).join() === 'a.npy,meta.json' && JSON.parse(new TextDecoder().decode(members['meta.json'])).x === 1, 'zip round trip');
  ok(Buffer.compare(Buffer.from(zip), Buffer.from(F.zipStore([{ name: 'a.npy', data: F.npy(new Float32Array([1, 2]), [2]) }, { name: 'meta.json', data: new TextEncoder().encode('{"x":1}') }]))) === 0, 'zip is byte-identical for identical content');

  // A 1 x 1 PNG, then text in and out; a second write with the same keyword replaces the first.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const prov = { link: '#cahn/σ-test', note: 'non-Latin text: Cahn–Hilliard, σ' };
  let tagged = F.pngWithText(new Uint8Array(png), { Software: 'GENChase test', 'GENChase provenance': JSON.stringify({ old: true }) });
  tagged = F.pngWithText(tagged, { 'GENChase provenance': JSON.stringify(prov) });
  const text = F.readPngText(tagged);
  ok(text.Software === 'GENChase test' && JSON.parse(text['GENChase provenance']).link === prov.link, 'PNG text round trip, UTF-8 in iTXt');
  ok(Object.keys(text).length === 2, 'PNG keyword replaced, not stacked');

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const comment = 'GENChase provenance ' + F.asciiJSON(prov);
  const jc = F.jpegWithComment(jpeg, comment);
  ok(F.readJpegComments(jc)[0] === comment && jc[2] === 0xff && jc[3] === 0xe0, 'JPEG comment after APP0');
  ok(JSON.parse(F.readJpegComments(jc)[0].replace(/^GENChase provenance /, '')).note === prov.note, 'escaped JSON restores non-ASCII text');

  const w = 40, h = 20, rgb = new Uint8Array(w * h * 3).fill(128);
  const plain = Buffer.from(await (await GenChasePrintFormats.pdf(rgb, w, h, 2, 1)).arrayBuffer()).toString('latin1');
  ok(!/\/Info/.test(plain), 'control: a PDF without provenance has no Info object');
  const withProv = Buffer.from(await (await GenChasePrintFormats.pdf(rgb, w, h, 2, 1, { provenance: JSON.stringify(prov), producer: 'GENChase test', title: 'GENChase · Cahn–Hilliard' })).arrayBuffer()).toString('latin1');
  ok(readPdfProvenance(withProv).link === prov.link && /\/Info 7 0 R/.test(withProv) && /\/Size 8/.test(withProv), 'PDF Info dictionary carries the provenance');
  const tif = new Uint8Array(await GenChasePrintFormats.tiff(rgb, w, h, 2, 1, { description: F.asciiJSON(prov), software: 'GENChase test' }).arrayBuffer());
  const tags = readTiffTags(tif);
  ok(JSON.parse(tags[270]).note === prov.note && tags[305] === 'GENChase test', 'TIFF ImageDescription and Software tags');
  ok(tags.order.every((t, i) => !i || t > tags.order[i - 1]), 'TIFF tags are in ascending order');
}

function readPdfProvenance(pdf) {
  const m = /\/GENChaseProvenance <FEFF([0-9A-F]*)>/.exec(pdf);
  if (!m) return null;
  let s = '';
  for (let i = 0; i < m[1].length; i += 4) s += String.fromCharCode(parseInt(m[1].slice(i, i + 4), 16));
  return JSON.parse(s);
}
function readTiffTags(b) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength), n = v.getUint16(8, true), out = { order: [] };
  for (let i = 0; i < n; i++) {
    const at = 10 + i * 12, id = v.getUint16(at, true), type = v.getUint16(at + 2, true), count = v.getUint32(at + 4, true), off = v.getUint32(at + 8, true);
    out.order.push(id);
    if (type === 2) out[id] = Buffer.from(b.subarray(off, off + count - 1)).toString('latin1').trimEnd();
  }
  return out;
}

/* ---- Browser: the studio's own paths ---- */
async function browserChecks() {
  const { chromium } = require('playwright');
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(root, 'dist', 'studio.html');
  const html = fs.readFileSync(studio, 'utf8');
  const build = JSON.parse(/id="build-info">([^<]*)</.exec(html)[1]);
  const records = JSON.parse(fs.readFileSync(path.join(root, 'validation', 'techniques.json'), 'utf8'));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1400, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    // A GPU grid tab with exportData().
    await page.goto('file://' + studio + '#cahn/provenance-check', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.Studio && Studio.getRecipe() && /step/.test(document.querySelector('#status').innerText), null, { timeout: 90000 });
    const prov = await page.evaluate(() => Studio.getProvenance());
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'src/modules/pde.js'))).digest('hex');
    ok(prov.build === build.build && prov.buildFingerprint === build.fingerprint, 'provenance names the build');
    ok(prov.technique.source === 'src/modules/pde.js' && prov.technique.sourceSha256 === sha, 'provenance source hash matches the file');
    ok(prov.technique.validation === records.find(r => r.id === 'cahn').status, 'provenance carries the validation status');
    ok(prov.compute.api === 'WebGL2' && prov.compute.renderer && /float32|float16/.test(prov.compute.precision), 'provenance names the device and precision', JSON.stringify(prov.compute));
    ok(/^#cahn\/provenance-check/.test(prov.link) && prov.recipe.id === 'cahn', 'provenance carries the recipe link');
    ok(JSON.stringify(await page.evaluate(() => Studio.getProvenance())) === JSON.stringify(prov), 'provenance is deterministic');

    const npz = await exportData(page);
    const members = F.readZip(npz), meta = JSON.parse(new TextDecoder().decode(members['meta.json']));
    const field = F.readNpy(members['field.npy']);
    ok(meta.stateExported && field.descr === '<f4' && field.shape.join() === meta.grid.grid.slice().reverse().join(), 'data export: field.npy matches the grid', field.shape.join('x'));
    ok(Array.from(field.data).every(Number.isFinite), 'data export: every value is finite');
    ok(meta.provenance.technique.sourceSha256 === sha && /step/.test(meta.status), 'data export: meta.json carries provenance and the status line');

    // The badge and the tab strip.
    const badge = await page.locator('#btn-science-report').innerText();
    ok(/Validated within stated limits/.test(badge), 'stage badge shows the status', badge);
    ok(await page.locator('.tab[data-id="ising"] .tab-evidence').innerText() === '○', 'tab strip shows the status glyph');

    // A tab without exportData(): meta.json says so rather than inventing arrays.
    await page.evaluate(() => { location.hash = '#reuleaux/provenance-check'; });
    await page.waitForFunction(() => Studio.getRecipe() && Studio.getRecipe().id === 'reuleaux', null, { timeout: 60000 });
    const npz2 = F.readZip(await exportData(page)), meta2 = JSON.parse(new TextDecoder().decode(npz2['meta.json']));
    ok(!meta2.stateExported && Object.keys(npz2).join() === 'meta.json' && /does not export its state/.test(meta2.note), 'control: a tab without exportData() exports no arrays and says so');

    // The real export buttons, at the smallest offered print size.
    await page.evaluate(() => {
      for (const id of ['export-inches', 'export-dpi']) {
        const s = document.getElementById(id), v = [...s.options].map(o => +o.value).filter(Number.isFinite).sort((a, b) => a - b)[0];
        s.value = String(v); s.dispatchEvent(new Event('change', { bubbles: true }));
      }
      document.getElementById('btn-export').click();
    });
    await page.waitForFunction(() => { const i = document.getElementById('export-img'); return i && !i.hidden && i.getAttribute('src'); }, null, { timeout: 180000 });
    const want = await page.evaluate(() => Studio.getProvenance());
    const pngBytes = new Uint8Array(Buffer.from(await page.evaluate(async () => {
      const b = new Uint8Array(await (await fetch(document.getElementById('export-img').getAttribute('src'))).arrayBuffer());
      let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s);
    }), 'base64'));
    const pngText = F.readPngText(pngBytes);
    ok(JSON.parse(pngText['GENChase provenance']).technique.sourceSha256 === want.technique.sourceSha256 && /^GENChase, engine API 1/.test(pngText.Software), 'exported PNG carries the provenance');
    for (const [button, check] of [
      ['export-pdf', b => readPdfProvenance(Buffer.from(b).toString('latin1'))],
      ['export-tiff', b => JSON.parse(readTiffTags(b)[270])],
      ['export-jpg', b => JSON.parse(F.readJpegComments(b).find(c => c.startsWith('GENChase provenance ')).slice(20))],
    ]) {
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.locator('#' + button).click()]);
      const got = check(new Uint8Array(fs.readFileSync(await download.path())));
      ok(got && got.link === want.link && got.build === want.build, button.replace('export-', '').toUpperCase() + ' download carries the provenance');
    }
    ok(!errors.length, 'no page errors', errors.join(' | '));
  } finally { await browser.close(); }
}
async function exportData(page) {
  return new Uint8Array(Buffer.from(await page.evaluate(async () => {
    const b = new Uint8Array(await (await Studio.exportData()).arrayBuffer());
    let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s);
  }), 'base64'));
}

(async () => {
  await nodeChecks();
  if (!process.argv.includes('--node-only')) await browserChecks();
  console.log(passed + ' provenance and data checks passed');
})().catch(err => { console.error('FAIL ' + err.message); process.exitCode = 1; });
