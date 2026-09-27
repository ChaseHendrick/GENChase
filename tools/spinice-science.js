// node tools/spinice-science.js [--write]
//
// Square ice on the torus: exact counts, and whether a sampler visits those
// ice-rule configurations uniformly.
//
// The count is the number of Eulerian orientations (two arrows in, two out at
// every vertex). Lieb, Phys. Rev. Lett. 18, 692 (1967), gives the growth
// W = (4/3)^(3/2) per vertex in the thermodynamic limit. Pauling's counting,
// applied to this square lattice, is 3/2. A finite torus is neither number.
//
// The plate's update is the single-arrow Metropolis step in src/modules/spinice.js.
// It is loaded here the way tools/ssh-science.js loads the SSH spectrum: the
// maintained source is evaluated in a vm, and the flipper is taken from that
// evaluation rather than reimplemented. On a torus small enough to enumerate,
// that flipper does not stay on the ice rule, so it fails the uniform-ice
// predicate. An independent loop flip is what the predicate accepts. A biased
// accept/reject on the same loops, and a flip that ignores the ice rule, fail
// the same predicate.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const source = fs.readFileSync(path.join(root, 'src/modules/spinice.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/shared/engine.js'), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const TAU = Math.PI * 2;
const makeRng = new Function('TAU', engine.slice(engine.indexOf('  function makeRng'), engine.indexOf('  function makeNoise')) + '\nreturn makeRng;')(TAU);

const LIEB = (4 / 3) ** 1.5;
const PAULING = 1.5;
// OEIS A054759: Eulerian orientations of the n x n torus grid. The tool
// recomputes every term. These strings are the published check, not the source
// of the count.
const OEIS = { 1: '4', 2: '18', 3: '148', 4: '2970', 5: '143224', 6: '16448400' };
const SIZES = [1, 2, 3, 4, 5, 6];
// Independent-draw null: chi-squared has mean df and variance 2*df. A pass is
// at most 4 of those standard deviations, and no bin farther than 5 of its own
// exact multinomial standard deviations. The band is the normal tail, not a fit
// to the observed fair runs.
const CHI_Z_MAX = 4;
const BIN_Z_MAX = 5;
const CHAIN = {
  fair2: { n: 2, burn: 5000, gap: 20, samples: 20000, mode: 'fair', seed: 'spinice/fair/2' },
  fair3: { n: 3, burn: 8000, gap: 40, samples: 15000, mode: 'fair', seed: 'spinice/fair/3' },
  gap1: { n: 2, burn: 5000, gap: 1, samples: 20000, mode: 'fair', seed: 'spinice/gap1/2' },
  bias2: { n: 2, burn: 5000, gap: 20, samples: 20000, mode: 'bias', seed: 'spinice/bias/2' },
  bias3: { n: 3, burn: 8000, gap: 40, samples: 15000, mode: 'bias', seed: 'spinice/bias/3' },
  break2: { n: 2, burn: 0, gap: 1, samples: 2000, mode: 'break', seed: 'spinice/break/2' },
};
const PLATE_FRAMES = 4000;

function replaceOnce(text, before, after) {
  const parts = text.split(before);
  assert.equal(parts.length, 2, 'Expected one hook: ' + before.slice(0, 80));
  return parts.join(after);
}

function idx(n, x, y) {
  return ((y % n) + n) % n * n + ((x % n) + n) % n;
}
function pack(hx, hy) {
  const nn = hx.length;
  let p = 0;
  for (let i = 0; i < nn; i++) if (hx[i] === 1) p |= 1 << i;
  for (let i = 0; i < nn; i++) if (hy[i] === 1) p |= 1 << (nn + i);
  return p;
}
function unpack(k, n, hx, hy) {
  const nn = n * n;
  for (let i = 0; i < nn; i++) hx[i] = ((k >> i) & 1) ? 1 : -1;
  for (let i = 0; i < nn; i++) hy[i] = ((k >> (nn + i)) & 1) ? 1 : -1;
}
function rightCount(hx) {
  let r = 0;
  for (let i = 0; i < hx.length; i++) if (hx[i] === 1) r++;
  return r;
}

