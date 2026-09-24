// node tools/art-check.js
// End-to-end check of the art modes (apps/validate/art.js) on the real dist/studio.html in a real browser,
// at small grids so it fits in CI. It runs the runner as a volunteer would, then checks what it wrote:
//   (a) hunt: turing at grid 128, warmup 300, three seeds, one kept print. Every step count is verified,
//       every hash is the engine's own encoding of its recipe, a fresh re-run gives identical metrics and
//       luminance hashes, a resume in the same folder renders nothing again, and the print is 2400 px.
//       A hunt stopped by SIGTERM mid-candidate (as the validator's Stop does) records no failure, and its
//       Resume scores every candidate. A hunt under a German system locale still reads its step counts.
//   (b) deep render: cahn at grid 128 for 200 steps. The print is 2400 px, the engine's print-job recipe
//       equals the recorded recipe, and the grid change is labelled a new plate.
//   (c) evolve: one parent, four children. Fixed keys stay the parent's, hashes carry only schema keys.
//   (d) negative controls: a payload with a bookkeeping key and a deep render past the tab's step maximum
//       are refused; a plate that really is flat is gated as flat.
//   (e) eligibility of every ART_TABS tab: two fresh loads stop at the same step with the same pixels, and
//       the status reports grid, step and paused.
// The runner's pixel claims hold on one renderer and Chromium build. Nothing here compares pixels across GPUs.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto'), url = require('node:url');
const tabs = require('../apps/validate/art-tabs');
const { launchGraphicsBrowser } = require('../apps/validate/browser');
const ROOT = path.resolve(__dirname, '..'), RUNNER = path.join(ROOT, 'apps/validate/art.js'), STUDIO = path.join(ROOT, 'dist/studio.html');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const read = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, 'art', rel), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const schemas = tabs.loadSchemas(ROOT, Object.keys(tabs.ART_TABS));
const summary = [];

