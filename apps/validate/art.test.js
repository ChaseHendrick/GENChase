'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process');
const { command } = require('./commands');
const tabs = require('./art-tabs');
const score = require('./art-score');
const evolve = require('./art-evolve');
const { galleryHtml } = require('./art-gallery');
const { Jobs } = require('./jobs');
const { parse: cliParse } = require('./cli');
const ROOT = path.resolve(__dirname, '../..');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const power = { mode: 'maximum', pauseOnBattery: false, thermalPause: false };

function catalogRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'art-command-'));
  fs.writeFileSync(path.join(root, 'techniques.json'), JSON.stringify({ techniques: [{ id: 'cahn' }, { id: 'turing' }, { id: 'ising' }] }));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
// A deterministic test generator with the engine's rng surface. Not the engine's makeRng.
function makeRng(text) {
  let h = 2166136261; for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.pick = list => list[Math.floor(r() * list.length)]; r.range = (lo, hi) => lo + (hi - lo) * r(); r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  return r;
}

test('art commands accept bounded jobs, store the seed block and reject everything else', t => {
  const root = catalogRoot(t), base = { workspace: 'contribute', power, machineSlug: 'lab' };
  const hunt = command(root, { ...base, mode: 'art-hunt', id: 'turing', samples: 3, start: 5, keep: 1 });
  assert.deepEqual(hunt.args, ['apps/validate/art.js', '--mode', 'art-hunt', '--id', 'turing', '--inches', '8', '--ppi', '300', '--vary', 'seed', '--samples', '3', '--start', '5', '--keep', '1']);
  assert.equal(hunt.executable, process.execPath);
  const drawn = command(root, { ...base, mode: 'art-hunt', id: 'cahn' });
  assert(Number.isInteger(drawn.input.start) && drawn.input.start >= 0, 'a random seed block is recorded');
  assert.deepEqual(command(root, drawn.input).args, drawn.args, 'Resume re-runs the stored block');
  const deep = command(root, { ...base, mode: 'art-deep', recipe: '#cahn/cahn-1958', steps: 2000 });
  assert.deepEqual(deep.args, ['apps/validate/art.js', '--mode', 'art-deep', '--id', 'cahn', '--inches', '20', '--ppi', '300', '--budget', '120', '--recipe', '#cahn/cahn-1958', '--steps', '2000']);
  assert.equal(command(root, { ...base, mode: 'art-deep', recipe: 'cahn/x', steps: 5, grid: 256, inches: 8, ppi: 600, budget: 5 }).args.join(' '),
    'apps/validate/art.js --mode art-deep --id cahn --inches 8 --ppi 600 --budget 5 --recipe #cahn/x --steps 5 --grid 256');
  const evo = command(root, { ...base, mode: 'art-evolve', parents: ['#turing/a', '#turing/b/' + b64({ D: 60 })], samples: 4, keep: 0 });
  assert.equal(evo.input.id, 'turing', 'the tab comes from the parents');
  assert.deepEqual(evo.args.filter((a, i) => evo.args[i - 1] === '--parent'), ['#turing/a', '#turing/b/' + b64({ D: 60 })]);
  const bad = [
    { mode: 'art-hunt', id: 'ising' }, { mode: 'art-hunt', id: 'nope' }, { mode: 'art-hunt' },
    { mode: 'art-hunt', id: 'turing', recipe: '#cahn/x' }, { mode: 'art-hunt', id: 'turing', vary: 'surprise' },
    { mode: 'art-hunt', id: 'turing', samples: 0 }, { mode: 'art-hunt', id: 'turing', samples: 5001 }, { mode: 'art-hunt', id: 'turing', start: -1 },
    { mode: 'art-hunt', id: 'turing', start: 2 ** 31 }, { mode: 'art-hunt', id: 'turing', keep: 25 }, { mode: 'art-hunt', id: 'turing', inches: 9 },
    { mode: 'art-hunt', id: 'turing', ppi: 301 }, { mode: 'art-hunt', id: 'turing', budget: 0 }, { mode: 'art-hunt', id: 'turing', budget: 1441 },
    { mode: 'art-hunt', id: 'turing', steps: 10 }, { mode: 'art-hunt', id: 'turing', alpha: 1 }, { mode: 'art-hunt', id: 'turing', score: 3 },
    { mode: 'art-hunt', id: 'x'.repeat(8000) },
    { mode: 'art-deep', id: 'cahn' }, { mode: 'art-deep', recipe: '#cahn/x', steps: 0 }, { mode: 'art-deep', recipe: '#cahn/x', steps: 100001 },
    { mode: 'art-deep', recipe: '#cahn/x', steps: 10, grid: 63 }, { mode: 'art-deep', recipe: '#cahn/x', steps: 10, grid: 1025 },
    { mode: 'art-deep', recipe: '#cahn/x; rm -rf /', steps: 10 }, { mode: 'art-deep', recipe: '#cahn/x/' + b64({ __proto__: null, constructor: 1 }), steps: 10 },
    { mode: 'art-evolve', parents: [] }, { mode: 'art-evolve', parents: Array.from({ length: 7 }, (_, i) => '#turing/p' + i) },
    { mode: 'art-evolve', parents: ['#turing/a', '#cahn/b'] }, { mode: 'art-evolve', parents: ['#turing/a', '#turing/a'] },
    { mode: 'art-evolve', id: 'cahn', parents: ['#turing/a'] }, { mode: 'art-evolve', parents: ['#turing/a'], generations: 2 },
    { mode: 'art-evolve', parents: ['#turing/a'], samples: 201 }, { mode: 'art-evolve', parents: '#turing/a' },
  ];
  for (const input of bad) assert.throws(() => command(root, { ...base, ...input }), undefined, JSON.stringify(input).slice(0, 120));
  assert.throws(() => command(root, { ...base, mode: 'art-hunt', id: 'ising' }), /cahn and turing/);
});

