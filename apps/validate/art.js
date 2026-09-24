// node apps/validate/art.js --mode art-hunt|art-deep|art-evolve --id ID [settings] [--out DIR]
//
// Art modes for the volunteer runner. Every plate goes through the product path: a recipe hash, the
// shell's applyHash and sanitize (legacyFill and the module's own sanitizer included), regenerate, and
// the shell's own export. Nothing here reaches into a module or builds a second recipe or print stack.
//
// The step count is part of the recipe: every payload carries running:false and warmup:N, and a plate
// counts only once its status reads "step N" and "paused". Budgets decide whether the next render
// starts, never how a plate is computed. Scores are print-sharpness proxies, comparable within one job,
// and not a measure of beauty or scientific evidence.
//
// Output goes to GENCHASE_JOB_DIR (the validator job folder) or --out, never into repository paths:
//   browser-report.json, art/candidates.json, art/share.json, art/recipes.txt, art/gallery.html,
//   art/thumbs/*.jpg, art/prints/*.png with their print-job JSON, art/checkpoint.json.
// Exit codes: 0 finished (including a hunt stopped by its budget), 1 failed, 3 refused before rendering.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), os = require('node:os'), cp = require('node:child_process'), url = require('node:url');
const tabs = require('./art-tabs');
const score = require('./art-score');
const { galleryHtml } = require('./art-gallery');
const { launchGraphicsBrowser } = require('./browser');
const { seal, intact } = require('./checkpoint');
const { redact } = require('./privacy');
const { ids } = require('./commands');

const ROOT = path.resolve(__dirname, '../..');
const STUDIO = path.join(ROOT, 'dist/studio.html');
const THUMB_KEEP = 60;          // thumbnails kept for the gallery; prints are kept for the best `keep` only
const RESTART_EVERY = 25;       // a fresh browser every 25 candidates
const CROP = 1024, THUMB = 320;
const GUARD = /numerical guard|exceeds the monitored range/i;
const FIXED_CLAMP = ['warmup', 'running', 'grid'];
const METRIC_KEYS = ['contrast', 'edge', 'acuity', 'spread', 'ink', 'entropy', 'featurePx'];
const SCORING = {
  definition: 'Candidates are ordered by print-sharpness class (sharp, ok, soft, using the edge and acuity thresholds of tools/sharp.js), then by the entropy of the 64-bin luminance histogram, then by candidate number. Metrics are measured on a central crop of the real export at native pixels, with pixel differences taken at every offset, so they are not comparable with the 2026-09-24 print audit.',
  limits: 'These are proxies for print sharpness and tonal range at this print size, grid, step count and renderer, comparable only within one job. They are not a measure of beauty or composition, and not scientific evidence. They favour high-contrast, fine-grained plates and early coarsening stages.',
};
const REDUCED_MOTION_NOTE = 'Rendered with full motion. A viewer whose browser asks for reduced motion sees only the first 80 steps of a cahn (pde family) recipe, a known studio limitation; turing (rdx family) computes every step either way.';
const REPRODUCIBILITY = 'The same recipe at the same step count gives the same plate on the same renderer and Chromium build, and a statistically similar plate elsewhere. Identical pixels across GPUs are not claimed.';

class Refusal extends Error {}
class Failure extends Error {}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
const b64 = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64url');
const nameFor = index => 'c-' + String(index + 1).padStart(4, '0');
function writeFile(file, data) { fs.writeFileSync(file + '.tmp', data); fs.renameSync(file + '.tmp', file); }
const writeJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n');
function fileSha256(file) {
  return new Promise((resolve, reject) => { const h = crypto.createHash('sha256'); fs.createReadStream(file).on('data', d => h.update(d)).on('error', reject).on('end', () => resolve(h.digest('hex'))); });
}
function gitHead() { const r = cp.spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; }
function playwrightVersion() { try { return require('playwright/package.json').version; } catch { return null; } }
function sd(values) { if (values.length < 2) return null; const m = values.reduce((a, b) => a + b, 0) / values.length; return Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / values.length); }
function median(values) { const s = values.slice().sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; }

// Settings the engine would clamp or replace, found before anything renders. The module's own sanitizer
// (grid parity, time-step ceilings) runs only in the page, so the recorded recipe is compared again later.
function outOfSchema(payload, fields) {
  const out = [];
  for (const f of fields) {
    if (!(f.key in payload)) continue;
    const v = payload[f.key];
    if (f.type === 'range' && !(typeof v === 'number' && v >= f.min && v <= f.max)) out.push(f.key + ' ' + JSON.stringify(v) + ' is outside ' + f.min + ' to ' + f.max);
    if (f.type === 'seg' && !f.options.some(o => o === v)) out.push(f.key + ' ' + JSON.stringify(v) + ' is not one of ' + f.options.join(', '));
    if (f.type === 'toggle' && typeof v !== 'boolean') out.push(f.key + ' must be true or false');
  }
  return out;
}
// Keys the job asked for whose recorded value differs: clamped or replaced by a sanitizer.
function clampedKeys(payload, recipe, defaults) {
  const out = [];
  for (const k of Object.keys(payload)) {
    if (k === 'v') continue;
    let want = payload[k];
    const got = Object.hasOwn(recipe, k) ? recipe[k] : defaults[k];
    if (k === 'palette' && Array.isArray(want)) want = want.map(c => String(c).toUpperCase());
    if (JSON.stringify(want) !== JSON.stringify(got)) out.push(k);
  }
  return out;
}

// Active time: gaps longer than half a second (a SIGSTOP duty cycle, a thermal or battery pause, a
// sleeping laptop) count as 0.1 s, so pauses do not use up a budget or trip a timeout. Expect about 10%
// error at the light duty setting.
class ActiveClock {
  constructor() { this.ms = 0; this.last = Date.now(); this.timer = setInterval(() => this.tick(), 100); this.timer.unref(); }
  tick() { const now = Date.now(), gap = now - this.last; this.ms += gap > 500 ? 100 : gap; this.last = now; }
  seconds() { this.tick(); return this.ms / 1000; }
  stop() { clearInterval(this.timer); }
}

