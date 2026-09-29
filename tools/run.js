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
// --steps does not stop integration at an exact step. It waits until the status line reports that many steps or sweeps; --wait is a fixed settle time
// in milliseconds when a tab has no step counter. --set key=value (repeatable) overrides one recipe key
// atomically in the hash before loading (including segmented controls). The headless browser uses the software renderer, so a GPU tab runs slowly
// and reports "SwiftShader" as its renderer in the provenance; that is recorded, not hidden.
//
// Set STUDIO=path/to/studio.html to run a copy. Needs Playwright (see TESTING.md).
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('fs');
const path = require('path');
const F = require('../src/shared/data-formats.js');

function parseArgs(argv) {
  const o = { hash: null, out: null, steps: 0, wait: 6000, timeout: 600000, set: [], report: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') o.out = argv[++i];
    else if (a === '--report') o.report = argv[++i];
    else if (a === '--steps') o.steps = +argv[++i];
    else if (a === '--wait') o.wait = +argv[++i];
    else if (a === '--timeout') o.timeout = +argv[++i];
    else if (a === '--set') o.set.push(argv[++i]);
    else if (!o.hash) o.hash = a.replace(/^#/, '');
    else throw new Error('Unexpected argument: ' + a);
  }
  if (!o.hash) throw new Error('usage: node tools/run.js <hash> [--out file.npz] [--steps N] [--wait ms] [--set key=value]');
  for (const key of ['steps', 'wait', 'timeout']) if (!Number.isFinite(o[key]) || o[key] < 0 || (key === 'timeout' && (o[key] < 100 || o[key] > 1800000))) throw Error('Invalid ' + key);
  return o;
}

function requestedRecipe(hash, overrides = []) {
  const parts = hash.replace(/^#/, '').split('/');
  if (!/^[a-z][a-z0-9-]*$/.test(parts[0])) throw Error('Invalid technique ID');
  const payload = parts[2] ? JSON.parse(Buffer.from(parts[2], 'base64url').toString('utf8')) : {};
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') throw Error('Recipe must be an object');
  if (['__proto__', 'constructor', 'prototype'].some(k => Object.prototype.hasOwnProperty.call(payload, k))) throw Error('Unsafe recipe key');
  const recipe = { ...(parts[1] ? { seed: decodeURIComponent(parts[1]) } : {}), ...payload };
  for (const kv of overrides) {
    const at = kv.indexOf('='); if (at < 1) throw Error('--set needs key=value: ' + kv);
    const key = kv.slice(0, at), raw = kv.slice(at + 1);
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) || ['id', '__proto__', 'constructor', 'prototype'].includes(key)) throw Error('Invalid recipe key: ' + key);
    let value; try { value = JSON.parse(raw); } catch { value = raw; }
    recipe[key] = value;
  }
  recipe.id = parts[0]; return recipe;
}
function recipeHash(recipe) {
  return recipe.id + '/' + encodeURIComponent(String(recipe.seed || '')) + '/' + Buffer.from(JSON.stringify(recipe)).toString('base64url');
}
async function run(opts) {
  const { chromium } = require('playwright');
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.resolve(__dirname, '..', 'dist', 'studio.html');
  const requested = requestedRecipe(opts.hash, opts.set), started = Date.now();
  let browser, timer;
  const errors = [], deadline = started + opts.timeout;
  const remaining = () => Math.max(1, deadline - Date.now());
  const operation = async () => {
    browser = await chromium.launch({ args: [...glArgs(), '--ignore-gpu-blocklist'], timeout: remaining() });
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    // This runner only reads local studio assets; modules must not fetch remote resources.
    await page.route(/^https?:/, route => route.abort());
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('file://' + studio + '#' + recipeHash(requested), { waitUntil: 'domcontentloaded', timeout: remaining() });
    await page.waitForFunction(id => window.Studio && Studio.getRecipe?.()?.id === id, requested.id, { timeout: remaining() });
    const unknown = await page.evaluate(keys => {
      const m = Studio.modules[Studio.getRecipe().id], known = new Set(['id', 'seed', 'v', 'bg', 'palette', ...Object.keys(m.defaults), ...m.schema.map(x => x.key)]);
      return keys.filter(k => !known.has(k));
    }, Object.keys(requested));
    if (unknown.length) throw Error('Unknown recipe keys: ' + unknown.join(', '));
    if (opts.steps > 0) {
      await page.waitForFunction(n => {
        const m = /\b(?:step|sweep)s?\s+([0-9,]+)/.exec(document.querySelector('#status').innerText);
        return m && +m[1].replace(/,/g, '') >= n;
      }, opts.steps, { timeout: remaining(), polling: 100 });
    } else await page.waitForTimeout(opts.wait);
    const captured = await page.evaluate(async () => {
      const resolved = () => ({ ...Studio.modules[Studio.getRecipe().id].defaults, ...Studio.getRecipe() });
      const before = resolved(), bytes = new Uint8Array(await (await Studio.exportData()).arrayBuffer());
      let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return { b64: btoa(s), before, after: resolved(), status: document.querySelector('#status').innerText };
    });
    const match = /\b(?:step|sweep)s?\s+([0-9,]+)/.exec(captured.status);
    return { bytes: new Uint8Array(Buffer.from(captured.b64, 'base64')), errors,
      report: { requested, actual: captured.after, recipeStableDuringExport: JSON.stringify(captured.before) === JSON.stringify(captured.after), elapsedMs: Date.now() - started,
        sampling: { requestedCounter: opts.steps || null, observedCounter: match ? +match[1].replace(/,/g, '') : null, waitMs: opts.wait, exactTemporalStop: false, note: 'A counter threshold is a lower bound, not an exact temporal stop. Use a module fixed-budget paused recipe and verify exported time/step for comparisons.' } } };
  };
  try {
    return await Promise.race([operation(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Whole recipe timeout')), opts.timeout); })]);
  } finally {
    clearTimeout(timer);
    if (browser) await Promise.race([browser.close(), new Promise(resolve => { const t = setTimeout(resolve, 2000); t.unref(); })]);
  }
}

function summarize(bytes) {
  const members = F.readZip(bytes), meta = JSON.parse(new TextDecoder().decode(members['meta.json']));
  return { members: Object.keys(members), meta };
}

if (require.main === module) {
  (async () => {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.out && fs.existsSync(opts.out)) throw Error('Output already exists: ' + opts.out);
    if (opts.report && fs.existsSync(opts.report)) throw Error('Report already exists: ' + opts.report);
    const { bytes, errors, report } = await run(opts);
    const { meta } = summarize(bytes);
    const out = opts.out || ('genchase-' + meta.provenance.technique.id + '.npz');
    fs.writeFileSync(out, bytes, { flag: 'wx' });
    if (opts.report) fs.writeFileSync(opts.report, JSON.stringify({ ...report, errors }, null, 2) + '\n', { flag: 'wx' });
    console.log('wrote ' + out + ' (' + bytes.length.toLocaleString() + ' bytes)');
    console.log('link    ' + meta.provenance.link);
    console.log('build   ' + meta.provenance.build + ' · ' + meta.provenance.technique.source + ' ' + String(meta.provenance.technique.sourceSha256).slice(0, 12) + ' · ' + meta.provenance.technique.validation);
    console.log('device  ' + meta.provenance.compute.api + (meta.provenance.compute.renderer ? ' · ' + meta.provenance.compute.renderer : '') + ' · ' + meta.provenance.compute.precision);
    console.log('arrays  ' + (meta.stateExported ? Object.entries(meta.arrays).map(([k, a]) => k + ' ' + a.dtype + ' [' + a.shape.join(', ') + ']').join(', ') : 'none: ' + meta.note));
    console.log('status  ' + meta.status);
    if (errors.length) { console.log('page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
  })().catch(err => { console.error(err.message); process.exitCode = 1; });
}

module.exports = { run, summarize, parseArgs, requestedRecipe, recipeHash };