// Plaquette, full-row and full-column reversals. Each is an involution. The
// caller picks the site without looking at the arrows, so the proposal is
// symmetric on the uniform measure.
function reversePlaquette(hx, hy, n, x, y) {
  const cw = hx[idx(n, x, y)] === 1 && hy[idx(n, x + 1, y)] === 1 && hx[idx(n, x, y + 1)] === -1 && hy[idx(n, x, y)] === -1;
  const cc = hx[idx(n, x, y)] === -1 && hy[idx(n, x + 1, y)] === -1 && hx[idx(n, x, y + 1)] === 1 && hy[idx(n, x, y)] === 1;
  if (!cw && !cc) return false;
  hx[idx(n, x, y)] *= -1;
  hy[idx(n, x + 1, y)] *= -1;
  hx[idx(n, x, y + 1)] *= -1;
  hy[idx(n, x, y)] *= -1;
  return true;
}
function reverseRow(hx, n, y) {
  let same = true;
  for (let x = 1; x < n; x++) if (hx[idx(n, x, y)] !== hx[idx(n, 0, y)]) same = false;
  if (!same) return false;
  for (let x = 0; x < n; x++) hx[idx(n, x, y)] *= -1;
  return true;
}
function reverseCol(hy, n, x) {
  let same = true;
  for (let y = 1; y < n; y++) if (hy[idx(n, x, y)] !== hy[idx(n, x, 0)]) same = false;
  if (!same) return false;
  for (let y = 0; y < n; y++) hy[idx(n, x, y)] *= -1;
  return true;
}

function countOrientations(n, { skipFirst = false, wrap = true } = {}) {
  const states = 1 << n;
  const T = Array.from({ length: states }, () => Array(states).fill(0));
  for (let below = 0; below < states; below++) {
    for (let above = 0; above < states; above++) {
      let ways = 0;
      for (let h = 0; h < states; h++) {
        let ok = true;
        for (let x = 0; x < n; x++) {
          if (skipFirst && x === 0) continue;
          const leftBit = wrap ? (h >> ((x - 1 + n) % n)) & 1 : (x === 0 ? 0 : (h >> (x - 1)) & 1);
          const inL = leftBit === 1;
          const inR = ((h >> x) & 1) === 0;
          const inD = ((below >> x) & 1) === 1;
          const inU = ((above >> x) & 1) === 0;
          if (inL + inR + inD + inU !== 2) { ok = false; break; }
        }
        if (ok) ways++;
      }
      T[below][above] = ways;
    }
  }
  const mul = (A, B) => {
    const C = Array.from({ length: states }, () => Array(states).fill(0n));
    for (let i = 0; i < states; i++) {
      for (let k = 0; k < states; k++) {
        const aik = A[i][k];
        if (aik === 0n) continue;
        for (let j = 0; j < states; j++) C[i][j] += aik * B[k][j];
      }
    }
    return C;
  };
  let result = null;
  let base = T.map(row => row.map(BigInt));
  let e = n;
  while (e) {
    if (e & 1) result = result ? mul(result, base) : base.map(row => row.slice());
    if (e > 1) base = mul(base, base);
    e >>= 1;
  }
  let trace = 0n;
  for (let i = 0; i < states; i++) trace += result[i][i];
  return trace;
}

function countBrute(n) {
  const nn = n * n;
  const total = 1 << (2 * nn);
  let ice = 0;
  for (let bits = 0; bits < total; bits++) {
    let ok = true;
    for (let y = 0; y < n && ok; y++) {
      for (let x = 0; x < n; x++) {
        const hL = (bits >> (y * n + ((x - 1 + n) % n))) & 1;
        const hR = (bits >> (y * n + x)) & 1;
        const vD = (bits >> (nn + ((y - 1 + n) % n) * n + x)) & 1;
        const vU = (bits >> (nn + y * n + x)) & 1;
        const nin = (hL === 1 ? 1 : 0) + (hR === 0 ? 1 : 0) + (vD === 1 ? 1 : 0) + (vU === 0 ? 1 : 0);
        if (nin !== 2) { ok = false; break; }
      }
    }
    if (ok) ice++;
  }
  return ice;
}

