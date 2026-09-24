'use strict';
// Loads the real src/modules/lattice.js in Node, the way tools/ust-review.js loads ust.js: the module text
// is run with new Function, a fake Studio collects its register() calls, and a few string insertions expose
// closures (the percolation labeler, the sandpile toppler and identity job) to the caller through `hooks`.
// Nothing numerical is rewritten unless a caller passes `edits`, which is how the failure controls inject a
// deliberately wrong rule into a copy of the code. Every edit must match exactly once, or the load throws,
// so a control cannot silently test the unmodified code.
//
// It also builds a temporary copy of dist/studio.html whose lattice.js carries an auditRead() on the
// percolation and sandpile instances, plus Studio.auditInstances(), for the print checks in Chromium.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');

const root = path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const source = read('src/modules/lattice.js');
const engine = read('src/shared/engine.js');
const sha256 = x => crypto.createHash('sha256').update(x).digest('hex');

// The engine's own seeded generator, extracted verbatim (as tools/ust-review.js does).
const makeRng = new Function(engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + 'return makeRng;')();

function replaceOnce(text, find, replacement, why) {
  const at = text.indexOf(find);
  if (at < 0 || text.indexOf(find, at + 1) >= 0) throw new Error('Edit anchor must occur exactly once: ' + (why || find.slice(0, 60)));
  return text.slice(0, at) + replacement + text.slice(at + find.length);
}

// Hooks that only expose closures; they change no statement the module executes.
const HOOKS = [
  // module scope: the grid toppler and the octant pile used by the sandpile tab
  ['  const SAND_MODE = {', '  hooks.makeGridToppler = makeGridToppler; hooks.makeOctantPile = makeOctantPile;\n  const SAND_MODE = {'],
  // percolation create(): the field drawer and the Hoshen-Kopelman labeler, with read access to their state
  ['      function paint() {\n        const s = host.getState();\n        ensureField(s); label(s);',
    '      hooks.percolation = { ensureField, label, read: () => ({ W, H, field, bonds, parent, size, rank, spanRoot, nClusters, maxSize }) };\n' +
    '      function paint() {\n        const s = host.getState();\n        ensureField(s); label(s);'],
  // sandpile create(): the identity and random-drop jobs, with read access to their results
  ['      function compute() {\n        stop();',
    '      hooks.sandpile = { startIdentity, startSoc, startPile, read: () => ({ heights, marks, n, drops, topples, maxAv, sumAv, pile, radius, bw, bh }) };\n' +
    '      function compute() {\n        stop();'],
];

// Stubs: enough of Studio, document and performance for create() to run without a browser. The GLSL
// strings are only concatenated at load time; no GL call is made by the CPU tabs used here.
function stubs() {
  const glsl = new Proxy({}, { get: () => '' });
  const util = {
    makeRng,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    hexToRgb: h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)],
  };
  const canvas = () => ({ width: 0, height: 0, getContext: () => ({}) });
  return {
    Studio: { util, gl: { GLSL: glsl }, PALETTES: new Proxy({}, { get: () => ['#000000', '#ffffff'] }), configs: {}, register(c) { this.configs[c.id] = c; } },
    document: { createElement: canvas },
    canvas,
  };
}

// load({ edits: [[find, replace, why], ...], clock }) -> { hooks, configs, text }
function load(opts) {
  opts = opts || {};
  let text = source;
  for (const [find, rep] of HOOKS) text = replaceOnce(text, find, rep, 'hook');
  for (const [find, rep, why] of opts.edits || []) text = replaceOnce(text, find, rep, why);
  const hooks = {}, st = stubs();
  let tick = 0;
  // A deterministic clock: every call advances one millisecond, so `ms` budgets in the module turn into
  // pop-count budgets and resumable chunking is exercised reproducibly.
  const performance = { now: opts.clock || (() => tick++) };
  new Function('Studio', 'hooks', 'performance', 'document', text)(st.Studio, hooks, performance, st.document);
  return { hooks, configs: st.Studio.configs, text, makeCanvas: st.canvas };
}

// Create one instance of a registered tab with a fake host whose state the caller sets.
function instance(loaded, id, state) {
  const host = {
    canvas: loaded.makeCanvas(), state,
    getState() { return this.state; }, setStatus() {}, reducedMotion: () => true, fault() {},
  };
  loaded.configs[id].create(host);
  return host;
}

