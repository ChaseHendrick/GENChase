// node tools/run.js <hash> [--out file.npz] [--steps N] [--wait ms] [--timeout ms]
//
// Runs one recipe headlessly and writes its research data: the simulation state as NumPy arrays in an
// uncompressed .npz (numpy.load reads it), with meta.json holding the provenance, grid, units and the
// status line's printed measurements. It drives the studio's own Studio.exportData(), the same path as
// the "Download data (.npz)" button in the science report, so a sweep of recipes gives the same bytes a
// person would download.
//
//   node tools/run.js '#cahn/demo' --out cahn.npz --steps 2000
//   for T in 2.0 2.2 2.269 2.4; do node tools/run.js "#ising/sweep" --set T=$T --out ising-$T.npz --steps 6000; done
//
// --steps waits until the status line reports that many steps or sweeps; --wait is a fixed settle time
// in milliseconds when a tab has no step counter. --set key=value (repeatable) overrides one recipe key
// after the hash is applied. The headless browser uses the software renderer, so a GPU tab runs slowly
// and reports "SwiftShader" as its renderer in the provenance; that is recorded, not hidden.
//
// Set STUDIO=path/to/studio.html to run a copy. Needs Playwright (see TESTING.md).
'use strict';
const fs = require('fs');
const path = require('path');
const F = require('../src/shared/data-formats.js');

function parseArgs(argv) {
  const o = { hash: null, out: null, steps: 0, wait: 6000, timeout: 600000, set: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--steps') o.steps = +argv[++i];
    else if (a === '--wait') o.wait = +argv[++i];
    else if (a === '--timeout') o.timeout = +argv[++i];
    else if (a === '--set') o.set.push(argv[++i]);
    else if (!o.hash) o.hash = a.replace(/^#/, '');
    else throw new Error('Unexpected argument: ' + a);
  }
  if (!o.hash) throw new Error('usage: node tools/run.js <hash> [--out file.npz] [--steps N] [--wait ms] [--set key=value]');
  return o;
}

async function run(opts) {
  const { chromium } = require('playwright');
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'dist', 'studio.html');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + studio + '#' + opts.hash, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.Studio && Studio.getRecipe && Studio.getRecipe(), null, { timeout: 90000 });
    for (const kv of opts.set) {
      const at = kv.indexOf('=');
      if (at < 1) throw new Error('--set needs key=value: ' + kv);
      const key = kv.slice(0, at), raw = kv.slice(at + 1), value = /^-?[0-9.]+(e-?[0-9]+)?$/i.test(raw) ? +raw : raw === 'true' ? true : raw === 'false' ? false : raw;
      const ok = await page.evaluate(([key, value]) => {
        const id = Studio.getRecipe().id, el = document.getElementById('p-' + id + '-' + key);
        if (!el) return false;
        if (el.type === 'checkbox') { if (el.checked !== value) el.click(); }
        else { el.value = String(value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
        return true;
      }, [key, value]);
      if (!ok) throw new Error('No control for recipe key "' + key + '" on this tab');
    }
    if (opts.steps > 0) {
      await page.waitForFunction(n => {
        const m = /\b(?:step|sweep)\s+([0-9,]+)/.exec(document.querySelector('#status').innerText);
        return m && +m[1].replace(/,/g, '') >= n;
      }, opts.steps, { timeout: opts.timeout, polling: 250 });
    } else await page.waitForTimeout(opts.wait);
    const b64 = await page.evaluate(async () => {
      const bytes = new Uint8Array(await (await Studio.exportData()).arrayBuffer());
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s);
    });
    return { bytes: new Uint8Array(Buffer.from(b64, 'base64')), errors };
  } finally { await browser.close(); }
}

function summarize(bytes) {
  const members = F.readZip(bytes), meta = JSON.parse(new TextDecoder().decode(members['meta.json']));
  return { members: Object.keys(members), meta };
}

if (require.main === module) {
  (async () => {
    const opts = parseArgs(process.argv.slice(2));
    const { bytes, errors } = await run(opts);
    const { meta } = summarize(bytes);
    const out = opts.out || ('genchase-' + meta.provenance.technique.id + '.npz');
    fs.writeFileSync(out, bytes);
    console.log('wrote ' + out + ' (' + bytes.length.toLocaleString() + ' bytes)');
    console.log('link    ' + meta.provenance.link);
    console.log('build   ' + meta.provenance.build + ' · ' + meta.provenance.technique.source + ' ' + String(meta.provenance.technique.sourceSha256).slice(0, 12) + ' · ' + meta.provenance.technique.validation);
    console.log('device  ' + meta.provenance.compute.api + (meta.provenance.compute.renderer ? ' · ' + meta.provenance.compute.renderer : '') + ' · ' + meta.provenance.compute.precision);
    console.log('arrays  ' + (meta.stateExported ? Object.entries(meta.arrays).map(([k, a]) => k + ' ' + a.dtype + ' [' + a.shape.join(', ') + ']').join(', ') : 'none: ' + meta.note));
    console.log('status  ' + meta.status);
    if (errors.length) { console.log('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
  })().catch(err => { console.error(err.message); process.exitCode = 1; });
}

module.exports = { run, summarize, parseArgs };