function loadPlate() {
  let text = source;
  text = replaceOnce(text, '      return {\n        aspect(s)',
    '      return {\n        audit() { return { sweep, charges, W: () => W, H: () => H, hx: () => hx, hy: () => hy, Q: () => Q, iceFrac: () => iceFrac }; },\n        aspect(s)');
  text = replaceOnce(text, 'return { W: g, H: Math.max(32, Math.round(g * aspect)) };',
    'return { W: g, H: s._small ? Math.max(1, Math.round(g * aspect)) : Math.max(32, Math.round(g * aspect)) };');
  assert(text.includes('if (dE + dH > 0 && rng() >= Math.exp(-(dE + dH) / T))'), 'plate sweep acceptance is no longer the Metropolis test this harness calls');
  let state = {};
  const host = {
    canvas: { width: 4, height: 4, getContext: () => ({ imageSmoothingEnabled: false, fillStyle: '', fillRect() {}, drawImage() {} }) },
    getState: () => state,
    setStatus() {},
    isActive: () => false,
    reducedMotion: () => true,
  };
  const document = {
    createElement() {
      return { width: 1, height: 1, getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {} }) };
    },
  };
  const context = {
    Studio: {
      util: {
        makeRng,
        clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
        makeRamp: () => () => [0, 0, 0],
        stats: { compare: () => '' },
      },
      PALETTES: {},
      register(m) { context.module = m; },
    },
    document,
  };
  vm.createContext(context);
  vm.runInContext(text, context);
  assert(context.module && typeof context.module.create === 'function', 'spinice module did not register');
  return {
    module: context.module,
    boot(extra) {
      state = Object.assign({
        grid: 2, aspect: '1:1', J: context.module.defaults.J, temp: context.module.defaults.temp, field: context.module.defaults.field,
        warmup: 0, running: false, init: 'ice', view: 'charge', exposure: 1,
        seed: 'spinice-science', palette: ['#000000'], bg: '#000000',
      }, extra);
      const inst = context.module.create(host);
      inst.regenerate();
      return { state, api: inst.audit() };
    },
  };
}

function allIce(api) {
  api.charges();
  const Q = api.Q();
  for (let i = 0; i < Q.length; i++) if (Q[i] !== 0) return false;
  return true;
}
function defectCount(api) {
  api.charges();
  const Q = api.Q();
  let c = 0;
  const rows = new Set();
  const W = api.W();
  for (let i = 0; i < Q.length; i++) if (Q[i] !== 0) { c++; rows.add((i / W) | 0); }
  return { count: c, rows: [...rows] };
}

function iceKeys(plate, n) {
  const { api } = plate.boot({ grid: n, _small: true, seed: 'census/' + n });
  const hx = api.hx(), hy = api.hy();
  const nn = n * n;
  const keys = [];
  for (let bits = 0; bits < (1 << (2 * nn)); bits++) {
    unpack(bits, n, hx, hy);
    if (allIce(api)) keys.push(bits);
  }
  return keys;
}

function reachable(keys, n) {
  const allowed = new Set(keys);
  const seen = new Set([keys[0]]);
  const queue = [keys[0]];
  const nn = n * n;
  const hx = new Int8Array(nn), hy = new Int8Array(nn);
  while (queue.length) {
    const u = queue.pop();
    unpack(u, n, hx, hy);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!reversePlaquette(hx, hy, n, x, y)) continue;
        const v = pack(hx, hy);
        reversePlaquette(hx, hy, n, x, y);
        assert(allowed.has(v), 'plaquette reversal left the ice rule');
        if (!seen.has(v)) { seen.add(v); queue.push(v); }
      }
      if (reverseRow(hx, n, y)) {
        const v = pack(hx, hy);
        reverseRow(hx, n, y);
        assert(allowed.has(v), 'row reversal left the ice rule');
        if (!seen.has(v)) { seen.add(v); queue.push(v); }
      }
    }
    for (let x = 0; x < n; x++) {
      if (!reverseCol(hy, n, x)) continue;
      const v = pack(hx, hy);
      reverseCol(hy, n, x);
      assert(allowed.has(v), 'column reversal left the ice rule');
      if (!seen.has(v)) { seen.add(v); queue.push(v); }
    }
  }
  return seen.size;
}