// A copy of dist/studio.html with auditRead() on the percolation and sandpile instances.
const PERC_AUDIT = [
  "      return {\n        aspect(s) { return ASPECTS[s.aspect] || 1; },\n        regenerate() { paint(); status(); },",
  "      return {\n        auditRead() { return { W, H, field: field && Array.from(field), bonds: bonds && Array.from(bonds), parent: parent && Array.from(parent), size: size && Array.from(size), rank: rank && Array.from(rank), spanRoot, nClusters, maxSize, bw: buf.width, bh: buf.height }; },\n" +
  "        aspect(s) { return ASPECTS[s.aspect] || 1; },\n        regenerate() { paint(); status(); },",
];
const SAND_AUDIT = [
  "      return {\n        aspect() { return 1; },\n        regenerate() {",
  "      return {\n        auditRead() { const c = (bw - 1) / 2; return { done, n, bw, bh, radius, drops, topples, maxAv, sumAv, heights: heights && Array.from(heights), marks: marks && Array.from(marks), pileR: pile ? pile.R : null, pileGrid: pile && done ? Array.from({ length: bw * bh }, (_, i) => pile.at(i % bw - c, ((i / bw) | 0) - c)) : null }; },\n" +
  "        aspect() { return 1; },\n        regenerate() {",
];
function auditStudio() {
  const html = read('dist/studio.html');
  if (!html.includes(source)) throw new Error('dist/studio.html does not contain the current src/modules/lattice.js; run node tools/build.js');
  let injected = replaceOnce(source, PERC_AUDIT[0], PERC_AUDIT[1], 'percolation auditRead');
  injected = replaceOnce(injected, SAND_AUDIT[0], SAND_AUDIT[1], 'sandpile auditRead');
  const page = replaceOnce(html, source, injected, 'lattice.js in dist').replace('generatePalette, register, boot,', 'generatePalette, register, auditInstances:()=>instances, boot,');
  if (!page.includes('auditInstances')) throw new Error('engine export anchor moved');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lattice-review-')), file = path.join(dir, 'studio.html');
  fs.writeFileSync(file, page);
  return { file, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

// Runs inside the page. Decodes the tab's own exportPNG(w, h) and compares every output pixel with an
// independently computed buffer of cell colors (bw x bh, RGB), mapped by nearest neighbor: output column x
// samples the source at u = (x + 0.5) * bw / w and shows cell floor(u). Chromium's scaler resolves u in fixed
// point, so when u lies within a hundredth of a cell of a boundary (an exact tie included) it may show the
// neighboring cell instead; that is a positional error below 0.01 cell (at most a quarter of an output
// pixel for cells up to 25 pixels wide). Those near-boundary pixels are counted separately and must equal one of the two
// cells at that boundary; every other pixel must match its cell to one level per channel.
// `controls` are deliberately wrong buffers (another state) that must disagree; the displaced control
// compares against the buffer shifted by one output pixel.
const PRINT_CHECK = async ({ id, w, h, bw, bh, expected, controls }) => {
  const e = Studio.auditInstances()[id], blob = await e.inst.exportPNG(w, h), bitmap = await createImageBitmap(blob);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.drawImage(bitmap, 0, 0); const natural = [bitmap.width, bitmap.height]; bitmap.close();
  const px = ctx.getImageData(0, 0, w, h).data, EPS = 0.01;
  const axis = (n, src) => {
    const cell = new Int32Array(n + 1), alt = new Int32Array(n + 1).fill(-1);
    for (let x = 0; x <= n; x++) {
      const num = (2 * x + 1) * src, den = 2 * n, k = Math.min(src - 1, Math.floor(num / den)), frac = (num % den) / den;
      cell[x] = k;
      if (frac < EPS && k > 0) alt[x] = k - 1; else if (frac > 1 - EPS && k < src - 1) alt[x] = k + 1;
    }
    return { cell, alt };
  };
  const X = axis(w, bw), Y = axis(h, bh);
  const diff = (o, cx, cy) => { const k = (cy * bw + cx) * 3; let d = 0; for (let ch = 0; ch < 3; ch++) d = Math.max(d, Math.abs(px[o + ch] - expected[k + ch])); return d; };
  let max = 0, over = 0, sum = 0, opaque = true, shifted = 0, near = 0, nearShowingNeighbor = 0, nearFailures = 0;
  const wrong = (controls || []).map(() => 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, cx = X.cell[x], cy = Y.cell[y];
    if (px[o + 3] !== 255) opaque = false;
    const d = diff(o, cx, cy);
    if (X.alt[x] >= 0 || Y.alt[y] >= 0) {
      near++;
      let best = d;
      for (const [ax, ay] of [[X.alt[x], cy], [cx, Y.alt[y]], [X.alt[x], Y.alt[y]]]) if (ax >= 0 && ay >= 0) best = Math.min(best, diff(o, ax, ay));
      if (best > 1) nearFailures++; else if (d > 1) nearShowingNeighbor++;
    } else {
      const k = (cy * bw + cx) * 3;
      for (let ch = 0; ch < 3; ch++) sum += Math.abs(px[o + ch] - expected[k + ch]);
      if (d > max) max = d;
      if (d > 1) over++;
    }
    if (diff(o, X.cell[x + 1], cy) > 2) shifted++;
    (controls || []).forEach((b, j) => { const k = (cy * bw + cx) * 3; for (let ch = 0; ch < 3; ch++) if (Math.abs(px[o + ch] - b[k + ch]) > 2) { wrong[j]++; break; } });
  }
  return { width: w, height: h, decoded: natural, blobType: blob.type, blobBytes: blob.size, cells: [bw, bh], pixels: w * h,
    maxChannelError: max, pixelsOverOne: over, meanChannelError: sum / (3 * (w * h - near)), opaque,
    nearBoundaryPixels: near, nearBoundaryTolerance: EPS, nearBoundaryShowingNeighborCell: nearShowingNeighbor, nearBoundaryFailures: nearFailures,
    displacedControlFailingPixels: shifted, wrongStateControlFailingPixels: wrong };
};

module.exports = { root, source, engine, sha256, makeRng, load, instance, auditStudio, replaceOnce, PRINT_CHECK };
