'use strict';
// Runs a studio module's own source in Node, unchanged except for named text patches, behind a
// mock host. Used by tools/aztec-science.js and tools/lozenge-science.js.
//
// The module registers itself through a stub Studio whose util is the engine's own util, cut out of
// src/shared/engine.js, so makeRng, the color arithmetic and the stats harness are the ones the
// studio runs. setTimeout is a queue that drain() empties in order, and performance.now() is a clock
// the caller controls: frozen, every chunk loop runs to completion in one call; advanced by a large
// step on every read, every chunk does the least work it can, which is how a test shows that
// chunking against the clock does not change the sample.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const sha256 = x => crypto.createHash('sha256').update(x).digest('hex');
const engine = read('src/shared/engine.js');
const stats = require('../../src/shared/stats.js');

function engineUtil() {
  const start = engine.indexOf('  function makeRng');
  const end = engine.indexOf('  const util = {');
  assert(start > 0 && end > start, 'engine util block not found');
  const line = engine.slice(end, engine.indexOf('\n', end)).replace('const util =', 'return');
  return new Function('window', 'const TAU = Math.PI * 2;\n' + engine.slice(start, end) + line)({ GenChaseStats: stats });
}
const util = engineUtil();

function palettes() {
  const start = engine.indexOf('  const PALETTES = {');
  const end = engine.indexOf('\n  };', start) + 5;
  assert(start > 0 && end > start, 'engine palettes not found');
  return new Function(engine.slice(start, end) + '\nreturn PALETTES;')();
}
const PALETTES = palettes();

function patch(source, patches) {
  let out = source;
  for (const [from, to] of patches || []) {
    assert(out.includes(from), 'patch target not found: ' + from.slice(0, 80));
    assert.equal(out.split(from).length, 2, 'patch target is not unique: ' + from.slice(0, 80));
    out = out.replace(from, to);
  }
  return out;
}

const mockContext = () => new Proxy({}, {
  get(_, prop) {
    if (prop === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
    return () => {};
  },
  set() { return true; },
});

// load(source, { patches }) -> { mod, create(state) -> { inst, host, run() } }
function load(source, opts) {
  const code = patch(source, opts && opts.patches);
  let mod = null;
  const queue = [];
  const clock = { t: 0, step: 0 };
  const performance = { now: () => (clock.t += clock.step) };
  const Studio = { util, PALETTES, register(m) { mod = m; } };
  new Function('Studio', 'setTimeout', 'clearTimeout', 'performance', code)(
    Studio, fn => { queue.push(fn); return queue.length; }, () => {}, performance);
  assert(mod, 'module did not register');
  function create(state) {
    const host = {
      canvas: { width: 4, height: 4, getContext: () => mockContext() },
      util, gl: null, status: '',
      getState: () => state,
      setStatus(html) { host.status = html; },
      setWitness() {}, reducedMotion: () => true, isActive: () => true, requestRepaint() {},
    };
    const inst = mod.create(host);
    return {
      inst, host,
      // regenerate and drain every scheduled chunk; step is the clock advance per read (0: one chunk)
      run(step) { clock.step = step || 0; inst.regenerate(); let guard = 0; while (queue.length) { queue.shift()(); assert(++guard < 1e7); } clock.step = 0; },
    };
  }
  return { mod, create, code, hooks: Studio.auditHooks || null };
}

// A recipe state the way the shell builds one: defaults, then the given keys, then the palette.
function stateFor(mod, params, seed) {
  const pal = PALETTES[mod.defaultPalette] || PALETTES.kiln;
  const s = Object.assign({}, mod.defaults, params, { seed });
  if (!s.palette) s.palette = pal.colors.slice();
  if (!s.bg) s.bg = pal.bg;
  if (mod.sanitize && !(params && params.__raw)) mod.sanitize(s);
  delete s.__raw;
  return s;
}

// Chi-square upper tail Q(df/2, x/2), from the regularized incomplete gamma function (series below
// a + 1, Lentz continued fraction above), as in Numerical Recipes 6.2.
function logGamma(x) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function gammaQ(a, x) {
  if (x <= 0) return 1;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 100000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
    return Math.max(0, 1 - sum * Math.exp(-x + a * Math.log(x) - logGamma(a)));
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 100000; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}
const chiSquareP = (chi, df) => gammaQ(df / 2, chi / 2);

// Standard normal quantile (Acklam's rational approximation, relative error below 1.2e-9).
function normalQuantile(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) return -normalQuantile(1 - p);
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// Frequencies of K outcomes against exact probabilities: Pearson chi-square with its p-value, every
// outcome seen, and a simultaneous Hoeffding bound at alpha over the K outcome probabilities and the
// M marginal probabilities together (union bound), as in tools/ust-review.js.
function frequencyTest(counts, probs, draws, marginals, alpha) {
  let chi = 0, missing = 0, maxDev = 0;
  for (let k = 0; k < probs.length; k++) {
    const e = draws * probs[k], o = counts[k] || 0;
    chi += (o - e) * (o - e) / e;
    if (!o) missing++;
    maxDev = Math.max(maxDev, Math.abs(o / draws - probs[k]));
  }
  const df = probs.length - 1, p = chiSquareP(chi, df);
  let maxMarginalDev = 0, maxMarginalZ = 0;
  for (const m of marginals || []) {
    const f = m.count / draws;
    maxMarginalDev = Math.max(maxMarginalDev, Math.abs(f - m.exact));
    const se = Math.sqrt(m.exact * (1 - m.exact) / draws);
    if (se > 0) maxMarginalZ = Math.max(maxMarginalZ, Math.abs(f - m.exact) / se);
  }
  const tests = probs.length + (marginals ? marginals.length : 0);
  const bound = Math.sqrt(Math.log(2 * tests / alpha) / (2 * draws));
  const nonDegenerate = (marginals || []).filter(m => m.exact > 0 && m.exact < 1).length;
  const zCritical = nonDegenerate ? normalQuantile(1 - alpha / (2 * nonDegenerate)) : NaN;
  return { draws, outcomes: probs.length, df, chiSquare: chi, pValue: p, missing, maxOutcomeDeviation: maxDev,
    marginals: marginals ? marginals.length : 0, maxMarginalDeviation: maxMarginalDev, maxMarginalZ, bonferroniZCritical: zCritical,
    simultaneousHoeffdingAlpha: alpha, hoeffdingBound: bound,
    passes: p >= alpha && missing === 0 && maxDev < bound && maxMarginalDev < bound && !(maxMarginalZ > zCritical) };
}

module.exports = { root, read, sha256, engine, stats, util, PALETTES, patch, load, stateFor, chiSquareP, normalQuantile, frequencyTest };
