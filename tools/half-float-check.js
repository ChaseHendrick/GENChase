// node tools/half-float-check.js [--write] [--steps 100,1000] [--only cahn,turing]
// What the rgba16f fallback does to the six pde tabs and the five rdx tabs. A device without
// EXT_color_buffer_float stores the simulation state as float16; this runs each tab's own default recipe
// (seed "half-float-check", the tab's default grid, running:false, warmup N) in the real studio twice,
// once normally and once with EXT_color_buffer_float hidden by an init script (getExtension returns null
// for it and getSupportedExtensions leaves it out), which sends the tab down its own fallback. Both states
// come back through Studio.exportData(). It reports, per tab and step count, the relative L2 and maximum
// differences of the exported field, and the status line's measured values side by side.
//
// Controls: the float32 run is repeated and must match itself bit for bit (so the difference is the
// precision, not run-to-run noise); the hidden-extension run must report rgba16f in its export and
// "float16 state (half-float fallback)" in its provenance and show the half-float status span, which the
// float32 run must not; and the two precisions must differ (a zero difference means the fallback never ran).
// It also reports whether either state is bit for bit unchanged between the step counts: float16 storage
// drops any increment below half its spacing, so a slowly growing instability can freeze.
// --write stores validation/results/half-float.json. validation/HALF-FLOAT.md explains the table.
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const F = require('../src/shared/data-formats.js');
const root = path.resolve(__dirname, '..');
const TABS = ['amb', 'cahn', 'ohta', 'swift', 'pfc', 'ks', 'excitable', 'turing', 'cyclic', 'chemotaxis', 'vegetation'];
const SEED = 'half-float-check';

const argv = process.argv.slice(2), opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const STEPS = (opt('--steps') || '100,1000').split(',').map(Number);
const ONLY = opt('--only') ? opt('--only').split(',') : TABS;
assert(STEPS.every(n => Number.isInteger(n) && n > 0), '--steps takes positive integers');
assert(ONLY.every(id => TABS.includes(id)), '--only takes ids from ' + TABS.join(', '));

// Installed before any page script runs: the tab asks for EXT_color_buffer_float and is told it is absent.
const HIDE_FLOAT32 = () => {
  for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!C) continue;
    const get = C.prototype.getExtension, list = C.prototype.getSupportedExtensions;
    C.prototype.getExtension = function (name) { return name === 'EXT_color_buffer_float' ? null : get.call(this, name); };
    C.prototype.getSupportedExtensions = function () { return (list.call(this) || []).filter(n => n !== 'EXT_color_buffer_float'); };
  }
};
const encode = recipe => { const { id, ...p } = recipe; return '#' + id + '/' + encodeURIComponent(p.seed) + '/' + Buffer.from(JSON.stringify(p), 'utf8').toString('base64url'); };
const stepOf = text => { const m = /step\s*([\d,]+)/.exec(text); return m ? Number(m[1].replace(/,/g, '')) : null; };

// Status spans, minus the bookkeeping ones, as { label: [numbers] }.
function measured(spans) {
  const out = {};
  for (const s of spans) {
    if (s.cls.includes('half-float')) continue;
    const label = s.text.replace(/[-+]?\d[\d,]*(?:\.\d+)?(?:e[-+]?\d+)?/gi, '#').replace(/\s+/g, ' ').trim();
    if (/^(grid|step|dt|seed)\b|^paused$/.test(label)) continue;
    const nums = (s.text.match(/[-+]?\d[\d,]*(?:\.\d+)?(?:e[-+]?\d+)?/gi) || []).map(x => Number(x.replace(/,/g, '')));
    if (nums.length) out[label] = { text: s.text, values: nums };
  }
  return out;
}