test('recipe hashes decode as the engine reads them and refuse what the engine would drop', () => {
  const p = tabs.parseRecipeHash('#turing/path-seed/' + b64({ v: 2, seed: 'payload-seed', grid: 128, palette: ['#112233'] }));
  assert.equal(p.id, 'turing'); assert.equal(p.seed, 'payload-seed', 'the payload seed wins, as in parseHash');
  assert.equal(tabs.parseRecipeHash('cahn/a%20b').seed, 'a b');
  const recipe = { id: 'cahn', v: 2, grid: 128, running: false, seed: 'h-1', palette: ['#1A1A1A'], bg: '#E9E7E2' };
  const hash = tabs.encodeRecipe(recipe), back = tabs.parseRecipeHash(hash);
  assert.deepEqual({ id: back.id, ...back.payload }, recipe);
  assert.equal(hash, '#cahn/h-1/' + b64({ v: 2, grid: 128, running: false, seed: 'h-1', palette: ['#1A1A1A'], bg: '#E9E7E2' }));
  for (const bad of ['', '#cahn', '#Cahn/x', '#cahn/' + 'x'.repeat(65), '#cahn/%E0%A4%A', '#cahn/x/' + b64([1]), '#cahn/x/' + b64({ a: { b: 1 } }),
    '#cahn/x/' + Buffer.from('{"__proto__":{"x":1}}').toString('base64url'), '#cahn/x/' + b64({ seed: 7 }), '#cahn/x/' + Buffer.from([0xff, 0xfe]).toString('base64url'),
    '#cahn/x/' + b64(Object.fromEntries(Array.from({ length: 65 }, (_, i) => ['k' + i, i]))), '#cahn/x/y z', '#' + 'a'.repeat(1001)])
    assert.throws(() => tabs.parseRecipeHash(bad), undefined, bad.slice(0, 60));
  const schemas = tabs.loadSchemas(ROOT);
  for (const [id, s] of Object.entries(schemas)) for (const k of s.keys) assert.match(k, /^[A-Za-z0-9_]{1,32}$/, id + ' key ' + k + ' must survive the payload key rule');
  assert.equal(schemas.cahn.defaults.warmup, 2000); assert(schemas.turing.keys.has('tmodel'));
  assert.deepEqual(tabs.unknownKeys({ seed: 'a', v: 2, grid: 128, score: 1 }, schemas.cahn.keys), ['score']);
});

