// node tools/half-float-check.js [--write] [--steps 100,1000] [--only cahn,turing] [--no-controls]
// What the rgba16f fallback does to the six pde tabs and the five rdx tabs. A device without
// EXT_color_buffer_float stores the simulation state as float16; this runs each tab's own default recipe
// (seed "half-float-check", the tab's default grid, running:false, warmup N) in the real studio twice,
// once normally and once with EXT_color_buffer_float hidden by an init script (getExtension returns null
// for it and getSupportedExtensions leaves it out), which sends the tab down its own fallback. Both states
// come back through Studio.exportData(). It reports, per tab and step count, the relative L2 and maximum
// differences of the exported field, the mean and standard deviation of each channel, and the status line's
// measured values side by side.
//
// Controls: the float32 run is repeated and must match itself bit for bit (so the difference is the
// precision, not run-to-run noise); the hidden-extension run must report rgba16f in its export and
// "float16 state (half-float fallback)" in its provenance and show the half-float status span, which the
// float32 run must not; and the two precisions must differ (a zero difference means the fallback never ran).
// It also reports whether either state is bit for bit unchanged between the step counts: float16 storage
// drops any increment below half its spacing, so a slowly growing instability can freeze.
//
// Three tabs did not survive the plain fallback: chemotaxis froze, amb's fluctuations shrank instead of
// growing, and pfc lost the conservation of its mean. The modules now handle them (validation/HALF-FLOAT.md):
//   BASED    chemotaxis and amb store float16 state as the deviation from their uniform state (halfBase in the
//            module). The fallback export must name that base and the float32 export none, and the float16
//            run must meet ACCEPT at the largest step count against the float32 run: not frozen since the
//            first step count, every channel's standard deviation within 10% of float32's, and moving the same
//            way as float32's since the first step count. The criteria were fixed before the runs.
//   REFUSED  pfc refuses the fallback (halfRefuse): with the extension hidden the status line and the fault
//            panel must carry the refusal, no step may run and no state may export; float32 still runs.
// Failure controls (skipped with --no-controls), on a patched copy of the studio in a temporary directory:
//   nobase   the BASED tabs with halfBase removed, which is the fallback as it was: each must fail ACCEPT.
//   pfc      pfc with the refusal removed, plainly and with the float16 state stored as the deviation from
//            psi0: the mean must drift more than CONSERVE times as far as float32's between the step counts.
//            This is the evidence for refusing rather than fixing pfc.
// --write stores validation/results/half-float.json. validation/HALF-FLOAT.md explains the table.
'use strict';
const { glArgs } = require('./lib/gl-args');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), assert = require('node:assert/strict');
const F = require('../src/shared/data-formats.js');
const root = path.resolve(__dirname, '..');
const TABS = ['amb', 'cahn', 'ohta', 'swift', 'pfc', 'ks', 'excitable', 'turing', 'cyclic', 'chemotaxis', 'vegetation'];
const BASED = { chemotaxis: 'froze: the float16 state stopped changing', amb: 'fluctuations shrank instead of growing' };
const REFUSED = { pfc: 'the mean density, conserved by the equation, drifted' };
const SEED = 'half-float-check';
const ACCEPT = { sdTolerance: 0.10 }, CONSERVE = 3;

const argv = process.argv.slice(2), opt = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const STEPS = (opt('--steps') || '100,1000').split(',').map(Number);
const ONLY = opt('--only') ? opt('--only').split(',') : TABS;
const CONTROLS = !argv.includes('--no-controls');
assert(STEPS.every(n => Number.isInteger(n) && n > 0), '--steps takes positive integers');
assert(STEPS.length >= 2 || !CONTROLS, 'the acceptance test and the controls compare two step counts; pass --no-controls for one');
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

