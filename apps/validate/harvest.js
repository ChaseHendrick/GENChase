// Bounded observations of real module defaults, not automatic scientific validation.
'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { ids } = require('./commands');
const { hardwareCard } = require('./hardware');
const { redactObject, redact } = require('./privacy');
const { launchGraphicsBrowser } = require('./browser');
const ROOT = path.resolve(__dirname, '../..');
function numbers(text) {
  // Keep offsets and literal tokens. Do not infer units or tolerance from prose.
  return [...text.matchAll(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g)]
    .map(m => ({ token: m[0], value: Number(m[0]), offset: m.index }))
    .filter(m => Number.isFinite(m.value));
}
function observation(id, data, error = null) {
  const witness = data?.witness || null;
  const status = error ? 'runtime failure' : witness?.valid === false ? 'witness miss'
    : witness?.valid === true ? 'within stated tolerance' : 'unassessed';
  return { id, status, recipeHash: data?.recipeHash || null, recipe: data?.recipe || null,
    witness, statusText: data?.statusText || '', numbers: numbers(data?.statusText || ''), error };
}
async function harvest({ root = ROOT, selected, dwellMs = 3000, machineSlug = 'm1pro', outputRoot = root, jobDir = process.env.GENCHASE_JOB_DIR } = {}) {
  const catalog = ids(root);
  if (!Array.isArray(selected) || !selected.length || selected.some(id => !catalog.includes(id)) || new Set(selected).size !== selected.length) throw Error('Choose registered module IDs or --all.');
  if (!Number.isInteger(dwellMs) || dwellMs < 100 || dwellMs > 60000) throw Error('Observation time must be 100 to 60000 milliseconds.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(machineSlug) || machineSlug.length > 32) throw Error('Invalid machine slug.');
  const { chromium } = require('playwright');
  const commit = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if(jobDir)fs.mkdirSync(jobDir,{recursive:true});
  const started = Date.now(), command = 'node apps/validate/harvest.js ' + (selected.length === catalog.length ? '--all' : selected.join(' ')) + ' --machine '+machineSlug+' --dwell '+dwellMs;
  const { browser, graphics } = await launchGraphicsBrowser(chromium);
  console.log('Graphics: ' + (graphics.renderer || 'WebGL2 unavailable') + (graphics.fallback ? ' (software fallback requested)' : '') + '. Float32 targets: ' + graphics.float32 + '.');
  const entries = [], browserVersions = { chromium: browser.version() }; let webglRenderer = graphics.renderer;
  try {
    for (const id of selected) {
      const page = await browser.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      // Portable code, fonts and evidence only. No research or telemetry requests.
      await page.route(/^https?:\/\//, route => route.abort());
      let data = null, failure = null;
      try {
        await page.goto('file://' + path.join(root, 'dist/studio.html') + '#' + id + '/witness-corpus', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.evaluate(() => Studio.ready);
        await page.waitForFunction(() => document.querySelector('#status')?.textContent.trim() || !document.querySelector('#fault')?.hidden, null, { timeout: 30000 });
        await page.waitForTimeout(dwellMs);
        data = await page.evaluate(() => {
          const fault = document.querySelector('#fault');
          const probe = document.createElement('canvas'); const gl = probe.getContext('webgl2') || probe.getContext('webgl');
          let renderer = null;
          if (gl) {
            const debug = gl.getExtension('WEBGL_debug_renderer_info');
            renderer = gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
          }
          return { witness: Studio.getWitness(), recipe: Studio.getRecipe(), recipeHash: location.hash,
            statusText: document.querySelector('#status').innerText,
            fault: fault && !fault.hidden ? fault.innerText : null, renderer };
        });
        webglRenderer ||= data.renderer;
        if (data.fault || errors.length) failure = [data.fault, ...errors].filter(Boolean).join('\n');
        if (data.recipe?.id !== id) failure = 'The requested module did not become active.';
      } catch (e) { failure = e.message; }
      finally { await page.close(); }
      entries.push(observation(id, redactObject(data,{root}), failure?redact(failure,{root}):null));
      console.log('GENCHASE_HARVEST ' + JSON.stringify({ done: entries.length, total: selected.length, id, status: entries.at(-1).status }));
    }
  } finally { await browser.close(); }
  const misses = entries.filter(e => ['runtime failure', 'witness miss'].includes(e.status));
  const exitCode = misses.length ? 1 : 0;
  const hardware = hardwareCard({ machineSlug, commit, command, exitCode, elapsedSeconds: (Date.now() - started) / 1000, browserVersions, webglRenderer },{root});
  const safe = value => redactObject(value, { root });
  const corpus = safe({ schemaVersion: 1, commit, machineSlug, observationMilliseconds: dwellMs, hardware, graphics,
    scope: 'Snapshots of default recipes after a bounded warm-up. Status tokens include untyped prose numbers; only structured witnesses define expected values and tolerance. A missing witness is unassessed. These observations do not change validation or originality labels.', entries });
  const file = 'validation/results/witnesses-' + commit + '-' + machineSlug + '.json';
  fs.mkdirSync(path.join(outputRoot, 'validation/results'), { recursive: true });
  fs.writeFileSync(path.join(outputRoot, file), JSON.stringify(corpus, null, 2) + '\n');
  const packets = [];
  for (const miss of misses) {
    const name = commit + '-' + miss.id + '.json', relative = 'run/validator/misses/' + name;
    const packet = safe({ schemaVersion: 1, commit, kind: miss.status, id: miss.id, recipeHash: miss.recipeHash,
      expected: miss.witness?.expected ?? null, got: miss.witness?.measured ?? miss.error,
      tolerance: miss.witness?.tol ?? null, witness: miss.witness, command, hardwareCard:hardware,
      status: 'miss', reason: miss.error || miss.witness?.missWhen || 'Witness outside its stated limits.',
      scope: 'Recorded disagreement or runtime failure, not an automatic scientific status decision.' });
    fs.mkdirSync(path.dirname(path.join(outputRoot, relative)), { recursive: true });
    fs.writeFileSync(path.join(outputRoot, relative), JSON.stringify(packet, null, 2) + '\n');
    if (jobDir) fs.writeFileSync(path.join(jobDir, 'miss-' + miss.id + '.json'), JSON.stringify(packet, null, 2) + '\n');
    packets.push({ file: relative, artifact: 'miss-' + miss.id + '.json', kind: miss.status, status: 'miss', id: miss.id, commit, reason: packet.reason });
  }
  const report = safe({ corpus: file, misses: packets, browserVersions, webglRenderer, graphics, counts: { observed: entries.length, misses: misses.length, unassessed: entries.filter(e => e.status === 'unassessed').length } });
  if (jobDir) {
    fs.writeFileSync(path.join(jobDir, 'witnesses.json'), JSON.stringify(corpus, null, 2) + '\n');
    fs.writeFileSync(path.join(jobDir, 'harvest-report.json'), JSON.stringify(safe(report), null, 2) + '\n');
  }
  console.log('Measurements saved: ' + file + '. ' + misses.length + ' misses; ' + report.counts.unassessed + ' unassessed. Scientific labels unchanged.');
  return { exitCode, report, corpus };
}
function parse(args, catalog=ids(ROOT)) {
  const options={selected:[],machineSlug:process.env.GENCHASE_MACHINE_SLUG||'m1pro',dwellMs:3000};let all=false;
  for(let i=0;i<args.length;i++) {
    const value=args[i];
    if(value==='--all') { if(all)throw Error('Use --all once.');all=true; }
    else if(value==='--machine'||value==='--dwell') {
      if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+value);
      const raw=args[++i];if(value==='--machine')options.machineSlug=raw;else options.dwellMs=Number(raw);
    } else if(value.startsWith('--'))throw Error('Unknown harvest option: '+value);
    else options.selected.push(value);
  }
  if(all&&options.selected.length)throw Error('Choose either --all or explicit module IDs.');
  if(all)options.selected=catalog.slice();
  return options;
}
module.exports = { numbers, observation, harvest, parse };
if (require.main === module) {
  try {
    harvest(parse(process.argv.slice(2))).then(r => { process.exitCode = r.exitCode; })
      .catch(e => { console.error(redact(e.message,{root:ROOT})); process.exitCode = 1; });
  } catch(e) { console.error(redact(e.message,{root:ROOT}));process.exitCode=1; }
}
