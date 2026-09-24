// Art modes: which tabs may be rendered, what a recipe hash may contain, and the job input rules.
// The command allowlist, the runner and the submission check all read this file, so they cannot disagree.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');

// A tab joins only after tools/art-check.js shows that its plate stops at exactly `warmup` steps with
// running:false, that its status reports "grid W×H", "step N" and "paused", that it declares fieldCells(),
// and that two fresh loads give the same step count and the same pixels.
const ART_TABS = Object.freeze({
  cahn: Object.freeze({ family: 'pde', stepKey: 'warmup' }),
  turing: Object.freeze({ family: 'rdx', stepKey: 'warmup' }),
});
const ART_MODES = Object.freeze(['art-deep', 'art-hunt', 'art-evolve']);
// Evolve never changes these: run controls, numerical and structural keys. The step count is `warmup`.
const FIXED_KEYS = Object.freeze(['running', 'steps', 'warmup', 'grid', 'aspect', 'dt', 'bc', 'lap']);
// A model selector changes which other keys mean anything, so a nudge keeps it.
const SELECTOR_KEYS = Object.freeze(['model', 'tmodel', 'system', 'mode']);
// The only keys a recipe payload may carry besides the tab's own schema keys. Bookkeeping such as a
// score or a generation number must never enter a payload: the engine would publish it in the hash.
const RECIPE_META_KEYS = Object.freeze(['seed', 'palette', 'bg', 'v']);
// Copies of the engine's print lists (PRINT_INCHES and PRINT_DPI in src/shared/engine.js).
// apps/validate/art.test.js compares them with the engine source.
const PRINT_INCHES = Object.freeze([8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 30, 36, 40, 44, 48, 60]);
const PRINT_DPI = Object.freeze([300, 360, 450, 600]);
const LIMITS = Object.freeze({ hashLength: 1000, seedLength: 64, payloadKeys: 64, parents: 6, huntSamples: 5000, evolveSamples: 200,
  keep: 24, deepSteps: 100000, budgetMinutes: 1440, inputBytes: 7000, thumbs: 12, thumbBytes: 64 * 1024, thumbEdge: 320, shareBytes: 1024 * 1024, shareRecords: 200 });