test('print lists match the engine literals', () => {
  const engine = fs.readFileSync(path.join(ROOT, 'src/shared/engine.js'), 'utf8');
  const inches = /const PRINT_INCHES = \[([^\]]+)\]/.exec(engine)[1].split(',').map(Number);
  const dpi = [.../const PRINT_DPI = \[(.*)\];/.exec(engine)[1].matchAll(/\[(\d+),/g)].map(m => Number(m[1]));
  assert.deepEqual([...tabs.PRINT_INCHES], inches); assert.deepEqual([...tabs.PRINT_DPI], dpi);
});

test('headless flags collect repeated parents and numeric art settings', () => {
  const { input } = cliParse(['--mode', 'art-evolve', '--parent', '#turing/a', '--parent', '#turing/b', '--samples', '4', '--keep', '0', '--inches', '10', '--ppi', '360', '--budget', '30', '--generations', '1']);
  assert.equal(input.workspace, 'contribute'); assert.deepEqual(input.parents, ['#turing/a', '#turing/b']);
  for (const k of ['samples', 'keep', 'inches', 'ppi', 'budget', 'generations']) assert.equal(typeof input[k], 'number', k);
  assert.equal(cliParse(['--mode', 'art-deep', '--recipe', '#cahn/x', '--steps', '10']).input.recipe, '#cahn/x');
});

test('scores gate flat plates and checkerboards, and see blocks at every pixel offset', () => {
  const flat = score.flatSummary(new Float32Array(200 * 200).fill(128));
  assert(score.isFlat(flat)); assert.equal(score.entropy(new Float32Array(1000).fill(77)), 0);
  const gw = 32, gh = 32, cells = new Float32Array(gw * gh).map((_, k) => ((k % gw) + Math.floor(k / gw)) % 2 ? 255 : 0);
  assert(score.nyq(cells, gw, gh) < -0.99); assert(score.isChecker(score.nyq(cells, gw, gh)));
  assert.equal(score.nyq(new Float32Array(gw * gh).fill(3), gw, gh), null, 'a flat field has no correlation to report');
  // Noise enlarged by 2x2 nearest-neighbour blocks: only odd offsets cross a block edge.
  const rng = makeRng('blocks'), n = 64, W = n * 2, L = new Float32Array(W * W);
  const src = Array.from({ length: n * n }, () => Math.floor(rng() * 256));
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) L[y * W + x] = src[(y >> 1) * n + (x >> 1)];
  const m = score.metrics(L, W, W);
  assert(m.edge > 0 && m.mad[1] > 0, 'every-offset sampling sees the block edges');
  const even = []; for (let y = 0; y < W; y += 2) for (let x = 0; x + 1 < W; x += 2) even.push(Math.abs(L[y * W + x + 1] - L[y * W + x]));
  assert.equal(Math.max(...even), 0, 'the even-offset sampling of tools/sharp.js would have scored this plate featureless');
  assert.equal(m.sampling, 'all');
});

test('a hard edge ranks above its blur and ranking is total and deterministic', () => {
  // Hard-edged random 8 px blocks, and the same image through a 9 px box blur in both directions.
  const W = 128, B = 8, n = W / B, pick = makeRng('blocks-edge'), cells = Array.from({ length: n * n }, () => pick() < 0.5 ? 0 : 255);
  const hard = new Float32Array(W * W), tmp = new Float32Array(W * W), blur = new Float32Array(W * W), at = v => Math.min(W - 1, Math.max(0, v));
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) hard[y * W + x] = cells[Math.floor(y / B) * n + Math.floor(x / B)];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -4; d <= 4; d++) s += hard[y * W + at(x + d)]; tmp[y * W + x] = s / 9; }
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { let s = 0; for (let d = -4; d <= 4; d++) s += tmp[at(y + d) * W + x]; blur[y * W + x] = s / 9; }
  const sharp = { index: 5, metrics: score.metrics(hard, W, W) }, soft = { index: 1, metrics: score.metrics(blur, W, W) };
  assert.equal(sharp.metrics.class, 'sharp'); assert.notEqual(soft.metrics.class, 'sharp');
  assert(score.compare(sharp, soft) < 0 && score.compare(soft, sharp) > 0);
  const rng = makeRng('rank'), classes = ['sharp', 'ok', 'soft'];
  const records = Array.from({ length: 200 }, (_, index) => ({ index, metrics: { class: classes[Math.floor(rng() * 3)], entropy: Math.floor(rng() * 4) / 2 } }));
  const once = records.slice().sort(score.compare).map(r => r.index), shuffled = records.slice().reverse().sort(score.compare).map(r => r.index);
  assert.deepEqual(once, shuffled);
  for (let i = 1; i < once.length; i++) assert(score.compare(records[once[i - 1]], records[once[i]]) < 0, 'strictly ordered');
});

