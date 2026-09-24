#!/usr/bin/env node
// node tools/gpu-science.js
// Runs the GPU science and print-state tools that validation/techniques.json records for GPU tabs on this
// machine's own GPU (GENCHASE_GL=hardware, tools/lib/gl-args.js), and writes one self-describing file:
// validation/results/gpu/<platform>-<renderer>.json with the commit, platform, browser, WebGL renderer
// and, for every tool, its outcome, exit code, time, the renderer each of its browsers reported, the
// tail of its output and the result JSON it produced. docs/HARDWARE-GPU.md is the guide.
//
// The recorded evidence runs on SwiftShader. This asks whether the same tests pass on real drivers.
// It refuses, and writes nothing, when the renderer is software (SwiftShader, llvmpipe, lavapipe, WARP):
// first for its own probe, then for every browser any tool launches, through the gl-args wrapper.
//
// Result files a tool writes under validation/results/ are captured into the output and then restored,
// so the SwiftShader evidence in the repository is never replaced by a hardware run.
//
// Options:
//   --list                 print the tools, the tabs they cover and what is excluded; run nothing
//   --only a,b             run a subset: tool names (pde-science) or tab ids (cahn)
//   --label slug           append a pseudonymous machine label to the file name (two identical GPUs)
//   --timeout minutes      per tool, default 90
//   --software-control     the same pipeline on SwiftShader, labeled software, written only to --out
//   --out file             write here instead (required with --software-control; never under
//                          validation/results/gpu for a software run)
//   --self-test            unit checks of the switch, the refusal and the plan; no browser
// Exit: 0 every tool passed, 1 a tool failed, 3 refused (software renderer or no WebGL2).
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), cp = require('node:child_process'), crypto = require('node:crypto');
const GL = require('./lib/gl-args');
const { redact, sanitize } = require('../apps/validate/privacy');

const root = path.resolve(__dirname, '..');
const GPU_DIR = path.join(root, 'validation', 'results', 'gpu');
const RESULTS = path.join(root, 'validation', 'results');
const EMBED_LIMIT = 256 * 1024;

function parseArgs(argv) {
  const o = { list: false, selfTest: false, softwareControl: false, only: [], label: '', timeout: 90, out: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw Error(a + ' needs a value'); return argv[++i]; };
    if (a === '--list') o.list = true;
    else if (a === '--self-test') o.selfTest = true;
    else if (a === '--software-control') o.softwareControl = true;
    else if (a === '--only') o.only = next().split(',').map(s => s.trim()).filter(Boolean);
    else if (a === '--label') o.label = next();
    else if (a === '--timeout') o.timeout = Number(next());
    else if (a === '--out') o.out = path.resolve(next());
    else throw Error('Unknown option ' + a + '. See the header of tools/gpu-science.js.');
  }
  if (o.label && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.label)) throw Error('--label takes lowercase letters, digits and single hyphens');
  if (!(o.timeout > 0)) throw Error('--timeout takes a positive number of minutes');
  return o;
}