const readStatus = () => {
  const st = document.querySelector('#status'), fault = document.querySelector('#fault'), seed = document.querySelector('#seed');
  return { status: st ? st.innerText.replace(/\s+/g, ' ').trim() : '', seed: seed ? seed.value : null, fault: fault && !fault.hidden ? fault.innerText.slice(0, 500) : null };
};
const readRecipe = id => ({ hash: location.hash, recipe: Studio.getRecipe(id), witness: Studio.getWitness(id), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
const exportState = () => {
  const img = document.querySelector('#export-img'), note = document.querySelector('#export-note');
  if (note && note.classList.contains('err')) return { state: 'err', note: note.textContent };
  if (img && !img.hidden && img.getAttribute('src')) return { state: 'ok', note: note ? note.textContent : '' };
  return null;
};

class ArtRun {
  constructor(opts, dir) {
    this.opts = opts; this.dir = path.resolve(dir); this.art = path.join(this.dir, 'art');
    this.clock = new ActiveClock(); this.records = []; this.rendered = 0; this.controls = null; this.calibration = null; this.stoppedBy = null;
    this.started = new Date().toISOString(); this.keep = opts.mode === 'art-deep' ? 1 : opts.keep;
  }
  log(message) { console.log(redact(message, { root: ROOT })); }
  progress(p) { console.log('GENCHASE_PROGRESS ' + JSON.stringify(p)); }
  within(promise, deadline, what) {
    promise = Promise.resolve(promise); promise.catch(() => {});
    let timer;
    const watch = new Promise((_, reject) => { timer = setInterval(() => { if (this.clock.seconds() > deadline) reject(new Failure(what + ' did not finish within the active-time limit')); }, 250); });
    return Promise.race([promise, watch]).finally(() => clearInterval(timer));
  }
  async launch() {
    const { browser, graphics } = await launchGraphicsBrowser(this.chromium);
    if (this.graphics && graphics.renderer !== this.graphics.renderer) { await browser.close(); throw new Failure('The renderer changed after a browser restart.'); }
    this.browser = browser; this.graphics = graphics;
  }
  async restartBrowser() { await this.browser?.close().catch(() => {}); await this.launch(); }
  async setup() {
    this.chromium = require('playwright').chromium;
    await this.launch();
    const g = this.graphics;
    this.log('Graphics: ' + (g.renderer || 'WebGL2 unavailable') + (g.fallback ? ' (software fallback)' : '') + '. Float32 targets: ' + g.float32 + '.');
    if (!g.webgl2 || !g.float32) throw new Refusal('This browser lacks WebGL2 or float32 color buffers, so a plate would integrate at lower precision. Art jobs refuse to run without them.');
    this.studioBytes = fs.readFileSync(STUDIO); this.studioSha256 = sha256(this.studioBytes); this.commit = gitHead();
    this.browserVersions = { chromium: this.browser.version(), playwright: playwrightVersion() };
    fs.mkdirSync(path.join(this.art, 'thumbs'), { recursive: true }); fs.mkdirSync(path.join(this.art, 'prints'), { recursive: true });
    this.tab = await this.describeTab();
    if (this.tab.reducedMotion) throw new Refusal('The page reports prefers-reduced-motion, which caps pde plates at 80 steps.');
    writeJson(path.join(this.dir, 'browser-report.json'), { browserVersions: this.browserVersions, webglRenderer: g.renderer, graphics: g, reducedMotion: false,
      studioSha256: this.studioSha256, commit: this.commit, recipeVersion: this.tab.recipeVersion, apiVersion: this.tab.apiVersion });
    this.sig = this.signature();
  }
  async openPage(seed, payload, deadline) {
    const ctx = await this.browser.newContext({ viewport: { width: 1400, height: 900 }, reducedMotion: 'no-preference', acceptDownloads: true });
    const errors = [];
    try {
      // Only the local studio file. No research, font or telemetry requests.
      await ctx.route(/^https?:\/\//, route => route.abort());
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('crash', () => errors.push('the page crashed'));
      const target = url.pathToFileURL(STUDIO).href + '#' + this.opts.id + '/' + encodeURIComponent(seed) + '/' + b64(payload);
      await this.within(page.goto(target, { waitUntil: 'domcontentloaded', timeout: 0 }), deadline, 'page load');
      await this.within(page.evaluate(() => Studio.ready), deadline, 'studio boot');
      return { ctx, page, errors };
    } catch (e) { await ctx.close().catch(() => {}); throw e; }
  }
  async describeTab() {
    const { ctx, page } = await this.openPage('art-setup', { running: false, warmup: 0, grid: 128 }, this.clock.seconds() + 180);
    try {
      return await page.evaluate(id => {
        const m = Studio.modules[id];
        return { recipeVersion: Studio.recipeVersion, apiVersion: Studio.apiVersion, defaults: JSON.parse(JSON.stringify(m.defaults)), palette: !!m.palette,
          fields: m.schema.filter(f => f.type !== 'action').map(f => ({ key: f.key, type: f.type, min: f.min, max: f.max, step: f.step, options: f.options ? f.options.map(o => o[0]) : undefined })),
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
      }, this.opts.id);
    } finally { await ctx.close(); }
  }
  signature() {
    const h = crypto.createHash('sha256');
    for (const f of ['art-evolve.js', 'art-gallery.js', 'art-score.js', 'art-tabs.js', 'art.js']) h.update(f + '\0').update(fs.readFileSync(path.join(__dirname, f)));
    h.update(this.studioBytes);
    h.update(JSON.stringify({ input: this.opts, chromium: this.browserVersions.chromium, renderer: this.graphics.renderer, float32: this.graphics.float32 }));
    return h.digest('hex');
  }
  schemaKeys() { return new Set(this.tab.fields.map(f => f.key)); }
  budgetReached() { return this.opts.budget !== undefined && this.clock.seconds() >= this.opts.budget * 60; }
  candidateLimit() {
    const done = this.records.filter(r => r && r.status !== 'failed' && r.activeSeconds).map(r => r.activeSeconds);
    return Math.max(120, 5 * (median(done) || 0));
  }

  // One plate: fresh context and page, the product hash path, a verified step count, the shell's export,
  // scores measured on the export, and the print kept only when it is wanted.
  async renderCandidate(c) {
    const t0 = this.clock.seconds(), deadline = t0 + c.limit;
    const rec = { index: c.index, generation: c.generation ?? null, operator: c.operator || null, requested: c.requested || null, changed: c.changed || undefined,
      parentHash: c.parentHash || null, parentIndex: c.parentIndex ?? null, givenHash: c.givenHash || undefined, seed: c.seed, payload: c.payload, requestedHash: '#' + this.opts.id + '/' + encodeURIComponent(c.seed) + '/' + b64(c.payload),
      steps: null, stepsSource: null, hash: null, recipe: null, grid: null, status: 'failed', reason: null, clamped: [], metrics: null, class: null, rank: null,
      thumb: null, thumbSha256: null, print: null, printSha256: null, printJob: null, lumSha256: null, activeSeconds: null, validated: false };
    const unknown = tabs.unknownKeys(c.payload, this.schemaKeys());
    if (unknown.length) return { ...rec, status: 'rejected', reason: 'unknown-key: ' + unknown.join(', '), activeSeconds: 0 };
    const outside = outOfSchema(c.payload, this.tab.fields);
    if (outside.length && c.clampPolicy === 'any') return { ...rec, status: 'rejected', reason: 'clamped: ' + outside.join('; '), clamped: outside.map(s => s.split(' ')[0]), activeSeconds: 0 };
    let ctx, last = '';
    const timing = {};
    try {
      const opened = await this.openPage(c.seed, c.payload, deadline); ctx = opened.ctx;
      const { page, errors } = opened;
      timing.boot = this.clock.seconds() - t0;
      let lastStep = null;
      for (;;) {
        const snap = await this.within(page.evaluate(readStatus), deadline, 'reading the status');
        last = snap.status;
        if (errors.length) throw new Failure('page error: ' + errors[0]);
        if (snap.fault) throw new Failure('studio fault: ' + snap.fault);
        const m = /\bstep\s+([\d,]+)/.exec(snap.status), step = m ? Number(m[1].replace(/,/g, '')) : null;
        if (snap.seed === c.seed && GUARD.test(snap.status)) { rec.status = 'rejected'; rec.reason = 'guard'; rec.steps = step; return rec; }
        if (snap.seed === c.seed && step !== null && step !== lastStep) { lastStep = step; c.onStep?.(step); }
        if (snap.seed === c.seed && step === c.target && /\bpaused\b/.test(snap.status)) break;
        if (this.clock.seconds() > deadline) throw new Failure('the plate did not report step ' + c.target + ' and paused within ' + Math.round(c.limit) + ' active seconds');
        await sleep(200);
      }
      timing.simulate = this.clock.seconds() - t0 - timing.boot;
      rec.steps = c.target; rec.stepsSource = 'status';
      const g = /grid\s+(\d+)\s*[x×]\s*(\d+)/i.exec(last); rec.grid = g ? [Number(g[1]), Number(g[2])] : null;
      // writeHash is debounced by 180 ms, so the address bar settles after the plate does.
      await sleep(300);
      let state;
      for (let i = 0; i < 12; i++) {
        state = await this.within(page.evaluate(readRecipe, this.opts.id), deadline, 'reading the recipe');
        if (state.recipe && state.hash === tabs.encodeRecipe(state.recipe)) break;
        await sleep(250);
      }
      if (!state.recipe || state.recipe.id !== this.opts.id) throw new Failure('the requested tab did not become active');
      if (state.hash !== tabs.encodeRecipe(state.recipe)) throw new Failure('the page hash does not match the engine recipe');
      if (state.reducedMotion) throw new Failure('the page switched to reduced motion');
      rec.hash = state.hash; rec.recipe = state.recipe; rec.witness = state.witness;
      rec.clamped = clampedKeys(c.payload, state.recipe, this.tab.defaults);
      const fixedClamp = rec.clamped.filter(k => FIXED_CLAMP.includes(k));
      if (c.clampPolicy === 'any' && rec.clamped.length) { rec.status = 'rejected'; rec.reason = 'clamped: ' + rec.clamped.join(', '); return rec; }
      if (fixedClamp.length) { rec.status = 'rejected'; rec.reason = 'clamped: ' + fixedClamp.join(', '); return rec; }
      if (state.witness && state.witness.valid === false) { rec.status = 'rejected'; rec.reason = 'witness'; return rec; }

      const sized = await page.evaluate(([inches, ppi]) => {
        const i = document.querySelector('#export-inches'), d = document.querySelector('#export-dpi');
        if (!i || !d || ![...i.options].some(o => Number(o.value) === inches) || ![...d.options].some(o => Number(o.value) === ppi)) return false;
        i.value = String(inches); i.dispatchEvent(new Event('change', { bubbles: true }));
        d.value = String(ppi); d.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }, [this.opts.inches, this.opts.ppi]);
      if (!sized) throw new Failure('the print size controls do not offer ' + this.opts.inches + ' in at ' + this.opts.ppi + ' ppi');
      const tExport = this.clock.seconds();
      await page.evaluate(() => {
        const img = document.querySelector('#export-img'), note = document.querySelector('#export-note');
        if (img) { img.removeAttribute('src'); img.hidden = true; }
        if (note) note.classList.remove('err');
        document.querySelector('#btn-export').click();
      });
      let done = null;
      while (!(done = await this.within(page.evaluate(exportState), deadline, 'the export'))) {
        if (this.clock.seconds() > deadline) throw new Failure('the export did not finish within the active-time limit');
        await sleep(250);
      }
      if (done.state === 'err') throw new Failure('export failed: ' + done.note.slice(0, 300));
      rec.exportNote = done.note.slice(0, 400);
      const cells = /field is ([\d,]+) × ([\d,]+) cells/.exec(done.note); rec.fieldCells = cells ? [Number(cells[1].replace(/,/g, '')), Number(cells[2].replace(/,/g, ''))] : null;
      timing.export = this.clock.seconds() - tExport;
      await page.addScriptTag({ path: path.join(__dirname, 'art-score.js') });
      const [gw, gh] = rec.grid || [0, 0];
      const m = await this.within(page.evaluate(o => window.GenChaseArtScore.measureExport(document.querySelector('#export-img'), o),
        { gw, gh, crop: CROP, thumb: THUMB, maxBytes: tabs.LIMITS.thumbBytes }), deadline, 'scoring');
      timing.score = this.clock.seconds() - tExport - timing.export;
      Object.assign(rec, { printSize: [m.width, m.height], metrics: m.metrics, class: m.metrics.class, flat: m.flat, nyq: m.nyq, lumSha256: m.lumSha256 });
      if (m.flatGate) { rec.status = 'rejected'; rec.reason = 'flat'; }
      else if (score.isChecker(m.nyq)) { rec.status = 'rejected'; rec.reason = 'checkerboard'; }
      else rec.status = 'scored';
      const keepFiles = c.name && (rec.status === 'scored' || c.keepRejected);
      if (keepFiles && m.thumb && c.wantThumb(rec)) {
        const bytes = Buffer.from(m.thumb, 'base64');
        try { tabs.jpegInfo(bytes); const rel = 'thumbs/' + c.name + '.jpg'; writeFile(path.join(this.art, rel), bytes); rec.thumb = rel; rec.thumbSha256 = sha256(bytes); rec.thumbQuality = m.thumbQuality; }
        catch (e) { rec.thumbError = e.message; }
      }
      if (keepFiles && c.wantPrint(rec)) {
        const rel = 'prints/' + c.name + '.png', job = 'prints/' + c.name + '-print-job.json';
        await this.download(page, '#export-download', path.join(this.art, rel), deadline);
        await this.download(page, '#export-job-json', path.join(this.art, job), deadline);
        rec.print = rel; rec.printJob = job; rec.printSha256 = await fileSha256(path.join(this.art, rel));
        const printed = JSON.parse(fs.readFileSync(path.join(this.art, job), 'utf8'));
        rec.printJobMatches = JSON.stringify(printed.recipe) === JSON.stringify(rec.recipe);
        rec.printSpec = printed.printSpec || null;
      }
      return rec;
    } catch (e) {
      rec.status = 'failed'; rec.reason = redact(String(e && e.message || e), { root: ROOT }).slice(0, 500);
      if (last) rec.statusText = redact(last, { root: ROOT }).slice(0, 400);
      return rec;
    } finally {
      rec.timing = Object.fromEntries(Object.entries(timing).map(([k, v]) => [k, Number(v.toFixed(2))]));
      rec.activeSeconds = Number((this.clock.seconds() - t0).toFixed(2));
      if (ctx) await ctx.close().catch(() => {});
    }
  }
  async download(page, selector, file, deadline) {
    const wait = page.waitForEvent('download', { timeout: 0 }); wait.catch(() => {});
    await page.evaluate(s => document.querySelector(s).click(), selector);
    const d = await this.within(wait, deadline, 'the download');
    await this.within(d.saveAs(file + '.part'), deadline, 'saving the download');
    fs.renameSync(file + '.part', file);
  }

  rankOf(rec) {
    const scored = this.records.filter(r => r && r.status === 'scored' && r.index !== rec.index).concat(rec).sort(score.compare);
    return scored.indexOf(rec);
  }
  rerank() {
    const scored = this.records.filter(r => r && r.status === 'scored').sort(score.compare);
    scored.forEach((r, i) => {
      r.rank = i + 1;
      if (i >= THUMB_KEEP && r.thumb) { fs.rmSync(path.join(this.art, r.thumb), { force: true }); r.thumb = null; r.thumbSha256 = null; r.thumbEvicted = true; }
      if (i >= this.keep && r.print) { for (const f of [r.print, r.printJob]) fs.rmSync(path.join(this.art, f), { force: true }); r.print = r.printJob = r.printSha256 = null; r.printEvicted = true; }
    });
  }
  async candidate(spec) {
    if (!this.browser.isConnected()) await this.restartBrowser();
    else if (this.rendered && this.rendered % RESTART_EVERY === 0) await this.restartBrowser();
    this.rendered++;
    const rec = await this.renderCandidate({ limit: this.candidateLimit(), target: spec.payload.warmup, name: nameFor(spec.index), clampPolicy: 'fixed',
      wantThumb: r => this.rankOf(r) < THUMB_KEEP, wantPrint: r => this.rankOf(r) < this.keep, ...spec });
    this.records[spec.index] = rec;
    this.rerank(); this.saveCheckpoint();
    const done = this.records.filter(Boolean).length;
    this.progress({ stage: 'search', message: this.opts.id + ': candidate ' + (spec.index + 1) + ' ' + rec.status + (rec.reason ? ' (' + rec.reason.slice(0, 80) + ')' : ''), done: Math.min(done, this.total), total: this.total, unit: 'candidates' });
    return rec;
  }

  saveCheckpoint() {
    writeJson(path.join(this.art, 'checkpoint.json'), seal({ format: 1, signature: this.sig, mode: this.opts.mode, records: this.records, calibration: this.calibration, controls: this.controls }));
  }
  clean() {
    for (const sub of ['thumbs', 'prints']) for (const f of fs.readdirSync(path.join(this.art, sub))) fs.rmSync(path.join(this.art, sub, f), { force: true, recursive: true });
    for (const f of ['candidates.json', 'share.json', 'recipes.txt', 'gallery.html', 'checkpoint.json']) fs.rmSync(path.join(this.art, f), { force: true });
  }
  async restore() {
    const file = path.join(this.art, 'checkpoint.json');
    if (!fs.existsSync(file)) return this.clean();
    let saved;
    try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { this.log('Art checkpoint could not be read; starting again.'); return this.clean(); }
    if (!intact(saved) || saved.format !== 1 || saved.signature !== this.sig || saved.mode !== this.opts.mode || !Array.isArray(saved.records)) {
      this.log('Art checkpoint context changed; starting again.'); return this.clean();
    }
    let kept = 0, redo = 0;
    for (const r of saved.records) {
      if (!r) continue;
      let ok = true;
      for (const [rel, want] of [[r.thumb, r.thumbSha256], [r.print, r.printSha256]]) {
        if (!rel) continue;
        const p = path.join(this.art, rel);
        if (!fs.existsSync(p) || await fileSha256(p) !== want) ok = false;
      }
      if (r.printJob && !fs.existsSync(path.join(this.art, r.printJob))) ok = false;
      if (ok) { this.records[r.index] = r; kept++; }
      else { redo++; for (const rel of [r.thumb, r.print, r.printJob]) if (rel) fs.rmSync(path.join(this.art, rel), { force: true }); }
    }
    this.calibration = saved.calibration || null;
    this.controls = redo ? null : saved.controls || null;
    this.log('Resumed ' + kept + ' candidate(s) from the art checkpoint' + (redo ? '; ' + redo + ' with missing or changed images will render again.' : '.'));
  }

  basePayload(hash) {
    const r = hash ? tabs.parseRecipeHash(hash) : { payload: {} };
    const unknown = tabs.unknownKeys(r.payload, this.schemaKeys());
    if (unknown.length) throw new Refusal('The recipe names ' + unknown.join(', ') + ', which ' + this.opts.id + ' does not have. A payload may carry only the tab\'s settings plus seed, palette, bg and v.');
    return r.payload;
  }
  async hunt() {
    const o = this.opts, base = this.basePayload(o.recipe);
    const warmup = base.warmup ?? this.tab.defaults.warmup, v = base.v ?? this.tab.recipeVersion;
    const outside = outOfSchema({ ...base, warmup }, this.tab.fields);
    if (outside.length) throw new Refusal('The base recipe would be clamped: ' + outside.join('; ') + '.');
    this.total = o.samples;
    await this.restore();
    for (let i = 0; i < o.samples; i++) {
      if (this.records[i]) continue;
      if (this.budgetReached()) { this.stoppedBy = 'budget'; break; }
      const seed = 'h-' + (o.start + i).toString(36);
      await this.candidate({ index: i, seed, operator: 'seed', payload: { ...base, v, seed, running: false, warmup } });
    }
  }
  async evolve() {
    const o = this.opts, parents = o.parents.map(tabs.parseRecipeHash);
    this.total = parents.length + o.samples;
    await this.restore();
    for (let i = 0; i < parents.length; i++) {
      if (this.records[i]) continue;
      const p = parents[i], payload = { ...p.payload, v: p.payload.v ?? this.tab.recipeVersion, running: false, warmup: p.payload.warmup ?? this.tab.defaults.warmup };
      await this.candidate({ index: i, generation: 0, seed: p.seed, operator: 'parent', parentHash: null, payload, givenHash: p.hash });
    }
    const usable = this.records.slice(0, parents.length).filter(r => r && r.recipe);
    if (!usable.length) throw new Refusal('No parent recipe rendered, so there is nothing to evolve.');
    const jobs = [];
    for (let j = 0; j < o.samples; j++) {
      const index = parents.length + j;
      if (this.records[index]) continue;
      const parent = usable[j % usable.length], { id, ...payload } = parent.recipe;
      jobs.push({ index, j, parentIndex: parent.index, parentHash: parent.hash, digest: sha256(o.parents[parent.index]), payload });
    }
    const children = jobs.length ? await this.buildChildren(jobs) : [];
    for (const child of children) {
      if (this.budgetReached()) { this.stoppedBy = 'budget'; break; }
      await this.candidate({ index: child.index, generation: 1, seed: child.payload.seed, operator: child.operator, requested: child.requested, changed: child.changed,
        parentHash: child.parentHash, parentIndex: child.parentIndex, payload: child.payload });
    }
  }
  // Child recipes come from the engine's own makeRng, generatePalette and the tab's surprise(), in the page.
  async buildChildren(jobs) {
    const { ctx, page } = await this.openPage('art-setup', { running: false, warmup: 0, grid: 128 }, this.clock.seconds() + 180);
    try {
      await page.addScriptTag({ path: path.join(__dirname, 'art-evolve.js') });
      const made = await page.evaluate(({ id, jobs }) => {
        const m = Studio.modules[id], defaults = JSON.parse(JSON.stringify(m.defaults));
        const api = { schema: m.schema, surprise: typeof m.surprise === 'function' ? (rng, s) => m.surprise(rng, s) : null, makeRng: Studio.util.makeRng,
          generatePalette: Studio.generatePalette, PALETTES: Studio.PALETTES, palette: !!m.palette };
        return jobs.map(j => window.GenChaseArtEvolve.child({ parent: { payload: j.payload, state: Object.assign({}, defaults, j.payload) }, generation: 1, index: j.j, digest: j.digest, api }));
      }, { id: this.opts.id, jobs });
      return made.map((c, i) => ({ ...c, index: jobs[i].index, parentIndex: jobs[i].parentIndex, parentHash: jobs[i].parentHash }));
    } finally { await ctx.close(); }
  }
  async deep() {
    const o = this.opts, r = tabs.parseRecipeHash(o.recipe), base = this.basePayload(o.recipe), rv = this.tab.recipeVersion;
    const payload = { ...base, v: base.v ?? rv, running: false, warmup: o.steps };
    if (o.grid !== undefined) payload.grid = o.grid;
    const outside = outOfSchema(payload, this.tab.fields);
    if (outside.length) throw new Refusal('The recipe would be clamped: ' + outside.join('; ') + '. A deep render never trims a request.');
    // The shell clamps a sheet to 16,000 px and 132 MP (and to the GPU texture limit); a single-target GL
    // export then needs about 31 bytes per pixel (docs/print-audit-2026-09-24). Keep that under half the RAM.
    const long = Math.min(o.inches * o.ppi, 16000), need = Math.min(long * long, 132e6) * 31;
    if (need > os.totalmem() / 2) throw new Refusal('A ' + long + ' px print needs about ' + (need / 1024 ** 3).toFixed(1) + ' GB, more than half of this computer\'s memory.');
    // A different grid is a larger domain with an unrelated initial field (per-cell draws run in row-major order).
    const baseGrid = base.grid ?? (Number(base.v) < rv ? null : this.tab.defaults.grid);
    const gridChanged = o.grid !== undefined && o.grid !== baseGrid;
    this.total = 1;
    await this.restore();
    let final = this.records[0];
    if (!final) {
      const calN = Math.min(o.steps, 240), single = o.steps <= 240, limit = 600;
      this.progress({ stage: 'calibrate', message: 'Calibrating at ' + calN + ' steps' + (single ? ' (this is the whole render)' : '') });
      const cal = await this.renderCandidate({ index: 0, seed: r.seed, operator: 'deep', payload: { ...payload, warmup: calN }, target: calN, limit, clampPolicy: 'any',
        name: single ? 'deep' : null, keepRejected: true, wantThumb: () => true, wantPrint: () => true, onStep: s => this.stepProgress(s, calN, single ? 'render' : 'calibrate') });
      if (cal.status === 'failed') { this.records[0] = cal; return; }
      if (/^(clamped|unknown-key)/.test(cal.reason || '')) throw new Refusal('The engine changed this recipe (' + cal.reason + '). A deep render never trims or rewrites a request.');
      const t = cal.timing, rate = (t.simulate || 0) / calN, fixed = (t.boot || 0) + (t.export || 0) + (t.score || 0);
      const estimate = rate * o.steps + fixed;
      this.calibration = { steps: calN, secondsPerStep: Number(rate.toFixed(5)), fixedSeconds: Number(fixed.toFixed(2)), estimateSeconds: Number(estimate.toFixed(1)) };
      if (single) final = cal;
      else {
        if (estimate > o.budget * 60) {
          const most = Math.max(0, Math.floor((o.budget * 60 - fixed) / Math.max(rate, 1e-9)));
          throw new Refusal('About ' + (estimate / 60).toFixed(1) + ' active minutes are needed, over the ' + o.budget + ' minute budget. The largest step count that fits is about ' + most + '. The request was not trimmed.');
        }
        const pde = tabs.ART_TABS[o.id].family === 'pde';
        this.progress({ stage: 'render', message: 'Target ' + o.steps + ' steps, about ' + (estimate / 60).toFixed(1) + ' active minutes' + (pde ? '; the pde status stays silent until the plate settles.' : '.') });
        final = await this.renderCandidate({ index: 0, seed: r.seed, operator: 'deep', payload, target: o.steps, limit: Math.max(120, 3 * estimate), clampPolicy: 'any',
          name: 'deep', keepRejected: true, wantThumb: () => true, wantPrint: () => true, onStep: pde ? null : s => this.stepProgress(s, o.steps) });
        if (/^(clamped|unknown-key)/.test(final.reason || '')) throw new Refusal('The engine changed this recipe (' + final.reason + ').');
      }
      final.gridChanged = gridChanged;
      if (gridChanged) final.label = 'new plate, not an enlargement';
      if (final.printSpec && final.printSpec.clamped) this.log('The shell clamped this sheet to ' + final.printSpec.pw + ' × ' + final.printSpec.ph + ' px (' + final.printSpec.clampWhy + ' limit), about ' + final.printSpec.effDpi + ' ppi.');
      this.records[0] = final; this.rerank(); this.saveCheckpoint();
    }
  }
  stepProgress(step, total, stage = 'render') {
    const now = Date.now();
    if (step !== total && now - (this.lastStepLine || 0) < 1000) return;
    this.lastStepLine = now;
    this.progress({ stage, message: (stage === 'calibrate' ? 'calibration ' : '') + 'step ' + step + ' of ' + total, done: Math.min(step, total), total, unit: 'steps' });
  }

  // Repeat the top candidate and one other in fresh pages. On one renderer every difference should be 0.
  async runControls() {
    if (this.opts.mode === 'art-deep') { this.controls = { summary: 'not run: a deep render is not repeated, its cost is the job', repeats: [] }; return; }
    if (this.stoppedBy === 'budget') { this.controls = { summary: 'not run: the budget was reached', repeats: [] }; return; }
    if (this.controls) return;
    const scored = this.records.filter(r => r && r.status === 'scored').sort(score.compare);
    const spread = { entropy: sd(scored.map(r => r.metrics.entropy)), edge: sd(scored.map(r => r.metrics.edge)) };
    if (!scored.length) { this.controls = { summary: 'not run: no candidate was scored', repeats: [], spread }; return; }
    const picks = [scored[0]];
    if (scored.length > 1) { let j = parseInt(sha256(this.sig + '/control').slice(0, 8), 16) % scored.length; if (j === 0) j = 1; picks.push(scored[j]); }
    this.progress({ stage: 'score', message: 'Repeating ' + picks.length + ' candidate(s) in fresh pages to measure repeatability' });
    const repeats = [];
    for (const r of picks) {
      if (!this.browser.isConnected()) await this.restartBrowser();
      const again = await this.renderCandidate({ index: r.index, seed: r.seed, payload: r.payload, target: r.steps, limit: this.candidateLimit(), clampPolicy: 'fixed', name: null, wantThumb: () => false, wantPrint: () => false });
      const diffs = {};
      for (const k of METRIC_KEYS) {
        const a = r.metrics?.[k] ?? null, b = again.metrics?.[k] ?? null;
        diffs[k] = a === null && b === null ? 0 : Number.isFinite(a) && Number.isFinite(b) ? Number(Math.abs(a - b).toFixed(6)) : null;
      }
      repeats.push({ index: r.index, rank: r.rank, status: again.status, reason: again.reason, diffs, lumSame: again.lumSha256 === r.lumSha256, hashSame: again.hash === r.hash });
    }
    const worst = k => Math.max(0, ...repeats.map(x => x.diffs[k] ?? Infinity));
    const repeatable = repeats.every(x => x.status === 'scored' && x.lumSame && x.hashSame && METRIC_KEYS.every(k => x.diffs[k] === 0));
    const informative = scored.length >= 2 && ((spread.entropy ?? 0) > 2 * worst('entropy') || (spread.edge ?? 0) > 2 * worst('edge'));
    this.controls = { repeats, repeatable, spread, repeatDifference: { entropy: worst('entropy'), edge: worst('edge') }, informative,
      summary: (repeatable ? 'repeatable: the repeated renders gave identical metrics and luminance hashes' : 'NOT repeatable: a repeated render differed; treat the ranking with caution') +
        '; entropy spread ' + (spread.entropy === null ? 'n/a' : spread.entropy.toFixed(4)) + ' bits, edge spread ' + (spread.edge === null ? 'n/a' : spread.edge.toFixed(4)) + '.' };
    this.saveCheckpoint();
  }

  counts() {
    const all = this.records.filter(Boolean), rejected = {};
    for (const r of all) if (r.status === 'rejected') { const k = String(r.reason || 'rejected').split(':')[0]; rejected[k] = (rejected[k] || 0) + 1; }
    return { candidates: all.length, scored: all.filter(r => r.status === 'scored').length, failed: all.filter(r => r.status === 'failed').length, rejected };
  }
  jobMeta() {
    return { schemaVersion: 1, mode: this.opts.mode, id: this.opts.id, input: this.opts, commit: this.commit, studioSha256: this.studioSha256, recipeVersion: this.tab.recipeVersion,
      apiVersion: this.tab.apiVersion, chromium: this.browserVersions.chromium, playwright: this.browserVersions.playwright, renderer: this.graphics.renderer, float32: this.graphics.float32,
      softwareFallback: !!this.graphics.fallback, reducedMotion: false, reducedMotionNote: REDUCED_MOTION_NOTE, reproducibility: REPRODUCIBILITY, inches: this.opts.inches, ppi: this.opts.ppi,
      started: this.started, ended: new Date().toISOString(), activeSeconds: Number(this.clock.seconds().toFixed(1)), stoppedBy: this.stoppedBy, calibration: this.calibration,
      thumbnailsKept: THUMB_KEEP, printsKept: this.keep, browserRestartEvery: RESTART_EVERY, activeClock: 'Pauses longer than 0.5 s count as 0.1 s; expect about 10% error at the light duty setting.' };
  }
  headline() {
    if (this.opts.mode === 'art-deep') return this.records[0]?.label ? 'Grid changed: a new plate, not an enlargement of the recipe.' : null;
    if (!this.controls || !this.controls.repeats?.length) return null;
    if (!this.controls.repeatable) return 'A repeated render did not reproduce its metrics on this renderer: the ranking is not reliable.';
    return this.controls.informative ? null : 'Ranking is not informative for this tab at these settings: the spread between candidates is no larger than twice the repeat difference.';
  }
  writeOutputs() {
    const job = this.jobMeta(), counts = this.counts(), records = this.records.filter(Boolean);
    const ranked = records.filter(r => r.status === 'scored').sort(score.compare);
    writeJson(path.join(this.art, 'candidates.json'), { schemaVersion: 1, job, scoring: SCORING, controls: this.controls, counts, records });
    writeFile(path.join(this.art, 'recipes.txt'), ranked.map(r => r.hash).join('\n') + (ranked.length ? '\n' : ''));
    writeFile(path.join(this.art, 'gallery.html'), galleryHtml({ job, records: this.opts.mode === 'art-deep' ? records.map(r => ({ ...r, rank: r.rank || 1 })) : ranked, controls: this.controls, counts, scoring: SCORING, headline: this.headline() }));
    // What sharing may publish: recipes, their scores and at most 12 small thumbnails. Never prints,
    // the gallery, the full candidate list or the checkpoint. A record whose recipe text would be
    // changed by redaction looks private, so it is left out here and sharing refuses it as well.
    const looksPrivate = r => [r.hash, r.seed, r.parentHash].some(s => s && redact(s, { root: ROOT }) !== s);
    const shareable = (this.opts.mode === 'art-deep' ? records.filter(r => r.status !== 'failed' && r.hash) : ranked).filter(r => !looksPrivate(r));
    const privateLooking = (this.opts.mode === 'art-deep' ? records.filter(r => r.hash) : ranked).length - shareable.length;
    const thumbs = shareable.filter(r => r.thumb).slice(0, tabs.LIMITS.thumbs).map(r => r.thumb);
    const pick = r => ({ rank: r.rank, index: r.index, hash: r.hash, seed: r.seed, operator: r.operator, parentHash: r.parentHash, generation: r.generation, steps: r.steps, grid: r.grid,
      status: r.status, reason: r.reason, class: r.class, metrics: r.metrics && Object.fromEntries(METRIC_KEYS.map(k => [k, r.metrics[k]])), clamped: r.clamped, gridChanged: r.gridChanged,
      thumb: thumbs.includes(r.thumb) ? r.thumb : null, thumbSha256: thumbs.includes(r.thumb) ? r.thumbSha256 : null, validated: false });
    let list = shareable.slice(0, tabs.LIMITS.shareRecords).map(pick), share;
    for (;;) {
      share = { schemaVersion: 1, kind: 'genchase-art', mode: job.mode, id: job.id, commit: job.commit, studioSha256: job.studioSha256, recipeVersion: job.recipeVersion,
        chromium: job.chromium, renderer: job.renderer, float32: job.float32, reducedMotion: false, print: { inches: job.inches, ppi: job.ppi }, input: this.opts,
        scoring: SCORING, reproducibility: REPRODUCIBILITY, claim: 'Recipes and print-sharpness proxy scores. No scientific, validation or aesthetic claim; every recipe is unvalidated.',
        counts: { ...counts, privateLooking }, controls: this.controls && { repeatable: this.controls.repeatable ?? null, informative: this.controls.informative ?? null, spread: this.controls.spread ?? null,
          repeatDifference: this.controls.repeatDifference ?? null, summary: this.controls.summary }, stoppedBy: this.stoppedBy, thumbs: thumbs.filter(t => list.some(r => r.thumb === t)), records: list };
      if (Buffer.byteLength(JSON.stringify(share, null, 2)) <= tabs.LIMITS.shareBytes || !list.length) break;
      list = list.slice(0, Math.floor(list.length * 0.9));
    }
    writeJson(path.join(this.art, 'share.json'), share);
  }
  exitCode() {
    const all = this.records.filter(Boolean);
    if (this.opts.mode === 'art-deep') return all[0] && all[0].print ? 0 : 1;
    if (!all.length) return this.stoppedBy === 'budget' ? 0 : 1;
    return all.some(r => r.status !== 'failed') ? 0 : 1;
  }
  async run() {
    try {
      await this.setup();
      if (this.opts.mode === 'art-deep') await this.deep();
      else if (this.opts.mode === 'art-hunt') await this.hunt();
      else await this.evolve();
      await this.runControls();
      this.writeOutputs();
      const c = this.counts();
      this.log('Art ' + this.opts.mode + ' ' + this.opts.id + ': ' + c.candidates + ' candidate(s), ' + c.scored + ' scored, ' + c.failed + ' failed, rejected ' + JSON.stringify(c.rejected) +
        (this.stoppedBy ? '; stopped by ' + this.stoppedBy : '') + '. ' + (this.controls?.summary || '') + ' Gallery: ' + path.join(this.art, 'gallery.html'));
      for (const r of this.records.filter(Boolean)) if (r.status === 'failed') this.log('Candidate ' + (r.index + 1) + ' failed: ' + r.reason);
      this.progress({ stage: 'score', message: 'Finished: ' + c.scored + ' scored of ' + c.candidates + (this.stoppedBy ? ', stopped by the budget' : '') + '. Open art/gallery.html in the job folder.' });
      return this.exitCode();
    } finally {
      this.clock.stop();
      await this.browser?.close().catch(() => {});
    }
  }
}

function parseArgs(argv) {
  const input = {}; let out = null;
  const map = { '--mode': 'mode', '--id': 'id', '--recipe': 'recipe', '--parent': 'parents', '--vary': 'vary', '--samples': 'samples', '--start': 'start', '--keep': 'keep',
    '--inches': 'inches', '--ppi': 'ppi', '--budget': 'budget', '--generations': 'generations', '--steps': 'steps', '--grid': 'grid' };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], value = argv[i + 1];
    if (value === undefined) throw Error('Missing value for ' + flag);
    i++;
    if (flag === '--out') { out = value; continue; }
    const key = map[flag];
    if (!key) throw Error('Unknown art option: ' + flag);
    if (key === 'parents') (input.parents ||= []).push(value);
    else input[key] = ['samples', 'start', 'keep', 'inches', 'ppi', 'budget', 'generations', 'steps', 'grid'].includes(key) ? Number(value) : value;
  }
  return { input, out };
}
async function main(argv = process.argv.slice(2)) {
  const { input, out } = parseArgs(argv);
  const opts = tabs.normalizeArtInput(input, ids(ROOT));
  if (input.start === undefined && opts.start !== undefined) console.log('Seed block start drawn at random: ' + opts.start + '.');
  const dir = out || process.env.GENCHASE_JOB_DIR;
  if (!dir) throw Error('Run art jobs through the validator, or give --out DIR for a local run.');
  const run = new ArtRun(opts, dir);
  try { return await run.run(); }
  catch (e) {
    if (!(e instanceof Refusal)) throw e;
    fs.mkdirSync(run.art, { recursive: true });
    writeJson(path.join(run.art, 'refused.json'), { schemaVersion: 1, mode: opts.mode, id: opts.id, input: opts, reason: e.message, calibration: run.calibration });
    console.log('REFUSED: ' + redact(e.message, { root: ROOT }));
    return 3;
  }
}
module.exports = { ArtRun, parseArgs, outOfSchema, clampedKeys, ActiveClock, main };
if (require.main === module) main().then(code => { process.exitCode = code; }).catch(e => { console.error(redact(String(e && e.stack || e), { root: ROOT })); process.exitCode = 1; });