// A module shaped like the turing tab: a model selector, keys that mean something for one model only,
// run controls and a surprise() whose envelope depends on the selector.
function syntheticTab() {
  const R = (key, min, max, step, extra) => ({ key, type: 'range', min, max, step, ...extra });
  const schema = [
    { key: 'grid', type: 'seg', options: [[128], [256], [512]] }, { key: 'aspect', type: 'seg', options: [['1:1'], ['4:5']] }, { key: 'lap', type: 'seg', options: [[5], [9]] },
    R('scale', 0.3, 3, 0.05), { key: 'tmodel', type: 'seg', options: [['schnak'], ['bruss']] }, R('D', 1, 200, 0.5),
    R('sa', 0.01, 0.5, 0.005, { dimUnless: s => s.tmodel === 'schnak' }), R('ba', 0.5, 6, 0.05, { dimUnless: s => s.tmodel === 'bruss' }),
    { key: 'init', type: 'seg', options: [['noise'], ['spots']] }, R('amp', 0.01, 0.6, 0.01), { key: 'running', type: 'toggle' }, R('steps', 1, 24, 1),
    R('dt', 0.0005, 0.05, 0.0005), R('warmup', 0, 6000, 50), { key: 'burst', type: 'action' }, { key: 'view', type: 'seg', options: [['u'], ['shade']] },
    R('bump', 0.5, 12, 0.1, { dimUnless: s => s.view === 'shade' }), R('grain', 0, 0.6, 0.02), { key: 'smooth', type: 'toggle' },
  ];
  const surprise = rng => {
    const tmodel = rng.pick(['schnak', 'schnak', 'bruss']);
    const p = { grid: rng.pick([128, 256]), aspect: rng.pick(['1:1', '4:5']), lap: 9, tmodel, D: 100, scale: rng.range(0.5, 1.5), sa: 0.1, ba: 2,
      init: rng.pick(['noise', 'spots']), amp: rng.range(0.1, 0.4), running: true, steps: 8, dt: 0.01, warmup: rng.int(1400, 2400), view: rng.pick(['u', 'shade']),
      bump: rng.range(3, 8), grain: rng.pick([0, 0.04]), smooth: rng() < 0.5 };
    if (tmodel === 'schnak') { p.D = rng.pick([30, 60, 100]); p.sa = rng.range(0.05, 0.2); } else { p.D = rng.range(8, 14); p.ba = rng.range(2, 5); }
    return p;
  };
  const PALETTES = { kiln: { colors: ['#111111', '#222222'], bg: '#FFFFFF' }, moss: { colors: ['#334455'], bg: '#000000' } };
  const generatePalette = rng => ({ colors: ['#' + Math.floor(rng() * 0xffffff).toString(16).padStart(6, '0').toUpperCase()], bg: '#EEEEEE' });
  return { schema, api: { schema, surprise, makeRng, generatePalette, PALETTES, palette: true } };
}