// Uniform ice predicate. `off` counts draws that are not ice-rule configurations.
// Under independent uniform draws, chi-squared has mean df and variance 2*df,
// and each bin has exact multinomial variance n*(1/k)*(1-1/k). Correlated draws
// do not inherit that variance; the gap is part of the declared sample.
function predicate(samples, keys) {
  const k = keys.length;
  const allowed = new Set(keys);
  const counts = new Map(keys.map(key => [key, 0]));
  let off = 0;
  for (const s of samples) {
    if (!allowed.has(s)) off++;
    else counts.set(s, counts.get(s) + 1);
  }
  const n = samples.length;
  const expected = n / k;
  let chi2 = 0, maxAbs = 0, missing = 0;
  const observed = [];
  for (const key of keys) {
    const c = counts.get(key);
    observed.push(c);
    const d = c - expected;
    chi2 += d * d / expected;
    if (Math.abs(d) > maxAbs) maxAbs = Math.abs(d);
    if (c === 0) missing++;
  }
  const df = k - 1;
  const chiVariance = 2 * df;
  const z = (chi2 - df) / Math.sqrt(chiVariance);
  const binVariance = n * (1 / k) * (1 - 1 / k);
  const binSd = Math.sqrt(binVariance);
  const maxZ = maxAbs / binSd;
  const pass = off === 0 && missing === 0 && Math.abs(z) <= CHI_Z_MAX && maxZ <= BIN_Z_MAX;
  return {
    sampleSize: n, configurations: k, offIce: off, missing, chi2, df, chiVariance, z, binVariance, binSd, maxAbs, maxZ, pass,
    observed: k <= 18 ? observed : undefined,
  };
}

function runChain(plate, keys, spec) {
  const { api } = plate.boot({ grid: spec.n, _small: true, seed: spec.seed, warmup: 0, init: 'ice' });
  const hx = api.hx(), hy = api.hy();
  unpack(keys[0], spec.n, hx, hy);
  assert(allIce(api), 'chain did not start on an ice configuration');
  const rng = makeRng(spec.seed);
  const samples = [];
  const steps = spec.burn + spec.gap * spec.samples;
  for (let t = 0; t < steps; t++) {
    if (spec.mode === 'break') {
      if (rng() < 0.5) hx[rng.int(0, spec.n * spec.n - 1)] *= -1;
      else hy[rng.int(0, spec.n * spec.n - 1)] *= -1;
    } else {
      const kind = rng.int(0, 2);
      const before = spec.mode === 'bias' ? rightCount(hx) : 0;
      let undo = null;
      if (kind === 0) {
        const x = rng.int(0, spec.n - 1), y = rng.int(0, spec.n - 1);
        if (reversePlaquette(hx, hy, spec.n, x, y)) undo = () => reversePlaquette(hx, hy, spec.n, x, y);
      } else if (kind === 1) {
        const y = rng.int(0, spec.n - 1);
        if (reverseRow(hx, spec.n, y)) undo = () => reverseRow(hx, spec.n, y);
      } else {
        const x = rng.int(0, spec.n - 1);
        if (reverseCol(hy, spec.n, x)) undo = () => reverseCol(hy, spec.n, x);
      }
      // Bias: a move that adds rightward arrows is kept; a move that removes
      // them is kept with probability 0.2. The graph is unchanged. The weights
      // are not.
      if (undo && spec.mode === 'bias' && rightCount(hx) < before && rng() > 0.2) undo();
    }
    if (t >= spec.burn && (t - spec.burn) % spec.gap === 0) {
      api.charges();
      const key = pack(hx, hy);
      const ice = allIce(api);
      if (ice) assert(keys.includes(key), 'plate ice configuration missing from the census');
      samples.push(ice ? key : -1);
    }
  }
  const result = predicate(samples, keys);
  return Object.assign({ n: spec.n, mode: spec.mode, burn: spec.burn, gap: spec.gap, seed: spec.seed }, result);
}