// The plan: GPU tabs are the records whose module source calls createGL(); their tools are the recorded
// commands. A tool counts only if it launches Chromium through glArgs(), since only that launch can be
// moved to the GPU; the rest are listed with the reason, and so are GPU tabs left with no tool.
function plan(dir = root) {
  const records = JSON.parse(fs.readFileSync(path.join(dir, 'validation', 'techniques.json'), 'utf8'));
  const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const tabs = records.filter(r => /\bcreateGL\s*\(/.test(read(r.source))).map(r => r.id);
  const tools = new Map(), excluded = new Map();
  for (const r of records.filter(x => tabs.includes(x.id))) {
    for (const kind of ['numerical', 'print']) for (const e of r[kind] || []) {
      const command = String(e.command || 'node ' + e.test).trim();
      let argv = command.split(/\s+/);
      const redirect = argv.indexOf('>');
      if (redirect >= 0) argv = argv.slice(0, redirect);
      const tool = argv[1] || '', key = argv.join(' ');
      const note = (map, extra) => { const t = map.get(key) || { command: key, tool, argv: argv.slice(1), tabs: [], kinds: [], ...extra }; if (!t.tabs.includes(r.id)) t.tabs.push(r.id); if (!t.kinds.includes(kind)) t.kinds.push(kind); map.set(key, t); };
      if (argv[0] !== 'node' || !/^tools\/[\w.-]+\.js$/.test(tool) || !fs.existsSync(path.join(dir, tool))) { note(excluded, { reason: 'not a node tools/ command' }); continue; }
      const src = read(tool);
      if (/\bglArgs\s*\(/.test(src)) note(tools);
      else note(excluded, { reason: /require\(['"]playwright['"]\)/.test(src) ? 'launches Chromium without the renderer switch, so it would stay on the default renderer' : 'no browser (a CPU reference or Node-only check), so no GPU is involved' });
    }
  }
  const list = [...tools.values()], covered = new Set(list.flatMap(t => t.tabs));
  return { tabs, tools: list, excluded: [...excluded.values()], uncovered: tabs.filter(id => !covered.has(id)) };
}

function rendererSlug(renderer) {
  const words = String(renderer || 'unknown')
    .replace(/\(0x[0-9a-f]+\)/gi, ' ')
    .replace(/\b(?:ANGLE|Metal Renderer|Unspecified Version|Direct3D1[01]|vs_\d_\d|ps_\d_\d|D3D1[01]|OpenGL(?: ES)? [\d.]+.*$|Vulkan [\d.]+)/gi, ' ')
    .toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const seen = new Set(), out = [];
  for (const w of words) if (!seen.has(w)) { seen.add(w); out.push(w); }
  return out.join('-').slice(0, 48).replace(/-+$/, '') || 'unknown';
}

function git(args) { const r = cp.spawnSync('git', args, { cwd: root, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; }
function snapshot() {
  const out = new Map();
  for (const name of fs.readdirSync(RESULTS)) { const p = path.join(RESULTS, name); if (fs.statSync(p).isFile()) out.set(name, fs.readFileSync(p)); }
  return out;
}
// Capture what a tool wrote under validation/results/ into the report, then put the repository back.
function captureAndRestore(before) {
  const after = snapshot(), captured = {};
  for (const [name, bytes] of after) {
    const old = before.get(name);
    if (old && Buffer.compare(old, bytes) === 0) continue;
    const entry = { sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, replacedEvidence: !!old };
    if (bytes.length <= EMBED_LIMIT) { try { entry.data = sanitize(JSON.parse(bytes.toString('utf8')), { root }); } catch { entry.text = redact(bytes.toString('utf8').slice(0, 4000), { root }); } }
    else entry.omitted = 'larger than 256 KB; rerun the command to regenerate it';
    captured['validation/results/' + name] = entry;
    if (old) fs.writeFileSync(path.join(RESULTS, name), old); else fs.unlinkSync(path.join(RESULTS, name));
  }
  for (const [name, bytes] of before) if (!after.has(name)) fs.writeFileSync(path.join(RESULTS, name), bytes);
  return captured;
}

async function probe(mode) {
  const { chromium } = require('playwright');
  const env = { ...process.env, GENCHASE_GL: mode === 'hardware' ? 'hardware' : '' };
  const args = GL.glArgs(env), channel = mode === 'hardware' ? GL.hardwareChannel(env) : null;
  let browser;
  try { browser = await GL.rawLaunch(chromium).call(chromium, { args, ...(channel ? { channel } : {}) }); }
  catch (error) {
    const hint = channel === 'chromium' ? ' The hardware path uses the full Chromium build: run npx playwright install chromium.' : '';
    throw Object.assign(Error('Could not start the browser: ' + error.message.split('\n')[0] + hint), { refusal: true });
  }
  try { return { ...await GL.probeGraphics(browser), browser: browser.version(), channel: channel || 'headless-shell', args }; }
  finally { await browser.close(); }
}

// A tool that prints its result as JSON rather than writing a file: keep it, from the first line that opens an object.
function jsonOf(text) {
  if (!text || text.length >= EMBED_LIMIT) return null;
  for (const start of [0, text.search(/^[{[]/m)]) { if (start < 0) continue; try { return sanitize(JSON.parse(text.slice(start)), { root }); } catch {} }
  return null;
}
function runTool(t, mode, timeoutMs, index, total) {
  const log = path.join(os.tmpdir(), 'genchase-gl-' + process.pid + '-' + index + '.jsonl');
  try { fs.unlinkSync(log); } catch {}
  const env = { ...process.env, GENCHASE_GL: mode === 'hardware' ? 'hardware' : '', GENCHASE_GL_LOG: log };
  const started = Date.now(), tail = [];
  let stdout = '';
  // One line buffer per stream, so a partial line on stdout never splices into one on stderr.
  const lineKeeper = () => { let pending = ''; const keep = chunk => {
    pending += chunk; const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) { tail.push(line); if (tail.length > 40) tail.shift(); process.stdout.write('    ' + line + '\n'); }
  }; keep.flush = () => { if (pending) keep('\n'); }; return keep; };
  const out = lineKeeper(), err = lineKeeper();
  console.log(`GENCHASE_PROGRESS ${JSON.stringify({ stage: 'check', message: t.command, unit: 'tools', done: index, total })}`);
  console.log(`[${index + 1}/${total}] ${t.command}  (tabs: ${t.tabs.join(', ')})`);
  return new Promise(resolve => {
    const child = cp.spawn(process.execPath, t.argv, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); setTimeout(() => child.kill('SIGKILL'), 5000); }, timeoutMs);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { if (stdout.length < EMBED_LIMIT) stdout += chunk; out(chunk); }); child.stderr.on('data', err);
    child.on('close', (code, signal) => {
      clearTimeout(timer); out.flush(); err.flush();
      let launches = [];
      try { launches = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); fs.unlinkSync(log); } catch {}
      const softwareInHardware = mode === 'hardware' && launches.some(l => l.software || !l.webgl2);
      const outcome = timedOut ? 'timeout' : softwareInHardware ? 'refused' : code !== 0 ? 'fail' : launches.length ? 'pass' : 'no-browser';
      resolve({ command: t.command, tabs: t.tabs, kinds: t.kinds, outcome, exitCode: code, signal: signal || null,
        seconds: Math.round((Date.now() - started) / 100) / 10, launches: launches.length,
        renderers: [...new Set(launches.map(l => l.renderer))], tail: tail.slice(-30).map(l => redact(l, { root })), stdoutJson: jsonOf(stdout) });
    });
  });
}

async function main(o) {
  const p = plan();
  let tools = p.tools;
  if (o.only.length) {
    tools = tools.filter(t => o.only.some(k => t.tool === 'tools/' + k + '.js' || t.tool === k || t.tabs.includes(k)));
    if (!tools.length) throw Error('--only matched no tool. Use --list to see the names.');
  }
  if (o.list) {
    console.log(`GPU tabs (module calls createGL): ${p.tabs.length}\n${p.tabs.join(' ')}\n\nTools to run on the GPU: ${tools.length}`);
    for (const t of tools) console.log('  ' + t.command + '   [' + t.tabs.join(', ') + ']');
    console.log(`\nRecorded for GPU tabs but not run: ${p.excluded.length}`);
    for (const t of p.excluded) console.log('  ' + t.command + '   [' + t.tabs.join(', ') + ']  ' + t.reason);
    console.log(`\nGPU tabs with no tool that can run on the GPU: ${p.uncovered.length}\n${p.uncovered.join(' ')}`);
    return 0;
  }
  const mode = o.softwareControl ? 'swiftshader' : 'hardware';
  if (o.softwareControl && !o.out) throw Error('--software-control needs --out: a software run is never written under validation/results/gpu.');
  if (o.softwareControl && path.resolve(o.out).startsWith(GPU_DIR + path.sep)) throw Error('Refusing to write a software-control run under validation/results/gpu/, which holds hardware results only.');

  const graphics = await probe(mode);
  const software = !graphics.webgl2 || GL.isSoftwareRenderer(graphics.renderer);
  console.log('WebGL renderer: ' + (graphics.renderer || 'none') + ' (' + graphics.channel + ' ' + graphics.browser + ')');
  if (mode === 'hardware' && software) {
    console.error('REFUSED: the renderer is ' + (graphics.webgl2 ? 'software ("' + graphics.renderer + '")' : 'missing (no WebGL2)') +
      '. Nothing was run or written. On a machine with a GPU, see docs/HARDWARE-GPU.md for GENCHASE_ANGLE and GENCHASE_GL_CHANNEL.');
    return 3;
  }
  const commit = git(['rev-parse', 'HEAD']), dirty = (git(['diff', '--name-only', 'HEAD']) || '').split('\n').filter(Boolean);
  const started = Date.now(), results = [];
  for (const [i, t] of tools.entries()) {
    const before = snapshot();
    const r = await runTool(t, mode, o.timeout * 60000, i, tools.length);
    r.results = captureAndRestore(before);
    results.push(r);
    console.log(`    -> ${r.outcome} (exit ${r.exitCode}, ${r.seconds} s, ${r.launches} browser launch${r.launches === 1 ? '' : 'es'})`);
  }
  const renderers = [...new Set(results.flatMap(r => r.renderers))];
  // Second guard: nothing labeled hardware unless every browser every tool launched reported hardware.
  if (mode === 'hardware' && (results.some(r => r.outcome === 'refused') || renderers.some(GL.isSoftwareRenderer))) {
    console.error('REFUSED: a tool ran on a software renderer (' + renderers.filter(GL.isSoftwareRenderer).join('; ') + '). Nothing was written.');
    return 3;
  }
  const count = k => results.filter(r => r.outcome === k).length;
  const report = {
    kind: 'genchase-gpu-science', format: 1, label: mode === 'hardware' ? 'hardware' : 'software-control',
    note: mode === 'hardware' ? 'Registered GPU science and print-state tools run on this machine\'s GPU. The repository\'s recorded evidence runs on SwiftShader; this file is additional platform evidence, not a replacement.'
      : 'Software control: the same pipeline on SwiftShader. Not hardware evidence.',
    commit, dirtyTrackedFiles: dirty, date: new Date().toISOString(),
    command: 'node tools/gpu-science.js' + (process.argv.slice(2).length ? ' ' + process.argv.slice(2).join(' ') : ''),
    platform: { os: process.platform, release: os.release(), arch: process.arch, cpu: (os.cpus()[0] || {}).model || null, cores: os.cpus().length, memoryGB: Math.round(os.totalmem() / 2 ** 30), node: process.version },
    browser: { channel: graphics.channel, version: graphics.browser, playwright: require('playwright/package.json').version, args: graphics.args,
      overrides: { GENCHASE_ANGLE: process.env.GENCHASE_ANGLE || null, GENCHASE_GL_CHANNEL: process.env.GENCHASE_GL_CHANNEL || null } },
    renderer: { renderer: graphics.renderer, vendor: graphics.vendor, version: graphics.version, float32: graphics.float32, software, toolRenderers: renderers },
    summary: { tools: results.length, pass: count('pass'), fail: count('fail'), timeout: count('timeout'), noBrowser: count('no-browser'), seconds: Math.round((Date.now() - started) / 1000) },
    coverage: { gpuTabs: p.tabs, uncovered: p.uncovered, excluded: p.excluded.map(({ command, tabs, reason }) => ({ command, tabs, reason })), subset: o.only.length ? o.only : null },
    tools: results,
  };
  const file = o.out || path.join(GPU_DIR, process.platform + '-' + rendererSlug(graphics.renderer) + (o.label ? '-' + o.label : '') + '.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  // Inside the volunteer runner the hardware card reads the renderer from the job folder.
  if (process.env.GENCHASE_JOB_DIR) fs.writeFileSync(path.join(process.env.GENCHASE_JOB_DIR, 'browser-report.json'),
    JSON.stringify({ browserVersions: { chromium: graphics.browser, playwright: report.browser.playwright }, webglRenderer: graphics.renderer, graphics: { ...graphics, args: undefined }, gpuScience: path.relative(root, file) }, null, 2) + '\n');
  console.log(`GENCHASE_PROGRESS ${JSON.stringify({ stage: 'check', message: 'done', unit: 'tools', done: results.length, total: results.length })}`);
  console.log(`\n${report.label}: ${report.summary.pass} pass, ${report.summary.fail} fail, ${report.summary.timeout} timeout, ${report.summary.noBrowser} without a browser, of ${results.length} tools in ${report.summary.seconds} s`);
  console.log('Wrote ' + (file.startsWith(root + path.sep) ? path.relative(root, file) : file));
  return results.every(r => r.outcome === 'pass') ? 0 : 1;
}

async function selfTest() {
  const assert = require('node:assert/strict');
  let n = 0; const ok = (c, name) => { assert.ok(c, name); n++; };
  // The switch.
  ok(JSON.stringify(GL.glArgs({})) === JSON.stringify(['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']), 'default is the SwiftShader list, unchanged');
  ok(GL.glArgs({ GENCHASE_GL: 'swiftshader' }).includes('--use-angle=swiftshader'), 'GENCHASE_GL=swiftshader is the default');
  for (const [platform, backend] of [['darwin', 'metal'], ['win32', 'd3d11'], ['linux', 'vulkan']]) {
    const a = GL.glArgs({ GENCHASE_GL: 'hardware' }, platform);
    ok(a.includes('--use-angle=' + backend) && a.includes('--ignore-gpu-blocklist') && !a.some(x => /swiftshader/.test(x)), 'hardware on ' + platform + ' uses ' + backend);
  }
  ok(GL.glArgs({ GENCHASE_GL: 'hardware', GENCHASE_ANGLE: 'gl-egl' }, 'linux').includes('--use-angle=gl-egl'), 'GENCHASE_ANGLE overrides the backend');
  assert.throws(() => GL.glArgs({ GENCHASE_GL: 'hardwre' }), /GENCHASE_GL must be/); n++;
  assert.throws(() => GL.glArgs({ GENCHASE_GL: 'hardware', GENCHASE_ANGLE: 'swiftshader' }), /software renderer/); n++;
  // What counts as software. The first string is the one this repository's container reports.
  for (const r of ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'ANGLE (Mesa, llvmpipe (LLVM 15.0.7, 256 bits), OpenGL 4.5)',
    'ANGLE (Mesa, Vulkan 1.3.255 (llvmpipe (LLVM 16.0.6, 256 bits) (0x00000000)), lavapipe)', 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', 'Apple Software Renderer', null, ''])
    ok(GL.isSoftwareRenderer(r), 'software: ' + r);
  for (const r of ['ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'ANGLE (AMD, AMD Radeon RX 6800 XT (0x000073BF) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)'])
    ok(!GL.isSoftwareRenderer(r), 'hardware: ' + r);
  ok(rendererSlug('ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)') === 'apple-m1-pro', 'slug for Apple M1 Pro');
  ok(rendererSlug('ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)') === 'nvidia-geforce-rtx-3080', 'slug for an NVIDIA card');
  // The wrapper: refuses a software renderer in hardware mode, passes a hardware one, leaves other launches alone.
  const fake = renderer => {
    const calls = [], closed = [];
    return { calls, closed, launch: async function (opts) { calls.push(opts); return { version: () => '1.0', close: async () => closed.push(1),
      newPage: async () => ({ evaluate: async () => ({ webgl2: true, float32: true, renderer, vendor: 'x', version: 'WebGL 2.0' }), close: async () => {} }) }; } };
  };
  const log = path.join(os.tmpdir(), 'gpu-science-self-test-' + process.pid + '.jsonl');
  const hw = { GENCHASE_GL: 'hardware', GENCHASE_GL_LOG: log };
  let c = fake('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)');
  GL.installLaunchWrapper(c, hw, 'linux');
  await assert.rejects(c.launch({ args: GL.glArgs(hw, 'linux') }), /Refusing to run on it as hardware/); n++;
  ok(c.closed.length === 1 && c.calls[0].channel === 'chromium', 'refused browser is closed; the hardware launch asked for the full Chromium build');
  ok(JSON.parse(fs.readFileSync(log, 'utf8').trim()).software === true, 'the refused launch is logged as software');
  fs.unlinkSync(log);
  c = fake('ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)');
  GL.installLaunchWrapper(c, hw, 'darwin');
  await c.launch({ args: [...GL.glArgs(hw, 'darwin'), '--ignore-gpu-blocklist'] });
  ok(c.closed.length === 0 && JSON.parse(fs.readFileSync(log, 'utf8').trim()).renderer.includes('Apple M1 Pro'), 'a hardware renderer passes and is logged');
  await c.launch({});
  ok(c.calls[1].channel === undefined && c.calls.length === 2, 'a launch without the switch passes through untouched');
  fs.unlinkSync(log);
  c = fake('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)');
  GL.installLaunchWrapper(c, { GENCHASE_GL_LOG: log }, 'linux');
  await c.launch({ args: GL.glArgs({}) });
  ok(c.calls[0].channel === undefined && JSON.parse(fs.readFileSync(log, 'utf8').trim()).mode === 'swiftshader', 'the default mode only logs, and keeps the headless shell');
  fs.unlinkSync(log);
  // The plan, from the repository.
  const p = plan();
  ok(p.tabs.includes('cahn') && p.tabs.includes('turing') && p.tabs.length >= 20, 'GPU tabs derived from createGL');
  ok(p.tools.length >= 10 && p.tools.every(t => /\bglArgs\s*\(/.test(fs.readFileSync(path.join(root, t.tool), 'utf8'))), 'every planned tool launches through glArgs()');
  ok(p.tools.some(t => t.tool === 'tools/pde-science.js') && p.tools.some(t => t.tool === 'tools/rdx-print-state.js'), 'the pde and rdx science and print-state tools are planned');
  ok(p.excluded.every(t => t.reason) && !p.tools.some(t => p.excluded.some(e => e.command === t.command)), 'every exclusion has a reason and none is also planned');
  ok(p.tools.every(t => !t.argv.includes('>')), 'shell redirections are dropped from the argument list');
  ok(JSON.stringify(jsonOf('Running 3 cases\n{\n  "max": 1e-7\n}\n')) === '{"max":1e-7}' && jsonOf('no json here') === null, 'a JSON result printed after log lines is kept');
  // The output guard.
  await assert.rejects(main({ ...parseArgs(['--software-control', '--out', path.join(GPU_DIR, 'x.json')]) }), /hardware results only/); n++;
  await assert.rejects(main({ ...parseArgs(['--software-control']) }), /needs --out/); n++;
  console.log(n + ' gpu-science self-test checks passed');
}

if (require.main === module) {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  (o.selfTest ? selfTest().then(() => 0) : main(o))
    .then(code => { process.exitCode = code; })
    .catch(e => { console.error((e.refusal ? 'REFUSED: ' : 'FAIL ') + e.message); process.exitCode = e.refusal ? 3 : 1; });
}
module.exports = { plan, rendererSlug, parseArgs };