// A tab that refuses the fallback: the refusal must reach the status line and the stage, and nothing may run.
async function refusedRun(browser, studio, v, id, steps) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: 'no-preference' });
  await ctx.addInitScript(HIDE_FLOAT32);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto('file://' + studio + encode({ id, seed: SEED, v, warmup: steps, running: false }));
    await page.waitForFunction(() => window.Studio && /cannot run/.test(document.querySelector('#status')?.innerText || ''), null, { timeout: 120000 });
    await page.waitForTimeout(1500); // long enough for a warm-up to have reported a step, had one started
    const got = await page.evaluate(async () => {
      const b = new Uint8Array(await (await Studio.exportData()).arrayBuffer());
      let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      const fault = document.getElementById('fault');
      return { npz: btoa(s), text: document.querySelector('#status').innerText, faultShown: !!fault && !fault.hidden,
        faultMsg: document.getElementById('fault-msg')?.textContent || '', precision: Studio.getProvenance().compute.precision };
    });
    assert.deepEqual(errors, [], id + ': page errors on the refused fallback');
    const zip = F.readZip(new Uint8Array(Buffer.from(got.npz, 'base64'))), meta = JSON.parse(new TextDecoder().decode(zip['meta.json']));
    return { text: got.text, faultShown: got.faultShown, faultMsg: got.faultMsg, precision: got.precision, step: stepOf(got.text), members: Object.keys(zip), stateExported: !!meta.stateExported };
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

// ACCEPT for a float16 run against float32, from the first to the last step count.
function accept(f32First, f32Last, f16First, f16Last) {
  const m32a = moments(f32First.data, f32First.shape), m32b = moments(f32Last.data, f32Last.shape);
  const m16a = moments(f16First.data, f16First.shape), m16b = moments(f16Last.data, f16Last.shape);
  const frozen = identical(f16First.data, f16Last.data);
  const sdRatio = m16b.map((m, c) => m.sd / m32b[c].sd);
  const sameTrend = m16b.map((m, c) => Math.sign(m.sd - m16a[c].sd) === Math.sign(m32b[c].sd - m32a[c].sd));
  const pass = !frozen && sdRatio.every(r => Math.abs(r - 1) <= ACCEPT.sdTolerance) && sameTrend.every(Boolean);
  return { frozen, sdRatio, sameTrend, pass };
}
// Drift of each channel's mean between the step counts, float16 against float32.
function drift(f32First, f32Last, f16First, f16Last) {
  const d = (a, b) => moments(b.data, b.shape).map((m, c) => m.mean - moments(a.data, a.shape)[c].mean);
  const d32 = d(f32First, f32Last), d16 = d(f16First, f16Last);
  return { float32: d32, float16: d16, ratio: d16.map((x, c) => Math.abs(x) / Math.abs(d32[c])), conserved: d16.every((x, c) => Math.abs(x) <= CONSERVE * Math.abs(d32[c])) };
}