async function run(browser, studio, v, id, steps, hide) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'no-preference' });
  if (hide) await ctx.addInitScript(HIDE_FLOAT32);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('file://' + studio + encode({ id, seed: SEED, v, warmup: steps, running: false }));
    await page.waitForFunction(n => {
      const t = document.querySelector('#status')?.innerText || '', m = /step\s*([\d,]+)/.exec(t);
      return window.Studio && m && Number(m[1].replace(/,/g, '')) === n && /\bpaused\b/.test(t);
    }, steps, { timeout: 900000 });
    const got = await page.evaluate(async () => {
      const b = new Uint8Array(await (await Studio.exportData()).arrayBuffer());
      let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      const status = document.querySelector('#status');
      return { npz: btoa(s), text: status.innerText, spans: [...status.querySelectorAll('span')].map(x => ({ text: x.innerText, cls: x.className })),
        recipe: Studio.getRecipe(), precision: Studio.getProvenance().compute.precision };
    });
    assert.deepEqual(errors, [], id + ': page errors');
    const zip = F.readZip(new Uint8Array(Buffer.from(got.npz, 'base64'))), meta = JSON.parse(new TextDecoder().decode(zip['meta.json']));
    const name = zip['field.npy'] ? 'field' : 'species', arr = F.readNpy(zip[name + '.npy']);
    return { data: Float32Array.from(arr.data), shape: arr.shape, array: name, meta, text: got.text, spans: got.spans, recipe: got.recipe, precision: got.precision, step: stepOf(got.text) };
  } finally { await ctx.close(); }
}

function difference(a, b) {
  let d2 = 0, a2 = 0, max = 0, scale = 0, nonfinite = 0;
  for (let i = 0; i < a.length; i++) {
    if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) { nonfinite++; continue; }
    const d = b[i] - a[i]; d2 += d * d; a2 += a[i] * a[i];
    max = Math.max(max, Math.abs(d)); scale = Math.max(scale, Math.abs(a[i]));
  }
  return { relL2: Math.sqrt(d2 / a2), maxAbs: max, maxRel: max / scale, fieldMaxAbs: scale, nonfinite };
}
// Pattern-level statistics of one exported array: a different realization of the same pattern keeps these
// close even when the pointwise difference is of order one.
// One entry per channel for the rdx species arrays ([h, w, k]), one for a pde field.
function moments(a, shape) {
  const k = shape.length === 3 ? shape[2] : 1, out = [];
  for (let c = 0; c < k; c++) {
    let n = 0, m = 0, q = 0;
    for (let i = c; i < a.length; i += k) { const x = a[i]; if (!Number.isFinite(x)) continue; n++; const d = x - m; m += d / n; q += d * (x - m); }
    out.push({ mean: m, sd: Math.sqrt(q / n) });
  }
  return out;
}
function identical(a, b) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false; return true; }