function run(args, out, env = {}) {
  const t0 = Date.now();
  const r = cp.spawnSync(process.execPath, [RUNNER, ...args, '--out', out], { encoding: 'utf8', timeout: 20 * 60 * 1000, env: { ...process.env, GENCHASE_JOB_DIR: '', ...env } });
  const seconds = (Date.now() - t0) / 1000, log = (r.stdout || '') + (r.stderr || '');
  return { code: r.status, log, seconds };
}
// Start the runner in its own process group and stop it as jobs.js stop() does: SIGTERM to the group once
// `when` matches the log and `delay` ms have passed, then SIGKILL 3 s later if anything is left.
function runStopped(args, out, when, delay) {
  return new Promise(resolve => {
    const t0 = Date.now(), child = cp.spawn(process.execPath, [RUNNER, ...args, '--out', out], { detached: true, env: { ...process.env, GENCHASE_JOB_DIR: '' } });
    let log = '', sent = false, killer = null;
    const signal = s => { try { process.kill(-child.pid, s); } catch { /* Already gone. */ } };
    const feed = d => {
      log += d;
      if (!sent && when.test(log)) { sent = true; setTimeout(() => { signal('SIGTERM'); killer = setTimeout(() => signal('SIGKILL'), 3000); }, delay); }
    };
    child.stdout.on('data', feed); child.stderr.on('data', feed);
    child.on('close', (code, sig) => { clearTimeout(killer); resolve({ code, signal: sig, log, seconds: (Date.now() - t0) / 1000 }); });
  });
}
function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('latin1', 1, 4), 'PNG', path.basename(file) + ' is a PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
function decode(hash) { return tabs.parseRecipeHash(hash); }
function onlySchemaKeys(id, hash) {
  const extra = tabs.unknownKeys(decode(hash).payload, schemas[id].keys);
  assert.deepEqual(extra, [], hash + ' names keys outside the ' + id + ' schema');
}
function commonRecord(id, r, steps) {
  assert.notEqual(r.status, 'failed', 'candidate ' + r.index + ' failed: ' + r.reason);
  assert.equal(r.steps, steps); assert.equal(r.stepsSource, 'status');
  assert.equal(r.hash, tabs.encodeRecipe(r.recipe), 'the address hash is the engine encoding of its recipe');
  assert.equal(r.recipe.id, id); assert.equal(r.recipe.warmup ?? schemas[id].defaults.warmup, steps); assert.equal(r.recipe.running, false);
  assert.equal(r.validated, false);
  onlySchemaKeys(id, r.hash);
  if (r.thumb) { const info = tabs.jpegInfo(fs.readFileSync(path.join(r.dir, 'art', r.thumb))); assert(info.width <= 320 && info.height <= 320); }
}
function checkPrint(dir, r, size) {
  assert(r.print, 'a print was kept');
  assert.deepEqual(pngSize(path.join(dir, 'art', r.print)), size);
  assert.equal(sha(path.join(dir, 'art', r.print)), r.printSha256);
  const job = read(dir, r.printJob);
  assert.deepEqual(job.recipe, r.recipe, 'the engine print job records the same recipe');
  assert.equal(r.printJobMatches, true);
}
function load(dir) { const c = read(dir, 'candidates.json'); for (const r of c.records) r.dir = dir; return c; }
function noNetwork(dir) {
  const html = fs.readFileSync(path.join(dir, 'art/gallery.html'), 'utf8');
  assert(!/http/i.test(html), 'the gallery has no network reference');
  // Every "Open in the studio" link resolves, from the gallery's own folder, to dist/studio.html.
  for (const [, href] of html.matchAll(/<a href="([^"#]*)#/g)) assert.equal(path.resolve(path.join(dir, 'art'), decodeURIComponent(href)), STUDIO, 'the studio link resolves to dist/studio.html');
}
function checkShare(dir) {
  const share = read(dir, 'share.json');
  assert(share.thumbs.length <= 12);
  for (const t of share.thumbs) { assert.match(t, /^thumbs\/[a-z0-9-]+\.jpg$/); tabs.jpegInfo(fs.readFileSync(path.join(dir, 'art', t))); }
  for (const r of share.records) { assert.equal(r.recipe, undefined); assert.equal(r.print, undefined); assert.equal(r.validated, false); }
  return share;
}

async function eligibility() {
  const { chromium } = require('playwright');
  const { browser, graphics } = await launchGraphicsBrowser(chromium);
  const out = {};
  try {
    for (const id of Object.keys(tabs.ART_TABS)) {
      const loads = [];
      for (let n = 0; n < 2; n++) {
        const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: 'en-US', reducedMotion: 'no-preference' });
        try {
          await ctx.route(/^https?:\/\//, r => r.abort());
          const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
          await page.goto(url.pathToFileURL(STUDIO).href + '#' + id + '/elig-1/' + b64({ grid: 128, warmup: 100, running: false }), { waitUntil: 'domcontentloaded', timeout: 90000 });
          await page.evaluate(() => Studio.ready);
          await page.waitForFunction(() => { const s = document.querySelector('#status').innerText; return /\bstep\s+100\b/.test(s) && /\bpaused\b/.test(s) && document.querySelector('#seed').value === 'elig-1'; }, null, { timeout: 120000, polling: 200 });
          await page.waitForTimeout(400);
          loads.push(await page.evaluate(id => {
            const f = Studio.modules[id].schema, c = [...document.querySelectorAll('canvas')].find(x => x.offsetParent !== null && x.width > 100);
            const t = document.createElement('canvas'); t.width = 200; t.height = Math.max(1, Math.round(200 * c.height / c.width));
            t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
            const d = t.getContext('2d').getImageData(0, 0, t.width, t.height).data; let h = 2166136261;
            for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); }
            return { status: document.querySelector('#status').innerText.replace(/\s+/g, ' '), fp: (h >>> 0).toString(16),
              running: f.some(x => x.key === 'running' && x.type === 'toggle'), warmup: f.some(x => x.key === 'warmup' && x.type === 'range') };
          }, id));
          assert.deepEqual(errors, [], id + ' page errors');
        } finally { await ctx.close(); }
      }
      assert(loads[0].running && loads[0].warmup, id + ' has a running toggle and a warmup range');
      for (const l of loads) { assert.match(l.status, /grid 128×128/); assert.match(l.status, /\bstep 100\b/); assert.match(l.status, /\bpaused\b/); }
      assert.equal(loads[0].fp, loads[1].fp, id + ': two fresh loads at step 100 give the same pixels');
      out[id] = { fingerprint: loads[0].fp, status: loads[0].status };
    }
  } finally { await browser.close(); }
  return { renderer: graphics.renderer, tabs: out };
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'genchase-art-check-'));
  const started = Date.now();
  try {
    // (a) hunt
    const A = path.join(tmp, 'hunt-a'), B = path.join(tmp, 'hunt-b');
    const huntArgs = ['--mode', 'art-hunt', '--id', 'turing', '--recipe', '#turing/base/' + b64({ grid: 128, warmup: 300 }), '--samples', '3', '--start', '0', '--keep', '1', '--inches', '8', '--ppi', '300'];
    let r = run(huntArgs, A); assert.equal(r.code, 0, r.log);
    const a = load(A);
    assert.equal(a.records.length, 3);
    for (const x of a.records) { commonRecord('turing', x, 300); assert.equal(x.recipe.grid, 128); assert.deepEqual(x.grid, [128, 128]); assert.deepEqual(x.fieldCells, [128, 128], 'turing declares fieldCells'); }
    const kept = a.records.filter(x => x.print); assert.equal(kept.length, 1, 'keep 1 keeps one print'); assert.equal(kept[0].rank, 1);
    checkPrint(A, kept[0], [2400, 2400]);
    assert.equal(a.controls.repeatable, true, 'repeated renders are identical on one renderer');
    const shareA = checkShare(A); noNetwork(A);
    assert.deepEqual(fs.readFileSync(path.join(A, 'art/recipes.txt'), 'utf8').trim().split('\n'), a.records.filter(x => x.status === 'scored').sort((p, q) => p.rank - q.rank).map(x => x.hash));
    summary.push({ check: 'hunt', seconds: r.seconds, scored: a.counts.scored, top: kept[0].hash, class: kept[0].class, entropy: kept[0].metrics.entropy, shareThumbs: shareA.thumbs.length });
    r = run(huntArgs, B); assert.equal(r.code, 0, r.log);
    const b = load(B);
    for (const x of a.records) {
      const y = b.records[x.index];
      assert.equal(y.hash, x.hash); assert.equal(y.lumSha256, x.lumSha256, 'identical luminance on a fresh re-run');
      assert.deepEqual(y.metrics, x.metrics, 'identical metrics on a fresh re-run');
    }
    summary.push({ check: 'hunt re-run', seconds: r.seconds, identical: true });
    r = run(huntArgs, A); assert.equal(r.code, 0, r.log);
    assert.match(r.log, /Resumed 3 candidate\(s\) from the art checkpoint\./); assert(!/candidate \d+ (scored|rejected|failed)/.test(r.log), 'a resume renders nothing again');
    assert.deepEqual(load(A).records.map(x => x.lumSha256), a.records.map(x => x.lumSha256));
    summary.push({ check: 'hunt resume', seconds: r.seconds, rendered: 0 });

    // (a') Stop mid-candidate, then Resume. The stopped runner records nothing further, and nothing it
    // left behind is a failure; the resumed run renders the rest and scores every candidate.
    const T = path.join(tmp, 'hunt-stop');
    const stopped = await runStopped(huntArgs, T, /: candidate 1 scored/, 1000);
    assert.equal(stopped.code, 143, 'the runner exits at once on SIGTERM (code ' + stopped.code + ', signal ' + stopped.signal + ')\n' + stopped.log);
    const saved = read(T, 'checkpoint.json').records.filter(Boolean);
    assert(saved.length >= 1 && saved.length < 3, 'the stop came mid-hunt: ' + saved.length + ' candidate(s) saved');
    assert.deepEqual(saved.filter(x => x.status !== 'scored'), [], 'a stop records no failed candidate');
    r = run(huntArgs, T); assert.equal(r.code, 0, r.log);
    assert.match(r.log, new RegExp('Resumed ' + saved.length + ' candidate\\(s\\) from the art checkpoint\\.'));
    const t = load(T);
    assert.deepEqual(t.records.map(x => x.status), ['scored', 'scored', 'scored'], 'every candidate is scored after Resume');
    assert.deepEqual(t.records.map(x => x.lumSha256), a.records.map(x => x.lumSha256), 'the resumed hunt gives the same plates');
    summary.push({ check: 'hunt stop and resume', seconds: stopped.seconds + r.seconds, savedAtStop: saved.length });

    // (a'') A German system locale formats the status step as "1.000". Art pages pin en-US, and the reader
    // accepts other groupings, so a plate at 1000 steps still counts.
    const G = path.join(tmp, 'hunt-de');
    r = run(['--mode', 'art-hunt', '--id', 'turing', '--recipe', '#turing/base/' + b64({ grid: 128, warmup: 1000 }), '--samples', '1', '--start', '0', '--keep', '0'], G,
      { LANG: 'de_DE.UTF-8', LC_ALL: 'de_DE.UTF-8', LANGUAGE: 'de' });
    assert.equal(r.code, 0, r.log);
    commonRecord('turing', load(G).records[0], 1000);
    summary.push({ check: 'hunt under de_DE', seconds: r.seconds, status: load(G).records[0].status });

    // (b) deep render
    const D = path.join(tmp, 'deep');
    r = run(['--mode', 'art-deep', '--id', 'cahn', '--recipe', '#cahn/deep-1', '--steps', '200', '--grid', '128', '--inches', '8', '--ppi', '300', '--budget', '10'], D);
    assert.equal(r.code, 0, r.log);
    const d = load(D), deep = d.records[0];
    assert.equal(d.records.length, 1); commonRecord('cahn', deep, 200); assert.equal(deep.recipe.grid, 128); assert.deepEqual(deep.fieldCells, [128, 128], 'cahn declares fieldCells');
    assert.equal(deep.print, 'prints/deep.png'); checkPrint(D, deep, [2400, 2400]);
    assert.equal(deep.gridChanged, true); assert.equal(deep.label, 'new plate, not an enlargement');
    assert.equal(d.job.calibration.steps, 200); checkShare(D); noNetwork(D);
    summary.push({ check: 'deep', seconds: r.seconds, status: deep.status, class: deep.class, calibration: d.job.calibration });

    // (c) evolve
    const E = path.join(tmp, 'evolve'), parentHash = '#cahn/evo-1/' + b64({ grid: 128, warmup: 150 });
    r = run(['--mode', 'art-evolve', '--parent', parentHash, '--samples', '4', '--keep', '0', '--inches', '8', '--ppi', '300'], E);
    assert.equal(r.code, 0, r.log);
    const e = load(E), [parent, ...children] = e.records, defs = schemas.cahn.defaults;
    assert.equal(parent.generation, 0); assert.equal(parent.givenHash, parentHash); commonRecord('cahn', parent, 150);
    assert.equal(children.length, 4);
    const eff = (rec, k) => Object.hasOwn(rec, k) ? rec[k] : defs[k];
    for (const c of children) {
      commonRecord('cahn', c, 150);
      assert.equal(c.generation, 1); assert.equal(c.parentHash, parent.hash); assert(['reseed', 'repalette', 'nudge'].includes(c.operator), c.operator);
      assert(!c.print, 'keep 0 keeps no print');
      for (const k of tabs.FIXED_KEYS) {
        assert.deepEqual(c.payload[k], k === 'running' ? false : k === 'warmup' ? 150 : parent.recipe[k], 'child payload keeps fixed ' + k);
        if (k === 'dt' && eff(c.recipe, k) !== eff(parent.recipe, k)) { assert(c.clamped.includes('dt') && eff(c.recipe, k) < eff(parent.recipe, k), 'dt moves only down to the stability ceiling'); continue; }
        assert.deepEqual(eff(c.recipe, k), eff(parent.recipe, k), 'child recipe keeps fixed ' + k);
      }
      onlySchemaKeys('cahn', c.requestedHash);
      if (c.operator !== 'reseed') assert.equal(c.seed, parent.seed); else assert.match(c.seed, /^e-[0-9a-z]{8}$/);
    }
    checkShare(E); noNetwork(E);
    assert.match(fs.readFileSync(path.join(E, 'art/gallery.html'), 'utf8'), /unvalidated recipe, not scientific evidence/);
    summary.push({ check: 'evolve', seconds: r.seconds, operators: children.map(c => c.operator), statuses: e.records.map(x => x.status) });

    // (d) negative controls
    const N1 = path.join(tmp, 'neg-key');
    r = run(['--mode', 'art-deep', '--id', 'cahn', '--recipe', '#cahn/neg-1/' + b64({ grid: 128, score: 0.93 }), '--steps', '50', '--inches', '8', '--budget', '5'], N1);
    assert.equal(r.code, 3, r.log); assert.match(read(N1, 'refused.json').reason, /score/);
    const N2 = path.join(tmp, 'neg-steps');
    r = run(['--mode', 'art-deep', '--id', 'cahn', '--recipe', '#cahn/neg-2/' + b64({ grid: 128 }), '--steps', '2500', '--inches', '8', '--budget', '5'], N2);
    assert.equal(r.code, 3, r.log); assert.match(read(N2, 'refused.json').reason, /warmup 2500 is outside 0 to 2000/);
    const F = path.join(tmp, 'neg-flat');
    // c0 = 0.6 lies outside the spinodal (|c| < 1/sqrt(3)), so the quench decays; no forcing and no grain.
    r = run(['--mode', 'art-hunt', '--id', 'cahn', '--recipe', '#cahn/flat/' + b64({ grid: 128, warmup: 150, c0: 0.6, amp: 0.02, noise: 0, grain: 0 }), '--samples', '1', '--start', '0', '--keep', '0'], F);
    assert.equal(r.code, 0, r.log);
    const flat = load(F).records[0];
    assert.equal(flat.status, 'rejected'); assert.equal(flat.reason, 'flat'); assert(flat.flat.p99 - flat.flat.p01 < 12, 'the plate really is flat: ' + JSON.stringify(flat.flat));
    assert.equal(read(F, 'share.json').records.length, 0, 'a gated plate is not shared');
    summary.push({ check: 'negative controls', refusedKey: true, refusedSteps: true, flat: flat.flat });

    // (e) eligibility
    const elig = await eligibility();
    summary.push({ check: 'eligibility', ...elig });
    console.log(JSON.stringify(summary, null, 1));
    console.log('PASS art-check: hunt, re-run, resume, deep render, evolve, three negative controls and eligibility of ' + Object.keys(tabs.ART_TABS).join(', ') + ' in ' + Math.round((Date.now() - started) / 1000) + ' s');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
})().catch(e => { console.error(summary.length ? JSON.stringify(summary, null, 1) : ''); console.error(e); process.exitCode = 1; });