// A copy of the studio with the module's float16 handling edited out, for the failure controls only.
function patched(studio, name, edits) {
  let html = fs.readFileSync(studio, 'utf8');
  for (const [from, to, count] of edits) {
    const n = html.split(from).length - 1;
    assert.equal(n, count, 'patch ' + name + ': expected ' + count + ' of ' + JSON.stringify(from) + ', found ' + n + '; update tools/half-float-check.js');
    html = html.split(from).join(to);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'half-float-' + name + '-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, html);
  return file;
}

(async () => {
  const { chromium } = require('playwright');
  const studio = process.env.STUDIO ? path.resolve(process.env.STUDIO) : path.join(root, 'dist', 'studio.html');
  const t0 = Date.now(), browser = await chromium.launch({ args: glArgs() }), rows = [], tabs = {}, controls = [];
  const first = STEPS[0], last = STEPS[STEPS.length - 1];
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
    const kept32 = {}, kept16 = {};
    for (const id of ONLY) {
    kept32[id] = {}; kept16[id] = {};
    for (const steps of STEPS) {
      const t = Date.now();
      const f32 = await run(browser, studio, v, id, steps, false);
      const repeat = steps === last ? await run(browser, studio, v, id, steps, false) : null;
      assert.equal(findPrecision(f32.meta), 'rgba32f', id + ': the normal run is float32');
      assert.equal(f32.precision, 'float32 state', id + ': provenance of the normal run');
      assert(!f32.spans.some(s => s.cls.includes('half-float')), id + ': no half-float span on float32');
      assert.equal(findKey(f32.meta, 'stateBase', x => x !== undefined), null, id + ': float32 state is stored as it is');
      assert.equal(f32.step, steps);
      if (repeat) assert(identical(f32.data, repeat.data), id + ': the float32 run repeats bit for bit');
      kept32[id][steps] = f32;
      if (REFUSED[id]) {
        const r = await refusedRun(browser, studio, v, id, steps);
        assert(/cannot run/.test(r.text) && /float16/.test(r.text), id + ': the status line carries the refusal: ' + r.text);
        assert(r.faultShown && /cannot run/.test(r.faultMsg), id + ': the stage shows the refusal');
        assert.equal(r.step, null, id + ': no step runs on the refused fallback');
        assert(!r.stateExported && r.members.join() === 'meta.json', id + ': the refused fallback exports no state');
        const row = { id, steps, refused: true, message: r.faultMsg, precision: r.precision, float32: { grid: f32.shape.slice(0, 2).reverse(), moments: moments(f32.data, f32.shape) },
          float32Repeat: repeat ? 'identical' : 'not repeated at this step count', seconds: Math.round((Date.now() - t) / 100) / 10 };
        rows.push(row);
        console.log(`${id.padEnd(11)} steps ${String(steps).padStart(5)}  float16 REFUSED ("${r.faultMsg.slice(0, 70)}...")  float32 sd ${row.float32.moments.map(m => m.sd.toPrecision(3)).join(',')} mean ${row.float32.moments.map(m => m.mean.toPrecision(6)).join(',')}  [${row.seconds} s]`);
        continue;
      }
      const f16 = await run(browser, studio, v, id, steps, true);
      assert.equal(findPrecision(f16.meta), 'rgba16f', id + ': hiding EXT_color_buffer_float sends the tab to rgba16f');
      assert.equal(f16.precision, 'float16 state (half-float fallback)', id + ': provenance of the fallback run');
      assert(f16.spans.some(s => s.cls.includes('half-float') && /measurements carry half-float rounding/.test(s.text)), id + ': the half-float span appears on the fallback');
      const base = findKey(f16.meta, 'stateBase', x => x !== undefined);
      if (BASED[id]) assert(base !== null && [].concat(base).every(Number.isFinite), id + ': the fallback stores deviations from a base and says so: ' + JSON.stringify(base));
      else assert.equal(base, null, id + ': this tab stores float16 state as it is');
      assert.equal(f16.step, steps);
      assert.deepEqual(f32.shape, f16.shape, id + ': same grid');
      const d = difference(f32.data, f16.data);
      assert(d.relL2 > 0, id + ': the precisions must differ, or the fallback never ran');
      kept16[id][steps] = f16;
      const m32 = measured(f32.spans), m16 = measured(f16.spans);
      const status = Object.keys({ ...m32, ...m16 }).map(label => {
        const a = m32[label], b = m16[label];
        return { label, float32: a ? a.text : null, float16: b ? b.text : null,
          diff: a && b && a.values.length === b.values.length ? a.values.map((x, i) => b.values[i] - x) : null };
      });
      const row = { id, steps, grid: f32.shape.slice(0, 2).reverse(), array: f32.array, dt: findKey(f32.meta, 'dt', v => typeof v === 'number'), stateBase: base, ...d,
        moments: { float32: moments(f32.data, f32.shape), float16: moments(f16.data, f16.shape) },
        float32Repeat: repeat ? 'identical' : 'not repeated at this step count', guard: { float32: f32.meta.guard ?? null, float16: f16.meta.guard ?? null }, status, seconds: Math.round((Date.now() - t) / 100) / 10 };
      // Stagnation: an increment smaller than half the float16 spacing rounds back to the stored value, so a
      // slowly growing mode can freeze. Compare each precision with itself at the first step count.
      if (steps !== first) {
        row.unchangedSince = { steps: first, float32: identical(kept32[id][first].data, f32.data), float16: identical(kept16[id][first].data, f16.data) };
        row.meanDrift = drift(kept32[id][first], f32, kept16[id][first], f16);
      }
      if (BASED[id] && steps === last && first !== last) row.accept = accept(kept32[id][first], f32, kept16[id][first], f16);
      rows.push(row);
      console.log(`${id.padEnd(11)} steps ${String(steps).padStart(5)}  rel L2 ${d.relL2.toExponential(2)}  max ${d.maxAbs.toExponential(2)} (field max ${d.fieldMaxAbs.toPrecision(3)})  ` +
        `sd ${row.moments.float32.map(m => m.sd.toPrecision(3)).join(',')} | ${row.moments.float16.map(m => m.sd.toPrecision(3)).join(',')}  ` +
        `mean ${row.moments.float32.map(m => m.mean.toPrecision(6)).join(',')} | ${row.moments.float16.map(m => m.mean.toPrecision(6)).join(',')}  ` +
        (base !== null ? `base ${JSON.stringify(base)}  ` : '') +
        (row.unchangedSince?.float16 ? `FLOAT16 STATE UNCHANGED SINCE STEP ${row.unchangedSince.steps}  ` : '') +
        (row.accept ? (row.accept.pass ? 'ACCEPTED  ' : 'NOT ACCEPTED  ') : '') +
        status.map(s => `${s.label}: ${s.float32} | ${s.float16}`).join('; ') + `  [${row.seconds} s]`);
    }
    if (BASED[id] && first !== last) {
      const a = rows.find(r => r.id === id && r.steps === last).accept;
      tabs[id] = { handling: 'float16 state stored as the deviation from a base state', plainFallback: BASED[id], accept: a };
      assert(a.pass, id + ': the float16 run does not meet the acceptance criteria: ' + JSON.stringify(a));
    }
    if (REFUSED[id]) tabs[id] = { handling: 'refuses the float16 fallback', plainFallback: REFUSED[id] };
    }

    // ---- failure controls on patched copies of the studio
    if (CONTROLS) {
      const noBase = ONLY.some(id => BASED[id]) ? patched(studio, 'nobase', [['halfBase: s =>', 'halfBaseOff: s =>', Object.keys(BASED).length]]) : null;
      for (const id of ONLY.filter(id => BASED[id])) {
        const f16 = {};
        for (const steps of [first, last]) f16[steps] = await run(browser, noBase, v, id, steps, true);
        assert.equal(findKey(f16[last].meta, 'stateBase', x => x !== undefined), null, id + ': the control build stores float16 state as it is');
        const a = accept(kept32[id][first], kept32[id][last], f16[first], f16[last]);
        controls.push({ id, control: 'nobase', mutant: 'halfBase removed (the fallback as it was)', accept: a, meanDrift: drift(kept32[id][first], kept32[id][last], f16[first], f16[last]),
          sd: moments(f16[last].data, f16[last].shape).map(m => m.sd), detected: !a.pass });
        console.log(`control     ${id.padEnd(11)} without halfBase: frozen ${a.frozen}, sd ratio ${a.sdRatio.map(r => r.toFixed(3)).join(',')}, same trend ${a.sameTrend.join(',')}  ${a.pass ? 'MISSED (passes ACCEPT)' : 'detected (fails ACCEPT)'}`);
      }
      for (const id of ONLY.filter(id => REFUSED[id])) {
        const variants = [
          ['plain', 'refusal removed: float16 state stored as it is', [['halfRefuse: PFC_HALF_REFUSAL,', 'halfRefuseOff: PFC_HALF_REFUSAL,', 1]]],
          ['base', 'refusal removed, float16 state stored as the deviation from psi0', [['halfRefuse: PFC_HALF_REFUSAL,', 'halfBase: s => s.psi0,', 1]]],
        ];
        for (const [name, mutant, edits] of variants) {
          const file = patched(studio, id + '-' + name, edits), f16 = {};
          for (const steps of [first, last]) f16[steps] = await run(browser, file, v, id, steps, true);
          const dr = drift(kept32[id][first], kept32[id][last], f16[first], f16[last]), a = accept(kept32[id][first], kept32[id][last], f16[first], f16[last]);
          const base = findKey(f16[last].meta, 'stateBase', x => x !== undefined);
          assert.equal(base === null, name === 'plain', id + ' control ' + name + ': stateBase ' + JSON.stringify(base));
          controls.push({ id, control: name, mutant, meanDrift: dr, accept: a, moments: { first: moments(f16[first].data, f16[first].shape), last: moments(f16[last].data, f16[last].shape) },
            relL2: difference(kept32[id][last].data, f16[last].data).relL2, detected: !dr.conserved });
          console.log(`control     ${id.padEnd(11)} ${mutant}: mean drift ${dr.float16.map(x => x.toExponential(2)).join(',')} against float32 ${dr.float32.map(x => x.toExponential(2)).join(',')} (${dr.ratio.map(r => r.toFixed(1)).join(',')} times)  ${dr.conserved ? 'MISSED (conserved within ' + CONSERVE + ' times)' : 'detected: not conserved'}`);
        }
      }
      const missed = controls.filter(c => !c.detected);
      assert.equal(missed.length, 0, 'failure controls missed: ' + missed.map(c => c.id + '/' + c.control).join(', '));
    }
  } finally { await browser.close(); }
  const result = { date: new Date().toISOString().slice(0, 10), renderer, recipeVersion: v, seed: SEED, steps: STEPS,
    method: 'Real studio, each tab\'s default recipe with warmup N and running:false; float16 by hiding EXT_color_buffer_float in an init script; state from Studio.exportData(). relL2 = ||f16 - f32||2 / ||f32||2 over the exported array; maxRel = max|f16 - f32| / max|f32|; moments are the mean and standard deviation of each channel of the exported array; unchangedSince says whether the state of each precision is bit for bit the same as at the first step count; meanDrift is the change of each channel\'s mean between the step counts. One seed: the differences are exact for it, with no sampling error, and their spread over seeds is not measured.',
    acceptance: 'For the tabs that store float16 state as a deviation from a base (' + Object.keys(BASED).join(', ') + '), fixed before the runs: at the largest step count the float16 state is not bit for bit its state at the first step count, every channel\'s standard deviation is within ' + ACCEPT.sdTolerance * 100 + '% of float32\'s, and it has moved the same way as float32\'s since the first step count. Refused tabs (' + Object.keys(REFUSED).join(', ') + '): the refusal is in the status line and on the stage, no step runs and no state exports. A fix for a refused tab would have to keep the mean drift within ' + CONSERVE + ' times float32\'s.',
    controls: 'float32 repeated bit for bit at the largest step count; rgba16f in the fallback export and float16 provenance; half-float status span present only on the fallback; nonzero difference; stateBase named only where the module declares it. Failure controls on patched copies: the based tabs without the base must fail the acceptance test; the refused tab without the refusal, plain and with a base, must fail the conservation test.',
    tabs, failureControls: controls, seconds: Math.round((Date.now() - t0) / 1000), rows };
  if (argv.includes('--write')) fs.writeFileSync(path.join(root, 'validation', 'results', 'half-float.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(`${rows.length} tab and step-count pairs and ${controls.length} failure controls checked on ${renderer} in ${result.seconds} s`);
})().catch(e => { console.error('FAIL ' + e.message); process.exitCode = 1; });

// The module's own meta sits inside the engine's meta.json; find a key wherever it is.
function findKey(meta, key, test) {
  if (!meta || typeof meta !== 'object') return null;
  if (key in meta && test(meta[key])) return meta[key];
  for (const v of Object.values(meta)) { const p = v && typeof v === 'object' ? findKey(v, key, test) : null; if (p !== null) return p; }
  return null;
}
const findPrecision = meta => findKey(meta, 'precision', v => typeof v === 'string' && /^rgba/.test(v));