test('evolved children keep fixed keys, dimmed keys and the model, and name only schema keys', () => {
  const { schema, api } = syntheticTab();
  const defaults = { grid: 512, aspect: '1:1', lap: 9, scale: 0.6, tmodel: 'schnak', D: 100, sa: 0.1, ba: 2, init: 'noise', amp: 0.25, running: true, steps: 8, dt: 0.01, warmup: 1500, view: 'u', bump: 4, grain: 0.05, smooth: true };
  const payload = { v: 2, grid: 128, running: false, dt: 0.0085, warmup: 300, seed: 'parent-1', palette: ['#2A6F6B'], bg: '#EFEADF' };
  const parent = { payload, state: { ...defaults, ...payload } };
  const seen = new Set(), dims = schema.filter(f => f.dimUnless && !f.dimUnless(parent.state)).map(f => f.key);
  for (let index = 0; index < 1000; index++) {
    const c = evolve.child({ parent, generation: 1, index, digest: 'd1', api });
    assert.deepEqual(evolve.child({ parent, generation: 1, index, digest: 'd1', api }), c, 'children are deterministic');
    seen.add(c.operator);
    for (const k of tabs.FIXED_KEYS) assert.deepEqual(c.payload[k], k === 'running' ? false : k === 'warmup' ? 300 : payload[k], 'fixed ' + k);
    for (const k of dims) assert.equal(c.payload[k], payload[k], 'dimmed ' + k + ' untouched');
    assert.equal(c.payload.tmodel, payload.tmodel, 'the model selector is kept');
    assert(typeof c.payload.seed === 'string' && c.payload.seed.length <= 64);
    assert.deepEqual(evolve.unknownKeys(c.payload, schema), []);
    assert.deepEqual(tabs.unknownKeys(c.payload, new Set(schema.filter(f => f.type !== 'action').map(f => f.key))), []);
    if (c.operator === 'reseed') { assert.match(c.payload.seed, /^e-[0-9a-z]{8}$/); assert.deepEqual(c.changed, ['seed']); }
    if (c.operator === 'repalette') { assert.equal(c.payload.seed, 'parent-1'); assert.deepEqual(c.changed, ['bg', 'palette']); }
    if (c.operator === 'nudge') {
      assert.equal(c.payload.seed, 'parent-1', 'a nudge is a controlled comparison on the same seed');
      assert(c.changed.length >= 1 && c.changed.length <= 2);
      for (const k of c.changed) {
        const f = schema.find(x => x.key === k);
        assert(!tabs.FIXED_KEYS.includes(k) && !tabs.SELECTOR_KEYS.includes(k));
        if (f.type === 'range') { assert(c.payload[k] >= f.min && c.payload[k] <= f.max); assert(Math.abs(Math.round((c.payload[k] - f.min) / f.step) * f.step + f.min - c.payload[k]) < 1e-9, 'snapped to step'); }
      }
    }
  }
  assert.deepEqual([...seen].sort(), ['nudge', 'repalette', 'reseed']);
  const family = digest => Array.from({ length: 20 }, (_, index) => evolve.child({ parent, generation: 1, index, digest, api }).payload);
  assert.notDeepEqual(family('d2'), family('d1'), 'another parent hash gives other children');
});

test('the gallery escapes recipe text, links relatively and makes no network reference', () => {
  const seed = '<script>alert(1)</script>';
  const record = { index: 0, rank: 1, status: 'scored', seed, hash: "#cahn/%3Cscript%3E'x/" + b64({ seed }), steps: 200, grid: [128, 128], thumb: 'thumbs/c-0001.jpg', operator: 'reseed', clamped: [],
    metrics: { class: 'sharp', entropy: 5.1, edge: 1.2, acuity: 0.3, contrast: 40, featurePx: 2 } };
  const html = galleryHtml({ job: { id: 'cahn', mode: 'art-evolve', commit: 'a'.repeat(40), renderer: seed, chromium: '141', inches: 8, ppi: 300, reducedMotionNote: 'note' },
    records: [record], controls: { summary: 'repeatable' }, counts: { candidates: 1, scored: 1, failed: 0, rejected: { flat: 2 } }, scoring: { definition: 'd', limits: 'l' }, headline: seed });
  assert(!html.includes('<script>alert'), 'recipe text is escaped');
  assert(!/http/i.test(html), 'no network reference');
  assert(html.includes('href="../../../../dist/studio.html#cahn/'));
  assert(html.includes('src="thumbs/c-0001.jpg"'));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.equal(scripts.length, 1); new vm.Script(scripts[0]);
});