function scripted(seq) {
  let i = 0;
  const rng = () => {
    assert(i < seq.length, 'plate sweep drew more random numbers than the forced flip allows');
    return seq[i++];
  };
  rng.int = (lo, hi) => Math.floor(lo + rng() * (hi - lo + 1));
  rng.left = () => seq.length - i;
  return rng;
}

function arrowsEqual(a, b) {
  return a.hx.length === b.hx.length && a.hx.every((v, i) => v === b.hx[i]) && a.hy.every((v, i) => v === b.hy[i]);
}
function snapshot(api) {
  return { hx: Array.from(api.hx()), hy: Array.from(api.hy()) };
}

function forcedFlip(plate, field, acceptDraw) {
  const { state, api } = plate.boot({ grid: 2, _small: true, seed: 'forced', warmup: 0, init: 'ice', field });
  assert(allIce(api), 'forced flip must start from ice');
  const before = snapshot(api);
  const seq = acceptDraw === null ? [0, 0, 0] : [0, 0, 0, acceptDraw];
  const rng = scripted(seq);
  api.sweep(state, rng, 1);
  api.charges();
  const after = snapshot(api);
  let flipped = 0;
  for (let i = 0; i < after.hx.length; i++) if (after.hx[i] !== before.hx[i]) flipped++;
  for (let i = 0; i < after.hy.length; i++) if (after.hy[i] !== before.hy[i]) flipped++;
  const Q = Array.from(api.Q());
  return { field, acceptDraw, ice: allIce(api), flipped, Q, unchanged: arrowsEqual(before, after), rngLeft: rng.left() };
}

function plateHistogram(plate, keys) {
  const defaults = plate.module.defaults;
  const { state, api } = plate.boot({
    grid: 2, _small: true, seed: 'plate-histogram', warmup: 0, init: 'ice',
    J: defaults.J, temp: defaults.temp, field: defaults.field,
  });
  assert(allIce(api), '2x2 ice seed is not ice; the histogram would not start on the manifold');
  const samples = [];
  for (let t = 0; t < PLATE_FRAMES; t++) {
    // Same call the frame loop makes: sweep(state, makeRng(seed + '/mc/' + step), W * 8).
    api.sweep(state, makeRng(state.seed + '/mc/' + t), api.W() * 8);
    const ice = allIce(api);
    samples.push(ice ? pack(api.hx(), api.hy()) : -1);
  }
  const result = predicate(samples, keys);
  const iceN = result.sampleSize - result.offIce;
  let chi2Conditional = null, zConditional = null;
  if (iceN > 0) {
    const expected = iceN / keys.length;
    const counts = new Map(keys.map(k => [k, 0]));
    for (const s of samples) if (counts.has(s)) counts.set(s, counts.get(s) + 1);
    let chi2 = 0;
    for (const c of counts.values()) chi2 += (c - expected) ** 2 / expected;
    chi2Conditional = chi2;
    zConditional = (chi2 - (keys.length - 1)) / Math.sqrt(2 * (keys.length - 1));
  }
  return Object.assign(result, {
    frames: PLATE_FRAMES,
    flipsPerFrame: 2 * 8,
    J: defaults.J, temp: defaults.temp, field: defaults.field,
    fracOffIce: result.offIce / result.sampleSize,
    chi2Conditional, zConditional,
    conditionalIsNotThePredicate: true,
  });
}

function round(x, d) {
  if (typeof x !== 'number' || !Number.isFinite(x)) return x;
  const p = 10 ** d;
  return Math.round(x * p) / p;
}
function publishChain(row) {
  const out = {
    n: row.n, mode: row.mode, burn: row.burn, gap: row.gap, seed: row.seed,
    sampleSize: row.sampleSize, configurations: row.configurations, offIce: row.offIce, missing: row.missing,
    chi2: round(row.chi2, 6), df: row.df, chiVariance: row.chiVariance, z: round(row.z, 6),
    binVariance: round(row.binVariance, 6), binSd: round(row.binSd, 6), maxAbs: row.maxAbs, maxZ: round(row.maxZ, 6),
    pass: row.pass,
  };
  if (row.observed) out.observed = row.observed;
  return out;
}