(async () => {
  const { chromium } = require('playwright');
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.join(root, 'dist', 'studio.html');
  const t0 = Date.now(), browser = await chromium.launch({ args: glArgs() }), rows = [];
  let renderer = null, v;
  try {
    { // The current recipe version, from the engine rather than a constant here.
      const page = await browser.newPage();
      await page.goto('file://' + studio + '#cahn/' + SEED);
      await page.waitForFunction(() => window.Studio && Studio.getRecipe && Studio.getRecipe('cahn'));
      v = await page.evaluate(() => Studio.getRecipe('cahn').v);
      renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'), d = gl.getExtension('WEBGL_debug_renderer_info'); return String(gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER)); });
      await page.close();
    }
    for (const id of ONLY) {
    const kept = {};
    for (const steps of STEPS) {
      const t = Date.now();
      const f32 = await run(browser, studio, v, id, steps, false), f16 = await run(browser, studio, v, id, steps, true);
      const repeat = steps === Math.max(...STEPS) ? await run(browser, studio, v, id, steps, false) : null;
      assert.equal(findPrecision(f32.meta), 'rgba32f', id + ': the normal run is float32');
      assert.equal(findPrecision(f16.meta), 'rgba16f', id + ': hiding EXT_color_buffer_float sends the tab to rgba16f');
      assert.equal(f32.precision, 'float32 state', id + ': provenance of the normal run');
      assert.equal(f16.precision, 'float16 state (half-float fallback)', id + ': provenance of the fallback run');
      assert(!f32.spans.some(s => s.cls.includes('half-float')), id + ': no half-float span on float32');
      assert(f16.spans.some(s => s.cls.includes('half-float') && /measurements carry half-float rounding/.test(s.text)), id + ': the half-float span appears on the fallback');
      assert.equal(f32.step, steps); assert.equal(f16.step, steps);
      assert.deepEqual(f32.shape, f16.shape, id + ': same grid');
      const d = difference(f32.data, f16.data);
      assert(d.relL2 > 0, id + ': the precisions must differ, or the fallback never ran');
      if (repeat) assert(identical(f32.data, repeat.data), id + ': the float32 run repeats bit for bit');
      const m32 = measured(f32.spans), m16 = measured(f16.spans);
      const status = Object.keys({ ...m32, ...m16 }).map(label => {
        const a = m32[label], b = m16[label];
        return { label, float32: a ? a.text : null, float16: b ? b.text : null,
          diff: a && b && a.values.length === b.values.length ? a.values.map((x, i) => b.values[i] - x) : null };
      });
      const row = { id, steps, grid: f32.shape.slice(0, 2).reverse(), array: f32.array, dt: findKey(f32.meta, 'dt', v => typeof v === 'number'), ...d,
        moments: { float32: moments(f32.data, f32.shape), float16: moments(f16.data, f16.shape) },
        float32Repeat: repeat ? 'identical' : 'not repeated at this step count', guard: { float32: f32.meta.guard ?? null, float16: f16.meta.guard ?? null }, status, seconds: Math.round((Date.now() - t) / 100) / 10 };
      // Stagnation: an increment smaller than half the float16 spacing rounds back to the stored value, so a
      // slowly growing mode can freeze. Compare each precision with itself at the first step count.
      if (kept.steps !== undefined) row.unchangedSince = { steps: kept.steps, float32: identical(kept.f32, f32.data), float16: identical(kept.f16, f16.data) };
      else Object.assign(kept, { steps, f32: f32.data, f16: f16.data });
      rows.push(row);
      console.log(`${id.padEnd(11)} steps ${String(steps).padStart(5)}  rel L2 ${d.relL2.toExponential(2)}  max ${d.maxAbs.toExponential(2)} (field max ${d.fieldMaxAbs.toPrecision(3)})  ` +
        `sd ${row.moments.float32.map(m => m.sd.toPrecision(3)).join(',')} | ${row.moments.float16.map(m => m.sd.toPrecision(3)).join(',')}  ` +
        (row.unchangedSince?.float16 ? `FLOAT16 STATE UNCHANGED SINCE STEP ${row.unchangedSince.steps}  ` : '') +
        status.map(s => `${s.label}: ${s.float32} | ${s.float16}`).join('; ') + `  [${row.seconds} s]`);
    }
    }
  } finally { await browser.close(); }
  const result = { date: new Date().toISOString().slice(0, 10), renderer, recipeVersion: v, seed: SEED, steps: STEPS,
    method: 'Real studio, each tab\'s default recipe with warmup N and running:false; float16 by hiding EXT_color_buffer_float in an init script; state from Studio.exportData(). relL2 = ||f16 - f32||2 / ||f32||2 over the exported array; maxRel = max|f16 - f32| / max|f32|; moments are the mean and standard deviation of each channel of the exported array; unchangedSince says whether the state of each precision is bit for bit the same as at the first step count. One seed: the differences are exact for it, with no sampling error, and their spread over seeds is not measured.',
    controls: 'float32 repeated bit for bit at the largest step count; rgba16f in the fallback export and float16 provenance; half-float status span present only on the fallback; nonzero difference.',
    seconds: Math.round((Date.now() - t0) / 1000), rows };
  if (argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation', 'results', 'half-float.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`${rows.length} tab and step-count pairs checked on ${renderer} in ${result.seconds} s`);
})().catch(e => { console.error('FAIL ' + e.message); process.exitCode = 1; });

// The module's own meta sits inside the engine's meta.json; find a key wherever it is.
function findKey(meta, key, test) {
  if (!meta || typeof meta !== 'object') return null;
  if (key in meta && test(meta[key])) return meta[key];
  for (const v of Object.values(meta)) { const p = v && typeof v === 'object' ? findKey(v, key, test) : null; if (p !== null) return p; }
  return null;
}
const findPrecision = meta => findKey(meta, 'precision', v => typeof v === 'string' && /^rgba/.test(v));