const HASH = /^#?([a-z0-9-]+)\/([A-Za-z0-9%._~!*'()-]{1,200})(?:\/([A-Za-z0-9_-]{1,900}))?$/;
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function plainValue(v) {
  if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) return typeof v !== 'number' || Number.isFinite(v);
  return Array.isArray(v) && v.length <= 16 && v.every(x => typeof x === 'string' && x.length <= 16);
}
// Decode '#id/seed/base64url(JSON)' exactly as the engine's parseHash reads it: the payload's own seed,
// when present, wins over the path seed. Anything the engine would silently drop is refused here instead.
function parseRecipeHash(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > LIMITS.hashLength) throw Error('A recipe hash must be text of at most ' + LIMITS.hashLength + ' characters.');
  const m = HASH.exec(value.trim());
  if (!m) throw Error('Not a studio recipe hash. Expected #id/seed or #id/seed/payload, as the studio copies it.');
  let seed;
  try { seed = decodeURIComponent(m[2]); } catch { throw Error('The recipe seed is not valid URI text.'); }
  let payload = {};
  if (m[3]) {
    const raw = Buffer.from(m[3], 'base64url'), text = raw.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(raw)) throw Error('The recipe payload is not UTF-8 text.');
    let parsed;
    try { parsed = JSON.parse(text); } catch { throw Error('The recipe payload does not decode to JSON.'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('The recipe payload must be a JSON object.');
    const keys = Object.keys(parsed);
    if (keys.length > LIMITS.payloadKeys) throw Error('The recipe payload has more than ' + LIMITS.payloadKeys + ' keys.');
    if (keys.some(k => FORBIDDEN.has(k) || !/^[A-Za-z0-9_]{1,32}$/.test(k))) throw Error('The recipe payload has a key that is not a plain setting name.');
    if (keys.some(k => !plainValue(parsed[k]))) throw Error('The recipe payload holds a value that is not a plain setting.');
    payload = parsed;
  }
  if (payload.seed !== undefined) { if (typeof payload.seed !== 'string') throw Error('The recipe seed must be text.'); seed = payload.seed; }
  if (!seed || seed.length > LIMITS.seedLength) throw Error('A recipe seed must be 1 to ' + LIMITS.seedLength + ' characters.');
  return { id: m[1], seed, payload: { ...payload, seed }, hash: '#' + m[0].replace(/^#/, '') };
}
// The engine's own encoding (encodeRecipe in src/shared/engine.js): '#' + id + '/' + URI seed + '/' +
// base64url of the JSON payload, keys in the order given. Studio.getRecipe(id) returns {id, ...payload}.
function encodeRecipe(recipe) {
  const { id, ...payload } = recipe;
  return '#' + id + '/' + encodeURIComponent(String(payload.seed || '')) + '/' + Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}
function unknownKeys(payload, schemaKeys) {
  return Object.keys(payload).filter(k => !RECIPE_META_KEYS.includes(k) && !schemaKeys.has(k));
}

const TITLES = { 'art-deep': 'Art: deep render of one recipe', 'art-hunt': 'Art: seed hunt for print-sharp plates', 'art-evolve': 'Art: evolve children from parent recipes' };
const MODE_KEYS = {
  'art-deep': ['recipe', 'steps', 'grid'],
  'art-hunt': ['recipe', 'vary', 'samples', 'start', 'keep'],
  'art-evolve': ['parents', 'samples', 'generations', 'keep'],
};
const COMMON_KEYS = ['workspace', 'mode', 'id', 'inches', 'ppi', 'budget', 'power', 'machineSlug', 'shareAutomatically'];
const given = v => v !== undefined && v !== null && v !== '';
function integer(value, label, lo, hi, fallback) {
  const n = given(value) ? Number(value) : fallback;
  if (!Number.isInteger(n) || n < lo || n > hi) throw Error(label + ' must be a whole number from ' + lo.toLocaleString('en-US') + ' to ' + hi.toLocaleString('en-US') + '.');
  return n;
}
// Normalize and bound an art job. `draw` picks a random seed block when a hunt names none; the command
// layer calls this inside command() and stores the result, so Resume reuses the same block.
function normalizeArtInput(input, catalog, draw = () => crypto.randomInt(0, 2 ** 31 - 1e6)) {
  if (!input || typeof input !== 'object') throw Error('Unsupported job settings.');
  const mode = input.mode;
  if (!ART_MODES.includes(mode)) throw Error('Choose art-deep, art-hunt or art-evolve.');
  const extra = Object.keys(input).filter(k => given(input[k]) && !COMMON_KEYS.includes(k) && !MODE_KEYS[mode].includes(k));
  if (extra.length) throw Error(extra.join(', ') + (extra.length > 1 ? ' do' : ' does') + ' not apply to ' + mode + '.');
  if (Buffer.byteLength(JSON.stringify(input)) > LIMITS.inputBytes) throw Error('Art job settings exceed ' + LIMITS.inputBytes + ' bytes.');
  const out = { mode };
  out.inches = given(input.inches) ? Number(input.inches) : mode === 'art-deep' ? 20 : 8;
  if (!PRINT_INCHES.includes(out.inches)) throw Error('Print size must be one of ' + PRINT_INCHES.join(', ') + ' inches.');
  out.ppi = given(input.ppi) ? Number(input.ppi) : 300;
  if (!PRINT_DPI.includes(out.ppi)) throw Error('Print resolution must be one of ' + PRINT_DPI.join(', ') + ' ppi.');
  if (given(input.budget) || mode === 'art-deep') out.budget = integer(input.budget, 'Budget in minutes', 1, LIMITS.budgetMinutes, 120);
  let id = given(input.id) ? input.id : undefined;
  const matchId = hashId => { if (id !== undefined && id !== hashId) throw Error('The recipe is for ' + hashId + ', not ' + id + '.'); id = hashId; };
  if (mode === 'art-evolve') {
    if (!Array.isArray(input.parents) || input.parents.length < 1 || input.parents.length > LIMITS.parents) throw Error('Give 1 to ' + LIMITS.parents + ' parent recipe hashes.');
    const parents = input.parents.map(parseRecipeHash);
    if (new Set(parents.map(p => p.id)).size !== 1) throw Error('All parent recipes must be for the same tab.');
    if (new Set(parents.map(p => p.hash)).size !== parents.length) throw Error('Parent recipes must be distinct.');
    matchId(parents[0].id);
    out.parents = parents.map(p => p.hash);
    out.samples = integer(input.samples, 'Children per generation', 1, LIMITS.evolveSamples, 12);
    // Selection between generations is left to a person in this release: one generation per job.
    out.generations = integer(input.generations, 'Generations (one per job in this release)', 1, 1, 1);
    out.keep = integer(input.keep, 'Kept prints', 0, LIMITS.keep, 6);
  } else if (mode === 'art-hunt') {
    if (given(input.recipe)) { const r = parseRecipeHash(input.recipe); matchId(r.id); out.recipe = r.hash; }
    out.vary = given(input.vary) ? input.vary : 'seed';
    if (out.vary !== 'seed') throw Error('This release hunts over seeds only: use vary seed.');
    out.samples = integer(input.samples, 'Candidates', 1, LIMITS.huntSamples, 24);
    out.start = given(input.start) ? Number(input.start) : draw();
    if (!Number.isInteger(out.start) || out.start < 0 || out.start + out.samples > 2 ** 31) throw Error('Seed block start must be a non-negative whole number, with start plus candidates at most 2^31.');
    out.keep = integer(input.keep, 'Kept prints', 0, LIMITS.keep, 6);
  } else {
    if (!given(input.recipe)) throw Error('A deep render needs the recipe hash to render.');
    const r = parseRecipeHash(input.recipe); matchId(r.id); out.recipe = r.hash;
    out.steps = integer(input.steps, 'Steps', 1, LIMITS.deepSteps);
    if (given(input.grid)) out.grid = integer(input.grid, 'Grid', 64, 1024);
  }
  if (!id || !Object.hasOwn(ART_TABS, id) || !catalog.includes(id)) throw Error('Art modes support ' + Object.keys(ART_TABS).join(' and ') + ' in this release.');
  out.id = id;
  return out;
}
function artArgs(n) {
  const args = ['apps/validate/art.js', '--mode', n.mode, '--id', n.id, '--inches', String(n.inches), '--ppi', String(n.ppi)];
  if (n.budget !== undefined) args.push('--budget', String(n.budget));
  if (n.recipe) args.push('--recipe', n.recipe);
  if (n.mode === 'art-deep') { args.push('--steps', String(n.steps)); if (n.grid !== undefined) args.push('--grid', String(n.grid)); }
  if (n.mode === 'art-hunt') args.push('--vary', n.vary, '--samples', String(n.samples), '--start', String(n.start), '--keep', String(n.keep));
  if (n.mode === 'art-evolve') { for (const p of n.parents) args.push('--parent', p); args.push('--samples', String(n.samples), '--generations', String(n.generations), '--keep', String(n.keep)); }
  return args;
}

// Registered schemas read from maintained source without a browser, the same way tools/registry.js
// reads metadata: only Studio.register runs, never a renderer.
function loadSchemas(root, wanted) {
  const noop = () => {};
  const glsl = new Proxy({}, { get: () => '' });
  const gl = new Proxy({ GLSL: glsl }, { get: (obj, key) => obj[key] || noop });
  const util = new Proxy({ clamp: (x, a, b) => Math.max(a, Math.min(b, x)), hexToRgb: () => [0, 0, 0], makeRng: () => ({}) }, { get: (obj, key) => obj[key] || noop });
  const palettes = new Proxy({}, { get: () => ({ colors: ['#000000'], bg: '#000000' }) });
  const files = [...fs.readFileSync(path.join(root, 'src/studio.html'), 'utf8').matchAll(/\{\{include:(modules\/[a-z0-9-]+\.js)\}\}/g)].map(m => m[1]);
  const out = {};
  for (const file of files) {
    const registered = [];
    const Studio = { util, gl, PALETTES: palettes, register: m => registered.push(m) };
    const context = { Studio, console, Math, Number, JSON, Date, Intl, performance: { now: () => 0 },
      Float32Array, Float64Array, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, ArrayBuffer,
      setTimeout: noop, clearTimeout: noop, requestAnimationFrame: noop, document: {}, window: {} };
    new vm.Script(fs.readFileSync(path.join(root, 'src', file), 'utf8'), { filename: file }).runInNewContext(context, { timeout: 5000 });
    for (const m of registered) if (!wanted || wanted.includes(m.id)) {
      const fields = (m.schema || []).filter(f => f.type !== 'action').map(f => ({ key: f.key, type: f.type, min: f.min, max: f.max, step: f.step, options: f.options ? f.options.map(o => o[0]) : undefined }));
      out[m.id] = { fields, keys: new Set(fields.map(f => f.key)), defaults: JSON.parse(JSON.stringify(m.defaults || {})) };
    }
  }
  return out;
}

// Shared thumbnails are JPEGs straight from Chromium's canvas encoder, which writes only JFIF, an ICC
// profile, tables, one frame and scans. Anything that can carry text (EXIF, XMP, comments, other
// application segments) is refused rather than stripped, so what is shared is what was checked.
function jpegInfo(buffer, { maxBytes = LIMITS.thumbBytes, maxEdge = LIMITS.thumbEdge } = {}) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  const fail = why => { throw Error('Thumbnail rejected: ' + why + '.'); };
  if (b.length > maxBytes) fail('larger than ' + maxBytes + ' bytes');
  if (b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) fail('not a JPEG');
  let i = 2, width = 0, height = 0, frame = false, scans = 0;
  const segment = () => {
    if (i + 4 > b.length) fail('truncated segment');
    const len = b.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > b.length) fail('bad segment length');
    return [i + 4, i + 2 + len];
  };
  for (;;) {
    if (i + 2 > b.length || b[i] !== 0xFF) fail('marker expected');
    const m = b[i + 1];
    if (m === 0xD9) { if (!frame || !scans) fail('no image data'); if (i + 2 !== b.length) fail('data after the end of the image'); break; }
    const [start, end] = segment();
    if (m === 0xE0) { if (b.toString('latin1', start, start + 5) !== 'JFIF\0') fail('APP0 is not JFIF'); }
    else if (m === 0xE2) { if (b.toString('latin1', start, start + 12) !== 'ICC_PROFILE\0') fail('APP2 is not an ICC profile'); }
    else if (m === 0xDB || m === 0xC4 || m === 0xDD) { /* quantization tables, Huffman tables, restart interval */ }
    else if (m === 0xC0 || m === 0xC2) {
      if (frame) fail('more than one frame');
      if (end - start < 6) fail('short frame header');
      frame = true; height = b.readUInt16BE(start + 1); width = b.readUInt16BE(start + 3);
      if (!width || !height || width > maxEdge || height > maxEdge) fail('dimensions ' + width + '×' + height + ' exceed ' + maxEdge + ' px');
    } else if (m === 0xDA) {
      if (!frame) fail('scan before frame');
      scans++; i = end;
      // Entropy-coded data runs to the next marker that is neither a stuffed zero nor a restart marker.
      while (i + 1 < b.length && !(b[i] === 0xFF && b[i + 1] !== 0x00 && !(b[i + 1] >= 0xD0 && b[i + 1] <= 0xD7))) i++;
      if (i + 1 >= b.length) fail('scan runs past the end');
      continue;
    } else fail('segment 0x' + m.toString(16).toUpperCase() + ' is not allowed (EXIF, XMP, comments and other metadata are refused)');
    i = end;
  }
  return { width, height, bytes: b.length };
}

module.exports = { ART_TABS, ART_MODES, FIXED_KEYS, SELECTOR_KEYS, RECIPE_META_KEYS, PRINT_INCHES, PRINT_DPI, LIMITS, TITLES,
  parseRecipeHash, encodeRecipe, unknownKeys, normalizeArtInput, artArgs, loadSchemas, jpegInfo };