function main() {
  const counts = {};
  const wrongNeed = {};
  const openRow = {};
  for (const n of SIZES) {
    counts[n] = countOrientations(n).toString();
    wrongNeed[n] = countOrientations(n, { skipFirst: true }).toString();
    if (n >= 2) openRow[n] = countOrientations(n, { wrap: false }).toString();
    if (n <= 3) assert.equal(String(countBrute(n)), counts[n], 'brute force disagrees with the transfer matrix at n=' + n);
    assert.equal(counts[n], OEIS[n], 'transfer count disagrees with OEIS A054759 at n=' + n);
    if (n >= 2) {
      assert.notEqual(wrongNeed[n], counts[n], 'skipping a vertex must not reproduce the ice count');
      assert.notEqual(openRow[n], counts[n], 'dropping the horizontal wrap must change the count');
    }
  }
  const published = SIZES.every(n => counts[n] === OEIS[n]);
  const wrongPublished = SIZES.filter(n => n >= 2).every(n => wrongNeed[n] === OEIS[n]);
  assert.equal(published, true);
  assert.equal(wrongPublished, false);

  const lattices = SIZES.map(n => {
    const count = BigInt(counts[n]);
    const N = n * n;
    const W = Math.exp(Number(Math.log(Number(count))) / N);
    return {
      n, N, count: counts[n], W_L: W,
      distanceToLieb: W - LIEB,
      distanceToPauling: W - PAULING,
      reachedLieb: false,
    };
  });
  for (const row of lattices) assert(Math.abs(row.distanceToLieb) > 1e-3, 'a computed torus is within 0.001 of Lieb; do not claim the limit');
  for (let i = 1; i < lattices.length - 1; i++) {
    // n = 1 is the degenerate one-vertex torus. From n = 2 upward, W_L moves toward Lieb.
    if (lattices[i].n < 2) continue;
    assert(Math.abs(lattices[i + 1].distanceToLieb) < Math.abs(lattices[i].distanceToLieb), 'W_L is not moving toward Lieb');
  }

  const plate = loadPlate();
  const defaults = { J: plate.module.defaults.J, temp: plate.module.defaults.temp, field: plate.module.defaults.field };
  assert.equal(defaults.J, 1.6);
  assert.equal(defaults.temp, 0.55);
  assert.equal(defaults.field, 0);

  const census = {};
  for (const n of [1, 2, 3]) {
    census[n] = iceKeys(plate, n);
    assert.equal(String(census[n].length), counts[n], 'plate charges() census disagrees with the transfer count at n=' + n);
  }
  assert.equal(reachable(census[2], 2), census[2].length, '2x2 loop graph is not the full ice set');
  assert.equal(reachable(census[3], 3), census[3].length, '3x3 loop graph is not the full ice set');

  const fair2 = runChain(plate, census[2], CHAIN.fair2);
  const fair3 = runChain(plate, census[3], CHAIN.fair3);
  const gap1 = runChain(plate, census[2], CHAIN.gap1);
  const bias2 = runChain(plate, census[2], CHAIN.bias2);
  const bias3 = runChain(plate, census[3], CHAIN.bias3);
  const break2 = runChain(plate, census[2], CHAIN.break2);
  for (const row of [fair2, fair3]) assert.equal(row.pass, true, 'fair loop flip failed the uniform-ice predicate at n=' + row.n);
  assert.equal(gap1.offIce, 0);
  assert.equal(gap1.pass, false, 'unthinned fair draws must fail the independent multinomial predicate');
  assert(gap1.z > CHI_Z_MAX, 'unthinned chi-squared was not high');
  for (const row of [bias2, bias3]) {
    assert.equal(row.offIce, 0, 'biased loop left the ice rule; that is a different control');
    assert.equal(row.missing, 0, 'biased loop missed configurations; the failure would not be the weights');
    assert.equal(row.pass, false, 'biased flip passed the uniform-ice predicate');
    assert(row.z > CHI_Z_MAX);
  }
  assert(break2.offIce > 0, 'ice-breaking flip stayed on the ice rule');
  assert.equal(break2.pass, false, 'ice-breaking update passed the uniform-ice predicate');

  const rate = Math.exp(-defaults.J / defaults.temp);
  const accepted = forcedFlip(plate, 0, rate / 2);
  const rejected = forcedFlip(plate, 0, Math.min(0.99, rate * 2));
  // The forced move flips hx at (0, 0). Choose the field so that move lowers
  // the field energy, whichever way the ice seed points.
  const probe = plate.boot({ grid: 2, _small: true, seed: 'forced-probe', warmup: 0, init: 'ice', field: 0 });
  assert(allIce(probe.api));
  const hx0 = probe.api.hx()[0];
  const downhillField = hx0 > 0 ? -1 : 1;
  const fieldKept = forcedFlip(plate, downhillField, null);
  assert(defaults.J + 2 * hx0 * downhillField < 0, 'the field trial is not downhill');
  assert.equal(accepted.ice, false, 'a Metropolis accept from ice must leave the ice rule');
  assert.equal(accepted.flipped, 1);
  assert.equal(accepted.rngLeft, 0);
  assert.equal(rejected.ice, true, 'a draw above exp(-J/T) must reject and stay on ice');
  assert.equal(rejected.unchanged, true);
  assert.equal(rejected.rngLeft, 0);
  assert.equal(fieldKept.ice, false, 'a downhill field flip must be kept without a further random draw');
  assert.equal(fieldKept.flipped, 1);
  assert.equal(fieldKept.rngLeft, 0);
  const defects = accepted.Q.filter(q => q !== 0);
  assert.equal(defects.length, 2);
  assert(defects.every(q => Math.abs(q) === 1), 'an accepted arrow flip must create a charge +1 and a charge -1');

  const plateRun = plateHistogram(plate, census[2]);
  assert.equal(plateRun.pass, false, 'plate Metropolis passed the uniform-ice predicate; the record says it does not');
  assert(plateRun.fracOffIce > 0.05, 'plate Metropolis barely left the ice rule at the defaults; the failure would be too weak to trust');

  const sheets = [];
  for (const spec of [
    { grid: 96, aspect: '1:1', label: 'default even sheet' },
    { grid: 48, aspect: '4:5', label: '4:5 even sheet' },
    { grid: 80, aspect: '16:9', label: '16:9 odd height' },
    { grid: 3, aspect: '1:1', label: '3x3 torus', _small: true },
  ]) {
    const { api } = plate.boot({ grid: spec.grid, aspect: spec.aspect, _small: !!spec._small, warmup: 0, init: 'ice', seed: 'seed/' + spec.label });
    const defects = defectCount(api);
    sheets.push({ label: spec.label, grid: spec.grid, aspect: spec.aspect, W: api.W(), H: api.H(), defectVertices: defects.count, defectRows: defects.rows, ice: defects.count === 0 });
  }
  const even = sheets.filter(s => s.label.startsWith('default') || s.label.startsWith('4:5'));
  for (const s of even) assert.equal(s.ice, true, 'ice seed is not ice on ' + s.label);
  const odd = sheets.find(s => s.label.startsWith('16:9'));
  assert.equal(odd.W, 80);
  assert.equal(odd.H, 45);
  assert.equal(odd.defectVertices, odd.W, 'expected one broken seam row on the odd-height sheet');
  assert.equal(odd.ice, false);

  const result = {
    date: '2026-09-27',
    source: 'src/modules/spinice.js',
    sourceSha256,
    model: 'square ice, six-vertex model, periodic boundary, not pyrochlore spin ice',
    lieb: { citation: 'E. H. Lieb, Phys. Rev. Lett. 18, 692 (1967)', W: LIEB, formula: '(4/3)^(3/2)' },
    pauling: { W: PAULING, note: '2^(2N) * (6/16)^N = (3/2)^N on the square lattice. Pauling, J. Am. Chem. Soc. 57, 2680 (1935), used the same style of count for three-dimensional ice.' },
    oeis: 'A054759',
    reachedLieb: false,
    lattices,
    failureControls: {
      enumeration: {
        skippedVertexMatchesPublished: wrongPublished,
        openHorizontalCounts: openRow,
        skippedVertexCounts: wrongNeed,
      },
    },
    predicate: {
      description: 'Every recorded configuration is an ice-rule state, none of the enumerated states is missing, chi-squared is within 4 standard deviations of its independent-draw mean df (variance 2*df), and no bin deviates by more than 5 of its exact multinomial standard deviations.',
      chiZMax: CHI_Z_MAX,
      binZMax: BIN_Z_MAX,
      independence: 'The chi-squared variance 2*df and the bin variance n*(1/k)*(1-1/k) are exact for independent multinomial draws. The chains are thinned deterministic PRNG draws. The gap-1 control is the same fair flip recorded every step, and it fails this independent-draw predicate.',
    },
    loopFlip: {
      note: 'Independent of the plate. Plaquette reversal plus reversal of a uniform row or column. Not the plate Monte Carlo.',
      fair2: publishChain(fair2),
      fair3: publishChain(fair3),
      gap1FailsIndependentVariance: publishChain(gap1),
      biased2: publishChain(bias2),
      biased3: publishChain(bias3),
      iceBreaking2: publishChain(break2),
    },
    plateSampler: {
      tested: true,
      passesUniformIcePredicate: plateRun.pass,
      note: 'Single-arrow Metropolis from src/modules/spinice.js, evaluated in a vm. The UI will not build a 2x2 torus (height is clamped at 32, and sanitize rejects grids under 48). The harness allows _small only so this same sweep can run on an enumerated torus. Defaults J, temp and field are the module defaults.',
      defaults,
      forcedFlip: {
        independentAcceptRate: rate,
        belowRateLeavesIce: accepted,
        aboveRateStaysIce: rejected,
        downhillFieldNeedsNoAcceptDraw: fieldKept,
      },
      histogram: {
        frames: plateRun.frames,
        flipsPerFrame: plateRun.flipsPerFrame,
        sampleSize: plateRun.sampleSize,
        configurations: plateRun.configurations,
        offIce: plateRun.offIce,
        fracOffIce: round(plateRun.fracOffIce, 6),
        chi2: round(plateRun.chi2, 6),
        df: plateRun.df,
        chiVariance: plateRun.chiVariance,
        z: round(plateRun.z, 6),
        binVariance: round(plateRun.binVariance, 6),
        binSd: round(plateRun.binSd, 6),
        maxZ: round(plateRun.maxZ, 6),
        pass: plateRun.pass,
        chi2ConditionalOnIce: round(plateRun.chi2Conditional, 6),
        zConditionalOnIce: round(plateRun.zConditional, 6),
        conditionalIsNotThePredicate: true,
      },
    },
    iceSeed: {
      note: 'warmup 0, init ice. The staggered pattern is an ice configuration when both periods are even. An odd period disagrees with itself across the seam.',
      sheets,
    },
    status: 'partially validated',
    whyNotFull: 'The plate sampler was executed and fails the uniform-ice predicate. The loop flip that passes is not the plate. No print-state audit was run. Finite tori have not reached Lieb\'s limit.',
  };

  const summary = [];
  summary.push('Lieb W = ' + LIEB + ' ; Pauling W = ' + PAULING);
  for (const row of lattices) summary.push('n=' + row.n + ' count=' + row.count + ' W_L=' + row.W_L + '  (Lieb ' + (row.distanceToLieb >= 0 ? '+' : '') + row.distanceToLieb + ')');
  for (const [name, row] of [['fair2', fair2], ['fair3', fair3], ['gap1', gap1], ['bias2', bias2], ['bias3', bias3], ['break2', break2]]) {
    summary.push(name + ' n=' + row.sampleSize + ' chi2=' + row.chi2 + ' z=' + row.z + ' maxZ=' + row.maxZ + ' off=' + row.offIce + ' pass=' + row.pass);
  }
  summary.push('plate pass=' + plateRun.pass + ' off=' + plateRun.offIce + '/' + plateRun.sampleSize + ' chi2=' + plateRun.chi2 + ' z=' + plateRun.z + ' conditionalZ=' + plateRun.zConditional);
  summary.push('odd sheet defects=' + odd.defectVertices + ' on ' + odd.W + 'x' + odd.H);
  console.log(summary.join('\n'));

  if (WRITE) {
    const file = path.join(root, 'validation/results/spinice-science.json');
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
    console.log('wrote ' + path.relative(root, file));
  }
}

main();