test('art job plumbing: progress units, resume copies the art folder, evidence and misses', async t => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'art-jobs-')), root = fs.mkdtempSync(path.join(os.tmpdir(), 'art-root-'));
  t.after(() => { fs.rmSync(data, { recursive: true, force: true }); fs.rmSync(root, { recursive: true, force: true }); });
  const jobs = new Jobs(root, data);
  jobs.current = { id: 'x', input: {} };
  jobs.progress('GENCHASE_PROGRESS {"stage":"search","message":"candidate 2/5","done":2,"total":5,"unit":"candidates"}');
  assert.deepEqual(jobs.current.progress, { done: 2, total: 5, unit: 'candidates' }); assert.equal(jobs.current.now, 'candidate 2/5');
  jobs.progress('GENCHASE_PROGRESS {"stage":"render","done":10,"total":20,"unit":"steps"}');
  assert.deepEqual(jobs.current.progress, { done: 10, total: 20, unit: 'steps' }); assert.equal(jobs.current.stage, 'render');
  jobs.progress('GENCHASE_PROGRESS {"stage":"paint","done":1,"total":2,"unit":"widgets"}');
  assert.deepEqual(jobs.current.progress, { done: 10, total: 20, unit: 'steps' }, 'an unknown unit is ignored'); assert.equal(jobs.current.stage, 'render');
  jobs.progress('GENCHASE_PROGRESS {"stage":"score","done":7,"total":5,"unit":"candidates"}');
  assert.deepEqual(jobs.current.progress, { done: 10, total: 20, unit: 'steps' }, 'done beyond total is ignored');

  // Evidence reads browser-report.json, and a failed art job records an art-run-failure for its tab.
  const id = '2026-09-24T00-00-00-000Z-0123abcd'; fs.mkdirSync(path.join(data, id));
  fs.writeFileSync(path.join(data, id, 'browser-report.json'), JSON.stringify({ browserVersions: { chromium: '141.0.7390.37' }, webglRenderer: 'SwiftShader' }));
  jobs.current = { id, input: { workspace: 'contribute', mode: 'art-hunt', id: 'turing', machineSlug: 'lab' }, status: 'failed', commit: 'a'.repeat(40), started: '2026-09-24T00:00:00Z', ended: '2026-09-24T00:01:00Z', exitCode: 1, reason: 'Command failed.' };
  jobs.stopping = false; jobs.evidence();
  const miss = JSON.parse(fs.readFileSync(path.join(data, id, 'miss.json'), 'utf8'));
  assert.equal(miss.kind, 'art-run-failure'); assert.equal(miss.id, 'turing'); assert.match(miss.expected, /not a scientific or aesthetic claim/);
  assert.equal(jobs.current.hardware.browserVersions.chromium, '141.0.7390.37'); assert.equal(jobs.current.hardware.webglRenderer, 'SwiftShader');

  // Resume copies the whole art folder (checkpoint and the images it vouches for) into the new job.
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'art-resume-')), runs = fs.mkdtempSync(path.join(os.tmpdir(), 'art-runs-'));
  t.after(() => { fs.rmSync(repo, { recursive: true, force: true }); fs.rmSync(runs, { recursive: true, force: true }); });
  fs.mkdirSync(path.join(repo, 'tools')); fs.writeFileSync(path.join(repo, 'techniques.json'), '{"techniques":[]}');
  fs.writeFileSync(path.join(repo, 'tools/science.js'), 'const fs=require("fs"),p=require("path"),d=process.env.GENCHASE_JOB_DIR;const had=fs.existsSync(p.join(d,"art/checkpoint.json"))&&fs.existsSync(p.join(d,"art/thumbs/c-0001.jpg"));console.log(had?"RESUMED":"FRESH");fs.mkdirSync(p.join(d,"art/thumbs"),{recursive:true});fs.writeFileSync(p.join(d,"art/checkpoint.json"),"{}");fs.writeFileSync(p.join(d,"art/thumbs/c-0001.jpg"),"x");');
  for (const args of [['init', '-q'], ['add', '.'], ['-c', 'user.name=Chaos', '-c', 'user.email=326338179+SharpMeow@users.noreply.github.com', 'commit', '-qm', 'Fixture']]) cp.execFileSync('git', args, { cwd: repo });
  const run = new Jobs(repo, runs);
  try {
    run.start({ workspace: 'validate', mode: 'inventory', power }); await run.wait();
    assert.match(run.tail.join('\n'), /FRESH/); assert.equal(run.resumeAvailable(), true, 'art/checkpoint.json offers Resume');
    const first = run.current.id; await run.resume(); await run.wait();
    assert.equal(run.current.resumedFrom, first); assert.match(run.tail.join('\n'), /RESUMED/);
  } finally { run.stop(); await run.wait(); }
});

test('shareable thumbnails are plain Chromium JPEGs and nothing that can carry text', () => {
  const seg = (m, body) => Buffer.concat([Buffer.from([0xFF, m, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);
  const jfif = seg(0xE0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')), icc = seg(0xE2, Buffer.from('ICC_PROFILE\0\x01\x01', 'latin1'));
  const sof = (w, h) => seg(0xC0, Buffer.from([8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0]));
  const jpeg = (...parts) => Buffer.concat([Buffer.from([0xFF, 0xD8]), ...parts, Buffer.from([0xFF, 0xD9])]);
  const scan = [seg(0xDB, Buffer.alloc(65)), seg(0xC4, Buffer.alloc(20)), seg(0xDA, Buffer.from([1, 1, 0, 0, 63, 0])), Buffer.from([0x12, 0xFF, 0x00, 0x34, 0xFF, 0xD0, 0x56])];
  assert.deepEqual(tabs.jpegInfo(jpeg(jfif, icc, sof(320, 200), ...scan)), { width: 320, height: 200, bytes: jpeg(jfif, icc, sof(320, 200), ...scan).length });
  assert.throws(() => tabs.jpegInfo(jpeg(jfif, seg(0xE1, Buffer.from('Exif\0\0')), sof(10, 10), ...scan)), /not allowed/);
  assert.throws(() => tabs.jpegInfo(jpeg(jfif, seg(0xFE, Buffer.from('a comment')), sof(10, 10), ...scan)), /not allowed/);
  assert.throws(() => tabs.jpegInfo(jpeg(jfif, sof(321, 10), ...scan)), /exceed/);
  assert.throws(() => tabs.jpegInfo(Buffer.concat([jpeg(jfif, sof(10, 10), ...scan), Buffer.from('tail')])), /after the end/);
  assert.throws(() => tabs.jpegInfo(Buffer.from('\x89PNG\r\n', 'latin1')), /not a JPEG/);
  assert.throws(() => tabs.jpegInfo(jpeg(jfif, sof(10, 10), ...scan), { maxBytes: 20 }), /larger/);
});

test('the runner finds clamps, refuses out-of-schema requests and does not bill pauses', () => {
  const { clampedKeys, outOfSchema, parseArgs, ActiveClock } = require('./art');
  const defaults = { grid: 512, warmup: 2000, dt: 0.014, palette: ['#1A1A1A'] };
  assert.deepEqual(clampedKeys({ v: 1, grid: 128, warmup: 2000, palette: ['#1a1a1a'] }, { id: 'cahn', v: 2, grid: 128 }, defaults), [], 'defaults, v and palette case are not clamps');
  assert.deepEqual(clampedKeys({ warmup: 2500, grid: 130, dt: 0.02 }, { id: 'cahn', warmup: 2000, grid: 130, dt: 0.0115 }, defaults), ['warmup', 'dt']);
  const fields = [{ key: 'warmup', type: 'range', min: 0, max: 2000 }, { key: 'grid', type: 'seg', options: [128, 512] }, { key: 'running', type: 'toggle' }];
  assert.deepEqual(outOfSchema({ warmup: 2000, grid: 128, running: false }, fields), []);
  assert.deepEqual(outOfSchema({ warmup: 2500, grid: '128', running: 0 }, fields).map(s => s.split(' ')[0]), ['warmup', 'grid', 'running']);
  const { input, out } = parseArgs(['--mode', 'art-evolve', '--parent', '#cahn/a', '--parent', '#cahn/b', '--samples', '4', '--out', '/tmp/x']);
  assert.deepEqual(input, { mode: 'art-evolve', parents: ['#cahn/a', '#cahn/b'], samples: 4 }); assert.equal(out, '/tmp/x');
  assert.throws(() => parseArgs(['--shell', 'x'])); assert.throws(() => parseArgs(['--mode']));
  const clock = new ActiveClock();
  try { clock.last -= 60000; assert(clock.seconds() < 1, 'a minute-long pause counts as a tenth of a second'); } finally { clock.stop(); }
});

test('the submission check accepts a shared art folder and names every structural fault', t => {
  const { checkFolder, context, main } = require('../../tools/art-submission-check');
  const ctx = context(ROOT), crypto = require('node:crypto');
  const seg = (m, body) => Buffer.concat([Buffer.from([0xFF, m, (body.length + 2) >> 8, (body.length + 2) & 255]), body]);
  const jpeg = (...extra) => Buffer.concat([Buffer.from([0xFF, 0xD8]), seg(0xE0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')), ...extra,
    seg(0xDB, Buffer.alloc(65)), seg(0xC0, Buffer.from([8, 0, 200, 1, 64, 1, 1, 0x11, 0])), seg(0xC4, Buffer.alloc(20)), seg(0xDA, Buffer.from([1, 1, 0, 0, 63, 0])), Buffer.from([5, 0xFF, 0xD9])]);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'art-submission-')); t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  let n = 0;
  function folder({ payload = { v: 2, grid: 128, running: false, warmup: 300 }, steps = 300, id = 'turing', thumb = jpeg(), extra = null, sha = null } = {}) {
    const dir = path.join(base, 'validation/submissions/job' + (++n) + '/art'); fs.mkdirSync(path.join(dir, 'thumbs'), { recursive: true });
    const seed = 'h-' + n, hash = '#' + id + '/' + seed + '/' + b64({ ...payload, seed });
    fs.writeFileSync(path.join(dir, 'thumbs/c-0001.jpg'), thumb);
    fs.writeFileSync(path.join(dir, 'share.json'), JSON.stringify({ schemaVersion: 1, kind: 'genchase-art', mode: 'art-hunt', id, thumbs: ['thumbs/c-0001.jpg'],
      records: [{ rank: 1, index: 0, hash, seed, steps, class: 'ok', metrics: { entropy: 4.2, edge: 0.4 }, thumb: 'thumbs/c-0001.jpg', thumbSha256: sha || crypto.createHash('sha256').update(thumb).digest('hex'), validated: false }] }));
    if (extra) fs.writeFileSync(path.join(dir, extra), 'x');
    return dir;
  }
  assert.deepEqual(checkFolder(folder(), ctx), []);
  const cases = [
    [{ extra: 'gallery.html' }, /gallery.html is not allowed/], [{ payload: { grid: 128, running: false, warmup: 300, score: 1 } }, /outside the turing schema: score/],
    [{ steps: 299 }, /must equal the recipe warmup 300/], [{ payload: { grid: 128, warmup: 300 } }, /must be paused/], [{ id: 'ising' }, /not an art tab/],
    [{ thumb: jpeg(seg(0xFE, Buffer.from('comment'))) }, /not allowed/], [{ sha: 'f'.repeat(64) }, /thumbnail hash does not match/],
  ];
  for (const [opts, why] of cases) assert.match(checkFolder(folder(opts), ctx).join('\n'), why, JSON.stringify(opts).slice(0, 80));
  // Defaults count: a recipe that leaves warmup at the tab's default records the default step count.
  assert.deepEqual(checkFolder(folder({ payload: { grid: 128, running: false }, steps: 1500 }), ctx), []);
  const cwd = process.cwd(), log = console.log; console.log = () => {};
  try { process.chdir(base); assert.equal(main(['validation/submissions/job1/art/share.json', 'validation/submissions/job1/job.json']), 0); assert.equal(main(['validation/submissions/job2/art/share.json']), 1); }
  finally { process.chdir(cwd); console.log = log; }
});
